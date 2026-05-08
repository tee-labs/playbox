import type { KVStorage } from '../interface';
import { kv } from '@vercel/kv';

/**
 * Vercel KV adapter using Upstash Redis.
 *
 * Environment variables required (auto-configured when using Vercel KV):
 * - KV_REST_API_URL
 * - KV_REST_API_TOKEN
 * - KV_REST_API_READ_ONLY_TOKEN (optional)
 *
 * Setup: vercel kv create playbox-kv
 */
export class VercelKVAdapter implements KVStorage {
  async get(key: string, options?: { type?: string }): Promise<any> {
    if (options?.type === 'json') {
      return kv.get(key);
    }
    return kv.get(key);
  }

  async put(key: string, value: any, options?: Record<string, any>): Promise<void> {
    if (options?.expirationTtl) {
      // Vercel KV (Upstash) uses seconds for EX, same as Cloudflare KV expirationTtl
      await kv.set(key, value, { ex: options.expirationTtl });
    } else {
      await kv.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await kv.del(key);
  }
}
