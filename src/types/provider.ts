/**
 * AI Provider Configuration Types
 */

/**
 * Protocol family - distinguishes between different API endpoint formats
 * - 'openai': OpenAI-compatible format - routes to /v1/chat/completions
 * - 'anthropic': Anthropic native format - routes to /v1/messages
 * - 'gemini': Gemini native format (Google AI, Gemini CLI) - routes to /v1beta/models
 */
export type ProtocolFamily = 'openai' | 'anthropic' | 'gemini' | 'embedding';

/**
 * Specific protocol types within each family
 */
export type OpenAIProtocolType = 'openai' | 'anthropic';
export type GeminiProtocolType = 'google' | 'gemini-cli' | 'gemini';

/**
 * All supported protocol types
 */
export type ProtocolType = OpenAIProtocolType | GeminiProtocolType | 'worker';

/**
 * Authentication type for API requests
 * - 'header': x-api-key header (Anthropic default)
 * - 'bearer': Authorization: Bearer header (OpenAI style)
 */
export type AuthType = 'header' | 'bearer';

/**
 * Provider configuration
 * Each provider is locked to a single protocol family at configuration time.
 */
export interface ProviderConfig {
  type: ProtocolType;
  family: ProtocolFamily; // Required: locks provider to a protocol family
  endpoint: string;
  key: string;
  models: string[];
  authType?: AuthType; // Optional: defaults to 'header' for Anthropic, 'bearer' for OpenAI
}

export type Provider = Record<string, ProviderConfig>;
