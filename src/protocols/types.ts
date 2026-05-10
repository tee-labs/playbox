import type { Env, ProtocolBody } from '../types';
import type { SqlClient } from '../db/types';

export type { Env, ProtocolBody };

export interface Provider {
  key: string;
  type: string;
  baseUrl?: string;
  endpoint: string;
  supportsStreaming?: boolean;
  models: string[];
  authType?: 'header' | 'bearer';
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface ProtocolAdapter {
  name: string;
  getAttempt(): number;
  getApiKey(sql: SqlClient, provider: Provider): Promise<string>;
  getEndpoint(
    provider: Provider,
    model: string,
    isStream: boolean,
    apiKey: string,
    isEmbedding?: boolean,
    isRerank?: boolean
  ): Promise<string>;
  getHeaders(provider: Provider, sql: SqlClient, apiKey: string): Promise<Record<string, string>>;

  // Optional: Request/response conversion (only for protocol-to-protocol conversion)
  toStandardRequest?(body: ProtocolBody): ProtocolBody;
  fromStandardRequest?(stdBody: ProtocolBody): ProtocolBody;
  toStandardResponse?(body: ProtocolBody, model: string): ProtocolBody;
  fromStandardResponse?(stdBody: ProtocolBody): ProtocolBody;
  createToStandardStream?(model: string): TransformStream;
  createFromStandardStream?(): TransformStream;
}
