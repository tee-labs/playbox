/**
 * Database abstraction layer (SqlClient)
 *
 * Provides a unified interface for database operations across different providers:
 * - Cloudflare D1
 * - Turso (libSQL)
 * - Supabase (PostgreSQL)
 *
 * Business code should depend on SqlClient interface, not specific implementations.
 *
 * @example
 * ```typescript
 * import { createSqlClient, type SqlClient } from '@/db';
 *
 * // In Cloudflare Workers
 * const db: SqlClient = createSqlClient({ d1: env.PLAYBOX_D1 });
 *
 * // Query data
 * const { results } = await db.prepare('SELECT * FROM users').bind(id).all();
 * ```
 */

// Types
export type {
  SqlClient,
  Statement,
  BoundStatement,
  QueryResults,
  QueryFirstResult,
  RunResult,
  BatchResult,
  QueryResultRow,
} from './types';

// Adapters
export { D1Adapter, d1Adapter } from './d1-adapter';
export { D1RestAdapter, d1RestAdapter, type D1RestOptions } from './d1-rest-adapter';
export { createSqlClient, type SqlClientOptions } from './factory';