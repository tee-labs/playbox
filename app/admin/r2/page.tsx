'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Input,
  Button,
  Space,
  Spin,
  Alert,
  Popconfirm,
  message,
  Upload,
  Modal,
  Drawer,
  Tag,
  Typography,
  Dropdown,
} from 'antd';
const { Text } = Typography;
import {
  SearchOutlined,
  ClearOutlined,
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  CloudServerOutlined,
  FolderOutlined,
  FileOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import NamespaceSelector from '../kv/components/NamespaceSelector';
import type { KVNamespaceOption } from '../types/kv';

interface R2ObjectInfo {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: string;
  contentType?: string;
  customMetadata?: Record<string, string>;
}

interface R2ObjectDisplay extends R2ObjectInfo {
  sizeFormatted: string;
  uploadedFormatted: string;
  type: 'file' | 'folder';
}

interface R2BucketsResponse {
  success: boolean;
  buckets?: { binding: string; bucket_name: string }[];
  error?: string;
}

interface R2ObjectsResponse {
  success: boolean;
  objects?: R2ObjectInfo[];
  delimitedPrefixes?: string[];
  truncated?: boolean;
  cursor?: string;
  error?: string;
}

interface R2ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface R2MetadataResponse {
  success: boolean;
  key?: string;
  size?: number;
  etag?: string;
  httpEtag?: string;
  uploaded?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
}

export default function R2AdminPage() {
  const [buckets, setBuckets] = useState<KVNamespaceOption[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [objects, setObjects] = useState<R2ObjectDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [truncated, setTruncated] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const fetchBuckets = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/r2');
      const data = (await response.json()) as R2BucketsResponse;
      if (data.success) {
        const bucketOptions: KVNamespaceOption[] = (data.buckets ?? []).map((b) => ({
          value: b.binding,
          label: b.binding,
          id: b.bucket_name,
        }));
        setBuckets(bucketOptions);
        if (bucketOptions.length > 0 && !selectedBucket) {
          setSelectedBucket(bucketOptions[0].value);
        }
      } else {
        setError(data.error || 'Failed to fetch buckets');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedBucket]);

  const fetchObjects = useCallback(
    async (resetCursor = false) => {
      if (!selectedBucket) return;

      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (prefix) params.set('prefix', prefix);
        if (!resetCursor && cursor && truncated) params.set('cursor', cursor);
        params.set('limit', '100');

        const response = await fetch(`/api/admin/r2/${selectedBucket}?${params}`);
        const data = (await response.json()) as R2ObjectsResponse;

        if (data.success) {
          const objectDisplays: R2ObjectDisplay[] = [
            ...(data.delimitedPrefixes ?? []).map((p: string) => ({
              key: p,
              size: 0,
              etag: '',
              httpEtag: '',
              uploaded: '',
              sizeFormatted: '-',
              uploadedFormatted: '-',
              type: 'folder' as const,
              contentType: 'folder',
            })),
            ...(data.objects ?? []).map((o: R2ObjectInfo) => ({
              ...o,
              sizeFormatted: formatSize(o.size),
              uploadedFormatted: o.uploaded ? new Date(o.uploaded).toLocaleString() : '-',
              type: 'file' as const,
            })),
          ];
          setObjects(objectDisplays);
          setTruncated(data.truncated ?? false);
          setCursor(data.cursor || undefined);
        } else {
          setError(data.error || 'Failed to fetch objects');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [selectedBucket, prefix, cursor, truncated]
  );

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);

  useEffect(() => {
    if (selectedBucket) {
      setCursor(undefined);
      setTruncated(false);
      fetchObjects(true);
    }
  }, [selectedBucket, prefix, fetchObjects]);

  const handleSearch = () => {
    setCursor(undefined);
    fetchObjects(true);
  };

  const handleClear = () => {
    setPrefix('');
    setCursor(undefined);
  };

  const handleRefresh = () => {
    setCursor(undefined);
    fetchObjects(true);
  };

  const handleFolderClick = (folderKey: string) => {
    setPrefix(folderKey);
    setCursor(undefined);
  };

  const handleDownload = (key: string) => {
    const url = `/api/admin/r2/${selectedBucket}/${encodeURIComponent(key)}`;
    window.open(url, '_blank');
  };

  const handleView = (key: string) => {
    setViewingKey(key);
    setDrawerOpen(true);
  };

  const handleDelete = async (key: string) => {
    try {
      const response = await fetch(`/api/admin/r2/${selectedBucket}/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as R2ActionResponse;
      if (data.success) {
        message.success(data.message);
        fetchObjects(true);
      } else {
        message.error(data.error || 'Failed to delete object');
      }
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;

    try {
      const response = await fetch(`/api/admin/r2/${selectedBucket}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'delete',
          keys: selectedRowKeys,
        }),
      });
      const data = (await response.json()) as R2ActionResponse;
      if (data.success) {
        message.success(data.message);
        setSelectedRowKeys([]);
        fetchObjects(true);
      } else {
        message.error(data.error || 'Failed to delete objects');
      }
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    action: `/api/admin/r2/${selectedBucket}`,
    data: (file) => {
      const key = prefix ? `${prefix}${file.name}` : file.name;
      return { key };
    },
    onChange(info) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} uploaded successfully`);
        fetchObjects(true);
        setUploadModalOpen(false);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} upload failed`);
      }
    },
  };

  const columns: ColumnsType<R2ObjectDisplay> = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      ellipsis: true,
      render: (text: string, record) => (
        <Space>
          {record.type === 'folder' ? (
            <a onClick={() => handleFolderClick(text)} style={{ cursor: 'pointer' }}>
              <FolderOutlined style={{ marginRight: 8, color: '#faad14' }} />
              {text.replace(prefix, '').replace('/', '')}
            </a>
          ) : (
            <>
              <FileOutlined style={{ marginRight: 8 }} />
              <a onClick={() => handleView(text)} style={{ cursor: 'pointer' }}>
                {text.replace(prefix, '')}
              </a>
            </>
          )}
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'contentType',
      key: 'contentType',
      width: 150,
      render: (contentType: string) => (contentType ? <Tag>{contentType}</Tag> : '-'),
    },
    {
      title: 'Size',
      dataIndex: 'sizeFormatted',
      key: 'size',
      width: 100,
    },
    {
      title: 'Uploaded',
      dataIndex: 'uploadedFormatted',
      key: 'uploaded',
      width: 180,
    },
    {
      title: 'Actions',
      key: '_actions',
      width: 150,
      render: (_, record) => {
        if (isMobile) {
          const items = [
            ...(record.type === 'file'
              ? [
                  {
                    key: 'download',
                    icon: <DownloadOutlined />,
                    label: 'Download',
                    onClick: () => handleDownload(record.key),
                  },
                  {
                    key: 'view',
                    icon: <EyeOutlined />,
                    label: 'View',
                    onClick: () => handleView(record.key),
                  },
                ]
              : []),
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              label: 'Delete',
              danger: true,
              onClick: () => handleDelete(record.key),
            },
          ];
          return (
            <Dropdown menu={{ items }} trigger={['click']}>
              <Button type="text" icon={<MoreOutlined />} size="small" />
            </Dropdown>
          );
        }
        return (
          <Space>
            {record.type === 'file' && (
              <>
                <Button type="text" icon={<DownloadOutlined />} onClick={() => handleDownload(record.key)} size="small" />
                <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record.key)} size="small" />
              </>
            )}
            <Popconfirm title="Delete this object?" onConfirm={() => handleDelete(record.key)} okText="Delete" okType="danger">
              <Button type="text" icon={<DeleteOutlined />} danger size="small" />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  if (loading && buckets.length === 0) {
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
            <CloudServerOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <NamespaceSelector
              namespaces={buckets}
              selected={selectedBucket}
              onChange={(b) => {
                setSelectedBucket(b);
                setPrefix('');
                setSelectedRowKeys([]);
              }}
              loading={loading}
            />
          </div>
          <Space.Compact style={{ width: '100%', maxWidth: 500 }}>
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
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setUploadModalOpen(true)}>
              Upload
            </Button>
          </Space>
        </Space>
      </Card>

      {prefix && (
        <Card style={{ marginBottom: 16, overflowX: 'auto' }}>
          <Space wrap>
            <Button onClick={() => setPrefix('')} size="small">
              Root
            </Button>
            {prefix
              .split('/')
              .filter(Boolean)
              .map((part, idx, arr) => (
                <span key={idx}>
                  <span> / </span>
                  <Button type="link" onClick={() => setPrefix(arr.slice(0, idx + 1).join('/') + '/')} size="small">
                    {part}
                  </Button>
                </span>
              ))}
          </Space>
        </Card>
      )}

      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Popconfirm
            title={`Delete ${selectedRowKeys.length} selected objects?`}
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
          dataSource={objects}
          rowKey="key"
          loading={loading && objects.length === 0}
          rowSelection={rowSelection}
          pagination={false}
          scroll={{ x: 700, y: 'calc(100vh - 400px)' }}
          size="small"
        />
      </div>

      {truncated && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => fetchObjects(false)} loading={loading}>
            Load More
          </Button>
        </div>
      )}

      <Modal title="Upload File" open={uploadModalOpen} onCancel={() => setUploadModalOpen(false)} footer={null}>
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to upload</p>
          <p className="ant-upload-hint">{prefix ? `Files will be uploaded to: ${prefix}` : 'Files will be uploaded to root'}</p>
        </Upload.Dragger>
      </Modal>

      <Drawer
        title={`Object: ${viewingKey?.replace(prefix, '')}`}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setViewingKey(null);
        }}
        width={600}
      >
        {viewingKey && <ObjectDetails bucket={selectedBucket} keyName={viewingKey} onDownload={() => handleDownload(viewingKey)} />}
      </Drawer>
    </div>
  );
}

