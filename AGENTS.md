# PROJECT KNOWLEDGE BASE

**Stack:** Next.js 15 + TypeScript + Vitest + Wrangler + Ant Design + Recharts **Generated:** 2026-05-10 | **Commit:**
8907e53 (main)

## OVERVIEW

AI API Gateway & Protocol Converter — converts between AI provider protocols (OpenAI, Anthropic, Google, Gemini CLI) on
Next.js with Cloudflare Workers deployment. Multi-protocol support with OAuth token management, D1 key storage, and
multi-platform database abstraction (D1 + D1 REST API for Vercel).

## STRUCTURE

```
./
├── app/ # Next.js App Router
│ ├── v1/ # Public API (non-standard location - NOT under app/api/) — [AGENTS.md]
│ │ ├── chat/completions/ # OpenAI-compatible chat completions
│ │ ├── embeddings/ # OpenAI-compatible embeddings API
│ │ ├── rerank/ # Rerank API
│ │ ├── models/ # Model listing endpoint (excludes Gemini)
│ │ └── messages/ # Anthropic-compatible messages API
│ ├── v1beta/ # Gemini native API endpoints (Google standard paths) — [AGENTS.md]
│ │ └── models/ # Gemini API: models listing + generateContent/streamGenerateContent
│ │ ├── route.ts # GET - List models
│ │ └── [...action]/ # POST - generateContent/streamGenerateContent
│ ├── api/
│ │ └── admin/ # Admin API endpoints — [AGENTS.md]
│ │ ├── tables/ # D1 table CRUD (with batch/rows)
│ │ ├── llm-keys/ # LLM API key management
│ │ ├── github-gists/ # GitHub Gists management
│ │ ├── domains/ # Domain management
│ │ └── providers/ # Provider config + speed test + models
│ ├── admin/ # Admin UI (React + Ant Design) — [AGENTS.md]
│ │ ├── llm-keys/ # LLM key management UI
│ │ ├── github-gists/ # GitHub Gists management UI
│ │ ├── providers/ # Provider configuration UI
│ │ ├── domains/ # Domain management UI
│ │ ├── components/ # Shared admin components — [AGENTS.md]
│ │ └── types/ # Shared admin types
│ ├── components/ # React components — [AGENTS.md]
│ └── lib/ # Client-side utilities
├── src/
│ ├── db/ # Database abstraction (SqlClient interface) — [AGENTS.md]
│ ├── protocols/ # Protocol adapters (OpenAI, Anthropic, Google, Gemini CLI) — [AGENTS.md]
│ ├── managers/ # AuthManager + KeyManager (auth + D1 token management) — [AGENTS.md]
│ ├── platforms/ # Platform detection + DB access (CF/Vercel/Node) — [AGENTS.md]
│ ├── config/ # ConfigManager, provider configs — [AGENTS.md]
│ ├── utils/ # Logger, CORS constants, SSRF protection — [AGENTS.md]
│ ├── lib/ # Auth middleware, response helpers — [AGENTS.md]
│ └── types/ # Protocol, request, response types — [AGENTS.md]
├── test/ # Vitest + Cloudflare Workers pool — [AGENTS.md]
│ ├── unit/ # Protocol + manager + lib + config + utils + db + platforms tests
│ ├── e2e/ # End-to-end admin tests
│ └── factories/ # Mock data generators
├── prisma/migrations/ # D1 schema migrations (6 tables)
├── scripts/ # Utility scripts (smoke-test.mjs)
├── wrangler.jsonc # Cloudflare Workers config (D1, KV, secrets)
└── vitest.config.mts # Test config with CF pool
```

## WHERE TO LOOK

