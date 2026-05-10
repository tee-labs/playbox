/**
 * Platform abstraction layer implementation
 *
 * Provides a unified interface for accessing platform resources
 * across different deployment targets.
 *
 * Usage:
 *   import { getPlatformDb } from '@/platforms';
 *   const db = getPlatformDb();
 */

import { createSqlClient } from '../db/factory';
import { d1RestAdapter } from '../db/index';
import type { PlatformContext, PlatformEnv, PlatformType } from './types';

// Module-level singleton
let _context: PlatformContext | null = null;
let _platformDetected: PlatformType | null = null;

/**
 * Detect current platform type
 */
function detectPlatform(): PlatformType {
  // Check Cloudflare Workers
  const globalAny = globalThis as Record<string, unknown>;
  if (globalAny.__ENV !== undefined || process.env.CF_PAGES === 'true') {
    return 'cloudflare';
  }

  // Check Vercel
  if (process.env.VERCEL === 'true' || process.env.VERCEL_ENV) {
    return 'vercel';
  }

  // Check Node.js
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'nodejs';
  }

  return 'other';
}

/**
 * Create Cloudflare platform context
 * Uses getCloudflareContext() from @opennextjs/cloudflare
 */
function createCloudflareContext(): PlatformContext {
  // Lazy import to avoid issues on non-CF platforms
  let getCloudflareContext: () => { env: unknown; ctx: unknown };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@opennextjs/cloudflare');
    getCloudflareContext = module.getCloudflareContext;
  } catch {
    // Not on Cloudflare, will fall through to mock context
    return createMockContext();
  }

  return {
    getDatabase: () => {
      try {
        console.log('[Cloudflare] Attempting to get D1 database...');
        const raw = getCloudflareContext();
        console.log('[Cloudflare] getCloudflareContext succeeded');
        const env = raw.env as { PLAYBOX_D1?: unknown };
        console.log('[Cloudflare] env keys:', Object.keys(env));
        if (!env.PLAYBOX_D1) {
          console.log('[Cloudflare] PLAYBOX_D1 not found in env');
          return null;
        }
        console.log('[Cloudflare] PLAYBOX_D1 found, creating client');
        return createSqlClient({ d1: env.PLAYBOX_D1 as Parameters<typeof createSqlClient>[0]['d1'] });
      } catch (error) {
        console.error('[Cloudflare] Failed to get database:', error);
        return null;
      }
    },

    getPlatformType: () => 'cloudflare',

    isPlatform: (platform: PlatformType) => platform === 'cloudflare',

    getEnv: () => {
      try {
        const raw = getCloudflareContext();
        const env = raw.env as { PLAYBOX_D1?: unknown; AUTH_TOKEN?: string };
        return {
          platformType: 'cloudflare' as PlatformType,
          primaryDb: env.PLAYBOX_D1
            ? createSqlClient({ d1: env.PLAYBOX_D1 as Parameters<typeof createSqlClient>[0]['d1'] })
            : null,
          authToken: env.AUTH_TOKEN,
        };
      } catch {
        return { platformType: 'cloudflare', primaryDb: null };
      }
    },

    getExecutionContext: () => {
      try {
        const raw = getCloudflareContext();
        return raw.ctx as { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void } | undefined;
      } catch {
        return undefined;
      }
    },
  };
}

/**
 * Create Vercel platform context
 * Uses D1 REST API via Cloudflare credentials
 */
function createVercelContext(): PlatformContext {
  // Read D1 REST API configuration from environment variables
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  // Check if all required environment variables are present
  const hasD1Config = accountId && databaseId && apiToken;

  return {
    getDatabase: () => {
      if (!hasD1Config) {
        console.warn(
          '[Vercel] D1 REST API not configured. ' +
            'Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, and CLOUDFLARE_API_TOKEN environment variables.'
        );
        return null;
      }

      try {
        return d1RestAdapter({
          accountId: accountId!,
          databaseId: databaseId!,
          apiToken: apiToken!,
        });
      } catch (error) {
        console.warn('[Vercel] Failed to create D1 REST client:', error);
        return null;
      }
    },

    getPlatformType: () => 'vercel',

    isPlatform: (platform: PlatformType) => platform === 'vercel',

    getEnv: (): PlatformEnv => ({
      platformType: 'vercel',
      primaryDb: hasD1Config
        ? d1RestAdapter({
            accountId: accountId!,
            databaseId: databaseId!,
            apiToken: apiToken!,
          })
        : null,
      authToken: process.env.AUTH_TOKEN,
    }),
  };
}

/**
 * Create a mock context for Node.js / local development
 */
function createMockContext(): PlatformContext {
  return {
    getDatabase: () => null,

    getPlatformType: () => 'nodejs',

    isPlatform: (platform: PlatformType) => platform === 'nodejs',

    getEnv: (): PlatformEnv => ({
      platformType: 'nodejs',
      primaryDb: null,
      authToken: process.env.AUTH_TOKEN,
    }),
  };
}

/**
 * Initialize platform context based on detected platform
 */
function initPlatformContext(): PlatformContext {
  const platform = detectPlatform();
  _platformDetected = platform;

  switch (platform) {
    case 'cloudflare':
      return createCloudflareContext();
    case 'vercel':
      return createVercelContext();
    default:
      return createMockContext();
  }
}

/**
 * Get or create the platform context singleton
 */
function getContext(): PlatformContext {
  if (!_context) {
    _context = initPlatformContext();
  }
  return _context;
}

/**
 * Get the primary database client
 * Returns null if no database is available
 *
 * Usage:
 *   const db = getPlatformDb();
 *   if (!db) throw new Error('Database not available');
 *   const { results } = await db.prepare('SELECT * FROM users').all();
 */
export function getPlatformDb(): import('../db/types').SqlClient | null {
  return getContext().getDatabase();
}

/**
 * Get the current platform type
 */
export function getPlatformType(): PlatformType {
  if (_platformDetected) return _platformDetected;
  return getContext().getPlatformType();
}

/**
 * Check if running on a specific platform
 */
export function isPlatform(platform: PlatformType): boolean {
  return getContext().isPlatform(platform);
}

/**
 * Get the platform environment
 */
export function getPlatformEnv(): PlatformEnv {
  return getContext().getEnv();
}

/**
 * Get the full platform context
 */
export function getPlatformContext(): PlatformContext {
  return getContext();
}

/**
 * Reset platform context (for testing)
 */
export function resetPlatformContext(): void {
  _context = null;
  _platformDetected = null;
}

/**
 * Set custom platform context (for testing)
 */
export function setPlatformContext(context: PlatformContext): void {
  _context = context;
}

// Re-export types
export type { PlatformContext, PlatformEnv, PlatformType } from './types';