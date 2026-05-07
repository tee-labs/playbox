# Configuration Management

**Location:** `src/config/`

## OVERVIEW

Provider configuration and runtime config resolution. Manages AI provider endpoints, model lists, and provider-type
mapping. Configuration is loaded from D1 database at runtime.

## STRUCTURE

```
config/
├── index.ts          # ConfigManager + resolveProvider()
└── default.ts        # Loads config from D1 database
```

## WHERE TO LOOK

| Task                    | Location             | Notes                                    |
| ----------------------- | -------------------- | ---------------------------------------- |
| Add new provider        | D1 `providers` table | Insert into database via admin UI or SQL |
| Change default provider | D1 `providers` table | First enabled provider becomes default   |
| Modify resolution logic | `index.ts`           | `resolveProvider()` function             |
| Config interface        | `default.ts`         | `Config` type definition                 |

## CONVENTIONS

- **Provider types**: `openai`, `anthropic`, `google`, `gemini-cli`
- **Model matching**: First match wins, prefers `preferredType` if specified
- **Fallback**: Uses `default_provider` if model not found
- **Priority**: D1 `providers` table (sole config source)

## ANTI-PATTERNS

- **DO NOT** hardcode endpoints in route handlers — use `getConfig()`
- **DO NOT** skip model validation — `resolveProvider()` handles fallback

## NOTES

- **Providers**: Configured via D1 database `providers` table
- **Key resolution**: Provider key names map to env vars (e.g., `LongCat` → `LONGCAT_API_KEY`)
- **Config source**: D1 database `providers` table (no local fallback files)
