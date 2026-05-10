import { NextRequest } from 'next/server';
import { getPlatformDb } from '@/platforms';
import { createJsonResponse, createInternalErrorResponse, createNotFoundResponse } from '@/lib/response-helpers';
import type { SqlClient } from '@/db/types';

export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ table: string }> }) {
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

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10)));
    const sort = url.searchParams.get('sort');
    const order = url.searchParams.get('order') === 'desc' ? 'DESC' : 'ASC';
    const search = url.searchParams.get('search');
    const searchColumn = url.searchParams.get('searchColumn');

    const validColumnNames = columns.map((c) => c.name);

    if (sort && !validColumnNames.includes(sort)) {
      return createJsonResponse({ error: 'Invalid sort column' }, 400);
    }

    if (searchColumn && !validColumnNames.includes(searchColumn)) {
      return createJsonResponse({ error: 'Invalid search column' }, 400);
    }

    const offset = (page - 1) * pageSize;
    const whereClauses: string[] = [];
    const bindParams: (string | number)[] = [];

    if (search && searchColumn) {
      whereClauses.push(`${escapeColumnName(searchColumn)} LIKE ?`);
      bindParams.push(`%${search}%`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await db
      .prepare(
        `
      SELECT COUNT(*) as total FROM ${escapeColumnName(tableName)} ${whereClause}
    `
      )
      .bind(...bindParams)
      .first();

    const total = (countResult?.results as { total: number } | null)?.total || 0;

    const orderByClause = sort ? `ORDER BY ${escapeColumnName(sort)} ${order}` : 'ORDER BY rowid ASC';

    const rowsResult = await db
      .prepare(
        `
      SELECT *, rowid as _rowid FROM ${escapeColumnName(tableName)} 
      ${whereClause} 
      ${orderByClause} 
      LIMIT ? OFFSET ?
    `
      )
      .bind(...bindParams, pageSize, offset)
      .all();

    return createJsonResponse({
      success: true,
      columns,
      rows: rowsResult.results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    return createInternalErrorResponse((error as Error).message);
  }
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

    const body = (await request.json()) as Record<string, unknown>;
    const validColumnNames = columns.map((c) => c.name);

    const insertColumns: string[] = [];
    const insertValues: string[] = [];
    const bindParams: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (validColumnNames.includes(key)) {
        insertColumns.push(escapeColumnName(key));
        insertValues.push('?');
        bindParams.push(value as string | number | null);
      }
    }

    if (insertColumns.length === 0) {
      return createJsonResponse({ error: 'No valid columns provided' }, 400);
    }

    await db
      .prepare(
        `
      INSERT INTO ${escapeColumnName(tableName)} (${insertColumns.join(', ')})
      VALUES (${insertValues.join(', ')})
    `
      )
      .bind(...bindParams)
      .run();

    const lastRow = await db
      .prepare(
        `
      SELECT * FROM ${escapeColumnName(tableName)} WHERE rowid = last_insert_rowid()
    `
      )
      .bind()
      .first();

    return createJsonResponse(
      {
        success: true,
        row: lastRow?.results || null,
      },
      201
    );
  } catch (error) {
    console.error('Error creating row:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}
