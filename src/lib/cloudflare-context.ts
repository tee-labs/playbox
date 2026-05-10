import { getCloudflareContext as getRawContext } from '@opennextjs/cloudflare';
import type { Env } from '../types';
import type { ExecutionContext } from '../protocols/types';

export function createCloudflareContext(executionCtx: ExecutionContext, env: Env) {
  return {
    get env() {
      return env;
    },

    get executionCtx() {
      return executionCtx;
    },

    getBinding<T>(name: string): T | undefined {
      return (env as unknown as Record<string, unknown>)[name] as T | undefined;
    },
  };
}

export interface CloudflareContext {
  env: Env;
  executionCtx: ExecutionContext;
}

/** Typed result from getCloudflareContext(). */
export interface TypedContext {
  env: Env;
  ctx: ExecutionContext;
}

/**
 * Typed wrapper around getCloudflareContext().
 * Returns properly typed env and ctx for use in API routes.
 */
export function getTypedContext(): TypedContext {
  const raw = getRawContext();
  return {
    env: raw.env as unknown as Env,
    ctx: raw.ctx as ExecutionContext,
  };
}
