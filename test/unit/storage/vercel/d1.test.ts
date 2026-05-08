import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock @vercel/postgres — factory must not reference external variables due to hoisting
vi.mock('@vercel/postgres', () => ({
  sql: {
    query: vi.fn(),
  },
}));

// Import after mock
import { VercelD1Adapter } from '../../../../src/storage/vercel/d1';
import { sql } from '@vercel/postgres';

const mockSqlQuery = sql.query as unknown as ReturnType<typeof vi.fn>;

describe('VercelD1Adapter', () => {
  let adapter: VercelD1Adapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new VercelD1Adapter();
  });

  describe('SQL translation', () => {
    it('translates ? placeholders to $1, $2, ...', async () => {
      mockSqlQuery.mockResolvedValue({ rows: [] });
      await adapter.query('SELECT * FROM users WHERE id = ? AND name = ?', [1, 'Alice']);
      expect(mockSqlQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 AND name = $2',
        [1, 'Alice']
      );
    });

    it('translates datetime("now") to NOW()', async () => {
      mockSqlQuery.mockResolvedValue({ rows: [] });
      await adapter.query('SELECT * FROM users WHERE created_at > datetime("now")');
      expect(mockSqlQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE created_at > NOW()',
        []
      );
    });

    it('handles query without params', async () => {
      mockSqlQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Alice' }] });
      const result = await adapter.query('SELECT * FROM users');
      expect(mockSqlQuery).toHaveBeenCalledWith('SELECT * FROM users', []);
      expect(result.results).toEqual([{ id: 1, name: 'Alice' }]);
    });
  });

  describe('query', () => {
    it('returns rows from Vercel Postgres', async () => {
      mockSqlQuery.mockResolvedValue({
        rows: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      });
      const result = await adapter.query('SELECT * FROM users');
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({ id: 1, name: 'Alice' });
    });

    it('returns empty results on error', async () => {
      mockSqlQuery.mockRejectedValue(new Error('Connection failed'));
      const result = await adapter.query('SELECT * FROM users');
      expect(result).toEqual({ results: [] });
    });
  });

  describe('execute', () => {
    it('executes INSERT with translated params', async () => {
      mockSqlQuery.mockResolvedValue({ rowCount: 1 });
      const result = await adapter.execute('INSERT INTO users (id, name) VALUES (?, ?)', [1, 'Alice']);
      expect(result).toEqual({ success: true });
      expect(mockSqlQuery).toHaveBeenCalledWith(
        'INSERT INTO users (id, name) VALUES ($1, $2)',
        [1, 'Alice']
      );
    });

    it('executes UPDATE with translated params', async () => {
      mockSqlQuery.mockResolvedValue({ rowCount: 1 });
      const result = await adapter.execute('UPDATE users SET name = ? WHERE id = ?', ['Bob', 1]);
      expect(result).toEqual({ success: true });
      expect(mockSqlQuery).toHaveBeenCalledWith(
        'UPDATE users SET name = $1 WHERE id = $2',
        ['Bob', 1]
      );
    });

    it('executes DELETE with translated params', async () => {
      mockSqlQuery.mockResolvedValue({ rowCount: 1 });
      const result = await adapter.execute('DELETE FROM users WHERE id = ?', [1]);
      expect(result).toEqual({ success: true });
      expect(mockSqlQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1',
        [1]
      );
    });

    it('returns failure on error', async () => {
      mockSqlQuery.mockRejectedValue(new Error('Connection failed'));
      const result = await adapter.execute('INSERT INTO users (id) VALUES (?)', [1]);
      expect(result).toEqual({ success: false });
    });
  });

  describe('interface compliance', () => {
    it('implements D1Storage interface', () => {
      expect(typeof adapter.query).toBe('function');
      expect(typeof adapter.execute).toBe('function');
    });
  });
});
