'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Button, Alert, Spin, Card, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function DownloadPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const onFinish = async (values: { url: string }) => {
    const { url } = values;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: 'Download failed' }))) as { error?: string };
        throw new Error(errorData.error || 'Download failed');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'download';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Create blob and trigger browser download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccess('File downloaded successfully!');
      form.resetFields();
    } catch (err) {
      setError((err as Error).message || 'Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: isMobile ? '12px' : '24px',
        background: '#f0f2f5',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 600,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            <DownloadOutlined style={{ marginRight: 8 }} />
            File Downloader
          </Title>
          <Text type="secondary">Enter a URL to download files directly to your device</Text>
        </div>

        {error && (
          <Alert message="Error" description={error} type="error" closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />
        )}

        {success && (
          <Alert
            message="Success"
            description={success}
            type="success"
            closable
            onClose={() => setSuccess(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="URL"
            name="url"
            rules={[
              { required: true, message: 'Please enter a URL' },
              { type: 'url', message: 'Please enter a valid URL' },
            ]}
          >
            <Input placeholder="https://example.com/file.pdf" size="large" disabled={loading} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={loading ? <Spin size="small" /> : <DownloadOutlined />}
              loading={loading}
              block
              style={{ height: 44 }}
            >
              {loading ? 'Downloading...' : 'Download File'}
            </Button>
          </Form.Item>
        </Form>

        <Alert
          message="Security Note"
          description={
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Only download files from trusted sources. The system validates URLs but cannot guarantee file safety. Allowed URL schemes:
                http, https
              </Text>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );
}
