import { beforeAll, afterEach, afterAll } from 'vitest';
import { vi } from 'vitest';

// Mock next/cache so unstable_cache works in tests
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn: (...args: unknown[]) => unknown, _tags: string[], _opts: object) => {
    const cache = new Map<string, unknown>();
    return (...args: unknown[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.then((v) => {
          cache.set(key, v);
          return v;
        });
      }
      cache.set(key, result);
      return result;
    };
  }),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Mock getCloudflareContext globally for unstable_cache support
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({
    env: {
      PLAYBOX_D1: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      },
    },
  })),
}));

const mockFetch = vi.fn(async (url: string | Request | URL, init?: RequestInit) => {
  const requestUrl = typeof url === 'string' ? new URL(url) : url instanceof URL ? url : new URL((url as Request).url);

  if (requestUrl.hostname === 'oauth2.googleapis.com' && requestUrl.pathname === '/token') {
    return new Response(
      JSON.stringify({
        access_token: 'mock-refreshed-token',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (requestUrl.hostname.includes('openai.com')) {
    return new Response(
      JSON.stringify({
        id: 'chatcmpl-mock',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Mock OpenAI response' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (requestUrl.hostname.includes('anthropic.com')) {
    return new Response(
      JSON.stringify({
        id: 'msg_mock',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Mock Anthropic response' }],
        model: 'claude-3-haiku',
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

beforeAll(async () => {
  global.fetch = mockFetch;

  if (!globalThis.env) {
    globalThis.env = {} as any;
  }

  if (!globalThis.env.PLAYBOX_KV) {
    globalThis.env.PLAYBOX_KV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as any;
  }

  if (!globalThis.env.PLAYBOX_D1) {
    globalThis.env.PLAYBOX_D1 = {
      prepare: vi.fn(),
      batch: vi.fn(),
      dump: vi.fn(),
      exec: vi.fn(),
    } as any;
  }
});

afterEach(async () => {
  vi.clearAllMocks();
});

afterAll(async () => {
  vi.restoreAllMocks();
});

export {};
