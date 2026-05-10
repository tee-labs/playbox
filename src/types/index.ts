export * from './protocol';
export type { ProviderConfig, ProtocolType } from './provider';
export * from './request';
export * from './response';

import { ProviderConfig } from './provider';

/**
 * D1 Database binding interface
 */
export interface D1Database {
  prepare: (query: string) => D1Statement;
  /** Cloudflare D1 native batch (sync, accepts D1Statement[]) */
  batch?: (statements: D1Statement[]) => Promise<unknown>;
  /** D1 REST adapter batch (async, accepts string[]) */
  executeBatch?: (sqlStatements: string[]) => Promise<unknown>;
}

export interface D1ResultMeta {
  changes?: number;
  last_row_id?: number;
  /** Duration in nanoseconds */
  duration?: number;
}

export interface D1Statement {
  bind: (...args: unknown[]) => D1Statement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<{ meta: D1ResultMeta }>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
}

/**
 * Environment bindings type
 * In production (CF Workers), this is auto-generated from wrangler.jsonc
 * In Vercel build, we define a minimal interface
 */
export interface Env {
  PLAYBOX_D1?: D1Database;
  AUTH_TOKEN?: string;
  GEMINI_CLI_CLIENT_ID?: string;
  GEMINI_CLI_CLIENT_SECRET?: string;
  GEMINI_CLI_REDIRECT_URI?: string;
  GEMINI_CLI_ACCESS_TOKEN?: string;
  GEMINI_CLI_REFRESH_TOKEN?: string;
  GEMINI_CLI_EXPIRES_AT?: string;
  [key: string]: unknown;
}

export interface Config {
  providers: Record<string, ProviderConfig>;
  default_provider: string;
}

export interface ResolvedProvider {
  name: string;
  provider: ProviderConfig;
  realModel: string;
}