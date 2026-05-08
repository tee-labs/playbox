'use client';

import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  message,
  Alert,
  Typography,
  Tag,
  Divider,
  InputNumber,
  Collapse,
  Select,
  Switch,
  Empty,
  Popconfirm,
} from 'antd';
import { ExperimentOutlined, PlayCircleOutlined, PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

interface ExtractionItem {
  extractionClass: string;
  extractionText: string;
  charInterval?: { startPos?: number; endPos?: number };
  alignmentStatus?: string;
  attributes?: Record<string, string | string[]>;
  description?: string;
}

interface ExampleForm {
  text: string;
  extractions: {
    extractionClass: string;
    extractionText: string;
    attributes: string;
  }[];
}

interface ProviderInfo {
  type: string;
  label: string;
  defaultModel: string;
  key: string | null;
}

export default function LangExtractPage() {
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    extractions: ExtractionItem[];
    text?: string;
  } | null>(null);
  const [examples, setExamples] = useState<ExampleForm[]>([
    { text: '', extractions: [{ extractionClass: '', extractionText: '', attributes: '' }] },
  ]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [selectedProviderKey, setSelectedProviderKey] = useState<string | null>(null);
  const [selectedModelType, setSelectedModelType] = useState<string>('openai');
  const [warning, setWarning] = useState<string | null>(null);

  const fetchProviders = async () => {
    setProvidersLoading(true);
    try {
      const res = await fetch('/api/admin/langextract');
      const data = (await res.json()) as {
        success: boolean;
        data?: { supportedProviders: ProviderInfo[] };
        error?: string;
      };
      if (data.success && data.data) {
        setProviders(data.data.supportedProviders);
        const defaultProv = data.data.supportedProviders.find((p) => p.type === 'openai');
        if (defaultProv) {
          setSelectedProviderKey(defaultProv.key);
          setSelectedModelType(defaultProv.type);
        }
      }
    } catch {
      // Provider fetch failed silently
    } finally {
      setProvidersLoading(false);
    }
  };

  const handleExtract = async (values: {
    text: string;
    promptDescription: string;
    providerSelect: string;
    modelId?: string;
    apiKey?: string;
    temperature: number;
    extractionPasses: number;
    maxCharBuffer: number;
    maxTokens: number;
    useSchemaConstraints: boolean;
  }) => {
    const validExamples = examples.filter((ex) => ex.text.trim() && ex.extractions.some((e) => e.extractionClass && e.extractionText));

    if (validExamples.length === 0) {
      message.warning('Please provide at least one example with source text, an extraction class, and extraction text.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setWarning(null);

    const sdkExamples = validExamples.map((ex) => ({
      text: ex.text,
      extractions: ex.extractions
        .filter((e) => e.extractionClass && e.extractionText)
        .map((e) => {
          let attrs: Record<string, string> = {};
          if (e.attributes) {
            try {
              attrs = JSON.parse(e.attributes);
            } catch {
              // Invalid JSON in attributes field, ignore
            }
          }
          return {
            extractionClass: e.extractionClass,
            extractionText: e.extractionText,
            attributes: Object.keys(attrs).length > 0 ? attrs : undefined,
          };
        }),
    }));

    try {
      const res = await fetch('/api/admin/langextract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: values.text,
          promptDescription: values.promptDescription,
          modelType: selectedModelType,
          provider: selectedProviderKey || undefined,
          modelId: values.modelId,
          apiKey: values.apiKey || undefined,
          temperature: values.temperature,
          extractionPasses: values.extractionPasses,
          maxCharBuffer: values.maxCharBuffer,
          maxTokens: values.maxTokens,
          useSchemaConstraints: values.useSchemaConstraints,
          examples: sdkExamples,
        }),
      });

      const data = (await res.json()) as {
        success: boolean;
        data?: {
          extractions: ExtractionItem[];
          text?: string;
        };
        warning?: string;
        error?: string;
      };

      if (data.success && data.data) {
        setResult(data.data);
        if (data.warning) {
          setWarning(data.warning);
          message.warning('No extractions found — check provider settings');
        } else {
          message.success(`Found ${data.data.extractions.length} extractions`);
        }
      } else {
        setError(data.error || 'Extraction failed');
        message.error(data.error || 'Extraction failed');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errMsg);
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const addExample = () => {
    setExamples([...examples, { text: '', extractions: [{ extractionClass: '', extractionText: '', attributes: '' }] }]);
  };

  const removeExample = (idx: number) => {
    setExamples(examples.filter((_, i) => i !== idx));
  };

  const addExtractionToExample = (exampleIdx: number) => {
    const updated = [...examples];
    updated[exampleIdx].extractions.push({ extractionClass: '', extractionText: '', attributes: '' });
    setExamples(updated);
  };

  const removeExtractionFromExample = (exampleIdx: number, extIdx: number) => {
    const updated = [...examples];
    updated[exampleIdx].extractions = updated[exampleIdx].extractions.filter((_, i) => i !== extIdx);
    setExamples(updated);
  };

  const renderExtractions = () => {
    if (!result?.extractions || result.extractions.length === 0) {
      return <Empty description="No extractions found" />;
    }

    const grouped = result.extractions.reduce(
      (acc, ext) => {
        const key = ext.extractionClass;
        if (!acc[key]) acc[key] = [];
        acc[key].push(ext);
        return acc;
      },
      {} as Record<string, ExtractionItem[]>
    );

    const colors = ['blue', 'green', 'orange', 'purple', 'cyan', 'magenta', 'red', 'geekblue'];

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {Object.entries(grouped).map(([label, items], groupIdx) => (
          <Card
            key={label}
            size="small"
            title={
              <Space>
                <Tag color={colors[groupIdx % colors.length]}>{label}</Tag>
                <Text type="secondary">({items.length})</Text>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ padding: 8, background: '#fafafa', borderRadius: 4, border: '1px solid #f0f0f0' }}>
                  <Text strong>{item.extractionText}</Text>
                  {item.charInterval?.startPos !== undefined && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      [pos: {item.charInterval.startPos}-{item.charInterval.endPos}]
                    </Text>
                  )}
                  {item.alignmentStatus && <Tag style={{ marginLeft: 8 }}>{item.alignmentStatus}</Tag>}
                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {Object.entries(item.attributes).map(([k, v]) => (
                        <Tag key={k} color="default">
                          {k}: {Array.isArray(v) ? v.join(', ') : v}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {item.description && (
                    <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0, fontSize: 12 }}>
                      {item.description}
                    </Paragraph>
                  )}
                </div>
              ))}
            </Space>
          </Card>
        ))}
      </Space>
    );
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>LangExtract - Structured Information Extraction</span>
          </Space>
        }
        extra={
          <Button icon={<InfoCircleOutlined />} onClick={fetchProviders} loading={providersLoading}>
            Providers
          </Button>
        }
      >
        {providers.length > 0 && (
          <Alert
            message="Supported Providers"
            description={
              <Space wrap>
                {providers.map((p) => (
                  <Tag key={p.type} color="blue">
                    {p.label} ({p.defaultModel})
                    {p.key && (
                      <Text code style={{ marginLeft: 4 }}>
                        {p.key}
                      </Text>
                    )}
                  </Tag>
                ))}
              </Space>
            }
            type="info"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            onClose={() => setProviders([])}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleExtract}
          initialValues={{
            providerSelect: '',
            modelId: 'minimax-m2.7',
            temperature: 0.3,
            extractionPasses: 1,
            maxCharBuffer: 1000,
            maxTokens: 2048,
            useSchemaConstraints: false,
          }}
        >
          <Form.Item name="providerSelect" label="Provider" rules={[{ required: true, message: 'Please select a provider' }]}>
            <Select
              placeholder="Select a provider..."
              options={providers.map((p) => ({ label: `${p.label} (${p.type})`, value: p.key || p.type }))}
              onSelect={(val: string) => {
                const prov = providers.find((p) => (p.key || p.type) === val);
                if (prov) {
                  setSelectedProviderKey(prov.key);
                  setSelectedModelType(prov.type);
                  form.setFieldValue('modelId', prov.defaultModel);
                }
              }}
            />
          </Form.Item>

          <Form.Item name="modelId" label="Model ID">
            <Input placeholder="e.g., gemini-2.5-flash, gpt-4o-mini" />
          </Form.Item>

          <Form.Item name="apiKey" label="API Key (optional)">
            <Input.Password placeholder="Leave empty to use env var or stored key" />
          </Form.Item>

          <Divider />

          <Form.Item name="text" label="Source Text" rules={[{ required: true, message: 'Please enter text to extract from' }]}>
            <TextArea rows={6} placeholder="Enter the unstructured text you want to extract information from..." />
          </Form.Item>

          <Form.Item
            name="promptDescription"
            label="Extraction Prompt"
            rules={[{ required: true, message: 'Please enter extraction instructions' }]}
          >
            <TextArea
              rows={3}
              placeholder="Describe what to extract. E.g., 'Extract all person names, ages, employers, and medical conditions from the text. Use exact text from the source.'"
            />
          </Form.Item>

          <Divider />

          <Title level={5}>
            Few-Shot Examples <Tag color="red">Required</Tag>
          </Title>
          <Paragraph type="secondary">
            Provide examples to guide the extraction. Each example should have source text and expected extractions.
          </Paragraph>
          <Alert
            message="At least one example is required"
            description="Provide at least one example with source text, an extraction class, and extraction text. Examples significantly improve extraction accuracy."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {examples.map((example, exIdx) => (
            <Card
              key={exIdx}
              size="small"
              style={{ marginBottom: 16 }}
              title={`Example ${exIdx + 1}`}
              extra={
                examples.length > 1 && (
                  <Popconfirm title="Remove this example?" onConfirm={() => removeExample(exIdx)}>
                    <Button danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                )
              }
            >
              <Form.Item label="Example Text">
                <TextArea
                  rows={3}
                  value={example.text}
                  onChange={(e) => {
                    const updated = [...examples];
                    updated[exIdx].text = e.target.value;
                    setExamples(updated);
                  }}
                  placeholder="Source text for this example..."
                />
              </Form.Item>

              <Text strong>Expected Extractions</Text>
              {example.extractions.map((ext, extIdx) => (
                <Space key={extIdx} style={{ display: 'flex', marginBottom: 8 }} align="start" wrap>
                  <Input
                    placeholder="Class (e.g., person)"
                    value={ext.extractionClass}
                    onChange={(e) => {
                      const updated = [...examples];
                      updated[exIdx].extractions[extIdx].extractionClass = e.target.value;
                      setExamples(updated);
                    }}
                    style={{ width: '100%', minWidth: 120 }}
                  />
                  <Input
                    placeholder="Text (e.g., John Smith)"
                    value={ext.extractionText}
                    onChange={(e) => {
                      const updated = [...examples];
                      updated[exIdx].extractions[extIdx].extractionText = e.target.value;
                      setExamples(updated);
                    }}
                    style={{ width: '100%', minWidth: 150 }}
                  />
                  <Input
                    placeholder='Attributes JSON (e.g., {"age":"30"})'
                    value={ext.attributes}
                    onChange={(e) => {
                      const updated = [...examples];
                      updated[exIdx].extractions[extIdx].attributes = e.target.value;
                      setExamples(updated);
                    }}
                    style={{ width: '100%', minWidth: 150 }}
                  />
                  {example.extractions.length > 1 && (
                    <Button size="small" icon={<DeleteOutlined />} onClick={() => removeExtractionFromExample(exIdx, extIdx)} />
                  )}
                </Space>
              ))}
              <Button size="small" icon={<PlusOutlined />} onClick={() => addExtractionToExample(exIdx)}>
                Add Extraction
              </Button>
            </Card>
          ))}

          <Button icon={<PlusOutlined />} onClick={addExample} style={{ marginBottom: 16 }}>
            Add Example
          </Button>

          <Divider />

          <Collapse
            size="small"
            items={[
              {
                key: 'advanced',
                label: 'Advanced Settings',
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Form.Item name="temperature" label="Temperature">
                      <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="extractionPasses" label="Extraction Passes">
                      <InputNumber min={1} max={5} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="maxCharBuffer" label="Max Char Buffer">
                      <InputNumber min={500} max={5000} step={500} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="maxTokens" label="Max Tokens">
                      <InputNumber min={256} max={8192} step={256} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="useSchemaConstraints" label="Use Schema Constraints" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Space>
                ),
              },
            ]}
          />

          <Divider />

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />} loading={loading} size="large">
              Extract
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {error && <Alert message="Extraction Error" description={error} type="error" showIcon closable onClose={() => setError(null)} />}

      {warning && (
        <Alert message="No Extractions Found" description={warning} type="warning" showIcon closable onClose={() => setWarning(null)} />
      )}

      {result && (
        <Card
          title={
            <Space>
              <span>Extraction Results</span>
              <Tag color="green">{result.extractions.length} extractions</Tag>
            </Space>
          }
        >
          {renderExtractions()}
        </Card>
      )}

      <Card size="small" title="About LangExtract">
        <Paragraph>
          <Text strong>LangExtract</Text> extracts structured information from unstructured text using LLMs. It uses few-shot prompting with
          examples to generalize extraction patterns, and grounds each extraction to its exact position in the source text.
        </Paragraph>
        <Paragraph>
          <Text strong>Setup:</Text> Set your API key as an environment variable (<Text code>GEMINI_API_KEY</Text>,{' '}
          <Text code>OPENAI_API_KEY</Text>) or provide it in the form. API keys are also read from the LLM keys table in the database.
        </Paragraph>
        <Paragraph>
          <Text strong>Tip:</Text> At least one few-shot example is required for extraction. Provide high-quality examples that include
          source text, extraction classes, and extraction text. Include diverse examples that cover edge cases you expect to encounter.
        </Paragraph>
      </Card>
    </Space>
  );
}
