# Managers

**Location:** `src/managers/`

## OVERVIEW

Core business logic for authentication and API key management. Handles request verification, token refresh, key
rotation, and D1 storage.

## STRUCTURE

```
managers/
├── auth.ts # AuthManager: request verification (Bearer, x-api-key, x-goog-api-key, ?key query param)
└── key.ts # KeyManager: token refresh, D1 operations, OAuth credential rotation
```

## WHERE TO LOOK

| Task              | Location  | Notes                                                 |
| ----------------- | --------- | ----------------------------------------------------- |
| Request auth      | `auth.ts` | `AuthManager.verify(request, env)` — 4 auth methods   |
| Token refresh     | `key.ts`  | `KeyManager.getValidAccessToken()` — auto-refresh     |
| API key rotation  | `key.ts`  | `KeyManager.getRandomApiKey()` — random from 100      |
| OAuth credentials | `key.ts`  | `KeyManager.getRandomOAuthCredentials()` — OAuth keys |
| D1 key queries    | `key.ts`  | `security_keys` table (API_KEY + EMAIL types)         |

## CONVENTIONS

- **Exported objects**: `KeyManager` and `AuthManager` objects with async methods
- **D1 storage**: API keys stored in D1 `security_keys` table
- **Gemini OAuth**: Automatic token refresh with Next.js unstable_cache
- **Random key selection**: `getRandomApiKey()` fetches 100 keys, picks random one

## ANTI-PATTERNS

- **DO NOT** return expired tokens — always check `expiresAt` with 60s buffer
- **DO NOT** store keys in code — use D1 only

## NOTES

- **Key cache TTL**: 300s (5 minutes)
- **Token cache TTL**: 3500s (~58 minutes)
- **Key batch size**: 100 keys fetched for random selection
