import { NextRequest } from 'next/server';
import { getPlatformDb } from '@/platforms';
import { createJsonResponse, createInternalErrorResponse } from '@/lib/response-helpers';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const db = getPlatformDb();

    if (!db) {
      return createJsonResponse({ error: 'D1 database not configured' }, 500);
    }

    interface SecurityKeyRow extends Record<string, unknown> {
      content: string;
    }
    const keyResult = await db
      .prepare(`SELECT content FROM security_keys WHERE type = 'API_KEY' AND provider = 'DIGITAL' LIMIT 1`)
      .bind()
      .first<SecurityKeyRow>();

    if (!keyResult) {
      return createJsonResponse({ error: 'DIGITAL API key not found' }, 404);
    }

    const apiKey = keyResult.results?.content;

    const response = await fetch('https://domain-api.digitalplat.org/api/v1/domains', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return createJsonResponse({ error: `Domain API returned ${response.status}: ${response.statusText}` }, response.status);
    }

    const data = (await response.json()) as { data?: unknown[] };

    return createJsonResponse({
      success: true,
      data: data.data || [],
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}
