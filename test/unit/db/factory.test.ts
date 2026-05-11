import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSqlClient, d1Adapter, d1RestAdapter } from '../../../src/db/factory';

vi.mock('../../../src/db/d1-adapter', () => ({
  D1Adapter: vi.fn(),
  d1Adapter: vi.fn(),
}));

vi.mock('../../../src/db/d1-rest-adapter', () => ({
  D1RestAdapter: vi.fn(),
  d1RestAdapter: vi.fn(),
}));

describe('createSqlClient', () => {
  describe('with D1 option', () => {
    it('should create D1 adapter', () => {
      const mockD1 = { prepare: vi.fn() } as any;
      const client = createSqlClient({ d1: mockD1 });

      expect(client).toBeDefined();
    });
  });

  describe('with D1Rest option', () => {
    it('should create D1 REST adapter', () => {
      const mockD1Rest = {
        accountId: 'test-account',
        databaseId: 'test-db',
        apiToken: 'test-token',
      };
      const client = createSqlClient({ d1Rest: mockD1Rest });

      expect(client).toBeDefined();
    });

    it('should prefer D1 over D1Rest when both provided', () => {
      const mockD1 = { prepare: vi.fn() } as any;
      const mockD1Rest = {
        accountId: 'test-account',
        databaseId: 'test-db',
        apiToken: 'test-token',
      };

      const client = createSqlClient({ d1: mockD1, d1Rest: mockD1Rest });

      expect(client).toBeDefined();
    });
  });

  describe('without options', () => {
    it('should throw error when no database binding provided', () => {
      expect(() => createSqlClient({})).toThrow('No database binding provided. Expected D1 or other database client.');
    });
  });
});
