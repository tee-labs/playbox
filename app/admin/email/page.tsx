'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Button, Space, Table, Tag, message, Tabs, Upload, Alert } from 'antd';
import { SendOutlined, ReloadOutlined, PlusOutlined, MailOutlined, HistoryOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { TextArea } = Input;
interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

interface EmailRecord {
  id: string;
  recipients: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments: EmailAttachment[];
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  createdAt: string;
  sentAt?: string;
}

export default function EmailTestPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<EmailRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const fetchHistory = useCallback(
    async (p = page, ps = pageSize) => {
      setHistoryLoading(true);
      try {
        const res = await fetch(`/api/admin/email?page=${p}&pageSize=${ps}`);
        const data = (await res.json()) as { success: boolean; records?: EmailRecord[]; total?: number; error?: string };
        if (data.success) {
          setHistory(data.records || []);
          setTotal(data.total || 0);
        } else {
          message.error(data.error || 'Failed to fetch email history');
        }
      } catch (_err) {
        message.error('Failed to fetch email history');
      } finally {
        setHistoryLoading(false);
      }
    },
    [page, pageSize]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSend = async (values: Record<string, unknown>) => {
    if (recipients.length === 0) {
      message.error('Please add at least one recipient');
      return;
    }

    setLoading(true);
    try {
      const attachments = fileList.map((file) => ({
        filename: file.name,
        content: (file as UploadFile & { base64?: string }).base64 || '',
        contentType: file.type || 'application/octet-stream',
      }));

      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          subject: values.subject,
          body: values.body,
          html: values.html,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        message.success('Email sent successfully');
        form.resetFields();
        setRecipients([]);
        setFileList([]);
        fetchHistory();
      } else {
        message.error(data.error || 'Failed to send email');
      }
    } catch (_err) {
      message.error('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = () => {
    const email = form.getFieldValue('newRecipient');
    if (email && email.includes('@')) {
      if (!recipients.includes(email)) {
        setRecipients([...recipients, email]);
      }
      form.setFieldValue('newRecipient', '');
    } else {
      message.error('Please enter a valid email address');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const beforeUpload = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFileList([
        ...fileList,
        {
          uid: file.name,
          name: file.name,
          status: 'done',
          type: file.type,
          base64,
        } as UploadFile,
      ]);
    };
    return false;
  };

  const handleRemoveFile = (file: UploadFile) => {
    setFileList(fileList.filter((f) => f.uid !== file.uid));
  };

  const columns = [
    {
      title: 'Recipients',
      dataIndex: 'recipients',
      key: 'recipients',
      render: (recipients: string[]) => (
        <span>
          {recipients.map((r, i) => (
            <Tag key={i} color="blue">
              {r}
            </Tag>
          ))}
        </span>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'sent' ? 'green' : status === 'failed' ? 'red' : 'orange';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Sent',
      dataIndex: 'sentAt',
      key: 'sentAt',
      render: (date?: string) => (date ? new Date(date).toLocaleString() : '-'),
    },
    {
      title: 'Error',
      dataIndex: 'error',
      key: 'error',
      render: (error?: string) => (error ? <span style={{ color: '#ff4d4f' }}>{error}</span> : '-'),
    },
  ];

  return (
    <div>
      <Tabs
        defaultActiveKey="send"
        items={[
          {
            key: 'send',
            label: (
              <span>
                <MailOutlined /> Send Email
              </span>
            ),
            children: (
              <Card>
                <Alert
                  message="Gmail SMTP Configuration Required"
                  description={
                    <span>
                      To send emails, add credentials to security_keys table with type=&apos;EMAIL&apos; and provider=&apos;GMAIL&apos;.
                      <br />
                      The content should be JSON:{' '}
                      {'{ "user": "your-email@gmail.com", "pass": "app-password", "from": "Your Name &lt;your-email@gmail.com&gt;" }'}
                    </span>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 24 }}
                />
                <Form form={form} layout="vertical" onFinish={handleSend}>
                  <Form.Item label="Recipients">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="newRecipient" noStyle>
                        <Input placeholder="Enter email address" style={{ width: 'calc(100% - 80px)' }} onPressEnter={handleAddRecipient} />
                      </Form.Item>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRecipient}>
                        Add
                      </Button>
                    </Space.Compact>
                    <div style={{ marginTop: 8 }}>
                      {recipients.map((email) => (
                        <Tag key={email} closable onClose={() => handleRemoveRecipient(email)} style={{ marginBottom: 4 }}>
                          {email}
                        </Tag>
                      ))}
                    </div>
                  </Form.Item>

                  <Form.Item name="subject" label="Subject" rules={[{ required: true, message: 'Please enter subject' }]}>
                    <Input placeholder="Email subject" />
                  </Form.Item>

                  <Form.Item name="body" label="Plain Text Body">
                    <TextArea rows={4} placeholder="Plain text email content" />
                  </Form.Item>

                  <Form.Item name="html" label="HTML Body (Optional)">
                    <TextArea rows={4} placeholder="HTML email content (optional)" />
                  </Form.Item>

                  <Form.Item label="Attachments (Optional)">
                    <Upload fileList={fileList} beforeUpload={beforeUpload} onRemove={handleRemoveFile} multiple>
                      <Button icon={<PlusOutlined />}>Select Files</Button>
                    </Upload>
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={loading}>
                      Send Email
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> Email History
              </span>
            ),
            children: (
              <Card>
                <Space style={{ marginBottom: 16 }}>
                  <Button icon={<ReloadOutlined />} onClick={() => fetchHistory()}>
                    Refresh
                  </Button>
                </Space>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <Table
                    columns={columns}
                    dataSource={history}
                    rowKey="id"
                    loading={historyLoading}
                    pagination={{
                      current: page,
                      pageSize,
                      total,
                      onChange: (p, ps) => {
                        setPage(p);
                        setPageSize(ps);
                        fetchHistory(p, ps);
                      },
                    }}
                    scroll={{ x: 800 }}
                    size="small"
                  />
                </div>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
