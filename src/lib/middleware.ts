import type { Env } from '@/types';
import type { ExecutionContext } from '@/protocols/types';
import type { CloudflareContext } from './cloudflare-context';
import { createUnauthorizedResponse } from './response-helpers';

interface AuthContext {
  cloudflare?: CloudflareContext;
  env?: Env;
  executionCtx?: ExecutionContext;
}

export function withAuthentication<T>(handler: (request: Request, context: T) => Promise<Response>) {
  return async (request: Request, context: T & AuthContext): Promise<Response> => {
    const cfContext = context as AuthContext;
    const env = cfContext.cloudflare?.env || context.env;
    const executionCtx = cfContext.cloudflare?.executionCtx || context.executionCtx;

    const apiKey = request.headers.get('x-api-key') || request.headers.get('Authorization')?.replace('Bearer ', '');
    const expectedKey = (env as unknown as Record<string, string | undefined>)?.AUTH_TOKEN;

    if (!apiKey || apiKey !== expectedKey) {
      return createUnauthorizedResponse();
    }

    return handler(request, {
      ...context,
      env,
      executionCtx,
      cloudflare: { env, executionCtx } as CloudflareContext,
    });
  };
}

export function withCorsPreflight(handler: (request: Request) => Response) {
  return (request: Request): Response => {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
        },
      });
    }
    return handler(request);
  };
}

export function withErrorHandling<T>(handler: (request: Request, context: T) => Promise<Response>) {
  return async (request: Request, context: T): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('Unhandled error:', error);

      return new Response(
        JSON.stringify({
          error: {
            message: 'Internal Server Error',
            type: 'internal_error',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
