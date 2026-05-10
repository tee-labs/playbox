import { NextRequest } from 'next/server';
import { getPlatformDb } from '@/platforms';
import { createJsonResponse, createInternalErrorResponse, createNotFoundResponse } from '@/lib/response-helpers';
import type { SqlClient } from '@/db/types';

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ table: string; rowid: string }> }) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const { table: tableName, rowid: rowidStr } = await params;
    const rowid = parseInt(rowidStr, 10);

    if (isNaN(rowid)) {
      return createJsonResponse({ error: 'Invalid row ID' }, 400);
    }

    const columns = await validateTable(db, tableName);
    if (!columns) {
      return createNotFoundResponse(`Table '${tableName}' not found`);
    }

    const row = await db
      .prepare(
        `
      SELECT * FROM ${escapeColumnName(tableName)} WHERE rowid = ?
    `
      )
      .bind(rowid)
      .first();

    if (!row || !row.results) {
      return createNotFoundResponse(`Row with rowid ${rowid} not found`);
    }

    return createJsonResponse({
      success: true,
      row: row.results,
    });
  } catch (error) {
    console.error('Error fetching row:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ table: string; rowid: string }> }) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const { table: tableName, rowid: rowidStr } = await params;
    const rowid = parseInt(rowidStr, 10);

    if (isNaN(rowid)) {
      return createJsonResponse({ error: 'Invalid row ID' }, 400);
    }

    const columns = await validateTable(db, tableName);
    if (!columns) {
      return createNotFoundResponse(`Table '${tableName}' not found`);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const validColumnNames = columns.map((c) => c.name);

    const updateClauses: string[] = [];
    const bindParams: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (validColumnNames.includes(key)) {
        updateClauses.push(`${escapeColumnName(key)} = ?`);
        bindParams.push(value as string | number | null);
      }
    }

    if (updateClauses.length === 0) {
      return createJsonResponse({ error: 'No valid columns provided' }, 400);
    }

    bindParams.push(rowid);

    await db
      .prepare(
        `
      UPDATE ${escapeColumnName(tableName)} 
      SET ${updateClauses.join(', ')} 
      WHERE rowid = ?
    `
      )
      .bind(...bindParams)
      .run();

    const updatedRow = await db
      .prepare(
        `
      SELECT * FROM ${escapeColumnName(tableName)} WHERE rowid = ?
    `
      )
      .bind(rowid)
      .first();

    return createJsonResponse({
      success: true,
      row: updatedRow?.results || null,
    });
  } catch (error) {
    console.error('Error updating row:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ table: string; rowid: string }> }) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const { table: tableName, rowid: rowidStr } = await params;
    const rowid = parseInt(rowidStr, 10);

    if (isNaN(rowid)) {
      return createJsonResponse({ error: 'Invalid row ID' }, 400);
    }

    const columns = await validateTable(db, tableName);
    if (!columns) {
      return createNotFoundResponse(`Table '${tableName}' not found`);
    }

    const existingRow = await db
      .prepare(
        `
      SELECT rowid FROM ${escapeColumnName(tableName)} WHERE rowid = ?
    `
      )
      .bind(rowid)
      .first();

    if (!existingRow || !existingRow.results) {
      return createNotFoundResponse(`Row with rowid ${rowid} not found`);
    }

    await db
      .prepare(
        `
      DELETE FROM ${escapeColumnName(tableName)} WHERE rowid = ?
    `
      )
      .bind(rowid)
      .run();

    return createJsonResponse({
      success: true,
      message: `Row ${rowid} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting row:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}
