import type { D1Storage } from '../interface';
import { sql } from '@vercel/postgres';

/**
 * Vercel D1 adapter using Vercel Postgres (Neon).
 *
 * Translates Cloudflare D1 (SQLite) SQL to PostgreSQL-compatible SQL.
 *
 * Environment variables required (auto-configured when using Vercel Postgres):
 * - POSTGRES_URL
 * - POSTGRES_PRISMA_URL
 * - POSTGRES_URL_NON_POOLING
 *
 * Setup: vercel postgres create playbox-db
 */
export class VercelD1Adapter implements D1Storage {
  /**
   * Translate SQLite SQL to PostgreSQL-compatible SQL.
   * Key differences handled:
   * - RANDOM() → ORDER BY RANDOM() (works in both, but explicit)
   * - datetime('now') → NOW() or CURRENT_TIMESTAMP
   * - ? placeholders → $1, $2, ... parameterized queries
   * - INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL PRIMARY KEY
   * - IF NOT EXISTS → same syntax
   * - CHECK constraints with IN → same syntax
   */
  private translateSql(sqlStr: string, params?: any[]): { text: string; values: any[] } {
    let pgSql = sqlStr;
    const values: any[] = [];

    // Replace ? placeholders with $1, $2, ... 
    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => {
      if (params && params.length >= paramIndex) {
        values.push(params[paramIndex - 1]);
      }
      return `$${paramIndex++}`;
    });

    // Replace SQLite datetime('now') with PostgreSQL NOW()
    pgSql = pgSql.replace(/datetime\(["']now["']\)/gi, 'NOW()');

    // Replace AUTOINCREMENT with SERIAL (for CREATE TABLE compatibility)
    pgSql = pgSql.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');

    return { text: pgSql, values };
  }

  async query(sqlStr: string, params?: any[]): Promise<{ results: any[] }> {
    try {
      const { text, values } = this.translateSql(sqlStr, params);
      const result = await sql.query(text, values);
      // Convert Vercel Postgres rows (array of objects) to D1 format
      return { results: result.rows as any[] };
    } catch (error) {
      console.error('VercelD1Adapter query error:', error);
      return { results: [] };
    }
  }

  async execute(sqlStr: string, params?: any[]): Promise<{ success: boolean }> {
    try {
      const { text, values } = this.translateSql(sqlStr, params);
      await sql.query(text, values);
      return { success: true };
    } catch (error) {
      console.error('VercelD1Adapter execute error:', error);
      return { success: false };
    }
  }
}
