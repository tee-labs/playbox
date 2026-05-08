'use client';

import { useState } from 'react';
import { Row, Col, Card, message, Space } from 'antd';
import HistoryPanel from './components/HistoryPanel';
import ApiTestForm from './components/ApiTestForm';
import ResponseViewer from './components/ResponseViewer';
import type { ApiTestRequest, ApiTestResponse, ExecuteApiResponse } from './types';

const defaultRequest: ApiTestRequest = {
  method: 'GET',
  url: '',
  headers: [{ key: '', value: '' }],
  body: '',
  bodyFormat: 'json',
};

export default function ApiTestPage() {
  const [request, setRequest] = useState<ApiTestRequest>(defaultRequest);
  const [response, setResponse] = useState<ApiTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/admin/api-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          saveHistory: true,
        }),
      });

      const data: ExecuteApiResponse = await res.json();

      if (data.success && data.data) {
        setResponse(data.data);
      } else {
        setError(data.error || 'Request failed');
        message.error(data.error || 'Request failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFromHistory = (historyRequest: ApiTestRequest) => {
    setRequest(historyRequest);
    setResponse(null);
    setError(null);
  };

  return (
    <Row gutter={16} style={{ height: 'calc(100vh - 200px)' }}>
      <Col xs={24} sm={24} md={6}>
        <Card
          title="History"
          size="small"
          style={{ height: '100%', overflow: 'hidden' }}
          bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto' }}
        >
          <HistoryPanel onSelect={handleLoadFromHistory} />
        </Card>
      </Col>
      <Col xs={24} sm={24} md={18}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card title="Request" size="small">
            <ApiTestForm request={request} onChange={setRequest} onExecute={handleExecute} loading={loading} />
          </Card>

          <Card title="Response" size="small">
            {error ? <div style={{ color: '#ff4d4f' }}>{error}</div> : <ResponseViewer response={response} />}
          </Card>
        </Space>
      </Col>
    </Row>
  );
}
