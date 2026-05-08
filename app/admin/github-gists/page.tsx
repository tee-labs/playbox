'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  Table,
  Button,
  Space,
  Alert,
  Popconfirm,
  message,
  Tag,
  Tooltip,
  Typography,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Tabs,
  Badge,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  CopyOutlined,
  GithubOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface GistFile {
  filename: string;
  type: string;
  language: string | null;
  raw_url: string;
  size: number;
  content?: string;
  truncated?: boolean;
}

interface Gist {
  id: string;
  description: string;
  public: boolean;
  html_url: string;
  created_at: string;
  updated_at: string;
  files: Record<string, GistFile>;
}

interface GistListResponse {
  success: boolean;
  gists?: Gist[];
  error?: string;
  pagination?: {
    page: number;
    per_page: number;
    total_pages: number | null;
  };
}

interface GistDetailResponse {
  success: boolean;
  gist?: Gist;
  error?: string;
}

interface GistDetailResponse {
  success: boolean;
  gist?: Gist;
  error?: string;
}

const SUPPORTED_LANGUAGES = [
  'Text',
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Ruby',
  'PHP',
  'Swift',
  'Kotlin',
  'Shell',
  'SQL',
  'HTML',
  'CSS',
  'JSON',
  'YAML',
  'XML',
  'Markdown',
  'Dockerfile',
  'Makefile',
  'Lua',
  'Perl',
  'R',
  'Scala',
  'TOML',
];

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'JavaScript',
    ts: 'TypeScript',
    py: 'Python',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    cs: 'C#',
    go: 'Go',
    rs: 'Rust',
    rb: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kt: 'Kotlin',
    sh: 'Shell',
    bash: 'Shell',
    sql: 'SQL',
    html: 'HTML',
    htm: 'HTML',
    css: 'CSS',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML',
    md: 'Markdown',
    dockerfile: 'Dockerfile',
    makefile: 'Makefile',
    lua: 'Lua',
    pl: 'Perl',
    r: 'R',
    scala: 'Scala',
    toml: 'TOML',
    txt: 'Text',
  };
  return map[ext] || 'Text';
}

function getFileExtension(language: string): string {
  const map: Record<string, string> = {
    'JavaScript': '.js',
    'TypeScript': '.ts',
    'Python': '.py',
    'Java': '.java',
    'C': '.c',
    'C++': '.cpp',
    'C#': '.cs',
    'Go': '.go',
    'Rust': '.rs',
    'Ruby': '.rb',
    'PHP': '.php',
    'Swift': '.swift',
    'Kotlin': '.kt',
    'Shell': '.sh',
    'SQL': '.sql',
    'HTML': '.html',
    'CSS': '.css',
    'JSON': '.json',
    'YAML': '.yml',
    'XML': '.xml',
    'Markdown': '.md',
    'Dockerfile': 'Dockerfile',
    'Makefile': 'Makefile',
    'Lua': '.lua',
    'Perl': '.pl',
    'R': '.r',
    'Scala': '.scala',
    'TOML': '.toml',
    'Text': '.txt',
  };
  return map[language] || '.txt';
}

