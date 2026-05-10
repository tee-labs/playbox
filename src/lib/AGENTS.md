# Core Libraries

**Location:** `src/lib/`

## OVERVIEW

Core library functions for authentication, middleware, and response helpers. Provides reusable utilities for API routes
and protocol adapters.

## STRUCTURE

```
lib/
├── auth.ts # API key verification
├── middleware.ts # Route middleware (auth, CORS, error handling)
├── response-helpers.ts # JSON/error response builders
└── cloudflare-context.ts # CF context type utilities (createCloudflareContext, getTypedContext)
```

## WHERE TO LOOK

| Task              | Location                | Notes                                                          |
| ----------------- | ----------------------- | -------------------------------------------------------------- |
| API key auth      | `auth.ts`               | `authenticate()` function                                      |
| Route wrappers    | `middleware.ts`         | `withAuthentication`, `withCorsPreflight`, `withErrorHandling` |
| Response builders | `response-helpers.ts`   | `createJsonResponse`, `createUnauthorizedResponse`, etc.       |
| CF context types  | `cloudflare-context.ts` | `createCloudflareContext()`, `getTypedContext()` for bindings  |

## CONVENTIONS

- **Middleware pattern**: Higher-order functions wrap handlers
- **3 middleware helpers**: `withAuthentication`, `withCorsPreflight`, `withErrorHandling`
- **Unified error format**: `{ error: string, message: string, type: string }`

## ANTI-PATTERNS

- **DO NOT** duplicate auth logic — use `authenticate()` or `withAuthentication`
- **DO NOT** skip CORS headers — use response helpers
- **DO NOT** create ad-hoc error responses — use `createInternalErrorResponse`

## NOTES

- **Auth check**: Compares `Authorization` (Bearer), `x-api-key`, `x-goog-api-key` headers, and `?key` query param
  against `AUTH_TOKEN` env var
- **CORS preflight**: Returns 204 for OPTIONS requests
- **Error format**: Consistent `{ error, message, type }` structure
