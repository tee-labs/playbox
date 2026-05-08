'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, DatePicker, Button, Spin, Alert, Table, Statistic } from 'antd';
import { BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface AnalyticsRow {
  model: string;
  stream_type: string;
  provider: string;
  count: number;
}

interface TimeSeriesRow {
  timestamp: string;
  model: string;
  count: number;
}

interface TokenRow {
  model: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface TokenTimeSeriesRow {
  timestamp: string;
  model: string;
  total_tokens: number;
}

interface ModelStatsRow {
  model: string;
  provider: string;
  stream_types: string[];
  count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ApiKeyRow {
  api_key: string;
  count: number;
}

interface ApiKeyTokenRow {
  api_key: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ApiKeyMergedRow {
  api_key: string;
  count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

const PIE_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggregated, setAggregated] = useState<AnalyticsRow[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesRow[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [tokenStats, setTokenStats] = useState<TokenRow[]>([]);
  const [tokenTimeSeries, setTokenTimeSeries] = useState<TokenTimeSeriesRow[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalPromptTokens, setTotalPromptTokens] = useState(0);
  const [totalCompletionTokens, setTotalCompletionTokens] = useState(0);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(1, 'day'), dayjs()]);
  const [apiKeyStats, setApiKeyStats] = useState<ApiKeyRow[]>([]);
  const [apiKeyTokenStats, setApiKeyTokenStats] = useState<ApiKeyTokenRow[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = dateRange[0].format('YYYY-MM-DDTHH:mm:ss');
      const endDate = dateRange[1].format('YYYY-MM-DDTHH:mm:ss');

      const response = await fetch(`/api/admin/analytics?startDate=${startDate}&endDate=${endDate}`);
      const result = (await response.json()) as {
        success: boolean;
        aggregated?: AnalyticsRow[];
        timeSeries?: TimeSeriesRow[];
        totalRequests?: number;
        tokenStats?: TokenRow[];
        tokenTimeSeries?: TokenTimeSeriesRow[];
        totalTokens?: number;
        totalPromptTokens?: number;
        totalCompletionTokens?: number;
        apiKeyStats?: ApiKeyRow[];
        apiKeyTokenStats?: ApiKeyTokenRow[];
        error?: string;
      };

      if (result.success) {
        setAggregated(result.aggregated || []);
        setTimeSeries(result.timeSeries || []);
        setTotalRequests(result.totalRequests || 0);
        setTokenStats(result.tokenStats || []);
        setTokenTimeSeries(result.tokenTimeSeries || []);
        setTotalTokens(result.totalTokens || 0);
        setTotalPromptTokens(result.totalPromptTokens || 0);
        setTotalCompletionTokens(result.totalCompletionTokens || 0);
        setApiKeyStats(result.apiKeyStats || []);
        setApiKeyTokenStats(result.apiKeyTokenStats || []);
      } else {
        setError(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  const handleQuickRange = (days: number) => {
    setDateRange([dayjs().subtract(days, 'day'), dayjs()]);
  };

  const _columns: ColumnsType<AnalyticsRow> = [
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      sorter: (a, b) => a.model.localeCompare(b.model),
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
    },
    {
      title: 'Stream Type',
      dataIndex: 'stream_type',
      key: 'stream_type',
      filters: [
        { text: 'stream', value: 'stream' },
        { text: 'non-stream', value: 'non-stream' },
      ],
      onFilter: (value, record) => record.stream_type === value,
    },
    {
      title: 'Requests',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => count.toLocaleString(),
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: 'descend',
    },
  ];

  const apiKeyMergedColumns: ColumnsType<ApiKeyMergedRow> = [
    {
      title: 'API Key',
      dataIndex: 'api_key',
      key: 'api_key',
      sorter: (a, b) => a.api_key.localeCompare(b.api_key),
    },
    {
      title: 'Requests',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => count.toLocaleString(),
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Prompt Tokens',
      dataIndex: 'prompt_tokens',
      key: 'prompt_tokens',
      render: (tokens: number) => formatNumber(tokens),
      sorter: (a, b) => a.prompt_tokens - b.prompt_tokens,
    },
    {
      title: 'Completion Tokens',
      dataIndex: 'completion_tokens',
      key: 'completion_tokens',
      render: (tokens: number) => formatNumber(tokens),
      sorter: (a, b) => a.completion_tokens - b.completion_tokens,
    },
    {
      title: 'Total Tokens',
      dataIndex: 'total_tokens',
      key: 'total_tokens',
      render: (tokens: number) => formatNumber(tokens),
      sorter: (a, b) => a.total_tokens - b.total_tokens,
      defaultSortOrder: 'descend',
    },
  ];

  const modelStatsColumns: ColumnsType<ModelStatsRow> = [
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      sorter: (a, b) => a.model.localeCompare(b.model),
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
    },
    {
      title: 'Stream Types',
      dataIndex: 'stream_types',
      key: 'stream_types',
      render: (types: string[]) => types.join(', '),
    },
    {
      title: 'Requests',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => count.toLocaleString(),
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Prompt Tokens',
      dataIndex: 'prompt_tokens',
      key: 'prompt_tokens',
      render: (tokens: number) => formatNumber(tokens),
      sorter: (a, b) => a.prompt_tokens - b.prompt_tokens,
    },
    {
      title: 'Completion Tokens',
      dataIndex: 'completion_tokens',
      key: 'completion_tokens',
      render: (tokens: number) => formatNumber(tokens),
      sorter: (a, b) => a.completion_tokens - b.completion_tokens,
    },
    {
      title: 'Total Tokens',
      dataIndex: 'total_tokens',
      key: 'total_tokens',
      render: (tokens: number) => formatNumber(tokens),
      sorter: (a, b) => a.total_tokens - b.total_tokens,
      defaultSortOrder: 'descend',
    },
  ];

  // Merge aggregated (Detailed Statistics) with tokenStats (Token Statistics)
  const modelStatsData = (() => {
    // Aggregate detailed stats by model+provider
    const detailMap = new Map<string, { count: number; stream_types: string[] }>();
    aggregated.forEach((row) => {
      const key = `${row.model}|${row.provider}`;
      const existing = detailMap.get(key);
      if (existing) {
        existing.count += row.count;
        if (!existing.stream_types.includes(row.stream_type)) {
          existing.stream_types.push(row.stream_type);
        }
      } else {
        detailMap.set(key, { count: row.count, stream_types: [row.stream_type] });
      }
    });

    // Merge with token stats
    const tokenMap = new Map(tokenStats.map((r) => [`${r.model}|${r.provider}`, r]));
    const allKeys = Array.from(new Set([...detailMap.keys(), ...tokenMap.keys()]));
    return allKeys
      .map((key): ModelStatsRow => {
        const [model, provider] = key.split('|');
        const detail = detailMap.get(key);
        const token = tokenMap.get(key);
        return {
          model,
          provider,
          stream_types: detail?.stream_types ?? [],
          count: detail?.count ?? 0,
          prompt_tokens: token?.prompt_tokens ?? 0,
          completion_tokens: token?.completion_tokens ?? 0,
          total_tokens: token?.total_tokens ?? 0,
        };
      })
      .filter((row) => row.count > 0 || row.total_tokens > 0)
      .sort((a, b) => b.total_tokens - a.total_tokens);
  })();

  const apiKeyMergedData = (() => {
    const tokenMap = new Map(apiKeyTokenStats.map((r) => [r.api_key, r]));
    const statsMap = new Map(apiKeyStats.map((r) => [r.api_key, r]));
    const allKeys = new Set([...statsMap.keys(), ...tokenMap.keys()]);
    return [...allKeys].map((key) => ({
      api_key: key,
      count: statsMap.get(key)?.count ?? 0,
      prompt_tokens: tokenMap.get(key)?.prompt_tokens ?? 0,
      completion_tokens: tokenMap.get(key)?.completion_tokens ?? 0,
      total_tokens: tokenMap.get(key)?.total_tokens ?? 0,
    }));
  })();

  const modelPieData = aggregated
    .reduce(
      (acc, row) => {
        const existing = acc.find((item) => item.name === row.model);
        if (existing) {
          existing.value += row.count;
        } else {
          acc.push({ name: row.model, value: row.count });
        }
        return acc;
      },
      [] as { name: string; value: number }[]
    )
    .slice(0, 6);

  const providerBarData = aggregated.reduce(
    (acc, row) => {
      const existing = acc.find((item) => row.provider && item.provider === row.provider);
      if (existing) {
        existing.count += row.count;
      } else if (row.provider) {
        acc.push({ provider: row.provider, count: row.count });
      }
      return acc;
    },
    [] as { provider: string; count: number }[]
  );

  const tokenModelPieData = tokenStats
    .reduce(
      (acc, row) => {
        const existing = acc.find((item) => item.name === row.model);
        if (existing) {
          existing.value += row.total_tokens;
        } else {
          acc.push({ name: row.model, value: row.total_tokens });
        }
        return acc;
      },
      [] as { name: string; value: number }[]
    )
    .slice(0, 6);

  const tokenProviderBarData = tokenStats.reduce(
    (acc, row) => {
      const existing = acc.find((item) => row.provider && item.provider === row.provider);
      if (existing) {
        existing.prompt_tokens += row.prompt_tokens;
        existing.completion_tokens += row.completion_tokens;
      } else if (row.provider) {
        acc.push({
          provider: row.provider,
          prompt_tokens: row.prompt_tokens,
          completion_tokens: row.completion_tokens,
        });
      }
      return acc;
    },
    [] as { provider: string; prompt_tokens: number; completion_tokens: number }[]
  );

  const timeSeriesChartData = timeSeries.reduce(
    (acc, row) => {
      const existing = acc.find((item) => item.date === row.timestamp);
      if (existing) {
        existing[row.model] = ((existing[row.model] as number) || 0) + row.count;
      } else {
        acc.push({ date: row.timestamp, [row.model]: row.count });
      }
      return acc;
    },
    [] as Record<string, number | string>[]
  );

  const uniqueModels = [...new Set(timeSeries.map((row) => row.model))].slice(0, 5);

  return (
    <div>
      {error && (
        <Alert message="Error" description={error} type="error" closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <BarChartOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          </Col>
          <Col flex="auto">
            <RangePicker value={dateRange} onChange={handleDateRangeChange} showTime={false} format="YYYY-MM-DD" allowClear={false} />
            <Button onClick={() => handleQuickRange(1)} style={{ marginLeft: 8 }}>
              1 Day
            </Button>
            <Button onClick={() => handleQuickRange(7)} style={{ marginLeft: 8 }}>
              7 Days
            </Button>
            <Button onClick={() => handleQuickRange(30)} style={{ marginLeft: 8 }}>
              30 Days
            </Button>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchAnalytics} loading={loading}>
              Refresh
            </Button>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col xs={12} sm={12} md={6}>
            <Statistic title="Total Requests" value={totalRequests.toLocaleString()} />
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Statistic title="Total Tokens" value={formatNumber(totalTokens)} suffix="tokens" />
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Statistic title="Prompt Tokens" value={formatNumber(totalPromptTokens)} />
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Statistic title="Completion Tokens" value={formatNumber(totalCompletionTokens)} />
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={24} md={12}>
              <Card title="Requests by Model" bordered={false}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={modelPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {modelPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Card title="Requests by Provider" bordered={false}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={providerBarData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="provider" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={24} md={12}>
              <Card title="Requests by API Key" bordered={false}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={apiKeyStats.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="api_key" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#722ed1" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Card title="Token Usage by API Key" bordered={false}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={apiKeyTokenStats.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="api_key" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                    <Legend />
                    <Bar dataKey="prompt_tokens" fill="#1890ff" name="Prompt" />
                    <Bar dataKey="completion_tokens" fill="#52c41a" name="Completion" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {timeSeriesChartData.length > 0 && (
            <Card title="Daily Request Trend" bordered={false} style={{ marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {uniqueModels.map((model, index) => (
                    <Line
                      key={model}
                      type="monotone"
                      dataKey={model}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={24} md={12}>
              <Card title="Token Distribution by Model" bordered={false}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tokenModelPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {tokenModelPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Card title="Token Usage by Provider" bordered={false}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tokenProviderBarData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="provider" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                    <Legend />
                    <Bar dataKey="prompt_tokens" fill="#1890ff" name="Prompt" />
                    <Bar dataKey="completion_tokens" fill="#52c41a" name="Completion" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {tokenTimeSeries.length > 0 && (
            <Card title="Daily Token Trend" bordered={false} style={{ marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={tokenTimeSeries.reduce(
                    (acc, row) => {
                      const existing = acc.find((item) => item.date === row.timestamp);
                      if (existing) {
                        existing[row.model] = ((existing[row.model] as number) || 0) + row.total_tokens;
                      } else {
                        acc.push({ date: row.timestamp, [row.model]: row.total_tokens });
                      }
                      return acc;
                    },
                    [] as Record<string, number | string>[]
                  )}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatNumber(Number(value))} />
                  <Legend />
                  {[...new Set(tokenTimeSeries.map((row) => row.model))].slice(0, 5).map((model, index) => (
                    <Line
                      key={model}
                      type="monotone"
                      dataKey={model}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card title="API Key Statistics" bordered={false} style={{ marginBottom: 16 }}>
            <Table
              columns={apiKeyMergedColumns}
              dataSource={apiKeyMergedData}
              rowKey="api_key"
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
              scroll={{ x: 800 }}
            />
          </Card>

          <Card title="Model Statistics" bordered={false}>
            <Table
              columns={modelStatsColumns}
              dataSource={modelStatsData}
              rowKey={(record) => `${record.model}-${record.provider}`}
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
              scroll={{ x: 900 }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
