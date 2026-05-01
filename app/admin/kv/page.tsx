'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, Table, Input, Button, Space, Spin, Alert, Popconfirm, message } from 'antd';
import {
  SearchOutlined,
  ClearOutlined,
  PlusOutlined,
  UploadOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import NamespaceSelector from './components/NamespaceSelector';
import type { KVNamespaceOption, KVKeyDisplay } from '../types/kv';
import type { KVKeyInfo } from '@/types/kv';

interface KVNamespacesResponse {
  success: boolean;
  namespaces?: { binding: string; id: string }[];
  error?: string;
}

interface KVKeysResponse {
  success: boolean;
  keys?: KVKeyInfo[];
  list_complete?: boolean;
  cursor?: string;
  error?: string;
}

interface KVActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}
const KVFormModal = dynamic(() => import('./components/KVFormModal'), { ssr: false });
const KVImportModal = dynamic(() => import('./components/KVImportModal'), { ssr: false });
const KeyValueDrawer = dynamic(() => import('./components/KeyValueDrawer'), { ssr: false });

export default function KVAdminPage() {
  const [namespaces, setNamespaces] = useState<KVNamespaceOption[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [keys, setKeys] = useState<KVKeyDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [listComplete, setListComplete] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [viewingKey, setViewingKey] = useState<string | null>(null);

  const fetchNamespaces = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/kv');
      const data = (await response.json()) as KVNamespacesResponse;
      if (data.success) {
        const nsOptions: KVNamespaceOption[] = (data.namespaces ?? []).map((ns) => ({
          value: ns.binding,
          label: ns.binding,
          id: ns.id,
        }));
        setNamespaces(nsOptions);
        if (nsOptions.length > 0 && !selectedNamespace) {
          setSelectedNamespace(nsOptions[0].value);
        }
      } else {
        setError(data.error || 'Failed to fetch namespaces');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedNamespace]);

  const fetchKeys = useCallback(
    async (resetCursor = false) => {
      if (!selectedNamespace) return;

      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (prefix) params.set('prefix', prefix);
        if (!resetCursor && cursor && !listComplete) params.set('cursor', cursor);
        params.set('limit', '100');

        const response = await fetch(`/api/admin/kv/${selectedNamespace}?${params}`);
        const data = (await response.json()) as KVKeysResponse;

        if (data.success) {
          const keyDisplays: KVKeyDisplay[] = (data.keys ?? []).map((k) => ({
            name: k.name,
            expiration: k.expiration,
            expirationFormatted: k.expiration ? new Date(k.expiration * 1000).toLocaleString() : 'Never',
          }));
          setKeys(keyDisplays);
          setListComplete(data.list_complete ?? false);
          setCursor(data.cursor || undefined);
        } else {
          setError(data.error || 'Failed to fetch keys');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [selectedNamespace, prefix, cursor, listComplete]
  );

  useEffect(() => {
    fetchNamespaces();
  }, [fetchNamespaces]);

  useEffect(() => {
    if (selectedNamespace) {
      setCursor(undefined);
      setListComplete(true);
      fetchKeys(true);
    }
  }, [selectedNamespace, prefix, fetchKeys]);

  const handleSearch = () => {
    setCursor(undefined);
    fetchKeys(true);
  };

  const handleClear = () => {
    setPrefix('');
    setCursor(undefined);
  };

  const handleRefresh = () => {
    setCursor(undefined);
    fetchKeys(true);
  };

  const handleCreate = () => {
    setEditingKey(null);
    setFormModalOpen(true);
  };

  const handleEdit = (keyName: string) => {
    setEditingKey(keyName);
    setFormModalOpen(true);
  };

  const handleView = (keyName: string) => {
    setViewingKey(keyName);
    setDrawerOpen(true);
  };

  const handleDelete = async (keyName: string) => {
    try {
      const encodedKey = encodeURIComponent(keyName);
      const response = await fetch(`/api/admin/kv/${selectedNamespace}/${encodedKey}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as KVActionResponse;
      if (data.success) {
        message.success(data.message);
        fetchKeys(true);
      } else {
        message.error(data.error || 'Failed to delete key');
      }
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;

    try {
      const response = await fetch(`/api/admin/kv/${selectedNamespace}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'delete',
          keys: selectedRowKeys,
        }),
      });
      const data = (await response.json()) as KVActionResponse;
      if (data.success) {
        message.success(data.message);
        setSelectedRowKeys([]);
        fetchKeys(true);
      } else {
        message.error(data.error || 'Failed to delete keys');
      }
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const handleImport = () => {
    setImportModalOpen(true);
  };

  const columns: ColumnsType<KVKeyDisplay> = [
    {
      title: 'Key',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text: string) => (
        <a onClick={() => handleView(text)} style={{ cursor: 'pointer' }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Expiration',
      dataIndex: 'expirationFormatted',
      key: 'expiration',
      width: 180,
    },
    {
      title: 'Actions',
      key: '_actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record.name)} size="small" />
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record.name)} size="small" />
          <Popconfirm title="Delete this key?" onConfirm={() => handleDelete(record.name)} okText="Delete" okType="danger">
            <Button type="text" icon={<DeleteOutlined />} danger size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  if (loading && namespaces.length === 0) {
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
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <DatabaseOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <NamespaceSelector
              namespaces={namespaces}
              selected={selectedNamespace}
              onChange={(ns) => {
                setSelectedNamespace(ns);
                setPrefix('');
                setSelectedRowKeys([]);
              }}
              loading={loading}
            />
          </div>
          <Space.Compact style={{ width: '100%', maxWidth: 400 }}>
            <Input
              placeholder="Filter by prefix..."
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              Search
            </Button>
            <Button icon={<ClearOutlined />} onClick={handleClear}>
              Clear
            </Button>
          </Space.Compact>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              New Key
            </Button>
            <Button icon={<UploadOutlined />} onClick={handleImport}>
              Import
            </Button>
          </Space>
        </Space>
      </Card>

      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Popconfirm
            title={`Delete ${selectedRowKeys.length} selected keys?`}
            onConfirm={handleBatchDelete}
            okText="Delete All"
            okType="danger"
          >
            <Button danger>Delete Selected ({selectedRowKeys.length})</Button>
          </Popconfirm>
        </div>
      )}

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table
          columns={columns}
          dataSource={keys}
          rowKey="name"
          loading={loading && keys.length === 0}
          rowSelection={rowSelection}
          pagination={false}
          scroll={{ x: 600, y: 'calc(100vh - 350px)' }}
          size="small"
        />
      </div>

      {!listComplete && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => fetchKeys(false)} loading={loading}>
            Load More
          </Button>
        </div>
      )}

      <KVFormModal
        open={formModalOpen}
        namespace={selectedNamespace}
        editingKey={editingKey}
        onClose={() => {
          setFormModalOpen(false);
          setEditingKey(null);
        }}
        onSuccess={() => {
          setFormModalOpen(false);
          setEditingKey(null);
          fetchKeys(true);
        }}
      />

      <KVImportModal
        open={importModalOpen}
        namespace={selectedNamespace}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false);
          fetchKeys(true);
        }}
      />

      <KeyValueDrawer
        open={drawerOpen}
        namespace={selectedNamespace}
        keyName={viewingKey}
        onClose={() => {
          setDrawerOpen(false);
          setViewingKey(null);
        }}
      />
    </div>
  );
}
