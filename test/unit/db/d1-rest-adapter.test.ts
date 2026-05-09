/**
 * Unit tests for D1 REST API adapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { D1RestAdapter, d1RestAdapter, type D1RestOptions } from '../../../src/db/d1-rest-adapter';

describe('D1RestAdapter', () => {
  const mockOptions: D1RestOptions = {
    accountId: 'test-account-id',
    databaseId: 'test-database-id',
    apiToken: 'test-api-token',
  };

  const createMockFetch = (responseData: unknown, status = 200) => {
    return vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
    });
  };

  describe('prepare', () => {
    it('should return a Statement with bind method', () => {
      const mockFetch = vi.fn();
      const adapter = new D1RestAdapter(mockOptions);

      // Access private fetch for testing
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const statement = adapter.prepare('SELECT * FROM users');
      expect(statement).toBeDefined();
      expect(typeof statement.bind).toBe('function');
    });
  });

  describe('bind and execute', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should execute all() and return query results', async () => {
      const mockResponse = {
        success: true,
        result: [
          {
            success: true,
            meta: { changes: 0, rows_read: 2, rows_written: 0 },
            results: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
          },
        ],
      };

      mockFetch = createMockFetch(mockResponse);

      const adapter = new D1RestAdapter(mockOptions);
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const statement = adapter.prepare('SELECT * FROM users WHERE id = ?');
      const boundStatement = statement.bind(1);

      const result = await boundStatement.all();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({ id: 1, name: 'Alice' });
      expect(result.meta?.rows_read).toBe(2);
    });

    it('should execute first() and return single row', async () => {
      const mockResponse = {
        success: true,
        result: [
          {
            success: true,
            meta: { changes: 0, rows_read: 1 },
            results: [{ id: 1, name: 'Alice' }],
          },
        ],
      };

      mockFetch = createMockFetch(mockResponse);

      const adapter = new D1RestAdapter(mockOptions);
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const statement = adapter.prepare('SELECT * FROM users WHERE id = ?');
      const boundStatement = statement.bind(1);

      const result = await boundStatement.first();

      expect(result.results).toEqual({ id: 1, name: 'Alice' });
    });

    it('should return null for first() when no results', async () => {
      const mockResponse = {
        success: true,
        result: [
          {
            success: true,
            meta: { changes: 0, rows_read: 0 },
            results: [],
          },
        ],
      };

      mockFetch = createMockFetch(mockResponse);

      const adapter = new D1RestAdapter(mockOptions);
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const statement = adapter.prepare('SELECT * FROM users WHERE id = ?');
      const boundStatement = statement.bind(999);

      const result = await boundStatement.first();

      expect(result.results).toBeNull();
    });

    it('should execute run() for write operations', async () => {
      const mockResponse = {
        success: true,
        result: [
          {
            success: true,
            meta: { changes: 1, rows_written: 1 },
            results: [],
          },
        ],
      };

      mockFetch = createMockFetch(mockResponse);

      const adapter = new D1RestAdapter(mockOptions);
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const statement = adapter.prepare('UPDATE users SET name = ? WHERE id = ?');
      const boundStatement = statement.bind('Charlie', 1);

      const result = await boundStatement.run();

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
      expect(result.meta?.changes).toBe(1);
      expect(result.meta?.rows_written).toBe(1);
    });

    it('should throw error on API failure', async () => {
      mockFetch = createMockFetch({ success: false, errors: [{ code: 1000, message: 'SQL syntax error' }] }, 400);

      const adapter = new D1RestAdapter(mockOptions);
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const statement = adapter.prepare('SELECT * FROM invalid_table');
      const boundStatement = statement.bind();

      await expect(boundStatement.all()).rejects.toThrow('SQL syntax error');
    });

    it('should handle HTTP errors', async () => {
      mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Access denied',
      });

      const adapter = new D1RestAdapter(mockOptions);
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const statement = adapter.prepare('SELECT * FROM users');
      const boundStatement = statement.bind();

      await expect(boundStatement.all()).rejects.toThrow('D1 REST API error: 403 Forbidden');
    });
  });

  describe('batch', () => {
    it('should execute multiple statements', async () => {
      const mockResponse = {
        success: true,
        result: [
          {
            success: true,
            meta: { changes: 0, rows_read: 1 },
            results: [{ id: 1 }],
          },
        ],
      };

      const mockFetch = createMockFetch(mockResponse);

      const adapter = new D1RestAdapter(mockOptions);
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const result = await adapter.batch(['SELECT 1', 'SELECT 2']);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return false if any statement fails', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: [{ success: true, meta: {}, results: [] }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: false,
            errors: [{ code: 1000, message: 'Error' }],
          }),
        });

      const adapter = new D1RestAdapter(mockOptions);
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const result = await adapter.batch(['SELECT 1', 'SELECT 2']);

      expect(result.success).toBe(false);
    });
  });

  describe('exec', () => {
    it('should execute raw SQL', async () => {
      const mockResponse = {
        success: true,
        result: [
          {
            success: true,
            meta: { changes: 5, rows_written: 5 },
            results: [],
          },
        ],
      };

      const mockFetch = createMockFetch(mockResponse);

      const adapter = new D1RestAdapter(mockOptions);
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const result = await adapter.exec('DELETE FROM users WHERE active = 0');

      expect(result.success).toBe(true);
      expect(result.meta?.changes).toBe(5);
      expect(result.meta?.rows_written).toBe(5);
    });
  });

  describe('dump', () => {
    it('should throw error as not supported', async () => {
      const adapter = new D1RestAdapter(mockOptions);

      await expect(adapter.dump()).rejects.toThrow('dump() is not supported via D1 REST API');
    });
  });

  describe('d1RestAdapter factory', () => {
    it('should create D1RestAdapter instance', () => {
      const adapter = d1RestAdapter(mockOptions);
      expect(adapter).toBeInstanceOf(D1RestAdapter);
    });
  });

  describe('custom baseUrl', () => {
    it('should use custom baseUrl when provided', async () => {
      const customBaseUrl = 'https://api.example.com';
      const mockResponse = {
        success: true,
        result: [{ success: true, meta: {}, results: [{ id: 1 }] }],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const adapter = new D1RestAdapter({ ...mockOptions, baseUrl: customBaseUrl });
      (adapter as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

      const statement = adapter.prepare('SELECT 1');
      await statement.bind().all();

      // Verify the URL used the custom baseUrl
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0].toString()).toContain(customBaseUrl);
    });
  });
});