# Test Suite

**Location:** `test/`

## OVERVIEW

Vitest tests with Cloudflare Workers pool. Uses global mocking for KV/D1 bindings and factory-based test data
generation.

## STRUCTURE

```
test/
├── setup.ts # Global mocks: KV, D1, node-fetch
├── factories/
│ └── index.ts # Mock data generators
├── unit/
│ ├── protocols/ # Protocol adapter tests (4 files)
│ ├── managers/ # Manager tests (2 files)
│ ├── lib/ # Auth, middleware, response-helpers, cloudflare-context tests (5 files)
│ ├── config/ # Config tests (1 file)
│ ├── db/ # D1 REST adapter tests (1 file)
│ ├── platforms/ # Platform detection, Vercel tests (2 files)
│ └── utils/ # Logger, SSE, SSRF, constants tests (4 files)
└── e2e/
    └── admin.spec.ts # End-to-end admin tests
```

## WHERE TO LOOK

| Task                | Location             | Notes                                                  |
| ------------------- | -------------------- | ------------------------------------------------------ |
| Add protocol test   | `unit/protocols/`    | Follow existing pattern                                |
| Add manager test    | `unit/managers/`     | Use factories for mock data                            |
| Add lib test        | `unit/lib/`          | Auth, middleware, response-helpers, cloudflare-context |
| Add config test     | `unit/config/`       | Config resolution tests                                |
| Add db test         | `unit/db/`           | D1 adapter, D1 REST adapter tests                      |
| Add platform test   | `unit/platforms/`    | Platform detection, Vercel adapter tests               |
| Add utils test      | `unit/utils/`        | Logger, SSE, SSRF, constants                           |
| Add e2e test        | `e2e/`               | End-to-end admin flow tests                            |
| Mock data factories | `factories/index.ts` | `createMockEnv`, `createMockProviderConfig`            |
| Global setup        | `setup.ts`           | D1 mock, fetch interception                            |
| Coverage thresholds | `vitest.config.mts`  | 70% branches, 85% functions, 80% lines                 |

## CONVENTIONS

- **Cloudflare Workers pool**: Uses `@cloudflare/vitest-pool-workers`
- **Factory pattern**: All test data via `test/factories/` with overrides
- **Global mocks**: D1 pre-mocked in `setup.ts`, not per-test

## ANTI-PATTERNS

- **DO NOT** create inline mock objects — use factories
- **DO NOT** mock fetch per-test — global mock in setup.ts handles it
