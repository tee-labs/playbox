import { NextRequest } from 'next/server';
import { getPlatformDb } from '@/platforms';
import { createJsonResponse, createInternalErrorResponse, createNotFoundResponse } from '@/lib/response-helpers';
import type { BoundStatement, SqlClient } from '@/db/types';

export const dynamic = 'force-dynamic';

interface ColumnInfo {
  name: string;
  type: string;
  pk: number;
}

async function validateTable(db: SqlClient, tableName: string): Promise<ColumnInfo[] | null> {
  const tablesResult = await db
    .prepare(
      `
    SELECT name FROM sqlite_master 
    WHERE type = 'table' 
      AND name = ? 
      AND name NOT LIKE 'sqlite_%' 
      AND name NOT LIKE '_cf_%'
  `
    )
    .bind(tableName)
    .first();

  if (!tablesResult || !tablesResult.results) return null;

  const columnsResult = await db.prepare(`PRAGMA table_info(${tableName})`).bind().all();
  return columnsResult.results as unknown as ColumnInfo[];
}

function escapeColumnName(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid column name: ${name}`);
  }
  return `"${name}"`;
}

function parseCSV(content: string): Record<string, unknown>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || null;
    });
    rows.push(row);
  }

  return rows;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const { table: tableName } = await params;
    const columns = await validateTable(db, tableName);

    if (!columns) {
      return createNotFoundResponse(`Table '${tableName}' not found`);
    }

    const body = (await request.json()) as {
      operation?: 'delete';
      ids?: number[];
      data?: Record<string, unknown>[] | string;
      format?: 'json' | 'csv';
    };

    const validColumnNames = columns.map((c) => c.name);

    if (body.operation === 'delete' && body.ids?.length) {
      const placeholders = body.ids.map(() => '?').join(', ');
      const result = await db
        .prepare(
          `
        DELETE FROM ${escapeColumnName(tableName)} WHERE rowid IN (${placeholders})
      `
        )
        .bind(...body.ids)
        .run();

      return createJsonResponse({
        success: true,
        message: `Deleted ${result.meta?.changes || 0} rows`,
        affected: result.meta?.changes || 0,
      });
    }

    if (body.data) {
      let rowsToInsert: Record<string, unknown>[];

      if (typeof body.data === 'string' && body.format === 'csv') {
        rowsToInsert = parseCSV(body.data);
      } else if (Array.isArray(body.data)) {
        rowsToInsert = body.data;
      } else {
        return createJsonResponse({ error: 'Invalid data format' }, 400);
      }

      if (rowsToInsert.length === 0) {
        return createJsonResponse({ error: 'No data to import' }, 400);
      }

      const statements: BoundStatement[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const row of rowsToInsert) {
        const insertColumns: string[] = [];
        const insertValues: string[] = [];
        const bindParams: (string | number | null)[] = [];

        for (const [key, value] of Object.entries(row)) {
          if (validColumnNames.includes(key)) {
            insertColumns.push(escapeColumnName(key));
            insertValues.push('?');
            bindParams.push(value as string | number | null);
          }
        }

        if (insertColumns.length > 0) {
          statements.push(
            db
              .prepare(
                `
              INSERT INTO ${escapeColumnName(tableName)} (${insertColumns.join(', ')})
              VALUES (${insertValues.join(', ')})
            `
              )
              .bind(...bindParams)
          );
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (statements.length > 0) {
        // Use batch if available (Cloudflare D1 native)
        if (typeof db.batch === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.batch(statements as any);
        } else {
          // Fallback: execute statements individually
          for (const stmt of statements) {
            await stmt.run();
          }
        }
      }

      return createJsonResponse(
        {
          success: true,
          message: `Imported ${successCount} rows${errorCount > 0 ? `, ${errorCount} rows skipped due to invalid columns` : ''}`,
          imported: successCount,
          skipped: errorCount,
        },
        201
      );
    }

    return createJsonResponse({ error: 'Invalid operation' }, 400);
  } catch (error) {
    console.error('Error in batch operation:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}