| Task                          | Location                          | Notes                                                                                      |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| Add new protocol adapter      | `src/protocols/`                  | Implement `ProtocolAdapter` interface, export factory                                      |
| Add new public API route      | `app/v1/`                         | Non-standard: v1 routes are NOT under `app/api/`                                           |
| Add Gemini native route       | `app/v1beta/`                     | Gemini native format endpoints (standard Google REST paths)                                |
| Add Gemini content generation | `app/v1beta/models/[...action]/`  | Catch-all for :generateContent/:streamGenerateContent                                      |
| Add admin API endpoint        | `app/api/admin/`                  | Follow existing CRUD patterns                                                              |
| Modify auth logic             | `src/lib/auth.ts`                 | `authenticate()` function                                                                  |
| Add provider config           | `src/config/default.ts`           | Add to `providers` object                                                                  |
| Type definitions              | `src/types/`                      | All types in barrel export                                                                 |
| Public API endpoints          | `app/v1/`                         | Chat completions, models, messages, embeddings, rerank                                     |
| Gemini native endpoints       | `app/v1beta/`                     | Standard Google Gemini REST paths (`models/{model}:generateContent`)                       |
| Admin UI pages                | `app/admin/`                      | React + Ant Design components                                                              |
| D1 binding                    | `wrangler.jsonc`                  | PLAYBOX_D1                                                                                 |
| Database abstraction          | `src/db/`                         | SqlClient interface, D1Adapter, D1RestAdapter                                              |
| Test factories                | `test/factories/`                 | Mock env, requests, providers                                                              |
| LLM key management            | `app/api/admin/llm-keys/`         | CRUD for LLM API keys                                                                      |
| LLM key UI                    | `app/admin/llm-keys/`             | Key management interface                                                                   |
| Provider config API           | `app/api/admin/providers/`        | Provider CRUD + speed test + models                                                        |
| Provider config UI            | `app/admin/providers/`            | Provider configuration                                                                     |
| Domain management             | `app/api/admin/domains/`          | Domain CRUD                                                                                |
| Domain UI                     | `app/admin/domains/`              | Domain management                                                                          |
| API test history              | `app/api/admin/api-test/history/` | Test execution history                                                                     |
| D1 schema                     | `prisma/migrations/`              | 6 tables: llm_api_keys, security_keys, providers, domains, email_history, download_history |
| GitHub Gists API              | `app/api/admin/github-gists/`     | GitHub Gists management                                                                    |
| GitHub Gists UI               | `app/admin/github-gists/`         | Gists management interface                                                                 |
| Shared admin components       | `app/admin/components/`           | DataTable, SearchBar, Create/Edit/Import modals, ReferralBadge                             |

## CODE MAP

| Symbol            | Type      | Location                 | Role                              |
| ----------------- | --------- | ------------------------ | --------------------------------- |
| `ProtocolFactory` | class     | `src/protocols/index.ts` | Protocol adapter factory          |
| `KeyManager`      | object    | `src/managers/key.ts`    | Token refresh, API key management |
| `ConfigManager`   | object    | `src/config/index.ts`    | Config resolution                 |
| `authenticate`    | function  | `src/lib/auth.ts`        | API key verification              |
| `CORS_HEADERS`    | const     | `src/utils/constants.ts` | CORS header map                   |
| `createSqlClient` | function  | `src/db/factory.ts`      | SqlClient factory (D1/D1REST)     |
| `SqlClient`       | interface | `src/db/types.ts`        | Database abstraction interface    |

## CONVENTIONS

