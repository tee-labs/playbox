# Platforms

**Location:** `src/platforms/`

## OVERVIEW

Platform abstraction layer for multi-platform deployment support. Provides unified access to platform-specific resources
across Cloudflare Workers, Vercel, Node.js, and other environments.

## STRUCTURE

```
platforms/
├── index.ts    # Main entry point - getPlatformDb(), getPlatformContext()
└── types.ts    # PlatformContext, PlatformEnv, PlatformType interfaces
```

## WHERE TO LOOK

| Task                | Location   | Notes                              |
| ------------------- | ---------- | ---------------------------------- |
| Get database client | `index.ts` | `getPlatformDb()`                  |
| Platform detection  | `index.ts` | `detectPlatform()`, `isPlatform()` |
| Platform types      | `types.ts` | `PlatformType`, `PlatformContext`  |

## USAGE

```typescript
import { getPlatformDb, getPlatformType } from '@/platforms';

// Get database (SqlClient — null if not available)
const db = getPlatformDb();
if (!db) {
  throw new Error('Database not available on this platform');
}

// Query database (via SqlClient interface)
const { results } = await db.prepare('SELECT * FROM users').bind(id).all();

// Check platform
if (isPlatform('cloudflare')) {
  // Cloudflare-specific code
}
```

## PLATFORM SUPPORT

| Platform   | Database            | Notes                                      |
| ---------- | ------------------- | ------------------------------------------ |
| Cloudflare | D1 (native binding) | Full support via getCloudflareContext()    |
| Vercel     | D1 REST API         | Via `D1RestAdapter` with Bearer token auth |
| Node.js    | None                | For local development/testing              |

## CONVENTIONS

- **Singleton pattern**: Platform context is cached at module level
- **Lazy initialization**: Context is created on first access
- **Graceful degradation**: Returns null for unavailable resources
- **Test helpers**: `resetPlatformContext()`, `setPlatformContext()` for testing
