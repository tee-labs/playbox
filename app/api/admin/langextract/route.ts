import { NextRequest } from 'next/server';
import { getTypedContext } from '@/lib/cloudflare-context';
import { createJsonResponse, createInternalErrorResponse } from '@/lib/response-helpers';
import { extract, ExampleData } from 'langextract';
import { getDefaultConfig } from '@/config/default';
import type { ProviderConfig } from '@/types/provider';
import type { D1Database } from '@cloudflare/workers-types';

export const dynamic = 'force-dynamic';

interface ExtractBody {
  text: string;
  promptDescription: string;
  examples?: ExampleData[];
  modelType: 'gemini' | 'openai' | 'ollama';
  provider?: string;
  modelId?: string;
  apiKey?: string;
  temperature?: number;
  extractionPasses?: number;
  maxCharBuffer?: number;
  maxTokens?: number;
  useSchemaConstraints?: boolean;
}

/**
 * Maps model types to their corresponding provider key names used in D1 security_keys table.
 * These key names match the `key` field in default.ts provider configs.
 */
const MODEL_TYPE_TO_PROVIDER_KEY: Record<string, string | undefined> = {
  gemini: 'Gemini',
  openai: 'LongCat',
  ollama: undefined, // Ollama typically uses local mode without API key
};

async function resolveApiKey(db: D1Database | undefined, provider: string | undefined, providedKey?: string): Promise<string | undefined> {
  if (providedKey) return providedKey;

  // provider is the provider key name (e.g., 'LongCat', 'Gemini')
  if (provider) {
    const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    if (envKey) return envKey;
  }

  if (db && provider) {
    try {
      const stored = await db
        .prepare(`SELECT content FROM security_keys WHERE type = 'API_KEY' AND provider = ? LIMIT 1`)
        .bind(provider)
        .first<{ content: string }>();
      if (stored?.content) return stored.content;
    } catch (_e) {
      void _e;
    }
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getTypedContext();
    const db = env.PLAYBOX_D1;

    const config = await getDefaultConfig(env);
    const body = (await request.json()) as ExtractBody;
    const {
      text,
      promptDescription,
      examples = [],
      modelType,
      provider,
      modelId,
      apiKey: providedKey,
      temperature = 0.3,
      extractionPasses = 1,
      maxCharBuffer = 1000,
      maxTokens = 2048,
      useSchemaConstraints = false,
    } = body;

    if (!text || !promptDescription) {
      return createJsonResponse({ success: false, error: 'text and promptDescription are required' }, 400);
    }

    if (!modelType) {
      return createJsonResponse({ success: false, error: 'modelType is required (gemini, openai, or ollama)' }, 400);
    }

    const providerKey = provider || MODEL_TYPE_TO_PROVIDER_KEY[modelType];
    const apiKey = await resolveApiKey(db, providerKey, providedKey);

    const extractOptions: Record<string, unknown> = {
      promptDescription,
      examples,
      modelType,
      temperature,
      extractionPasses,
      maxCharBuffer,
      maxTokens,
      useSchemaConstraints,
      debug: true, // Enable debug logging for better error visibility
    };

    if (apiKey) extractOptions.apiKey = apiKey;
    if (modelId) extractOptions.modelId = modelId;

    if (providerKey) {
      const providerEntry = Object.entries(config.providers).find(([, p]) => (p as ProviderConfig).key === providerKey);
      const providerEndpoint = (providerEntry?.[1] as ProviderConfig | undefined)?.endpoint;

      if (modelType === 'openai' && providerEndpoint) {
        extractOptions.baseURL = providerEndpoint;
      }
      if (modelType === 'ollama' && providerEndpoint) {
        extractOptions.modelUrl = providerEndpoint;
      }
    }

    // Fallback to environment variables if not set from config
    if (modelType === 'ollama' && !extractOptions.modelUrl && process.env.OLLAMA_BASE_URL) {
      extractOptions.modelUrl = process.env.OLLAMA_BASE_URL;
    }
    if (modelType === 'openai' && !extractOptions.baseURL && process.env.OPENAI_BASE_URL) {
      extractOptions.baseURL = process.env.OPENAI_BASE_URL;
    }

    const result = await extract(text, extractOptions);

    const annotated = Array.isArray(result) ? result[0] : result;

    // Check for empty extractions - likely caused by LLM call failure or alignment mismatch
    const extractions = annotated.extractions || [];
    if (extractions.length === 0) {
      return createJsonResponse({
        success: true,
        data: {
          extractions: [],
          text: annotated.text,
          documentId: annotated.documentId,
        },
        warning:
          'No extractions found. This may be caused by: (1) LLM API call failed (wrong endpoint/key/model), (2) extracted text does not match source text exactly, or (3) the model returned malformed output. Check your provider endpoint, API key, and model ID.',
      });
    }

    return createJsonResponse({
      success: true,
      data: {
        extractions: annotated.extractions || [],
        text: annotated.text,
        documentId: annotated.documentId,
      },
    });
  } catch (error) {
    console.error('LangExtract error:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}

export async function GET() {
  try {
    const { env } = getTypedContext();
    const config = await getDefaultConfig(env);

    const openaiProviders = Object.entries(config.providers)
      .filter(([, p]) => (p as ProviderConfig).type === 'openai')
      .map(([name, p]) => {
        const pc = p as ProviderConfig;
        return {
          type: 'openai' as const,
          label: name,
          defaultModel: pc.models?.[0] || 'minimax-m2.7',
          key: pc.key,
        };
      });

    const supportedProviders = [
      ...openaiProviders,
      {
        type: 'gemini',
        label: 'Google Gemini',
        defaultModel: 'gemini-2.5-flash',
        key: 'Gemini',
      },
      {
        type: 'ollama',
        label: 'Ollama (Local)',
        defaultModel: 'llama3.2',
        key: null,
      },
    ];

    return createJsonResponse({
      success: true,
      data: { supportedProviders },
    });
  } catch (error) {
    return createInternalErrorResponse((error as Error).message);
  }
}
