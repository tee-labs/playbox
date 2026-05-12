'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Spin,
  Alert,
  Popconfirm,
  message,
  Switch,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface ProviderRow {
  id: number;
  name: string;
  type: string;
  family: string;
  endpoint: string;
  key: string;
  models: string[];
  auth_type: string;
  auto_models: string;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const familyColors: Record<string, string> = {
  openai: '#52c41a',
  anthropic: '#fa8c16',
  gemini: '#1890ff',
  rerank: '#722ed1',
  embedding: '#13c2c2',
};

const familyLabels: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  rerank: 'Rerank',
  embedding: 'Embedding',
};

const typeOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'gemini-cli', label: 'Gemini CLI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'worker', label: 'Worker' },
];

const familyOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'rerank', label: 'Rerank' },
];

const authTypeOptions = [
  { value: 'bearer', label: 'Bearer' },
  { value: 'header', label: 'Header' },
];

interface FormValues {
  name: string;
  type: string;
  family: string;
  endpoint: string;
  key: string;
  models: string[];
  auth_type: string;
  auto_models: string;
  sort_order: number;
  enabled: boolean;
}

export default function ProviderConfigTab() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderRow | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/providers');
      const data = (await response.json()) as { success?: boolean; providers?: ProviderRow[]; error?: string };

      if (data.success) {
        setProviders(data.providers || []);
      } else {
        setError(data.error || 'Failed to fetch providers');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleToggleEnabled = async (id: number, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !currentEnabled } : p)));
      } else {
        message.error(data.error || 'Failed to update provider');
      }
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/providers/${id}`, { method: 'DELETE' });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (data.success) {
        message.success('Provider deleted');
        fetchProviders();
      } else {
        message.error(data.error || 'Failed to delete provider');
      }
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const openCreateModal = () => {
    setEditingProvider(null);
    form.resetFields();
    form.setFieldsValue({
      auth_type: 'bearer',
      sort_order: 0,
      enabled: true,
      models: [],
      auto_models: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (record: ProviderRow) => {
    setEditingProvider(record);
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      family: record.family,
      endpoint: record.endpoint,
      key: record.key,
      models: record.models || [],
      auth_type: record.auth_type || 'bearer',
      auto_models: record.auto_models || '',
      sort_order: record.sort_order ?? 0,
      enabled: record.enabled,
    });
    setModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);

      const url = editingProvider ? `/api/admin/providers/${editingProvider.id}` : '/api/admin/providers';
      const method = editingProvider ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };

      if (data.success) {
        message.success(editingProvider ? 'Provider updated' : 'Provider created');
        setModalOpen(false);
        fetchProviders();
      } else {
        message.error(data.error || `Failed to ${editingProvider ? 'update' : 'create'} provider`);
      }
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) {
        // form validation error — already shown by antd
        return;
      }
      message.error((err as Error).message);
    } finally {
      setModalLoading(false);
    }
  };

  const columns: ColumnsType<ProviderRow> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      render: (name: string, record) => <Tag color={familyColors[record.family] || '#1890ff'}>{name}</Tag>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Family',
      dataIndex: 'family',
      key: 'family',
      width: 110,
      render: (family: string) => <Tag color={familyColors[family] || 'default'}>{familyLabels[family] || family}</Tag>,
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
      ellipsis: true,
      render: (endpoint: string) => (
        <code style={{ fontSize: '12px', fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" }}>{endpoint}</code>
      ),
    },
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      width: 200,
      render: (key: string) => (
        <code style={{ fontSize: '12px', fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" }}>
          {key}
        </code>
      ),
    },
    {
      title: 'Models',
      dataIndex: 'models',
      key: 'models',
      width: 80,
      render: (models: string[]) => <Tag color={models?.length > 0 ? 'green' : 'default'}>{models?.length || 0}</Tag>,
    },
{
    title: 'Auth',
    dataIndex: 'auth_type',
    key: 'auth_type',
    width: 80,
    render: (authType: string) => <Tag>{authType || 'bearer'}</Tag>,
  },
  {
    title: 'Auto Models',
    dataIndex: 'auto_models',
    key: 'auto_models',
    width: 120,
    ellipsis: true,
    render: (autoModels: string) =>
      autoModels ? (
        <code style={{ fontSize: '11px', fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" }}>
          {autoModels}
        </code>
      ) : (
        <Tag>全部</Tag>
      ),
  },
  {
    title: 'Sort',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 60,
      render: (sortOrder: number) => <span>{sortOrder ?? 0}</span>,
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean, record) => (
        <Switch size="small" checked={enabled} onChange={() => handleToggleEnabled(record.id, enabled)} />
      ),
    },
    {
      title: 'Actions',
      key: '_actions',
      width: 90,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEditModal(record)} />
          <Popconfirm
            title="确认删除此 Provider?"
            description="此操作不可撤销。"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            okType="danger"
          >
            <Button type="text" icon={<DeleteOutlined />} danger size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading && providers.length === 0) {
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Title level={5} style={{ margin: 0 }}>
            <SettingOutlined style={{ marginRight: 8 }} />
            Total Providers: {providers.length}
          </Title>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={fetchProviders} size="middle">
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} size="middle">
              添加 Provider
            </Button>
          </Space>
        </div>
      </Card>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 16 }}>
        <Table
          columns={columns}
          dataSource={providers}
          rowKey="id"
          loading={loading && providers.length > 0}
          pagination={false}
          scroll={{ x: 1000, y: 'calc(100vh - 350px)' }}
          size="small"
        />
      </div>

      <Modal
        title={editingProvider ? '编辑 Provider' : '添加 Provider'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading}
        okText={editingProvider ? '保存' : '创建'}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter provider name' }]}>
            <Input placeholder="e.g. longcat" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Required' }]} style={{ width: 200 }}>
              <Select options={typeOptions} placeholder="Select type" />
            </Form.Item>
            <Form.Item name="family" label="Family" rules={[{ required: true, message: 'Required' }]} style={{ width: 200 }}>
              <Select options={familyOptions} placeholder="Select family" />
            </Form.Item>
          </Space>

          <Form.Item name="endpoint" label="Endpoint" rules={[{ required: true, message: 'Please enter endpoint URL' }]}>
            <Input
              placeholder="https://api.example.com/v1"
              style={{
                fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                fontSize: 13,
              }}
            />
          </Form.Item>

          <Form.Item name="key" label="API Key" rules={[{ required: true, message: 'Please enter API key' }]}>
            <Input.Password
              placeholder="sk-..."
              style={{
                fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                fontSize: 13,
              }}
            />
          </Form.Item>

          <Form.Item name="models" label="Models" extra="输入模型 ID 后按 Enter 添加">
            <Select mode="tags" placeholder="输入模型 ID..." tokenSeparators={[',']} style={{ width: '100%' }} open={false} />
          </Form.Item>

          <Form.Item
            name="auto_models"
            label="Auto Models"
            extra="留空则随机从 Models 中选取；填写逗号分割的模型 ID 则从中随机选取"
          >
            <Input
              placeholder="model-a,model-b（留空 = 全部随机）"
              style={{
                fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                fontSize: 13,
              }}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="auth_type" label="Auth Type" style={{ width: 150 }}>
              <Select options={authTypeOptions} />
            </Form.Item>
            <Form.Item name="sort_order" label="Sort Order" style={{ width: 120 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="enabled" label="Enabled" valuePropName="checked" style={{ width: 80 }}>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
