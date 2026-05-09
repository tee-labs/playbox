export * from './protocol';
export type { ProviderConfig, ProtocolType } from './provider';
export * from './request';
export * from './response';

import { ProviderConfig } from './provider';

export type Env = Cloudflare.Env;

export interface Config {
  providers: Record<string, ProviderConfig>;
  default_provider: string;
}

export interface ResolvedProvider {
  name: string;
  provider: ProviderConfig;
  realModel: string;
}
