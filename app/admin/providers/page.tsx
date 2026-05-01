'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Collapse, Table, Tag, Space, Button, Spin, Alert, Tooltip, Modal, Input } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  SearchOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

const { Panel } = Collapse;

interface ModelInfo {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

interface ProviderModels {
  provider: string;
  family: string;
  endpoint: string;
  models: string[];
  fetched?: ModelInfo[];
  error?: string;
}

interface ProvidersResponse {
  success: boolean;
  providers: {
    openai: ProviderModels[];
    anthropic: ProviderModels[];
    gemini: ProviderModels[];
  };
}

interface AllModelsResponse {
  success: boolean;
  provider: string;
  family: string;
  endpoint: string;
  configuredModels: string[];
  models: ModelInfo[];
  error?: string;
}

interface SpeedTestState {
  status: 'idle' | 'testing' | 'success' | 'error';
  latency?: number;
  error?: string;
}

type SpeedTestResults = Record<string, SpeedTestState>;

type ModelSearchState = Record<string, string>;

const familyColors: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d97706',
  gemini: '#4285f4',
};

const familyLabels: Record<string, string> = {
  openai: 'OpenAI Compatible',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
};

function speedTestKey(provider: string, model: string) {
  return `${provider}::${model}`;
}

const DELAY_BETWEEN_TESTS_MS = 1000;

