'use client';

import { useState } from 'react';
import { Card, Input, Button, Space, message, Typography, Alert } from 'antd';
import { LinkOutlined, QrcodeOutlined, CopyOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface ShortUrlItem {
  id: string;
  originalUrl: string;
  createdAt: string;
}

export default function ShortUrlPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; shortUrl: string; originalUrl: string; expiresIn: number; qrUrl: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [recentUrls, setRecentUrls] = useState<ShortUrlItem[]>([]);

  const handleCreate = async () => {
    if (!url.trim()) {
      message.error('Please enter a URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      message.error('Invalid URL format');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/short-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as { error?: string; success?: boolean; urls?: ShortUrlItem[] };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create short URL');
      }

      setResult(data as { id: string; shortUrl: string; originalUrl: string; expiresIn: number; qrUrl: string });
      setUrl('');
      message.success('Short URL created');
      fetchRecentUrls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create short URL');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentUrls = async () => {
    try {
      const response = await fetch('/api/admin/short-url');
      const json = (await response.json()) as { success?: boolean; urls?: ShortUrlItem[] };
      if (json.success) {
        setRecentUrls(json.urls?.slice(0, 10) ?? []);
      }
    } catch {
      // Background refresh - no UI feedback needed
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('Copied to clipboard');
    } catch {
      message.error('Failed to copy');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch('/api/admin/short-url', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        message.success('Deleted');
        fetchRecentUrls();
      }
    } catch {
      message.error('Failed to delete');
    }
  };

  return (
    <div>
      {error && <Alert message="Error" description={error} type="error" closable style={{ marginBottom: 24 }} />}

      <Card title="Create Short URL" style={{ marginBottom: 24 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Enter URL to shorten (e.g., https://example.com/page)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPressEnter={handleCreate}
            allowClear
            size="large"
          />
          <Button type="primary" icon={<LinkOutlined />} onClick={handleCreate} loading={loading} size="large">
            Create
          </Button>
        </Space.Compact>
        <div style={{ marginTop: 8, color: '#666666', fontSize: 13 }}>Short URLs expire after 10 minutes</div>
      </Card>

      {result && (
        <Card title="Result" style={{ marginBottom: 24 }}>
          <Space style={{ width: '100%' }} size="large" direction="vertical">
            <div>
              <Title level={5}>Short URL</Title>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Input value={result.shortUrl} readOnly style={{ width: '100%' }} />
                <Space wrap>
                  <Button icon={<CopyOutlined />} onClick={() => handleCopy(window.location.origin + result.shortUrl)}>
                    Copy
                  </Button>
                  <Button icon={<LinkOutlined />} onClick={() => window.open(result.shortUrl, '_blank')}>
                    Open
                  </Button>
                </Space>
              </Space>
            </div>

            <div>
              <Title level={5}>QR Code</Title>
              <Space align="start">
                <img src={result.qrUrl} alt="QR Code" style={{ border: '1px solid #f0f0f0', borderRadius: 4 }} />
                <Button icon={<DownloadOutlined />} onClick={() => window.open(result.qrUrl, '_blank')}>
                  Download QR
                </Button>
              </Space>
            </div>

            <div>
              <Title level={5}>Original URL</Title>
              <Input value={result.originalUrl} readOnly />
            </div>
          </Space>
        </Card>
      )}

      <Card title="Recent URLs">
        {recentUrls.length === 0 ? (
          <div style={{ color: '#666666', textAlign: 'center', padding: 24 }}>No recent URLs</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentUrls.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>/s/{item.id}</div>
                  <div style={{ color: '#666', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.originalUrl}
                  </div>
                </div>
                <Space>
                  <Button
                    type="text"
                    icon={<QrcodeOutlined />}
                    onClick={() =>
                      setResult({
                        id: item.id,
                        shortUrl: `/s/${item.id}`,
                        originalUrl: item.originalUrl,
                        expiresIn: 600,
                        qrUrl: `/api/short-url/${item.id}/qr`,
                      })
                    }
                  />
                  <Button type="text" icon={<CopyOutlined />} onClick={() => handleCopy(`${window.location.origin}/s/${item.id}`)} />
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item.id)} />
                </Space>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
