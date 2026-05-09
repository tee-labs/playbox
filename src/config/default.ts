import { Provider, ProviderConfig } from '../types/provider';
import type { Env } from '../types';
import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface Config {
  providers: Provider;
  default_provider: string;
}

async function loadProvidersFromD1(env: Env): Promise<Config | null> {
  const db = env.PLAYBOX_D1;
  if (!db) return null;

  try {
    const { results } = await db
      .prepare('SELECT name, type, family, endpoint, key, models, auth_type FROM providers WHERE enabled = 1 ORDER BY sort_order ASC')
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
  const raw = getCloudflareContext();
  const env = raw.env as unknown as Env;
  return loadProvidersFromD1(env);
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
