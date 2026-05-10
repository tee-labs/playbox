import { unstable_cache } from 'next/cache';
import { getPlatformDb } from '../platforms';

interface Provider {
  key: string;
  type: string;
  endpoint: string;
  models: string[];
}

interface OAuthCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

const _loadOAuthCredentials = async (provider: string): Promise<OAuthCredentials[]> => {
  const db = getPlatformDb();
  if (!db) {
    throw new Error('D1 database not available');
  }
  const query = `SELECT content FROM security_keys WHERE type = 'OAUTH_JSON' AND provider = ? ORDER BY RANDOM() LIMIT 100`;
  const { results } = await db.prepare(query).bind(provider).all();
  if (!results || results.length === 0) {
    throw new Error(`No OAuth credentials found for provider: ${provider}`);
  }
  return results.map((row: Record<string, unknown>) => {
    const typedRow = row as unknown as { content: string };
    return JSON.parse(typedRow.content) as OAuthCredentials;
  });
};

const _loadApiKeys = async (providerKey: string): Promise<string[]> => {
  const db = getPlatformDb();
  if (!db) {
    return [];
  }
  const query = `SELECT content FROM security_keys WHERE type = 'API_KEY' AND provider = ? ORDER BY RANDOM() LIMIT 100`;
  const { results } = await db.prepare(query).bind(providerKey).all();
  if (!results || results.length === 0) {
    throw new Error(`No API keys found for provider: ${providerKey}`);
  }
  return results.map((row: Record<string, unknown>) => {
    const typedRow = row as unknown as { content: string };
    return typedRow.content;
  });
};

export const getOAuthCredentialsCached = unstable_cache(_loadOAuthCredentials, ['oauth-credentials'], {
  tags: ['oauth-credentials'],
  revalidate: 300,
});

export const getApiKeysCached = unstable_cache(_loadApiKeys, ['api-keys'], { tags: ['api-keys'], revalidate: 300 });

export const KeyManager = {
  async getRandomOAuthCredentials(provider: string): Promise<OAuthCredentials> {
    const credList = await getOAuthCredentialsCached(provider);
    return credList[Math.floor(Math.random() * credList.length)];
  },

  async getRandomApiKey(provider: Provider): Promise<string> {
    const providerKey = provider.key.trim();
    const keyList = await getApiKeysCached(providerKey);
    return keyList[Math.floor(Math.random() * keyList.length)];
  },
};
