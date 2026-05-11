import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetPlatformDb } = vi.hoisted(() => ({
  mockGetPlatformDb: vi.fn(),
}));

vi.mock('../../../src/platforms', () => ({
  getPlatformDb: mockGetPlatformDb,
}));

import { getOAuthCredentialsCached } from '../../../src/managers/key';

describe('KeyManager OAuth - D1 unavailable', () => {
  beforeEach(() => {
    mockGetPlatformDb.mockReset();
  });

  it('should throw when D1 unavailable', async () => {
    mockGetPlatformDb.mockReturnValue(null);
    await expect(getOAuthCredentialsCached('OAuthProvider')).rejects.toThrow('D1 database not available');
  });
});
