# Admin API Routes

## OVERVIEW

Admin API endpoints for D1 tables with full CRUD and batch operations.

## STRUCTURE

```
api/admin/
├── tables/
│ ├── route.ts # List tables with schemas (GET)
│ └── [table]/
│ ├── rows/route.ts # List/create rows (GET, POST)
│ ├── rows/[rowid]/route.ts # Row CRUD (GET, PUT, DELETE)
│ └── batch/route.ts # Batch delete/import (POST)
├── llm-keys/route.ts # LLM key management (GET, POST)
├── llm-keys/[id]/route.ts # Single key operations (GET, PUT, DELETE)
├── github-gists/route.ts # GitHub Gists management (GET, POST)
├── github-gists/[id]/route.ts # Single gist operations (GET, PUT, DELETE)
├── domains/route.ts # Domain CRUD (GET, POST, PUT, DELETE)
├── providers/route.ts # Provider config (GET, POST, PUT, DELETE)
├── providers/[id]/route.ts # Single provider operations (GET, PUT, DELETE)
├── providers/speed-test/route.ts # Provider speed test (POST)
├── providers/models/route.ts # Provider models (GET)
└── providers/models/[provider]/route.ts # Models for specific provider (GET)
```

## WHERE TO LOOK

| Task               | Location           | Notes                                                             |
| ------------------ | ------------------ | ----------------------------------------------------------------- |
| Add table endpoint | `tables/[table]/`  | Use `validateTable()` helper, `escapeColumnName()` for SQL safety |
| Batch operations   | `*/batch/route.ts` | Support JSON/CSV import, batch delete                             |
| LLM key management | `llm-keys/`        | CRUD for LLM API keys in D1                                       |
| GitHub Gists       | `github-gists/`    | GitHub Gists management                                           |
| Domain management  | `domains/`         | Domain CRUD                                                       |
| Provider config    | `providers/`       | Provider CRUD + speed test + models                               |

## CONVENTIONS

- **Dynamic segments**: `[namespace]`, `[key]`, `[table]`, `[rowid]`
- **Context**: `getCloudflareContext()` from `@opennextjs/cloudflare` for Cloudflare bindings (D1)
- **Validation**: `validateTable()` for D1, `escapeColumnName()` prevents SQL injection
- **Pagination**: Default 20-50 items, configurable via `limit`/`page`/`pageSize`
- **Response helpers**: Use `createJsonResponse()`, `createInternalErrorResponse()`, `createNotFoundResponse()`

## ANTI-PATTERNS

- **DO NOT** skip table validation — use `validateTable()` before all D1 operations
- **DO NOT** use raw column names in SQL — always use `escapeColumnName()`
- **DO NOT** skip SSRF validation — all external URLs in api-test must use `validateSafeUrl()`
- **DO NOT** expose secrets — API keys from env vars, never hardcoded
