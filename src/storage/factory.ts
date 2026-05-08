import type { KVStorage, D1Storage, R2Storage } from './interface';
import { CloudflareKVAdapter, CloudflareD1Adapter, CloudflareR2Adapter } from './cloudflare';
import { VercelKVAdapter, VercelD1Adapter, VercelR2Adapter } from './vercel';

export interface StorageAdapters {
  kv: KVStorage;
  d1: D1Storage;
  r2: R2Storage;
}

export function createStorageAdapters(env: any): StorageAdapters {
  // Detect platform based on available Cloudflare bindings
  if (env.PLAYBOX_KV && env.PLAYBOX_D1 && env.PLAYBOX_R2) {
    // Cloudflare Workers environment
    return {
      kv: new CloudflareKVAdapter(env),
      d1: new CloudflareD1Adapter(env),
      r2: new CloudflareR2Adapter(env),
    };
  } else {
    // Vercel environment - adapters connect via environment variables:
    // KV: KV_REST_API_URL + KV_REST_API_TOKEN
    // D1: POSTGRES_URL
    // R2: BLOB_READ_WRITE_TOKEN
    return {
      kv: new VercelKVAdapter(),
      d1: new VercelD1Adapter(),
      r2: new VercelR2Adapter(),
    };
  }
}
