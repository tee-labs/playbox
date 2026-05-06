import { NextRequest } from 'next/server';
import { authenticate, extractApiKey } from '@/lib/auth';
import { createJsonResponse, createUnauthorizedResponse, createInternalErrorResponse } from '@/lib/response-helpers';
import { getConfig, resolveProvider } from '@/config';
import { ProtocolFactory } from '@/protocols';
import { CORS_HEADERS } from '@/utils/constants';
import { createLogger } from '@/utils/logger';
import { getTypedContext } from '@/lib/cloudflare-context';

interface AnalyticsEngineDataset {
  writeDataPoint(event?: { blobs?: (string | ArrayBuffer | null)[]; doubles?: number[]; indexes?: (string | ArrayBuffer | null)[] }): void;
}

export const dynamic = 'force-dynamic';

interface EmbeddingBody {
  model: string;
  input: string | string[];
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const logger = createLogger();

  const { env, ctx } = getTypedContext();

  const authResult = await authenticate(request, env);
  if (!authResult) {
    return createUnauthorizedResponse();
  }

  try {
    const rawBody = (await request.json()) as EmbeddingBody;

    const requestedModel = rawBody.model;

    const config = getConfig(env);
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

    // Record analytics data point (async, non-blocking)
    const apiKey = extractApiKey(request) || 'anonymous';
    (env as unknown as { PLAYBOX_EVENTS?: AnalyticsEngineDataset }).PLAYBOX_EVENTS?.writeDataPoint({
      blobs: [
        'llm_api', // blob1: fixed tag for filtering
        '/v1/embeddings', // blob2: request path
        requestedModel, // blob3: model name
        'embedding', // blob4: request type
        providerName, // blob5: provider name
      ],
      indexes: [apiKey], // index for sampling (masked for security)
    });

    const upstreamProtocol = ProtocolFactory.get(provider.type);

    // Embeddings use the same format as OpenAI, pass through directly
    const upstreamRequest = { ...rawBody };
    upstreamRequest.model = realModel;

    const MAX_ATTEMPTS = upstreamProtocol.getAttempt();
    let lastResponse: Response | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const upstreamApiKey = await upstreamProtocol.getApiKey(env, provider, ctx);
      const fetchUrl = await upstreamProtocol.getEndpoint(provider, realModel, false, upstreamApiKey);
      const fetchHeaders = await upstreamProtocol.getHeaders(provider, env, ctx, upstreamApiKey);
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

      // Record token usage analytics
      const usage = (upstreamJson as Record<string, unknown>).usage as Record<string, number> | undefined;
      if (usage) {
        (env as unknown as { PLAYBOX_EVENTS?: AnalyticsEngineDataset }).PLAYBOX_EVENTS?.writeDataPoint({
          blobs: [
            'llm_api_tokens', // blob1: event type for token tracking
            requestedModel, // blob2: model name
            providerName, // blob3: provider name
            'embedding', // blob4: request type
          ],
          doubles: [
            usage.prompt_tokens || 0, // double1: prompt tokens
            0, // double2: completion tokens (not applicable for embeddings)
            usage.total_tokens || 0, // double3: total tokens
          ],
          indexes: [apiKey],
        });
      }

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
