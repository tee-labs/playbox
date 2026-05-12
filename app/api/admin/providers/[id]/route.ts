import { NextRequest } from 'next/server';
import { getPlatformDb } from '@/platforms';
import { createJsonResponse, createNotFoundResponse, createInternalErrorResponse } from '@/lib/response-helpers';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return createJsonResponse({ error: 'id must be a number' }, 400);
    }

    const result = await db
      .prepare(
        `SELECT id, name, type, family, endpoint, key, models, auth_type, auto_models, sort_order, enabled, created_at, updated_at
         FROM providers
         WHERE id = ?`
      )
      .bind(id)
      .first();

    if (!result || !result.results) {
      return createNotFoundResponse('Provider not found');
    }

    const row = result.results as Record<string, unknown>;
    return createJsonResponse({
      success: true,
      provider: {
        id: row.id as number,
        name: row.name as string,
        type: row.type as string,
        family: row.family as string,
        endpoint: row.endpoint as string,
        key: row.key as string,
    models: JSON.parse(row.models as string),
    auth_type: row.auth_type as string,
    auto_models: (row.auto_models as string) || '',
    sort_order: row.sort_order as number,
        enabled: (row.enabled as number) === 1,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      },
    });
  } catch (error) {
    console.error('Error fetching provider:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return createJsonResponse({ error: 'id must be a number' }, 400);
    }

  const body = (await request.json()) as {
    name?: string;
    type?: string;
    family?: string;
    endpoint?: string;
    key?: string;
    models?: string[];
    auth_type?: string;
    auto_models?: string;
    sort_order?: number;
    enabled?: boolean;
  };

  const existing = await db.prepare('SELECT id FROM providers WHERE id = ?').bind(id).first();
  if (!existing || !existing.results) {
    return createNotFoundResponse('Provider not found');
  }

  const existingRow = (await db.prepare('SELECT * FROM providers WHERE id = ?').bind(id).first()).results as Record<string, unknown>;

  const name = body.name ?? (existingRow.name as string);
  const type = body.type ?? (existingRow.type as string);
  const family = body.family ?? (existingRow.family as string);
  const endpoint = body.endpoint ?? (existingRow.endpoint as string);
  const key = body.key ?? (existingRow.key as string);
  const models = body.models ?? JSON.parse(existingRow.models as string);
  const auth_type = body.auth_type ?? (existingRow.auth_type as string) ?? 'bearer';
  const auto_models = body.auto_models ?? (existingRow.auto_models as string) ?? '';
  const sort_order = body.sort_order ?? (existingRow.sort_order as number);
  const enabledVal = body.enabled !== undefined ? (body.enabled ? 1 : 0) : (existingRow.enabled as number);

  const modelsJson = JSON.stringify(models);

  await db
    .prepare(
      `UPDATE providers
       SET name = ?, type = ?, family = ?, endpoint = ?, key = ?, models = ?, auth_type = ?, auto_models = ?, sort_order = ?, enabled = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(name, type, family, endpoint, key, modelsJson, auth_type, auto_models, sort_order, enabledVal, id)
    .run();

  return createJsonResponse({
    success: true,
    provider: {
      id,
      name,
      type,
      family,
      endpoint,
      key,
      models,
      auth_type,
      auto_models,
      sort_order,
      enabled: enabledVal === 1,
    },
  });
  } catch (error) {
    console.error('Error updating provider:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return createJsonResponse({ error: 'id must be a number' }, 400);
    }

    const existing = await db.prepare('SELECT id FROM providers WHERE id = ?').bind(id).first();
    if (!existing || !existing.results) {
      return createNotFoundResponse('Provider not found');
    }

    await db.prepare('DELETE FROM providers WHERE id = ?').bind(id).run();

    return createJsonResponse({ success: true });
  } catch (error) {
    console.error('Error deleting provider:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}
