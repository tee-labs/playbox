/**
 * Authentication middleware utilities
 * Provides API key verification and unauthorized response creation
 */

import { CORS_HEADERS } from '../utils/constants';
import { getPlatformDb } from '../platforms';
import { createSqlClient } from '../db/factory';
import type { Env } from '../types';

export interface ApiKeyRecord {
  id: string;
  api_key: string;
  name: string;
  expires_at: string | null;
  created_at: string;
  is_active: number;
  last_used_at: string | null;
}

export function extractApiKey(request: Request): string | null {
  return (
    request.headers.get('x-goog-api-key') ||
    request.headers.get('x-api-key') ||
    request.headers.get('Authorization')?.replace('Bearer ', '') ||
    null
  );
}

/**
 * Authenticate a request using API key from headers
 *
 * Uses platform abstraction to access database, supporting both
 * Cloudflare (env.PLAYBOX_D1) and future platforms (Vercel, etc.)
 *
 * @param request - The incoming request
 * @param env - Optional Cloudflare env (for backward compatibility)
 * @returns true if valid, false otherwise
 */
export async function authenticate(request: Request, env?: Env): Promise<boolean> {
  const apiKey = extractApiKey(request);
  if (!apiKey) return false;

  // Try platform abstraction first, fall back to env if provided
  let db = getPlatformDb();

  if (!db && env) {
    // Backward compatibility: use env.PLAYBOX_D1 directly
    // Use unknown cast to avoid type conflicts with Env definition
    const d1 = (env as unknown as { PLAYBOX_D1?: unknown }).PLAYBOX_D1;
    if (d1) {
      db = createSqlClient({ d1: d1 as Parameters<typeof createSqlClient>[0]['d1'] });
    }
  }

  if (!db) return false;

  const result = await db.prepare('SELECT * FROM llm_api_keys WHERE api_key = ? AND is_active = 1').bind(apiKey).first();

  if (!result || !result.results) return false;

  const record = result.results as unknown as ApiKeyRecord;

  if (record.expires_at) {
    const now = new Date().toISOString();
    if (now > record.expires_at) return false;
  }

  await db.prepare('UPDATE llm_api_keys SET last_used_at = datetime("now") WHERE id = ?').bind(record.id).run();

  return true;
}

export function createUnauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: {
        message: 'Incorrect API key provided.',
        type: 'invalid_request_error',
      },
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    }
  );
}