export default function ProvidersPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speedTestResults, setSpeedTestResults] = useState<SpeedTestResults>({});
  const [batchTestingProvider, setBatchTestingProvider] = useState<string | null>(null);
  const [modelSearchTerms, setModelSearchTerms] = useState<ModelSearchState>({});
  const abortRef = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProvider, setModalProvider] = useState<ProviderModels | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalModels, setModalModels] = useState<ModelInfo[]>([]);
  const [modalConfiguredModels, setModalConfiguredModels] = useState<string[]>([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/providers/models');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = (await response.json()) as ProvidersResponse;
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const runSpeedTest = useCallback(async (provider: string, model: string) => {
    const key = speedTestKey(provider, model);
    setSpeedTestResults((prev) => ({ ...prev, [key]: { status: 'testing' } }));

    try {
      const response = await fetch('/api/admin/providers/speed-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model }),
      });
      const json = (await response.json()) as {
        success: boolean;
        result?: { latency: number; error?: string };
        error?: string;
      };

      if (json.success && json.result) {
        setSpeedTestResults((prev) => ({
          ...prev,
          [key]: {
            status: json.result!.error ? 'error' : 'success',
            latency: json.result!.latency,
            error: json.result!.error,
          },
        }));
      } else {
        setSpeedTestResults((prev) => ({
          ...prev,
          [key]: { status: 'error', error: json.error || 'Unknown error' },
        }));
      }
    } catch (err) {
      setSpeedTestResults((prev) => ({
        ...prev,
        [key]: { status: 'error', error: (err as Error).message },
      }));
    }
  }, []);

  const runBatchSpeedTest = useCallback(
    async (providerName: string, models: string[]) => {
      setBatchTestingProvider(providerName);
      abortRef.current = false;

      for (const model of models) {
        if (abortRef.current) break;
        await runSpeedTest(providerName, model);
        if (model !== models[models.length - 1]) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_TESTS_MS));
        }
      }

      setBatchTestingProvider(null);
    },
    [runSpeedTest]
  );

  const stopBatchTest = useCallback(() => {
    abortRef.current = true;
    setBatchTestingProvider(null);
  }, []);

  const filterModels = (models: ModelInfo[], searchTerm: string) => {
    if (!searchTerm.trim()) return models;
    const term = searchTerm.toLowerCase();
    return models.filter((m) => m.id.toLowerCase().includes(term));
  };

  const handleModelSearch = (providerKey: string, value: string) => {
    setModelSearchTerms((prev) => ({ ...prev, [providerKey]: value }));
  };

  const getProviderKey = (provider: string, family: string) => `${family}:${provider}`;

  const openModal = useCallback(async (record: ProviderModels) => {
    setModalProvider(record);
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalModels([]);
    setModalConfiguredModels([]);
    setModalSearchTerm('');

    try {
      const response = await fetch(`/api/admin/providers/models/${encodeURIComponent(record.provider)}`);
      const json = (await response.json()) as AllModelsResponse;
      if (json.success) {
        setModalModels(json.models || []);
        setModalConfiguredModels(json.configuredModels || []);
      } else {
        setModalError(json.error || 'Failed to fetch models');
      }
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalProvider(null);
  }, []);

  const renderSpeedTestResult = (provider: string, model: string) => {
    const key = speedTestKey(provider, model);
    const result = speedTestResults[key];

    if (!result || result.status === 'idle') {
      return (
        <Button size="small" icon={<ThunderboltOutlined />} onClick={() => runSpeedTest(provider, model)}>
          测速
        </Button>
      );
    }

    if (result.status === 'testing') {
      return <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />;
    }

    if (result.status === 'success') {
      return <Tag color="green">{result.latency}ms</Tag>;
    }

    return (
      <Tooltip title={result.error}>
        <Tag color="red" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {result.error || 'Error'}
        </Tag>
      </Tooltip>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Loading provider models..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        action={
          <Space>
            <Tag onClick={fetchProviders} style={{ cursor: 'pointer' }}>
              Retry
            </Tag>
          </Space>
        }
      />
    );
  }

  if (!data) return null;

  const columns = () => [
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
      ellipsis: true,
    },
    {
      title: 'Configured',
      dataIndex: 'models',
      key: 'configured',
      render: (models: string[]) => <Tag color={models?.length > 0 ? 'green' : 'default'}>{models?.length || 0} models</Tag>,
    },
    {
      title: 'API Status',
      dataIndex: 'error',
      key: 'status',
      render: (error?: string) =>
        error ? (
          <Space>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            <span style={{ color: '#ff4d4f' }}>{error}</span>
          </Space>
        ) : (
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a' }}>Connected</span>
          </Space>
        ),
    },
    {
      title: '全部模型',
      key: 'all-models',
      width: 120,
      render: (_: unknown, record: ProviderModels) => (
        <Button size="small" icon={<AppstoreOutlined />} onClick={() => openModal(record)}>
          全部模型
        </Button>
      ),
    },
    {
      title: '测速',
      key: 'speed-test',
      width: 120,
      render: (_: unknown, record: ProviderModels) => {
        const isBatching = batchTestingProvider === record.provider;
        return (
          <Button
            size="small"
            type={isBatching ? 'primary' : 'default'}
            danger={isBatching}
            icon={<ThunderboltOutlined />}
            onClick={() => (isBatching ? stopBatchTest() : runBatchSpeedTest(record.provider, record.models || []))}
          >
            {isBatching ? '停止' : '全部测速'}
          </Button>
        );
      },
    },
  ];

  const configuredModelColumns = (providerName: string) => [
    {
      title: 'Model ID',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <code style={{ fontSize: '12px' }}>{text}</code>,
    },
    {
      title: '测速',
      key: 'speed-test',
      width: 140,
      render: (_: unknown, record: { id: string }) => renderSpeedTestResult(providerName, record.id),
    },
  ];

  const renderFamilyPanel = (family: string, providers: ProviderModels[]) => (
    <Panel
      header={
        <Space>
          <ApiOutlined style={{ color: familyColors[family] }} />
          <span style={{ fontWeight: 500 }}>{familyLabels[family]}</span>
          <Tag color={familyColors[family]}>{providers.length} providers</Tag>
        </Space>
      }
      key={family}
    >
      <Table
        dataSource={providers}
        columns={columns()}
        rowKey="provider"
        pagination={false}
        size="small"
        expandable={{
          expandedRowRender: (record) => {
            const configuredModels = record.models || [];
            const providerKey = getProviderKey(record.provider, record.provider);
            const searchTerm = modelSearchTerms[providerKey] || '';
            const filteredModels = searchTerm.trim()
              ? configuredModels.filter((m) => m.toLowerCase().includes(searchTerm.toLowerCase()))
              : configuredModels;
            const displayModels = filteredModels.map((m) => ({ id: m }));

            return (
              <div style={{ margin: '8px 0' }}>
                <div style={{ marginBottom: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>已配置模型:</span>
                  <Input
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="搜索模型 ID..."
                    value={searchTerm}
                    onChange={(e) => handleModelSearch(providerKey, e.target.value)}
                    style={{ width: 200 }}
                    allowClear
                    size="small"
                  />
                  {searchTerm && (
                    <span style={{ color: '#666', fontSize: '12px' }}>
                      ({filteredModels.length} of {configuredModels.length})
                    </span>
                  )}
                </div>
                <Table
                  dataSource={displayModels}
                  columns={configuredModelColumns(record.provider)}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  showHeader={false}
                />
              </div>
            );
          },
          rowExpandable: (record) => (record.models?.length || 0) > 0,
        }}
      />
    </Panel>
  );

  return (
    <div>
      <Space style={{ marginBottom: '16px' }} wrap>
        <Tag onClick={fetchProviders} style={{ cursor: 'pointer' }}>
          Refresh
        </Tag>
      </Space>
      <Card>
        <Collapse defaultActiveKey={['openai', 'anthropic', 'gemini']}>
          {renderFamilyPanel('openai', data.providers.openai)}
          {renderFamilyPanel('anthropic', data.providers.anthropic)}
          {renderFamilyPanel('gemini', data.providers.gemini)}
        </Collapse>
      </Card>

      <Modal
        title={
          modalProvider ? (
            <Space size="small" wrap>
              <AppstoreOutlined />
              <span style={{ fontSize: '14px' }}>{modalProvider.provider} - 全部模型</span>
              <Tag color={familyColors[modalProvider.family]}>{familyLabels[modalProvider.family]}</Tag>
            </Space>
          ) : (
            '全部模型'
          )
        }
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={window.innerWidth < 768 ? '95%' : 800}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {modalLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="正在获取模型列表..." />
          </div>
        ) : modalError ? (
          <Alert message="获取模型失败" description={modalError} type="error" showIcon />
        ) : (
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Input
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="搜索模型 ID..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                style={{ width: 250 }}
                allowClear
                size="small"
              />
              {modalSearchTerm && (
                <span style={{ color: '#666', fontSize: '12px' }}>
                  ({filterModels(modalModels, modalSearchTerm).length} of {modalModels.length})
                </span>
              )}
              <div style={{ flex: 1 }} />
              <Tag color="blue">{modalConfiguredModels.length} configured</Tag>
              <Tag color="cyan">{modalModels.length} total</Tag>
            </div>
            <Table
              dataSource={filterModels(modalModels, modalSearchTerm)}
              columns={[
                {
                  title: 'Model ID',
                  dataIndex: 'id',
                  key: 'id',
                  render: (text: string) => (
                    <Space>
                      <code style={{ fontSize: '12px' }}>{text}</code>
                      {modalConfiguredModels.includes(text) && (
                        <Tag color="green" style={{ marginLeft: 4 }}>
                          Configured
                        </Tag>
                      )}
                    </Space>
                  ),
                },
                {
                  title: 'Owner',
                  dataIndex: 'owned_by',
                  key: 'owned_by',
                  render: (text?: string) => (text ? <Tag>{text}</Tag> : '-'),
                },
                {
                  title: '测速',
                  key: 'speed-test',
                  width: 140,
                  render: (_: unknown, record: ModelInfo) =>
                    modalProvider ? renderSpeedTestResult(modalProvider.provider, record.id) : null,
                },
              ]}
              rowKey="id"
              pagination={{ pageSize: 20, size: 'small' }}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
