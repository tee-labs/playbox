import { Provider, ProviderConfig } from '../types/provider';
import type { SqlClient } from '../db/types';
import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import { getPlatformDb } from '../platforms';

export interface Config {
  providers: Provider;
  default_provider: string;
}

async function loadProvidersFromD1(db: SqlClient): Promise<Config | null> {

  try {
    const { results } = await db
      .prepare('SELECT name, type, family, endpoint, key, models, auth_type, auto_models FROM providers WHERE enabled = 1 ORDER BY sort_order ASC')
      .bind()
      .all();

    if (!results || results.length === 0) {
      return null;
    }

    const providers: Provider = {};
    let defaultProvider = '';

    for (const row of results as unknown as Record<string, unknown>[]) {
      const name = row.name as string;
      try {
        const models: string[] = JSON.parse(row.models as string);
        providers[name] = {
          type: row.type as ProviderConfig['type'],
          family: row.family as ProviderConfig['family'],
          endpoint: row.endpoint as string,
          key: row.key as string,
          models,
          ...(row.auth_type ? { authType: row.auth_type as ProviderConfig['authType'] } : {}),
          ...(row.auto_models ? { autoModels: row.auto_models as string } : {}),
        };

        if (!defaultProvider) {
          defaultProvider = name;
        }
      } catch {
        continue;
      }
    }

    return {
      providers,
      default_provider: defaultProvider,
    };
  } catch {
    return null;
  }
}

const _loadConfigFromD1 = async (): Promise<Config | null> => {
  const db = getPlatformDb();
  if (!db) return null;
  return loadProvidersFromD1(db);
};

export const getDefaultConfigCached = unstable_cache(
  _loadConfigFromD1,
  ['config-default'], // cache key prefix
  { tags: ['config-default'], revalidate: 3600 } // 1 hour TTL
);

export async function getDefaultConfig(): Promise<Config> {
  const config = await getDefaultConfigCached();
  if (!config) {
    throw new Error('No provider configuration found. Please configure providers in D1 database.');
  }
  return config;
}

export async function revalidateConfigCache(): Promise<void> {
  revalidateTag('config-default');
}