const ViewGistModal = dynamic(
  () =>
    Promise.resolve(({ gist, open, onClose }: { gist: Gist | null; open: boolean; onClose: () => void }) => {
      if (!gist) return null;

      const fileEntries = Object.values(gist.files);

      return (
        <Modal
          title={
            <Space>
              <GithubOutlined />
              <span>{gist.description || 'Untitled Gist'}</span>
              <Tag color={gist.public ? 'green' : 'orange'}>{gist.public ? 'Public' : 'Secret'}</Tag>
            </Space>
          }
          open={open}
          onCancel={onClose}
          footer={[
            <Button key="open" icon={<LinkOutlined />} onClick={() => window.open(gist.html_url, '_blank')}>
              Open on GitHub
            </Button>,
            <Button key="close" type="primary" onClick={onClose}>
              Close
            </Button>,
          ]}
          width={800}
        >
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Gist ID">{gist.id}</Descriptions.Item>
            <Descriptions.Item label="Created">{dayjs(gist.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label="Updated">{dayjs(gist.updated_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label="Files">{fileEntries.length}</Descriptions.Item>
          </Descriptions>

          <Tabs
            items={fileEntries.map((file) => ({
              key: file.filename,
              label: (
                <Space>
                  {file.filename}
                  {file.language && <Tag color="blue">{file.language}</Tag>}
                </Space>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Space>
                      <Text type="secondary">Size: {file.size} bytes</Text>
                      {file.truncated && <Tag color="orange">Truncated</Tag>}
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(file.content || '');
                          message.success('Content copied');
                        }}
                      >
                        Copy
                      </Button>
                    </Space>
                  </div>
                  <pre
                    style={{
                      background: '#fafafa',
                      padding: 16,
                      borderRadius: 8,
                      maxHeight: 400,
                      overflow: 'auto',
                      fontSize: 13,
                      lineHeight: 1.5,
                      fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {file.content || 'Loading...'}
                  </pre>
                </div>
              ),
            }))}
          />
        </Modal>
      );
    }),
  { ssr: false }
);

const CreateGistModal = dynamic(
  () =>
    Promise.resolve(
      ({
        open,
        onClose,
        onSuccess,
        editMode,
        initialGist,
      }: {
        open: boolean;
        onClose: () => void;
        onSuccess: () => void;
        editMode?: boolean;
        initialGist?: Gist | null;
      }) => {
        const [form] = Form.useForm();
        const [loading, setLoading] = useState(false);
        const [files, setFiles] = useState<{ filename: string; language: string; content: string }[]>([
          { filename: '', language: 'Text', content: '' },
        ]);

        useEffect(() => {
          if (open && editMode && initialGist) {
            const fileEntries = Object.values(initialGist.files).map((f) => ({
              filename: f.filename,
              language: f.language || getLanguageFromFilename(f.filename),
              content: f.content || '',
            }));
            setFiles(fileEntries);
            form.setFieldsValue({
              description: initialGist.description,
              public: initialGist.public,
            });
          } else if (open && !editMode) {
            setFiles([{ filename: '', language: 'Text', content: '' }]);
            form.resetFields();
            form.setFieldsValue({ public: true });
          }
        }, [open, editMode, initialGist, form]);

        const addFile = () => {
          setFiles([...files, { filename: '', language: 'Text', content: '' }]);
        };

        const removeFile = (index: number) => {
          if (files.length <= 1) {
            message.warning('At least one file is required');
            return;
          }
          setFiles(files.filter((_, i) => i !== index));
        };

        const updateFile = (index: number, field: string, value: string) => {
          const newFiles = [...files];
          newFiles[index] = { ...newFiles[index], [field]: value };
          if (field === 'language' && !newFiles[index].filename) {
            newFiles[index].filename = `file${getFileExtension(value)}`;
          }
          setFiles(newFiles);
        };

        const handleSubmit = async () => {
          try {
            const values = await form.validateFields();

            const hasEmptyFile = files.some((f) => !f.filename.trim() || !f.content.trim());
            if (hasEmptyFile) {
              message.error('All files must have a filename and content');
              return;
            }

            setLoading(true);

            const filesPayload: Record<string, { content: string }> = {};
            for (const file of files) {
              filesPayload[file.filename] = { content: file.content };
            }

            const body = {
              description: values.description || '',
              public: values.public !== false,
              files: filesPayload,
            };

            let response;
            if (editMode && initialGist) {
              response = await fetch(`/api/admin/github-gists/${initialGist.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
            } else {
              response = await fetch('/api/admin/github-gists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
            }

            const data = (await response.json()) as GistDetailResponse;

            if (data.success) {
              message.success(editMode ? 'Gist updated' : 'Gist created');
              onSuccess();
            } else {
              message.error(data.error || 'Failed to save gist');
            }
          } catch (err) {
            message.error((err as Error).message);
          } finally {
            setLoading(false);
          }
        };

        return (
          <Modal
            title={
              <Space>
                <GithubOutlined />
                <span>{editMode ? 'Edit Gist' : 'Create New Gist'}</span>
              </Space>
            }
            open={open}
            onCancel={onClose}
            footer={[
              <Button key="cancel" onClick={onClose}>
                Cancel
              </Button>,
              <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
                {editMode ? 'Update' : 'Create'}
              </Button>,
            ]}
            width={700}
          >
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
              <Form.Item name="description" label="Description">
                <Input placeholder="Gist description (optional)" />
              </Form.Item>

              <Form.Item name="public" label="Visibility" valuePropName="checked">
                <Switch checkedChildren="Public" unCheckedChildren="Secret" defaultChecked={!editMode} />
              </Form.Item>

              <Form.Item label="Files">
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                  {files.map((file, index) => (
                    <Card
                      key={index}
                      size="small"
                      title={`File ${index + 1}`}
                      extra={
                        files.length > 1 && (
                          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeFile(index)} />
                        )
                      }
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        <Space.Compact style={{ width: '100%' }}>
                          <Input
                            placeholder="Filename (e.g., hello.py)"
                            value={file.filename}
                            onChange={(e) => updateFile(index, 'filename', e.target.value)}
                            style={{ width: '60%' }}
                          />
                          <Select
                            value={file.language}
                            onChange={(val) => updateFile(index, 'language', val)}
                            style={{ width: '40%' }}
                            options={SUPPORTED_LANGUAGES.map((l) => ({ label: l, value: l }))}
                          />
                        </Space.Compact>
                        <TextArea
                          placeholder="File content..."
                          value={file.content}
                          onChange={(e) => updateFile(index, 'content', e.target.value)}
                          rows={6}
                          style={{
                            fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                          }}
                        />
                      </Space>
                    </Card>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={addFile} block>
                    Add File
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        );
      }
    ),
  { ssr: false }
);

export default function GitHubGistsPage() {
  const [gists, setGists] = useState<Gist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingGist, setEditingGist] = useState<Gist | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingGist, setViewingGist] = useState<Gist | null>(null);
  const [contentCache, setContentCache] = useState<Record<string, string>>({});

  const fetchGists = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/github-gists?page=${p}&per_page=30`);
      const data = (await response.json()) as GistListResponse;

      if (data.success) {
        setGists(data.gists || []);
        if (data.pagination) {
          setTotalPages(data.pagination.total_pages);
        }
      } else {
        setError(data.error || 'Failed to fetch gists');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGistContent = useCallback(
    async (gist: Gist) => {
      const cachedGist = { ...gist };
      const filesWithContent: Record<string, GistFile> = {};

      for (const [key, file] of Object.entries(gist.files)) {
        const cacheKey = `${gist.id}:${file.filename}`;
        if (contentCache[cacheKey]) {
          filesWithContent[key] = { ...file, content: contentCache[cacheKey] };
          continue;
        }

        try {
          const response = await fetch(`/api/admin/github-gists/${gist.id}`);
          const data = (await response.json()) as GistDetailResponse;
          if (data.success && data.gist) {
            for (const [, f] of Object.entries(data.gist.files)) {
              const ck = `${gist.id}:${f.filename}`;
              setContentCache((prev) => ({ ...prev, [ck]: f.content || '' }));
              if (f.filename === file.filename) {
                filesWithContent[key] = { ...file, content: f.content || '' };
              }
            }
          }
        } catch {
          filesWithContent[key] = { ...file, content: 'Failed to load content' };
        }
      }

      return { ...cachedGist, files: filesWithContent };
    },
    [contentCache]
  );

  useEffect(() => {
    fetchGists();
  }, [fetchGists]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/github-gists/${id}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (data.success) {
        message.success('Gist deleted');
        fetchGists(page);
      } else {
        message.error(data.error || 'Failed to delete gist');
      }
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const handleView = async (gist: Gist) => {
    const gistWithContent = await fetchGistContent(gist);
    setViewingGist(gistWithContent);
    setViewModalOpen(true);
  };

  const handleEdit = async (gist: Gist) => {
    const gistWithContent = await fetchGistContent(gist);
    setEditingGist(gistWithContent);
    setEditModalOpen(true);
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success('URL copied to clipboard');
    } catch {
      message.error('Failed to copy');
    }
  };

  const columns: ColumnsType<Gist> = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string, record: Gist) => (
        <Space direction="vertical" size={0}>
          <Text strong>{desc || 'Untitled'}</Text>
          <Space size={4}>
            {Object.keys(record.files)
              .slice(0, 3)
              .map((filename) => (
                <Tag key={filename} color="geekblue">
                  {filename}
                </Tag>
              ))}
            {Object.keys(record.files).length > 3 && <Tag>+{Object.keys(record.files).length - 3} more</Tag>}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Visibility',
      dataIndex: 'public',
      key: 'public',
      width: 100,
      render: (isPublic: boolean) => <Tag color={isPublic ? 'green' : 'orange'}>{isPublic ? 'Public' : 'Secret'}</Tag>,
    },
    {
      title: 'Files',
      key: 'fileCount',
      width: 80,
      render: (_, record: Gist) => <Badge count={Object.keys(record.files).length} style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Actions',
      key: '_actions',
      width: 200,
      render: (_, record: Gist) => (
        <Space size={4}>
          <Tooltip title="View content">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Copy URL">
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopyUrl(record.html_url)} />
          </Tooltip>
          <Tooltip title="Open on GitHub">
            <Button type="text" size="small" icon={<LinkOutlined />} onClick={() => window.open(record.html_url, '_blank')} />
          </Tooltip>
          <Popconfirm
            title="Delete this gist?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {error && (
        <Alert message="Error" description={error} type="error" closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <GithubOutlined style={{ fontSize: 20 }} />
            <Title level={5} style={{ margin: 0 }}>
              GitHub Gists
            </Title>
            <Tag color="blue">{gists.length} loaded</Tag>
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchGists(page)}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              Create Gist
            </Button>
          </Space>
        </Space>
      </Card>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table
          columns={columns}
          dataSource={gists}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 30,
            total: totalPages ? totalPages * 30 : gists.length,
            onChange: (p) => {
              setPage(p);
              fetchGists(p);
            },
            showTotal: (total) => `~${total} gists`,
          }}
          scroll={{ x: 800, y: 'calc(100vh - 320px)' }}
          size="small"
        />
      </div>

      <CreateGistModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          fetchGists(page);
        }}
      />

      <CreateGistModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingGist(null);
        }}
        onSuccess={() => {
          setEditModalOpen(false);
          setEditingGist(null);
          fetchGists(page);
        }}
        editMode
        initialGist={editingGist}
      />

      <ViewGistModal
        gist={viewingGist}
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewingGist(null);
        }}
      />
    </div>
  );
}
