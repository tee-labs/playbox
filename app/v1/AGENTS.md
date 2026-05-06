# Public API Routes (V1)

**Location:** `app/v1/`

## OVERVIEW

Public API endpoints for AI provider protocol conversion. **Non-standard location** — NOT under `app/api/` as typical
Next.js convention.

## STRUCTURE

```
v1/
├── chat/completions/  # OpenAI-compatible chat completions (POST)
├── embeddings/        # OpenAI-compatible embeddings API (POST)
├── messages/          # Anthropic-compatible messages API (POST)
└── models/            # Model listing endpoint (GET)
```

## WHERE TO LOOK

| Task                    | Location                    | Notes                                |
| ----------------------- | --------------------------- | ------------------------------------ |
| Add chat endpoint       | `chat/completions/route.ts` | OpenAI format                        |
| Add embeddings endpoint | `embeddings/route.ts`       | OpenAI format, pass-through          |
| Add messages endpoint   | `messages/route.ts`         | Anthropic format                     |
| List models             | `models/route.ts`           | Returns available models from config |

## CONVENTIONS

- **Location**: `app/v1/` (NOT `app/api/v1/`) — intentional non-standard
- **Dynamic**: `export const dynamic = 'force-dynamic'`
- **Auth**: `authenticate()` from `@/lib/auth`
- **Protocols**: Use `ProtocolFactory.get(type)` from `@/protocols`
- **Config**: `getConfig()` and `resolveProvider()` from `@/config`

## ANTI-PATTERNS

- **DO NOT** place public routes under `app/api/` — use `app/v1/`
- **DO NOT** skip auth check — all routes require `x-api-key` header
- **DO NOT** forget CORS headers — use `CORS_HEADERS` from `@/utils/constants`

## NOTES

- **Endpoints**: POST `/v1/chat/completions`, POST `/v1/embeddings`, POST `/v1/messages`, GET `/v1/models`
- **Model separation**: `/v1/models` excludes Gemini models (use `/v1beta/models` for Gemini)
- **Protocol conversion**: OpenAI ↔ Anthropic ↔ Google ↔ Gemini CLI
- **Streaming**: All endpoints support SSE streaming responses
