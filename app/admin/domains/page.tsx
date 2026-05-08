'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Space, Spin, Alert, message } from 'antd';
import { GlobalOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface DomainInfo {
  name: string;
  status: string;
  slot_type: string;
  lifecycle_type: string;
  expiry_date: string;
  nameservers: string[];
  expires_at?: string;
  domain?: string;
}

function getExpiryColor(expiryDate: string): string | null {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return '#ff4d4f';
  if (diffDays <= 90) return '#faad14';
  return null;
}

function formatExpiry(dateStr: string): string {
  if (!dateStr) return '';
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  if (!y || !m || !d) return dateStr;
  return `${y}-${m}-${d}`;
}

function normalizeDomain(raw: Record<string, unknown>): DomainInfo {
  return {
    name: (raw.domain as string) || (raw.name as string) || '',
    status: (raw.status as string) || '',
    slot_type: (raw.slot_type as string) || '',
    lifecycle_type: (raw.lifecycle_type as string) || '',
    expiry_date: formatExpiry((raw.expires_at as string) || (raw.expiry_date as string) || ''),
    nameservers: (raw.nameservers as string[]) || [],
    expires_at: raw.expires_at as string,
    domain: raw.domain as string,
  };
}

export default function DomainsPage() {
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/domains');
      const data = (await response.json()) as { success: boolean; data?: Record<string, unknown>[]; error?: string };

      if (data.success) {
        const rawDomains = (data.data || []) as Record<string, unknown>[];
        setDomains(rawDomains.map(normalizeDomain));
      } else {
        setError(data.error || 'Failed to fetch domains');
        message.error(data.error || 'Failed to fetch domains');
      }
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const columns: ColumnsType<DomainInfo> = [
    {
      title: 'Domain',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string) => (
        <Space>
          <GlobalOutlined style={{ color: '#1890ff' }} />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={status === 'ok' ? 'green' : 'red'}>{status}</Tag>,
    },
    {
      title: 'Slot Type',
      dataIndex: 'slot_type',
      key: 'slot_type',
      width: 130,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Lifecycle',
      dataIndex: 'lifecycle_type',
      key: 'lifecycle_type',
      width: 130,
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      width: 130,
      render: (expiryDate: string) => {
        const color = getExpiryColor(expiryDate);
        const style: React.CSSProperties = color ? { color: color, fontWeight: 'bold' } : {};
        return <span style={style}>{expiryDate}</span>;
      },
    },
    {
      title: 'Nameservers',
      dataIndex: 'nameservers',
      key: 'nameservers',
      width: 300,
      render: (nameservers: string[]) => (
        <Space size={[0, 4]} wrap>
          {nameservers?.map((ns) => (
            <Tag key={ns} color="geekblue">
              {ns}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  if (loading && domains.length === 0) {
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
        <Space size="large" align="center" wrap>
          <GlobalOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <span style={{ color: '#666' }}>Total: {domains.length} domains</span>
          <div style={{ flex: 1 }} />
          <Button icon={<ReloadOutlined />} onClick={fetchDomains} loading={loading}>
            Refresh
          </Button>
        </Space>
      </Card>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table
          columns={columns}
          dataSource={domains}
          rowKey="name"
          loading={loading && domains.length > 0}
          pagination={false}
          scroll={{ x: 800, y: 'calc(100vh - 320px)' }}
          size="small"
        />
      </div>
    </div>
  );
}
