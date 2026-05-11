/**
 * Unit tests for D1 adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { D1Adapter, d1Adapter } from '../../../src/db/d1-adapter';

type D1Meta = { changes?: number; last_row_id?: number; rows_read?: number; rows_written?: number };

function createMockD1Database(
  overrides: Partial<{
    prepare: ReturnType<typeof vi.fn>;
    batch: ReturnType<typeof vi.fn>;
    dump: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
  }> = {}
): {
  prepare: ReturnType<typeof vi.fn>;
  batch: ReturnType<typeof vi.fn>;
  dump: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
} {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [], success: true }),
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true, meta: {} }),
      }),
    }),
    batch: vi.fn().mockResolvedValue([{ results: [], success: true, meta: { changes: 0 } }]),
    dump: vi.fn().mockResolvedValue(new Uint8Array([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65])),
    exec: vi.fn().mockReturnValue({ count: 5 }),
    ...overrides,
  };
}

describe('D1Adapter', () => {
  let mockDb: ReturnType<typeof createMockD1Database>;

  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  describe('constructor', () => {
    it('should create adapter with D1Database', () => {
      const adapter = new D1Adapter(mockDb as any);
      expect(adapter).toBeDefined();
    });
  });

  describe('prepare', () => {
    it('should return statement with bind method', () => {
      const adapter = new D1Adapter(mockDb as any);
      const stmt = adapter.prepare('SELECT * FROM users');

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users');
      expect(typeof stmt.bind).toBe('function');
    });

    it('should bind parameters to statement', () => {
      const adapter = new D1Adapter(mockDb as any);
      const stmt = adapter.prepare('SELECT * FROM users WHERE id = ?');
      const bound = stmt.bind(1);

      const mockPrepare = mockDb.prepare('SELECT * FROM users WHERE id = ?');
      const mockBind = mockPrepare.bind(1);
      expect(mockBind.all).toBeDefined();
      expect(mockBind.first).toBeDefined();
      expect(mockBind.run).toBeDefined();
    });

    it('should support null binding', () => {
      const adapter = new D1Adapter(mockDb as any);
      const stmt = adapter.prepare('SELECT * FROM users WHERE id = ?');
      const bound = stmt.bind(null);

      expect(typeof bound.all).toBe('function');
      expect(typeof bound.first).toBe('function');
      expect(typeof bound.run).toBe('function');
    });
  });

  describe('bound statement - first()', () => {
    it('should return null when no row found', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [], success: true }),
        first: mockFirst,
        run: vi.fn().mockResolvedValue({ success: true, meta: {} }),
      });
      mockDb.prepare = vi.fn().mockReturnValue({ bind: mockBind });

      const adapter = new D1Adapter(mockDb as any);
      const stmt = adapter.prepare('SELECT * FROM users WHERE id = ?');
      const bound = stmt.bind(1);
      const result = await bound.first();

      expect(result).toEqual({ results: null });
    });

    it('should return row when found', async () => {
      const mockRow = { id: 1, name: 'test' };
      const mockFirst = vi.fn().mockResolvedValue(mockRow);
      const mockBind = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [], success: true }),
        first: mockFirst,
        run: vi.fn().mockResolvedValue({ success: true, meta: {} }),
      });
      mockDb.prepare = vi.fn().mockReturnValue({ bind: mockBind });

      const adapter = new D1Adapter(mockDb as any);
      const stmt = adapter.prepare('SELECT * FROM users WHERE id = ?');
      const bound = stmt.bind(1);
      const result = await bound.first<typeof mockRow>();

      expect(result).toEqual({ results: mockRow });
    });
  });

  describe('batch()', () => {
    it('should execute multiple statements in batch', async () => {
      const mockBatch = vi.fn().mockResolvedValue([
        { results: [], success: true, meta: { changes: 1 } },
        { results: [], success: true, meta: { changes: 2 } },
      ]);
      mockDb.batch = mockBatch;

      const adapter = new D1Adapter(mockDb as any);
      const result = await adapter.batch(['INSERT INTO a VALUES(1)', 'INSERT INTO b VALUES(2)']);

      expect(mockBatch).toHaveBeenCalledWith([mockDb.prepare('INSERT INTO a VALUES(1)'), mockDb.prepare('INSERT INTO b VALUES(2)')]);
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toHaveProperty('success', true);
    });

    it('should return batch results with meta', async () => {
      mockDb.batch = vi.fn().mockResolvedValue([{ results: [], success: true, meta: { changes: 5 } }]);

      const adapter = new D1Adapter(mockDb as any);
      const result = await adapter.batch(['DELETE FROM users']);

      expect(result.results[0].meta).toHaveProperty('changes', 5);
    });
  });

  describe('dump()', () => {
    it('should dump database contents as string', async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode('SQLite format 3');
      mockDb.dump = vi.fn().mockResolvedValue(data);

      const adapter = new D1Adapter(mockDb as any);
      const result = await adapter.dump();

      expect(mockDb.dump).toHaveBeenCalled();
      expect(result).toBe('SQLite format 3');
    });

    it('should handle empty dump', async () => {
      mockDb.dump = vi.fn().mockResolvedValue(new Uint8Array([]));

      const adapter = new D1Adapter(mockDb as any);
      const result = await adapter.dump();

      expect(result).toBe('');
    });
  });

  describe('exec()', () => {
    it('should execute raw SQL statement', async () => {
      const mockExec = vi.fn().mockReturnValue({ count: 10 });
      mockDb.exec = mockExec;

      const adapter = new D1Adapter(mockDb as any);
      const result = await adapter.exec('CREATE TABLE users (id INTEGER PRIMARY KEY)');

      expect(mockExec).toHaveBeenCalledWith('CREATE TABLE users (id INTEGER PRIMARY KEY)');
      expect(result.success).toBe(true);
      expect(result.meta).toHaveProperty('changes', 10);
    });

    it('should return empty results on exec', async () => {
      mockDb.exec = vi.fn().mockReturnValue({ count: 0 });

      const adapter = new D1Adapter(mockDb as any);
      const result = await adapter.exec('DROP TABLE IF EXISTS users');

      expect(result.results).toEqual([]);
      expect(result.meta).toHaveProperty('changes', 0);
    });

    it('should track changes count', async () => {
      mockDb.exec = vi.fn().mockReturnValue({ count: 100 });

      const adapter = new D1Adapter(mockDb as any);
      const result = await adapter.exec('INSERT INTO users VALUES(1)');

      expect(result.meta).toHaveProperty('changes', 100);
    });
  });

  describe('d1Adapter factory', () => {
    it('should create D1Adapter instance', () => {
      const adapter = d1Adapter(mockDb as any);
      expect(adapter).toBeInstanceOf(D1Adapter);
    });
  });
});
