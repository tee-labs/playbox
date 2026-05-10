import { ProviderConfig } from './provider';
import type { Env } from './index';
import type { ExecutionContext } from '../protocols/types';

/**
 * JSON Schema type for tool parameters.
 * Represents a subset of JSON Schema Draft 07.
 */
export interface JsonSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: unknown[];
  default?: unknown;
  additionalProperties?: boolean | JsonSchema;
  [key: string]: unknown;
}

/**
 * Tool Definition (OpenAI Format)
 */
export interface StandardTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters?: JsonSchema;
  };
}

/**
 * Tool Call (OpenAI Format)
 */
export interface StandardToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type ToolChoice = 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };

export interface StandardMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: StandardToolCall[]; // For assistant messages
  tool_call_id?: string; // For tool responses
  name?: string; // For tool responses
}

/** Represents a request/response body in an unknown protocol format. */
export type ProtocolBody = Record<string, unknown>;

export interface ProtocolAdapter {
  name: string;

  // Path and Auth Conversion
  getAttempt(): number;
  getApiKey(env: Env, provider: ProviderConfig, ctx: ExecutionContext): Promise<string>;
  getEndpoint(provider: ProviderConfig, model: string, isStream: boolean, apiKey?: string): Promise<string>;
  getHeaders(provider: ProviderConfig, env: Env, ctx: ExecutionContext, apiKey?: string): Promise<Record<string, string>>;

  // Request Conversion (External <-> Standard)
  toStandardRequest(body: ProtocolBody): ProtocolBody;
  fromStandardRequest(stdBody: ProtocolBody): ProtocolBody;

  // Response Conversion (Non-stream)
  toStandardResponse(body: ProtocolBody, model: string): ProtocolBody;
  fromStandardResponse(stdBody: ProtocolBody): ProtocolBody;

  // Stream Conversion (Returns TransformStream)
  createToStandardStream(model: string): TransformStream;
  createFromStandardStream(): TransformStream;
}
