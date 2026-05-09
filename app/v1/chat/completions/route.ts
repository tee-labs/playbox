import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createUnauthorizedResponse } from '@/lib/response-helpers';
import { getConfig, resolveProvider } from '@/config';
import { ProtocolFactory } from '@/protocols';
import type { ProtocolBody } from '@/types/protocol';

import { CORS_HEADERS } from '@/utils/constants';
import { createLogger } from '@/utils/logger';
import { getTypedContext } from '@/lib/cloudflare-context';

export const dynamic = 'force-dynamic';

interface ChatBody {
  model: string;
  stream?: boolean;
  store?: unknown;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const logger = createLogger();

  const { env } = getTypedContext();

  const authResult = await authenticate(request, env);
  if (!authResult) {
    return createUnauthorizedResponse();
  }

  try {
    const rawBody = (await request.json()) as ChatBody;
    const rawBodyObj = rawBody as unknown as Record<string, unknown>;
    delete rawBodyObj.store;

    const requestedModel = rawBody.model;
    const isStream = rawBody.stream === true;

    const config = await getConfig();
    const { name: providerName, provider, realModel } = resolveProvider(config, requestedModel, 'openai');
    if (!provider) {
      throw new Error(`No provider found for model: ${requestedModel}`);
    }

    if (provider.family !== 'openai') {
      throw new Error(
        `Chat completions endpoint only supports 'openai' family providers. Got: ${provider.family} (provider: ${providerName})`
      );
    }

    logger.info('Request routed', { model: requestedModel, realModel, isStream, providerName, providerType: provider.type });

    const clientProtocol = ProtocolFactory.get('openai');
    const upstreamProtocol = ProtocolFactory.get(provider.type);

    const standardRequest = clientProtocol.toStandardRequest(rawBody);
    const upstreamRequest = upstreamProtocol.fromStandardRequest(standardRequest);

    // Replace model name with resolved model (handles aliases)
    upstreamRequest.model = realModel;

    // Ensure upstream returns usage in streaming responses
    // (OpenAI spec requires stream_options.include_usage for usage in SSE chunks)
    if (isStream) {
      upstreamRequest.stream_options = { include_usage: true };
    }

    const MAX_ATTEMPTS = upstreamProtocol.getAttempt();
    let lastResponse: Response | undefined;

    let fetchUrl = '';
    let fetchHeaders: Record<string, string> = {};
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const upstreamApiKey = await upstreamProtocol.getApiKey(env, provider);
      fetchUrl = await upstreamProtocol.getEndpoint(provider, realModel, isStream, upstreamApiKey);
      fetchHeaders = await upstreamProtocol.getHeaders(provider, env, upstreamApiKey);
      lastResponse = await fetch(fetchUrl, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify(upstreamRequest),
      });
      if (lastResponse.status !== 429 || attempt === MAX_ATTEMPTS) break;
      logger.warn(`Upstream 429 Rate Limit, retrying...`, { attempt });
    }

    if (lastResponse && !lastResponse.ok) {
      logger.error('Upstream request failed', { status: lastResponse.status, statusText: lastResponse.statusText });
    }

    const resHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': isStream ? 'text/event-stream' : 'application/json',
    };

    if (isStream && lastResponse) {
      let stream = lastResponse.body;
      if (!stream) {
        throw new Error('Response body is null');
      }

      stream = stream.pipeThrough(upstreamProtocol.createToStandardStream(realModel));
      stream = stream.pipeThrough(clientProtocol.createFromStandardStream());

      return new Response(stream, {
        headers: { ...resHeaders, 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    } else if (lastResponse) {
      const upstreamJson = await lastResponse.json();

      const standardResponse = upstreamProtocol.toStandardResponse(upstreamJson as ProtocolBody, realModel);

      const clientResponse = clientProtocol.fromStandardResponse(standardResponse);

      return new Response(JSON.stringify(clientResponse), { headers: resHeaders });
    }

    throw new Error('No response from upstream');
  } catch (err) {
    logger.error('Internal Server Error', { message: (err as Error).message, stack: (err as Error).stack });
    return new Response(JSON.stringify({ error: { message: (err as Error).message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