- **Barrel exports**: Every subdirectory has `index.ts` for clean imports
- **Protocol pattern**: Each protocol adapter exports `createXProtocol()` factory function
- **Next.js App Router**: Routes use file-based routing with `route.ts`
- **Type-first**: All types in `src/types/`, imported via barrel exports
- **Response helpers**: Use `createXResponse()` functions from `lib/response-helpers.ts`
- **Middleware pattern**: Higher-order functions for auth, CORS, error handling
- **Prettier**: `.prettierrc` — 140 char width, single quotes, 2-space tabs, LF endings
- **EditorConfig**: `.editorconfig` — tab for all except YAML (space), trim trailing whitespace

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT** use `src/index.ts` — that's a simple example, unused in Next.js version
- **DO NOT** put public API routes under `app/api/` — they belong in `app/v1/`
- **DO NOT** hardcode API keys — use `wrangler.jsonc` vars or secrets
- **DO NOT** skip token caching — Gemini CLI tokens must be cached in KV with TTL
- **DO NOT** modify `worker-configuration.d.ts` manually — run `npm run cf-typegen`
- **DO NOT** skip SSRF validation — all external URLs must use `validateSafeUrl()`
- **DO NOT** create inline mock objects in tests — use factories from `test/factories/`
- **DO NOT** expose secrets in `wrangler.jsonc` — use `wrangler secret put` for sensitive values
- **DO NOT** use server components in admin UI — requires `'use client'` directive
- **DO NOT** forget CORS headers — use response helpers or spread `CORS_HEADERS`
- **DO NOT** skip table validation — use `validateTable()` before all D1 operations
- **DO NOT** use raw column names in SQL — always use `escapeColumnName()`

## DESIGN SYSTEM

**Full spec:** [`DESIGN.md`](./DESIGN.md) — the single source of truth for all visual design tokens and UI patterns.
**Read it before writing any UI code.**

### Core Principles

- **Flat design** — no `box-shadow` anywhere. Use borders (`1px solid #f0f0f0`) and background contrast for hierarchy.
- **Information-dense** — prioritize data density and scan speed over decorative aesthetics.
- **Ant Design defaults** — use Ant Design components as-is, override only via `ConfigProvider` tokens in
  `app/admin/layout.tsx`.
- **Light-only** — no dark mode variants.

### Color Tokens (quick reference)

| Token            | Hex       | Use                                     |
| ---------------- | --------- | --------------------------------------- |
| `primary`        | `#1890ff` | Buttons, links, active states, icons    |
| `on-surface`     | `#0f172a` | Primary text, headings                  |
| `text-secondary` | `#666666` | Muted body text, secondary labels       |
| `border`         | `#f0f0f0` | All dividers, card borders, separators  |
| `surface`        | `#ffffff` | Card backgrounds, content areas, modals |
| `surface-subtle` | `#fafafa` | Hovered rows, subtle backgrounds        |
| `error`          | `#ff4d4f` | Error text, danger buttons              |
| `error-deep`     | `#f5222d` | Error alert text, strong error emphasis |
| `warning`        | `#faad14` | Warning indicators                      |
| `success`        | `#52c41a` | Success states                          |

**Chart palette** (8 colors, use in order): `#1890ff` → `#52c41a` → `#faad14` → `#f5222d` → `#722ed1` → `#13c2c2` →
`#eb2f96` → `#fa8c16`

### Typography (quick reference)

- **System font stack** only — no custom web fonts:
  `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Monospace** for code/JSON/API keys: `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace`
- Page titles: 24px/600 · Section headers: 20px/600 · Body: 14px/400 · Labels: 14px/500

### Spacing Scale

`xs: 4px` · `sm: 8px` · `md: 12px` · `base: 16px` · `lg: 24px` · `xl: 32px`

- Desktop content padding: `24px` (`spacing.lg`)
- Mobile content padding: `12px` (`spacing.md`) — breakpoint at `768px`
- Grid gutter: `16px` (`spacing.base`)

### Rounding Scale

`sm: 3px` · `md: 4px` (buttons, inputs, alerts) · `lg: 8px` (cards, modals, tables) · `xl: 12px` (badges) ·
`full: 9999px` (pills, avatars)

### Component Rules

- **Button**: 32px height, `rounded.md` (4px). Primary = solid blue. Default = white with border. Danger = red text →
  red fill on hover.
- **Table**: Small size, white bg, responsive columns with `ellipsis`, bordered variant, no row shadows.
- **Card**: White bg, `rounded.lg` (8px), no shadow — borders only when separation needed.
- **Modal**: White bg, `rounded.lg` (8px), confirm/cancel footer.
- **Input**: White fill, `rounded.md` (4px), 32px height.
- **Sidebar**: 220px fixed width, white bg, collapsible, `1px solid #f0f0f0` right border.
- **Header**: 64px height, white bg, `1px solid #f0f0f0` bottom border.

