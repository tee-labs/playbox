'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Select, Spin, Alert, Card, Row, Col, Statistic } from 'antd';
import { TableOutlined, DatabaseOutlined } from '@ant-design/icons';
import type { TableSchema, TableRow, ColumnInfo } from './types';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return isMobile;
};

interface TableActionResponse {
  success: boolean;
  error?: string;
}

interface TablesListResponse {
  success: boolean;
  tables?: TableSchema[];
  error?: string;
}

interface TableRowsResponse {
  success: boolean;
  rows?: TableRow[];
  columns?: ColumnInfo[];
  pagination?: { total: number; totalPages: number };
  error?: string;
}
const DataTable = dynamic(() => import('./components/DataTable'), { ssr: false });
const SearchBar = dynamic(() => import('./components/SearchBar'), { ssr: false });
const CreateRowModal = dynamic(() => import('./components/CreateRowModal'), { ssr: false });
const EditRowModal = dynamic(() => import('./components/EditRowModal'), { ssr: false });
const ImportModal = dynamic(() => import('./components/ImportModal'), { ssr: false });

export default function AdminPage() {
  const isMobile = useIsMobile();
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedTableSchema, setSelectedTableSchema] = useState<TableSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<TableRow[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [sort, setSort] = useState<string | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState<string>('');
  const [searchColumn, setSearchColumn] = useState<string>('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TableRow | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tables');
      const data = (await response.json()) as TablesListResponse;
      if (data.success) {
        setTables(data.tables ?? []);
        const tableList = data.tables ?? [];
        if (tableList.length > 0 && !selectedTable) {
          setSelectedTable(tableList[0].name);
          setSelectedTableSchema(tableList[0]);
        }
      } else {
        setError(data.error || 'Failed to fetch tables');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedTable]);

  const fetchRows = useCallback(async () => {
    if (!selectedTable) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(pagination.page));
      params.set('pageSize', String(pagination.pageSize));
      if (sort) {
        params.set('sort', sort);
        params.set('order', order);
      }
      if (search && searchColumn) {
        params.set('search', search);
        params.set('searchColumn', searchColumn);
      }

      const response = await fetch(`/api/admin/tables/${selectedTable}/rows?${params}`);
      const data = (await response.json()) as TableRowsResponse;

      if (data.success) {
        setRows(data.rows ?? []);
        setColumns(data.columns ?? []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 0,
        }));
      } else {
        setError(data.error || 'Failed to fetch rows');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, pagination.page, pagination.pageSize, sort, order, search, searchColumn]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (selectedTable) {
      const schema = tables.find((t) => t.name === selectedTable);
      setSelectedTableSchema(schema || null);
      fetchRows();
    }
  }, [selectedTable, fetchRows, tables]);

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSort(null);
    setSearch('');
    setSearchColumn('');
    setSelectedRowKeys([]);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({ ...prev, page, pageSize }));
  };

  const handleSort = (column: string, newOrder: 'asc' | 'desc' | null) => {
    if (newOrder) {
      setSort(column);
      setOrder(newOrder);
    } else {
      setSort(null);
    }
  };

  const handleSearch = (value: string, column: string) => {
    setSearch(value);
    setSearchColumn(column);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleEdit = (row: TableRow) => {
    setEditingRow(row);
    setEditModalOpen(true);
  };

  const handleDelete = async (rowid: number) => {
    try {
      const response = await fetch(`/api/admin/tables/${selectedTable}/rows/${rowid}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as TableActionResponse;
      if (data.success) {
        fetchRows();
      } else {
        setError(data.error || 'Failed to delete row');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;

    try {
      const response = await fetch(`/api/admin/tables/${selectedTable}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'delete',
          ids: selectedRowKeys,
        }),
      });
      const data = (await response.json()) as TableActionResponse;
      if (data.success) {
        setSelectedRowKeys([]);
        fetchRows();
      } else {
        setError(data.error || 'Failed to delete rows');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleImport = () => {
    setImportModalOpen(true);
  };

  const handleRefresh = () => {
    fetchRows();
  };

  if (loading && !selectedTable) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <Alert message="Error" description={error} type="error" closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />
      )}

      <Card style={{ marginBottom: 16 }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DatabaseOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <span style={{ fontSize: 16, fontWeight: 500 }}>Select Table</span>
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select a table"
              value={selectedTable}
              onChange={handleTableChange}
              options={tables.map((t) => ({ label: t.name, value: t.name }))}
            />
            <Statistic title="Tables" value={tables.length} prefix={<TableOutlined />} />
          </div>
        ) : (
          <Row gutter={16} align="middle">
            <Col>
              <DatabaseOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            </Col>
            <Col flex="auto">
              <Select
                style={{ width: 300 }}
                placeholder="Select a table"
                value={selectedTable}
                onChange={handleTableChange}
                options={tables.map((t) => ({ label: t.name, value: t.name }))}
              />
            </Col>
            <Col>
              <Statistic title="Tables" value={tables.length} prefix={<TableOutlined />} />
            </Col>
          </Row>
        )}
      </Card>

      {selectedTableSchema && (
        <>
          <SearchBar columns={columns} onSearch={handleSearch} onCreate={handleCreate} onImport={handleImport} onRefresh={handleRefresh} />

          <DataTable
            columns={columns}
            rows={rows}
            pagination={pagination}
            selectedRowKeys={selectedRowKeys}
            onRowSelect={setSelectedRowKeys}
            onPageChange={handlePageChange}
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBatchDelete={handleBatchDelete}
            loading={loading}
          />

          <CreateRowModal
            open={createModalOpen}
            table={selectedTable || ''}
            columns={columns}
            onClose={() => setCreateModalOpen(false)}
            onSuccess={() => {
              setCreateModalOpen(false);
              fetchRows();
            }}
          />

          <EditRowModal
            open={editModalOpen}
            table={selectedTable || ''}
            columns={columns}
            row={editingRow}
            onClose={() => {
              setEditModalOpen(false);
              setEditingRow(null);
            }}
            onSuccess={() => {
              setEditModalOpen(false);
              setEditingRow(null);
              fetchRows();
            }}
          />

          <ImportModal
            open={importModalOpen}
            table={selectedTable || ''}
            onClose={() => setImportModalOpen(false)}
            onSuccess={() => {
              setImportModalOpen(false);
              fetchRows();
            }}
          />
        </>
      )}
    </div>
  );
}
