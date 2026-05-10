import type { ProtocolBody } from '../types';
import type { ProtocolAdapter, Provider } from './types';
import type { SqlClient } from '../db/types';
import { KeyManager } from '../managers/key';
import { createSSEParser, SSEParser, SSEEvent } from '../utils/sse-parser';

export function createAnthropicProtocol(): ProtocolAdapter {
  return {
    name: 'anthropic',
    getAttempt: () => 3,
    getApiKey: async (_sql: SqlClient, provider: Provider): Promise<string> => KeyManager.getRandomApiKey(provider),
    getEndpoint: async (
      provider: Provider,
      _model: string,
      _isStream: boolean,
      _apiKey: string,
      _isEmbedding?: boolean
    ): Promise<string> => {
      const baseUrl = provider.endpoint ?? 'https://api.anthropic.com';
      return `${baseUrl}/v1/messages`;
    },
    getHeaders: async (provider: Provider, _sql: SqlClient, apiKey: string): Promise<Record<string, string>> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      };
      if (provider.authType === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        headers['x-api-key'] = apiKey;
      }
      return headers;
    },

    toStandardRequest: (body: ProtocolBody): ProtocolBody => {
      const b = body as Record<string, unknown>;
      const messages: { role: string; content: string }[] = [];
      if (b.system) {
        const sys = typeof b.system === 'string' ? b.system : (b.system as { text: string }[]).map((block) => block.text).join('\n');
        if (sys) messages.push({ role: 'system', content: sys });
      }
      const srcMessages = b.messages as { role: string; content: string | { type: string; text: string }[] }[] | undefined;
      for (const msg of srcMessages || []) {
        const content = Array.isArray(msg.content)
          ? msg.content.map((block) => (block.type === 'text' ? block.text : '')).join('\n')
          : msg.content;
        messages.push({ role: msg.role, content });
      }
      return {
        model: b.model,
        messages,
        max_tokens: b.max_tokens || 4096,
        temperature: b.temperature,
        top_p: b.top_p,
        stop_sequences: b.stop,
        stream: b.stream,
      };
    },
    fromStandardRequest: (stdBody: ProtocolBody): ProtocolBody => {
      const s = stdBody as Record<string, unknown>;
      let system = '';
      const messages: { role: string; content: string }[] = [];
      const srcMessages = s.messages as { role: string; content: string }[] | undefined;
      for (const msg of srcMessages || []) {
        if (msg.role === 'system') system += msg.content + '\n';
        else messages.push({ role: msg.role, content: msg.content });
      }
      return {
        model: s.model,
        system: system ? system.trim() : undefined,
        messages,
        max_tokens: s.max_tokens || 4096,
        temperature: s.temperature,
        top_p: s.top_p,
        stream: s.stream,
      };
    },
    toStandardResponse: (body: ProtocolBody, model: string): ProtocolBody => {
      const b = body as Record<string, unknown>;
      const usage = b.usage as Record<string, number> | undefined;
      const content = b.content as { text: string }[] | undefined;
      const finishReason = b.stop_reason === 'max_tokens' ? 'length' : 'stop';
      return {
        id: b.id || `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: content?.map((c) => c.text).join('') || '' },
            finish_reason: finishReason,
          },
        ],
        usage: {
          prompt_tokens: usage?.input_tokens || 0,
          completion_tokens: usage?.output_tokens || 0,
          total_tokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
        },
      };
    },
    fromStandardResponse: (stdBody: ProtocolBody): ProtocolBody => {
      const s = stdBody as Record<string, unknown>;
      const choices = s.choices as { finish_reason?: string; message?: { content?: string } }[] | undefined;
      const choice = choices?.[0] || {};
      const stopReason = choice.finish_reason === 'length' ? 'max_tokens' : 'end_turn';
      const usage = s.usage as Record<string, number> | undefined;
      return {
        id: s.id || `msg_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        model: s.model,
        content: [{ type: 'text', text: choice.message?.content || '' }],
        stop_reason: stopReason,
        stop_sequence: null,
        usage: { input_tokens: usage?.prompt_tokens || 0, output_tokens: usage?.completion_tokens || 0 },
      };
    },
    createToStandardStream: (model: string): TransformStream => {
      const streamId = 'chatcmpl-' + Date.now();
      const encoder = new TextEncoder();
      let parser: SSEParser | undefined;

      return new TransformStream({
        start(controller) {
          parser = createSSEParser(({ event, data }: SSEEvent) => {
            if (!data) return;
            try {
              const json = JSON.parse(data);
              if (event === 'content_block_delta' && json.delta?.text) {
                const chunk = {
                  id: streamId,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model,
                  choices: [{ index: 0, delta: { content: json.delta.text }, finish_reason: null }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              } else if (event === 'message_delta' && json.delta?.stop_reason) {
                const finishReason = json.delta.stop_reason === 'max_tokens' ? 'length' : 'stop';
                const chunk = {
                  id: streamId,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model,
                  choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } catch {
              return;
            }
          });
        },
        transform(chunk: Uint8Array, _controller: TransformStreamDefaultController) {
          if (parser) parser.process(chunk);
        },
        flush(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        },
      });
    },
    createFromStandardStream: (): TransformStream => {
      const encoder = new TextEncoder();
      let started = false;
      let parser: SSEParser | undefined;
      const writeEvent = (controller: TransformStreamDefaultController, event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      return new TransformStream({
        start(controller) {
          parser = createSSEParser(({ data }) => {
            if (data === '[DONE]') {
              writeEvent(controller, 'content_block_stop', { type: 'content_block_stop', index: 0 });
              writeEvent(controller, 'message_delta', {
                type: 'message_delta',
                delta: { stop_reason: 'end_turn' },
                usage: { output_tokens: 0 },
              });
              writeEvent(controller, 'message_stop', { type: 'message_stop' });
              return;
            }
            try {
              const json = JSON.parse(data);
              const choice = json.choices?.[0];
              if (!started && choice) {
                writeEvent(controller, 'message_start', {
                  type: 'message_start',
                  message: {
                    id: json.id || `msg_${Date.now()}`,
                    type: 'message',
                    role: 'assistant',
                    model: json.model || '',
                    content: [],
                    stop_reason: null,
                    stop_sequence: null,
                    usage: { input_tokens: 0, output_tokens: 0 },
                  },
                });
                writeEvent(controller, 'content_block_start', {
                  type: 'content_block_start',
                  index: 0,
                  content_block: { type: 'text', text: '' },
                });
                started = true;
              }
              if (choice?.delta?.content) {
                writeEvent(controller, 'content_block_delta', {
                  type: 'content_block_delta',
                  index: 0,
                  delta: { type: 'text_delta', text: choice.delta.content },
                });
              }
            } catch {
              return;
            }
          });
        },
        transform(chunk: Uint8Array, _controller: TransformStreamDefaultController) {
          if (parser) parser.process(chunk);
        },
      });
    },
  };
}
