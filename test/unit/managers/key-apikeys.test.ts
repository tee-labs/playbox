import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetPlatformDb } = vi.hoisted(() => ({
  mockGetPlatformDb: vi.fn(),
}));

vi.mock('../../../src/platforms', () => ({
  getPlatformDb: mockGetPlatformDb,
}));

import { getApiKeysCached } from '../../../src/managers/key';

describe('KeyManager API Keys - D1 unavailable', () => {
  beforeEach(() => {
    mockGetPlatformDb.mockReset();
  });

  it('should return empty array when D1 unavailable', async () => {
    mockGetPlatformDb.mockReturnValue(null);
    const result = await getApiKeysCached('apikey-provider');
    expect(result).toEqual([]);
  });
});
