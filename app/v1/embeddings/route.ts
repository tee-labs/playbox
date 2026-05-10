import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createJsonResponse, createInternalErrorResponse } from '@/lib/response-helpers';
import { getConfig, resolveProvider } from '@/config';
import { ProtocolFactory } from '@/protocols';
import { CORS_HEADERS } from '@/utils/constants';
import { createLogger } from '@/utils/logger';
import { getPlatformDb } from '@/platforms';

export const dynamic = 'force-dynamic';

interface EmbeddingBody {
  model: string;
  input: string | string[];
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const logger = createLogger();

  const db = getPlatformDb();
  await authenticate(request); // auth uses getPlatformDb internally

  try {
    const rawBody = (await request.json()) as EmbeddingBody;

    const requestedModel = rawBody.model;

    const config = await getConfig();
    const { name: providerName, provider, realModel } = resolveProvider(config, requestedModel, 'embedding');
    if (!provider) {
      throw new Error(`No provider found for model: ${requestedModel}`);
    }

    if (provider.family !== 'embedding') {
      throw new Error(
        `Embeddings endpoint only supports 'embedding' family providers. Got: ${provider.family} (provider: ${providerName})`
      );
    }

    logger.info('Embedding request routed', { model: requestedModel, realModel, providerName, providerType: provider.type });

    const upstreamProtocol = ProtocolFactory.get(provider.type);

    // Embeddings use the same format as OpenAI, pass through directly
    const upstreamRequest = { ...rawBody };
    upstreamRequest.model = realModel;

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const MAX_ATTEMPTS = upstreamProtocol.getAttempt();
    let lastResponse: Response | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const upstreamApiKey = await upstreamProtocol.getApiKey(db, provider);
      const fetchUrl = await upstreamProtocol.getEndpoint(provider, realModel, false, upstreamApiKey, true);
      const fetchHeaders = await upstreamProtocol.getHeaders(provider, db, upstreamApiKey);
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

    if (lastResponse) {
      const upstreamJson = await lastResponse.json();

      return createJsonResponse(upstreamJson);
    }

    throw new Error('No response from upstream');
  } catch (err) {
    logger.error('Internal Server Error', { message: (err as Error).message, stack: (err as Error).stack });
    return createInternalErrorResponse((err as Error).message);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
