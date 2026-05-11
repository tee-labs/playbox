/**
 * Cloudflare D1 adapter for SqlClient interface
 *
 * Wraps the native D1Database binding so business code can depend on
 * the SqlClient interface instead of D1-specific types.
 */

import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { SqlClient, Statement, BoundStatement, QueryResults, QueryFirstResult, RunResult, BatchResult, QueryResultRow } from './types';

function d1ToStatement(stmt: D1PreparedStatement): BoundStatement {
  return {
    all: () => stmt.all() as Promise<QueryResults>,
    first: async <T extends QueryResultRow = QueryResultRow>() => {
      const row = await stmt.first<T>();
      return { results: row ?? null } as QueryFirstResult<T>;
    },
    run: () => stmt.run() as unknown as Promise<RunResult>,
  };
}

/**
 * D1 adapter implementing SqlClient interface
 */
export class D1Adapter implements SqlClient {
  constructor(private db: D1Database) {}

  prepare(sql: string): Statement {
    const stmt = this.db.prepare(sql);
    return {
      bind: (...params) => d1ToStatement(stmt.bind(...params)),
    };
  }

  async batch(statements: string[]): Promise<BatchResult> {
    const results = await this.db.batch(statements.map((sql) => this.db.prepare(sql)));
    return {
      results: results.map((r) => ({
        results: [],
        success: true,
        meta: r.meta,
      })) as RunResult[],
      success: true,
    };
  }

  async dump(): Promise<string> {
    const buffer = await this.db.dump();
    return new TextDecoder().decode(buffer);
  }

  async exec(sql: string): Promise<RunResult> {
    const result = await this.db.exec(sql);
    return {
      results: [],
      success: true,
      meta: {
        changes: result.count,
      },
    };
  }
}

/**
 * Create a SqlClient from a D1Database binding
 */
export function d1Adapter(db: D1Database): SqlClient {
  return new D1Adapter(db);
}
