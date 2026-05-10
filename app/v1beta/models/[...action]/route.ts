import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createUnauthorizedResponse, createJsonResponse } from '@/lib/response-helpers';
import { getConfig, resolveProvider } from '@/config';
import { ProtocolFactory } from '@/protocols';
import { getPlatformDb } from '@/platforms';
import { CORS_HEADERS } from '@/utils/constants';
import { createLogger } from '@/utils/logger';

export const dynamic = 'force-dynamic';

interface GeminiSafetySetting {
  category: string;
  threshold: string;
}

interface GeminiGenerateRequest {
  model?: string;
  contents: unknown[];
  system_instruction?: unknown;
  generationConfig?: unknown;
  safetySettings?: GeminiSafetySetting[];
  tools?: unknown[];
  toolConfig?: unknown;
}

/**
 * Parse the action segment to extract model name and action.
 * Supports both standard Google format and alternative format:
 * - Standard: "gemini-2.5-flash:generateContent" or "gemini-2.5-flash:streamGenerateContent"
 * - Alternative: "gemini-2.5-flash/generateContent" (fallback if URL encoding fails)
 */
function parseActionSegment(actionSegment: string): { model: string; action: string } {
  // Try colon format first (standard Google API)
  if (actionSegment.includes(':')) {
    const colonIndex = actionSegment.lastIndexOf(':');
    const model = actionSegment.slice(0, colonIndex);
    const action = actionSegment.slice(colonIndex + 1);
    return { model, action };
  }

  // Fallback: try slash format
  if (actionSegment.includes('/')) {
    const parts = actionSegment.split('/');
    const action = parts.pop() || '';
    const model = parts.join('/');
    return { model, action };
  }

  // No separator found - assume entire segment is model with default action
  return { model: actionSegment, action: 'generateContent' };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string[] }> }) {
  const logger = createLogger();

  const authResult = await authenticate(request);
  if (!authResult) {
    return createUnauthorizedResponse();
  }

  const url = new URL(request.url);
  const debugParam = url.searchParams.get('debug');
  const debugHeader = request.headers.get('x-debug');
  const isDebug = debugParam === 'true' || debugParam === '1' || debugHeader === 'true' || debugHeader === '1';

  try {
    const { action: actionSegments } = await params;

    // Join all segments to get the full action path
    // e.g., ["gemini-2.5-flash:generateContent"] or ["gemini-2.5-flash", "generateContent"]
    const fullActionPath = actionSegments.join('/');

    // Parse model and action from the path
    const { model: pathModel, action } = parseActionSegment(fullActionPath);

    // Validate action
    const validActions = ['generateContent', 'streamGenerateContent'];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({
          error: {
            message: `Invalid action: ${action}. Supported actions: ${validActions.join(', ')}`,
            type: 'invalid_action',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    const rawBody = (await request.json()) as GeminiGenerateRequest;

    // Model from URL path takes precedence, then body, then default
    const requestedModel = pathModel || rawBody.model || 'gemini-2.5-flash';
    const isStream = action === 'streamGenerateContent' || url.searchParams.get('alt') === 'sse';

    const config = await getConfig();
    const { name: providerName, provider, realModel } = resolveProvider(config, requestedModel, 'gemini');

    if (!provider) {
      throw new Error(`No provider found for model: ${requestedModel}`);
    }

    if (provider.family !== 'gemini') {
      throw new Error(`Gemini endpoint only supports 'gemini' family providers. Got: ${provider.family} (provider: ${providerName})`);
    }

    logger.info('Gemini request routed', { model: requestedModel, realModel, isStream, providerName, providerType: provider.type, action });

    const protocol = ProtocolFactory.get(provider.type);

    const geminiRequest: Record<string, unknown> = {
      contents: rawBody.contents,
      system_instruction: rawBody.system_instruction,
      generationConfig: rawBody.generationConfig,
      safetySettings: rawBody.safetySettings || [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    };

    if (rawBody.tools) geminiRequest.tools = rawBody.tools;
    if (rawBody.toolConfig) geminiRequest.toolConfig = rawBody.toolConfig;

    const db = getPlatformDb();
    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const MAX_ATTEMPTS = protocol.getAttempt();
    let lastResponse: Response | undefined;

    let fetchUrl = '';
    let fetchHeaders: Record<string, string> = {};

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const apiKeyValue = await protocol.getApiKey(db, provider);
      fetchUrl = await protocol.getEndpoint(provider, realModel, isStream, apiKeyValue);
      fetchHeaders = await protocol.getHeaders(provider, db, apiKeyValue);

      const requestBody = geminiRequest;

      lastResponse = await fetch(fetchUrl, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify(requestBody),
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

    if (isDebug && lastResponse) {
      const responseHeaders: Record<string, string> = {};
      lastResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: unknown;
      const contentType = lastResponse.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        responseBody = await lastResponse.json();
      } else {
        responseBody = await lastResponse.text();
      }

      const debugResponse = {
        debug: true,
        upstream: {
          status: lastResponse.status,
          statusText: lastResponse.statusText,
          headers: responseHeaders,
          url: fetchUrl,
          request: geminiRequest,
          body: responseBody,
        },
        provider: { name: providerName, type: provider.type },
        model: requestedModel,
        realModel,
        action,
      };

      return new Response(JSON.stringify(debugResponse, null, 2), {
        headers: { ...resHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (isStream && lastResponse?.body) {
      const stream = lastResponse.body;

      return new Response(stream, { headers: { ...resHeaders, 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
    }

    if (lastResponse) {
      const responseJson = await lastResponse.json();

      return new Response(JSON.stringify(responseJson), { headers: resHeaders });
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

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