### Do's and Don'ts

- **Do** use `#f0f0f0` for all separators and card borders
- **Do** keep content within white cards on the gray page background
- **Do** use `monospace` typography for code, JSON, API keys
- **Don't** add `box-shadow` — flat design only
- **Don't** hardcode hex values inline — reference these tokens
- **Don't** use primary color for decorative/non-interactive elements
- **Don't** use `rounded.full` on rectangular elements — reserved for pills/avatars

### When Building UI

1. Check `DESIGN.md` for the full token spec and component patterns
2. Use existing `ConfigProvider` theme in `app/admin/layout.tsx` — don't override per-component unless necessary
3. Follow the spacing scale — don't introduce arbitrary values
4. Match the flat aesthetic — borders and contrast, never shadows

## UNIQUE STYLES

- **Multi-protocol**: Supports OpenAI, Anthropic, Google, Gemini CLI formats

- **CORS headers**: All responses include CORS headers from `utils/constants.ts`
- **OpenNext for Cloudflare**: Uses `@opennextjs/cloudflare` for deployment (NOT `@cloudflare/next-on-pages`)
- **Dynamic rendering**: API routes use `export const dynamic = 'force-dynamic'`
- **Ant Design**: Admin UI uses Ant Design components

## COMMANDS

```bash
npm run dev # Start local dev server (next dev)
npm run build # Build Next.js app
npm run deploy # Deploy to Cloudflare (opennextjs-cloudflare build + deploy)
npm run cf-typegen # Regenerate worker types from wrangler.jsonc
npm test # Run Vitest tests
```

## NOTES

- **Compatibility flags**: `nodejs_compat`, `global_fetch_strictly_public`
- **Observability**: Enabled in wrangler.jsonc (logs + traces)
- **API key**: Must be set via `AUTH_TOKEN` environment variable (no default)
- **Gemini CLI**: Requires OAuth refresh token, auto-refreshes access token
- **Non-standard API paths**: Public API at `app/v1/` (not `app/api/v1/`)
- **Gemini standard paths**: `/v1beta/models/{model}:generateContent` and `/v1beta/models/{model}:streamGenerateContent`
- **Admin routes**: Admin API at `app/api/admin/`, UI at `app/admin/`
- **Test coverage**: 70% branches, 85% functions, 80% lines (enforced)
- **SSRF protection**: Blocks private IPs, link-local, multicast, and blocked TLDs (.local, .internal, .localhost)
- **D1 schema**: Managed via prisma/migrations/
- **Cloudflare context**: Use `getCloudflareContext()` from `@opennextjs/cloudflare`
- **ESLint**: Uses `eslint.config.mjs` with TypeScript-ESLint, React, Prettier (not enforced in CI)
- **Build entry**: `.open-next/worker.js` (OpenNext output), not `src/index.ts`
- **D1 tables**: 6 tables — llm_api_keys, security_keys (with EMAIL type), providers, domains, email_history,
  download_history
- **GitHub Gists**: Management UI at `/admin/github-gists`, API at `/api/admin/github-gists/`
- **Database abstraction**: `SqlClient` interface in `src/db/` — business code depends on interface, not D1 directly
- **Multi-platform DB**: D1 adapter (Cloudflare Workers) + D1 REST API adapter (Vercel/other platforms)

<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the code-review-graph MCP tools BEFORE using Grep/Glob/Read
to explore the codebase.** The graph is faster, cheaper (fewer tokens), and gives you structural context (callers,
dependents, test coverage) that file scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool                        | Use when                                               |
| --------------------------- | ------------------------------------------------------ |
| `detect_changes`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context`        | Need source snippets for review — token-efficient      |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
