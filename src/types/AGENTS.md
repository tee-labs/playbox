# Type Definitions

**Location:** `src/types/`

## OVERVIEW

TypeScript type definitions for protocols, requests, responses, and shared interfaces. Barrel-exported for clean
imports.

## STRUCTURE

```
types/
├── index.ts # Barrel exports + Env, Config, ResolvedProvider
├── protocol.ts # ProtocolAdapter interface
├── provider.ts # ProviderConfig interface
├── kv.ts # KV-related types
├── request.ts # Request type definitions
└── response.ts # Response type definitions
```

## WHERE TO LOOK

| Task                  | Location                             | Notes                                           |
| --------------------- | ------------------------------------ | ----------------------------------------------- |
| Add new type          | Create file + export from `index.ts` | Follow barrel pattern                           |
| Protocol types        | `protocol.ts`                        | `ProtocolAdapter`, message types                |
| Provider config types | `provider.ts`                        | `ProviderConfig`, provider options              |
| Request types         | `request.ts`                         | Chat request, messages request                  |
| Response types        | `response.ts`                        | Standard response format                        |
| Env type              | `index.ts`                           | Auto-generated from `worker-configuration.d.ts` |

## CONVENTIONS

- **Auto-generated**: `Env` type from `wrangler.jsonc` via `cf-typegen`

## ANTI-PATTERNS

- **DO NOT** use `any` — define proper types
- **DO NOT** duplicate types across files
- **DO NOT** modify `worker-configuration.d.ts` — run `npm run cf-typegen`

## NOTES

- **Import pattern**: `import { SomeType } from '@/types'`
- **Env bindings**: PLAYBOX_D1, AUTH_TOKEN, GEMINI_CLI_*
