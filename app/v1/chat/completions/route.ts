import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createUnauthorizedResponse, createJsonResponse } from '@/lib/response-helpers';
import { getConfig, resolveProvider } from '@/config';
import { ProtocolFactory } from '@/protocols';
import type { ProtocolBody } from '@/types';

import { CORS_HEADERS } from '@/utils/constants';
import { createLogger } from '@/utils/logger';
import { getPlatformDb } from '@/platforms';

export const dynamic = 'force-dynamic';

interface ChatBody {
  model: string;
  stream?: boolean;
  store?: unknown;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const logger = createLogger();
  logger.info('=== Chat Completions Request Start ===');

  const authResult = await authenticate(request);
  if (!authResult) {
    return createUnauthorizedResponse();
  }

  try {
    const db = getPlatformDb();

    const rawBody = (await request.json()) as ChatBody;
    const rawBodyObj = rawBody as unknown as Record<string, unknown>;
    delete rawBodyObj.store;

    const requestedModel = rawBody.model;
    const isStream = rawBody.stream === true;
    logger.info('Request details', { model: requestedModel, stream: isStream });

    const config = await getConfig();
    const { name: providerName, provider, realModel } = resolveProvider(config, requestedModel, 'openai');
    logger.info('Provider resolved', { providerName, providerEndpoint: provider.endpoint, realModel });

    const upstreamProtocol = ProtocolFactory.get('openai');

    const upstreamRequest = upstreamProtocol.toStandardRequest(rawBodyObj as ProtocolBody);

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const MAX_ATTEMPTS = upstreamProtocol.getAttempt();
    let lastResponse: Response | undefined;

    let fetchUrl = '';
    let fetchHeaders: Record<string, string> = {};
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const upstreamApiKey = await upstreamProtocol.getApiKey(db, provider);
      fetchUrl = await upstreamProtocol.getEndpoint(provider, realModel, isStream, upstreamApiKey);
      fetchHeaders = await upstreamProtocol.getHeaders(provider, db, upstreamApiKey);
      logger.info('Upstream request', { 
        attempt, 
        url: fetchUrl, 
        headers: { ...fetchHeaders, Authorization: fetchHeaders['Authorization'] ? '[REDACTED]' : undefined },
        body: JSON.stringify(upstreamRequest).substring(0, 200),
      });
      lastResponse = await fetch(fetchUrl, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify(upstreamRequest),
      });
      if (lastResponse.status !== 429 || attempt === MAX_ATTEMPTS) break;
      logger.warn(`Upstream 429 Rate Limit, retrying...`, { attempt });
    }

    if (lastResponse && !lastResponse.ok) {
      logger.error('Upstream request failed', { 
        status: lastResponse.status, 
        statusText: lastResponse.statusText,
        url: fetchUrl,
        provider: providerName,
        model: realModel,
      });
    }

    const resHeaders = {
      ...CORS_HEADERS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    if (isStream) {
      // Handle streaming response
      const upstreamStream = lastResponse?.body;
      if (!upstreamStream) {
        return new Response('Upstream stream not available', { status: 502, headers: resHeaders });
      }

      const body = new ReadableStream({
        async start(controller) {
          const reader = upstreamStream.getReader();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } catch (error) {
            logger.error('Stream reading error', { error });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(body, {
        headers: {
          ...resHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      if (!lastResponse?.ok) {
        const errorText = await lastResponse?.text();
        logger.error('Upstream error response', { status: lastResponse?.status, body: errorText });
        return new Response(JSON.stringify({ error: 'Upstream provider error', details: errorText }), {
          status: lastResponse?.status || 500,
          headers: resHeaders,
        });
      }

      const upstreamData = await lastResponse?.json() as Record<string, unknown>;
      const response = upstreamProtocol.fromStandardResponse(upstreamData);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: resHeaders,
      });
    }
  } catch (error) {
    logger.error('Error in POST /v1/chat/completions', { error });
    return createJsonResponse(
      { error: { message: 'Internal Server Error', type: 'internal_error' } },
      500
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}