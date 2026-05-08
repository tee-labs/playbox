import type { R2Storage } from '../interface';
import { put, head, del, list } from '@vercel/blob';

/**
 * Vercel R2 adapter using Vercel Blob.
 *
 * Environment variables required (auto-configured when using Vercel Blob):
 * - BLOB_READ_WRITE_TOKEN
 *
 * Setup: vercel blob create playbox-r2
 *
 * Note: Vercel Blob uses a flat key-value store (S3-compatible).
 * The `list` method with prefix filtering emulates R2's prefix-based listing.
 */
export class VercelR2Adapter implements R2Storage {
  async put(key: string, body: any, options?: Record<string, any>): Promise<void> {
    await put(key, body, {
      access: 'public',
      ...options,
    });
  }

  async get(key: string): Promise<any> {
    try {
      const blobInfo = await head(key);
      if (!blobInfo) return null;
      // Fetch the actual content
      const response = await fetch(blobInfo.url);
      return response.body;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await del(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const result = await list({
      prefix: prefix || undefined,
    });
    return result.blobs.map((blob) => blob.pathname);
  }
}
