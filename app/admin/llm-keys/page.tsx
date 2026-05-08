'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Space, Spin, Alert, Popconfirm, message, Tag, Tooltip, Input, Typography } from 'antd';
const { Title } = Typography;
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  KeyOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
  last_used_at: string | null;
}

const CreateKeyModal = dynamic(() => import('./components/CreateKeyModal'), { ssr: false });

import dynamic from 'next/dynamic';

export default function LLMKeysAdminPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ api_key: string; name: string } | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/llm-keys');
      const data = (await response.json()) as { success?: boolean; error?: string; keys?: ApiKey[] };

      if (data.success) {
        setKeys(data.keys || []);
      } else {
        setError(data.error || 'Failed to fetch API keys');
      }
    } catch (_err) {
      message.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return apiKey;
    return apiKey.substring(0, 4) + '••••••••' + apiKey.substring(apiKey.length - 4);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('API key copied to clipboard');
    } catch (_err) {
      message.error('Failed to copy to clipboard');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/llm-keys/${id}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (data.success) {
        message.success('API key deleted');
        fetchKeys();
      } else {
        message.error(data.error || 'Failed to delete API key');
      }
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const handleCreate = () => {
    setNewKeyData(null);
    setCreateModalOpen(true);
  };

  const handleCreateSuccess = (newKey: { api_key: string; name: string }) => {
    setCreateModalOpen(false);
    setNewKeyData(newKey);
    fetchKeys();
  };

  const columns: ColumnsType<ApiKey> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <KeyOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: 'API Key',
      dataIndex: 'api_key',
      key: 'api_key',
      render: (apiKey: string, record: ApiKey) => {
        const isVisible = visibleKeys.has(record.id);
        const displayKey = isVisible ? apiKey : maskApiKey(apiKey);

        return (
          <Space>
            <Input
              value={displayKey}
              readOnly
              style={{ width: 200, fontFamily: 'monospace' }}
              suffix={
                <Space>
                  <Tooltip title={isVisible ? 'Hide key' : 'Show key'}>
                    <Button
                      type="text"
                      size="small"
                      icon={isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => toggleKeyVisibility(record.id)}
                    />
                  </Tooltip>
                  <Tooltip title="Copy key">
                    <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(apiKey)} />
                  </Tooltip>
                </Space>
              }
            />
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 180,
      render: (date: string | null) => {
        if (!date) return <Tag>Never</Tag>;
        const isExpired = dayjs(date).isBefore(dayjs());
        return <Tag color={isExpired ? 'red' : 'blue'}>{dayjs(date).format('YYYY-MM-DD HH:mm:ss')}</Tag>;
      },
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      width: 180,
      render: (date: string | null) => {
        if (!date) return <Tag color="default">Never</Tag>;
        return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: 'Actions',
      key: '_actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="Delete this API key?"
          description="This action cannot be undone."
          onConfirm={() => handleDelete(record.id)}
          okText="Delete"
          okType="danger"
        >
          <Button type="text" icon={<DeleteOutlined />} danger size="small" />
        </Popconfirm>
      ),
    },
  ];

  if (loading && keys.length === 0) {
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

      {newKeyData && (
        <Alert
          message="API Key Created"
          description={
            <div>
              <p style={{ margin: '0 0 8px 0' }}>Copy this key now. You will not be able to see it again.</p>
              <code
                style={{
                  display: 'block',
                  padding: 8,
                  background: '#fafafa',
                  borderRadius: 4,
                  fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                  fontSize: 13,
                  wordBreak: 'break-all',
                }}
              >
                {newKeyData.api_key}
              </code>
            </div>
          }
          type="success"
          closable
          onClose={() => setNewKeyData(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Title level={5} style={{ margin: 0 }}>
              Total API Keys: {keys.length}
            </Title>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={fetchKeys} size="middle">
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="middle">
                Create New Key
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 16 }}>
        <Table columns={columns} dataSource={keys} rowKey="id" loading={loading} pagination={false} scroll={{ x: 800 }} size="small" />
      </div>

      <CreateKeyModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={handleCreateSuccess} />
    </div>
  );
}
