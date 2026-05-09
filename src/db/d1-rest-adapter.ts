/**
 * Cloudflare D1 REST API adapter for SqlClient interface
 *
 * Allows accessing D1 databases outside of Cloudflare Workers.
 * Uses the Cloudflare REST API with Bearer token authentication.
 *
 * @example
 * ```typescript
 * import { d1RestAdapter } from '@/db';
 *
 * const db = d1RestAdapter({
 *   accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
 *   databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
 *   apiToken: process.env.CLOUDFLARE_API_TOKEN!,
 * });
 *
 * const { results } = await db.prepare('SELECT * FROM providers').bind(id).all();
 * ```
 */

import type {
  SqlClient,
  Statement,
  BoundStatement,
  QueryResults,
  QueryFirstResult,
  RunResult,
  BatchResult,
  QueryResultRow,
} from './types';

/** Configuration for D1 REST API adapter */
export interface D1RestOptions {
  /** Cloudflare Account ID */
  accountId: string;
  /** D1 Database ID (UUID) */
  databaseId: string;
  /** Cloudflare API Token */
  apiToken: string;
  /** Optional base URL override */
  baseUrl?: string;
}

/** D1 REST API response structure */
interface D1RestResponse {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  result?: D1RestResult[];
}

interface D1RestResult {
  success: boolean;
  meta: {
    changed_db?: boolean;
    changes?: number;
    duration?: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
    size_after?: number;
  };
  results?: Record<string, unknown>[];
}

/**
 * REST API version of BoundStatement
 */
class RestBoundStatement implements BoundStatement {
  constructor(
    private fetch: typeof globalThis.fetch,
    private baseUrl: string,
    private accountId: string,
    private databaseId: string,
    private apiToken: string,
    private sql: string,
    private params: (string | number | null | boolean)[]
  ) {}

  private async execute(): Promise<{ results: Record<string, unknown>[]; meta: QueryResults['meta'] }> {
    const url = `${this.baseUrl}/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;

    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({
        sql: this.sql,
        params: this.params,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`D1 REST API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as D1RestResponse;

    if (!data.success || !data.result?.[0]) {
      const errorMsg = data.errors?.[0]?.message ?? 'Unknown D1 REST API error';
      throw new Error(errorMsg);
    }

    const result = data.result[0];
    return {
      results: result.results ?? [],
      meta: {
        changes: result.meta.changes,
        last_row_id: result.meta.last_row_id,
        rows_read: result.meta.rows_read,
        rows_written: result.meta.rows_written,
      },
    };
  }

  async all(): Promise<QueryResults> {
    const { results, meta } = await this.execute();
    return { results, success: true, meta };
  }

  async first<T extends QueryResultRow = QueryResultRow>(): Promise<QueryFirstResult<T>> {
    const { results } = await this.execute();
    return { results: (results[0] as T) ?? null };
  }

  async run(): Promise<RunResult> {
    const { results, meta } = await this.execute();
    return { results: [], success: true, meta };
  }
}

/**
 * REST API version of Statement
 */
class RestStatement {
  constructor(
    private fetch: typeof globalThis.fetch,
    private baseUrl: string,
    private accountId: string,
    private databaseId: string,
    private apiToken: string,
    private sql: string
  ) {}

  bind(...params: (string | number | null | boolean)[]): BoundStatement {
    return new RestBoundStatement(
      this.fetch,
      this.baseUrl,
      this.accountId,
      this.databaseId,
      this.apiToken,
      this.sql,
      params
    );
  }
}

/**
 * D1 REST API adapter implementing SqlClient interface
 */
export class D1RestAdapter implements SqlClient {
  private fetch: typeof globalThis.fetch;
  private baseUrl: string;
  private accountId: string;
  private databaseId: string;
  private apiToken: string;

  constructor(options: D1RestOptions) {
    this.fetch = globalThis.fetch.bind(globalThis);
    this.baseUrl = options.baseUrl ?? 'https://api.cloudflare.com';
    this.accountId = options.accountId;
    this.databaseId = options.databaseId;
    this.apiToken = options.apiToken;
  }

  prepare(sql: string): Statement {
    return new RestStatement(
      this.fetch,
      this.baseUrl,
      this.accountId,
      this.databaseId,
      this.apiToken,
      sql
    );
  }

  async batch(statements: string[]): Promise<BatchResult> {
    // D1 REST API supports batch in single query with semicolons
    // But for simplicity, we execute each statement separately
    const results: RunResult[] = [];

    for (const sql of statements) {
      const url = `${this.baseUrl}/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;

      try {
        const response = await this.fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({ sql, params: [] }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          results.push({
            results: [],
            success: false,
            meta: { changes: 0 },
          });
          continue;
        }

        const data = (await response.json()) as D1RestResponse;

        if (!data.success || !data.result?.[0]) {
          results.push({
            results: [],
            success: false,
            meta: { changes: 0 },
          });
          continue;
        }

        const result = data.result[0];
        results.push({
          results: [],
          success: result.success,
          meta: {
            changes: result.meta.changes,
            last_row_id: result.meta.last_row_id,
            rows_read: result.meta.rows_read,
            rows_written: result.meta.rows_written,
          },
        });
      } catch {
        results.push({
          results: [],
          success: false,
          meta: { changes: 0 },
        });
      }
    }

    return { results, success: results.every((r) => r.success) };
  }

  async dump(): Promise<string> {
    // D1 REST API does not support dump/export directly
    throw new Error('dump() is not supported via D1 REST API. Use wrangler d1 export instead.');
  }

  async exec(sql: string): Promise<RunResult> {
    const url = `${this.baseUrl}/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;

    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({ sql, params: [] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`D1 REST API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as D1RestResponse;

    if (!data.success || !data.result?.[0]) {
      const errorMsg = data.errors?.[0]?.message ?? 'Unknown D1 REST API error';
      throw new Error(errorMsg);
    }

    const result = data.result[0];
    return {
      results: [],
      success: result.success,
      meta: {
        changes: result.meta.changes,
        last_row_id: result.meta.last_row_id,
        rows_read: result.meta.rows_read,
        rows_written: result.meta.rows_written,
      },
    };
  }
}

/**
 * Create a SqlClient from D1 REST API configuration
 */
export function d1RestAdapter(options: D1RestOptions): SqlClient {
  return new D1RestAdapter(options);
}