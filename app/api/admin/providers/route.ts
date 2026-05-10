import { NextRequest } from 'next/server';
import { getPlatformDb } from '@/platforms';
import { createJsonResponse, createInternalErrorResponse } from '@/lib/response-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const result = await db
      .prepare(
        `SELECT id, name, type, family, endpoint, key, models, auth_type, sort_order, enabled, created_at, updated_at
         FROM providers
         ORDER BY sort_order ASC`
      )
      .bind()
      .all();

    const providers = (result.results as readonly Record<string, unknown>[]).map((row) => ({
      id: row.id as number,
      name: row.name as string,
      type: row.type as string,
      family: row.family as string,
      endpoint: row.endpoint as string,
      key: row.key as string,
      models: JSON.parse(row.models as string) as string[],
      auth_type: row.auth_type as string,
      sort_order: row.sort_order as number,
      enabled: (row.enabled as number) === 1,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    }));

    return createJsonResponse({ success: true, providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const body = (await request.json()) as {
      name?: string;
      type?: string;
      family?: string;
      endpoint?: string;
      key?: string;
      models?: string[];
      auth_type?: string;
      sort_order?: number;
      enabled?: boolean;
    };

    const { name, type, family, endpoint, key, models, auth_type, sort_order, enabled } = body;

    if (!name || !type || !family || !endpoint || !key) {
      return createJsonResponse({ error: 'name, type, family, endpoint, and key are required' }, 400);
    }

    const validTypes = ['openai', 'anthropic', 'google', 'gemini'];
    if (!validTypes.includes(type)) {
      return createJsonResponse({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, 400);
    }

    const validFamilies = ['openai', 'anthropic', 'gemini', 'embedding', 'rerank'];
    if (!validFamilies.includes(family)) {
      return createJsonResponse({ error: `Invalid family. Must be one of: ${validFamilies.join(', ')}` }, 400);
    }

    const existing = await db.prepare('SELECT id FROM providers WHERE name = ?').bind(name).first();
    if (existing && existing.results) {
      return createJsonResponse({ error: `Provider "${name}" already exists` }, 409);
    }

    const modelsJson = JSON.stringify(models || []);
    const authType = auth_type || 'bearer';
    const sortOrder = sort_order ?? 0;
    const enabledVal = enabled !== false ? 1 : 0;

    const result = await db
      .prepare(
        `INSERT INTO providers (name, type, family, endpoint, key, models, auth_type, sort_order, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(name, type, family, endpoint, key, modelsJson, authType, sortOrder, enabledVal)
      .run();

    const newId = (result.meta as { last_row_id: number }).last_row_id;

    return createJsonResponse(
      {
        success: true,
        provider: {
          id: newId,
          name,
          type,
          family,
          endpoint,
          key,
          models: models || [],
          auth_type: authType,
          sort_order: sortOrder,
          enabled: enabledVal === 1,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error creating provider:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const body = (await request.json()) as {
      id?: number;
      name?: string;
      type?: string;
      family?: string;
      endpoint?: string;
      key?: string;
      models?: string[];
      auth_type?: string;
      sort_order?: number;
      enabled?: boolean;
    };

    const { id, name, type, family, endpoint, key, models, auth_type, sort_order, enabled } = body;

    if (!id) {
      return createJsonResponse({ error: 'id is required' }, 400);
    }

    const existing = await db.prepare('SELECT id FROM providers WHERE id = ?').bind(id).first();
    if (!existing || !existing.results) {
      return createJsonResponse({ error: 'Provider not found' }, 404);
    }

    const modelsJson = JSON.stringify(models || []);
    const enabledVal = enabled !== false ? 1 : 0;

    await db
      .prepare(
        `UPDATE providers
         SET name = ?, type = ?, family = ?, endpoint = ?, key = ?, models = ?, auth_type = ?, sort_order = ?, enabled = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        name || '',
        type || '',
        family || '',
        endpoint || '',
        key || '',
        modelsJson,
        auth_type || 'bearer',
        sort_order ?? 0,
        enabledVal,
        id
      )
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
        models: models || [],
        auth_type: auth_type || 'bearer',
        sort_order: sort_order ?? 0,
        enabled: enabledVal === 1,
      },
    });
  } catch (error) {
    console.error('Error updating provider:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return createJsonResponse({ error: 'id query parameter is required' }, 400);
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return createJsonResponse({ error: 'id must be a number' }, 400);
    }

    const existing = await db.prepare('SELECT id FROM providers WHERE id = ?').bind(id).first();
    if (!existing || !existing.results) {
      return createJsonResponse({ error: 'Provider not found' }, 404);
    }

    await db.prepare('DELETE FROM providers WHERE id = ?').bind(id).run();

    return createJsonResponse({ success: true });
  } catch (error) {
    console.error('Error deleting provider:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}
