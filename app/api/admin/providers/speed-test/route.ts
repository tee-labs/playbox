import { NextRequest } from 'next/server';
import { createJsonResponse, createInternalErrorResponse } from '@/lib/response-helpers';
import { getConfig } from '@/config';
import { KeyManager } from '@/managers/key';
import type { ProviderConfig } from '@/types/provider';

export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 30_000;

interface SpeedTestRequest {
  provider: string;
  model: string;
}

function buildOpenAIRequest(model: string, endpoint: string, apiKey: string): Request {
  const suffix = endpoint.match(/\/v\d+$/) ? '' : '/v1';
  const url = `${endpoint}${suffix}/chat/completions`;
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 10,
      stream: false,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function buildAnthropicRequest(model: string, endpoint: string, apiKey: string, authType?: string): Request {
  const url = `${endpoint}/v1/messages`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };

  if (authType === 'bearer') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    headers['x-api-key'] = apiKey;
  }

  return new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 10,
      stream: false,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function buildGeminiRequest(model: string, endpoint: string, apiKey: string): Request {
  const url = `${endpoint}/v1beta/models/${model}:generateContent?key=${apiKey}`;
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'hi' }] }],
      generationConfig: {
        maxOutputTokens: 10,
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function POST(request: NextRequest) {
  try {
    const config = await getConfig();

    const body = (await request.json()) as SpeedTestRequest;
    const { provider: providerName, model } = body;

    if (!providerName || !model) {
      return createJsonResponse({ success: false, error: 'Missing provider or model' }, 400);
    }

    const provider = config.providers[providerName] as ProviderConfig | undefined;
    if (!provider) {
      return createJsonResponse({ success: false, error: `Provider "${providerName}" not found` }, 404);
    }

    let apiKey: string;
    try {
      apiKey = await KeyManager.getRandomApiKey(provider);
    } catch (keyError) {
      return createJsonResponse({
        success: true,
        result: {
          provider: providerName,
          model,
          latency: 0,
          error: `No API key: ${(keyError as Error).message}`,
          timestamp: Date.now(),
        },
      });
    }

    const upstreamRequest =
      provider.family === 'openai' || provider.family === 'rerank'
        ? buildOpenAIRequest(model, provider.endpoint, apiKey)
        : provider.family === 'anthropic'
          ? buildAnthropicRequest(model, provider.endpoint, apiKey, provider.authType)
          : provider.family === 'gemini'
            ? buildGeminiRequest(model, provider.endpoint, apiKey)
            : null;

    if (!upstreamRequest) {
      return createJsonResponse(
        {
          success: false,
          error: `Unsupported family: ${provider.family}`,
        },
        400
      );
    }

    const start = Date.now();
    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(upstreamRequest);
    } catch (fetchError) {
      const latency = Date.now() - start;
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      return createJsonResponse({
        success: true,
        result: {
          provider: providerName,
          model,
          latency,
          error: errorMessage,
          timestamp: Date.now(),
        },
      });
    }
    const latency = Date.now() - start;

    if (!upstreamResponse.ok) {
      let errorDetail = `HTTP ${upstreamResponse.status}`;
      try {
        const errorBody = await upstreamResponse.text();
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody);
            errorDetail = parsed?.error?.message || parsed?.error?.type || parsed?.message || errorDetail;
          } catch {
            errorDetail = errorBody.length > 200 ? errorBody.slice(0, 200) + '...' : errorBody;
          }
        }
      } catch {
        /* noop */
      }

      return createJsonResponse({
        success: true,
        result: {
          provider: providerName,
          model,
          latency,
          error: errorDetail,
          timestamp: Date.now(),
        },
      });
    }

    return createJsonResponse({
      success: true,
      result: {
        provider: providerName,
        model,
        latency,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('Error in speed test:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}
