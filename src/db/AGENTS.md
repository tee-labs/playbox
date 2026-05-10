# Database Abstraction

**Location:** `src/db/`

## OVERVIEW

Database abstraction layer providing a unified `SqlClient` interface for database operations across different providers.
Business code depends on `SqlClient` interface, not specific implementations — enabling transparent swaps between D1, D1
REST API, and future backends (Turso, Supabase).

## STRUCTURE

```
db/
├── index.ts # Barrel exports (types + adapters + factory)
├── types.ts # SqlClient, Statement, BoundStatement, QueryResults, etc.
├── factory.ts # createSqlClient() — environment-aware factory
├── d1-adapter.ts # D1Adapter — wraps native D1Database binding
└── d1-rest-adapter.ts # D1RestAdapter — D1 via Cloudflare REST API (for Vercel/other)
```

## WHERE TO LOOK

| Task                     | Location             | Notes                                                          |
| ------------------------ | -------------------- | -------------------------------------------------------------- | ------------ |
| Add new database adapter | Create file + export | Implement `SqlClient` interface, add to `factory.ts`           |
| Database interface       | `types.ts`           | `SqlClient` — prepare, batch, dump, exec                       |
| Query result types       | `types.ts`           | `QueryResults`, `QueryFirstResult`, `RunResult`, `BatchResult` |
| D1 (Cloudflare Workers)  | `d1-adapter.ts`      | `D1Adapter` class wrapping `D1Database`                        |
| D1 REST API (Vercel)     | `d1-rest-adapter.ts` | `D1RestAdapter` using Cloudflare REST API with Bearer auth     |
| Factory function         | `factory.ts`         | `createSqlClient({ d1 }                                        | { d1Rest })` |

## CONVENTIONS

- **Interface-first**: Business code imports `SqlClient` type, never concrete adapters
- **Factory pattern**: `createSqlClient(options)` picks adapter based on available bindings
- **D1-first**: If both D1 and D1REST options provided, D1 adapter wins (native binding faster)
- **Barrel exports**: All types and adapters exported from `index.ts`
- **Prepared statements**: `prepare(sql).bind(params).all()` chain matches D1 API

## ANTI-PATTERNS

- **DO NOT** import `D1Adapter` or `D1RestAdapter` directly in business code — use `createSqlClient()`
- **DO NOT** depend on `D1Database` type in business logic — depend on `SqlClient` interface
- **DO NOT** use raw SQL without parameterized queries — always `.bind()` params

## NOTES

- **D1 REST API**: Uses `https://api.cloudflare.com/client/v4/accounts/{accountId}/d1/database/{databaseId}/query`
- **D1 REST auth**: Bearer token via `CLOUDFLARE_API_TOKEN`
- **Future backends**: Turso (libSQL) and Supabase (PostgreSQL) stubs in `factory.ts`
- **Statement chain**: `db.prepare(sql).bind(param1, param2).all()` / `.first()` / `.run()`