function ObjectDetails({ bucket, keyName, onDownload }: { bucket: string; keyName: string; onDownload: () => void }) {
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<R2MetadataResponse | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`/api/admin/r2/${bucket}/${encodeURIComponent(keyName)}`, {
          method: 'HEAD',
        });
        const data = (await response.json()) as R2MetadataResponse;
        if (data.success) {
          setMetadata(data);
        }
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, [bucket, keyName]);

  if (loading) {
    return <Spin />;
  }

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text strong>Key:</Text>
        <Text code>{keyName}</Text>

        <Text strong>Size:</Text>
        <Text>{metadata?.size ? `${(metadata.size / 1024).toFixed(2)} KB` : '-'}</Text>

        <Text strong>ETag:</Text>
        <Text code>{metadata?.etag || '-'}</Text>

        <Text strong>Uploaded:</Text>
        <Text>{metadata?.uploaded ? new Date(metadata.uploaded).toLocaleString() : '-'}</Text>

        <Text strong>Content Type:</Text>
        <Tag>{metadata?.contentType || 'unknown'}</Tag>

        {metadata?.customMetadata && Object.keys(metadata.customMetadata).length > 0 && (
          <>
            <Text strong>Custom Metadata:</Text>
            <pre
              style={{
                background: '#fafafa',
                padding: 8,
                borderRadius: 4,
                fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                fontSize: 13,
              }}
            >
              {JSON.stringify(metadata.customMetadata, null, 2)}
            </pre>
          </>
        )}

        <Button type="primary" icon={<DownloadOutlined />} onClick={onDownload} style={{ marginTop: 16 }}>
          Download
        </Button>
      </Space>
    </div>
  );
}
