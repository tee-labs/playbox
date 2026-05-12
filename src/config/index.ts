import { getDefaultConfig, Config } from './default';
import { ProtocolFamily, ProviderConfig } from '../types/provider';

export type { ProviderConfig } from '../types/provider';

export interface ResolvedProvider {
  name: string;
  provider: ProviderConfig;
  realModel: string;
}

export async function getConfig(): Promise<Config> {
  return getDefaultConfig();
}

export function resolveProvider(config: Config, model: string, family?: ProtocolFamily): ResolvedProvider {
  // New mode: prefixed model format (e.g., "doubao/ark-code-latest")
  if (model.includes('/')) {
    const colonIndex = model.indexOf('/');
    const providerNameFromModel = model.substring(0, colonIndex);
    const actualModelName = model.substring(colonIndex + 1);

    // Check if this provider exists in config
    if (config.providers[providerNameFromModel]) {
      const provider = config.providers[providerNameFromModel];

      // Auto model resolution: "provider/auto" → pick a random model
      if (actualModelName === 'auto') {
        const resolvedModel = resolveAutoModel(provider);
        return { name: providerNameFromModel, provider, realModel: resolvedModel };
      }

      // Validate model exists in provider's model list
      if (provider.models && provider.models.includes(actualModelName)) {
        // Valid new mode - use the prefixed provider and model
        return { name: providerNameFromModel, provider, realModel: actualModelName };
      }
      // Model not in provider's list - treat as legacy mode (fall through)
    }
    // Provider doesn't exist or model not in list - fall through to legacy mode
  }

  // Bare "auto" → resolve from default provider
  if (model === 'auto') {
    const providerName = config.default_provider;
    const provider = config.providers[providerName];
    const resolvedModel = resolveAutoModel(provider);
    return { name: providerName, provider, realModel: resolvedModel };
  }

  // Legacy mode: search for model in all providers
  let fallbackProviderName: string | null = null;

  for (const [name, p] of Object.entries(config.providers)) {
    if (p.models && p.models.includes(model)) {
      if (!fallbackProviderName) fallbackProviderName = name;
      if (family && p.family === family) {
        return { name, provider: p, realModel: model };
      }
    }
  }

  const finalName = fallbackProviderName || config.default_provider;
  return { name: finalName, provider: config.providers[finalName], realModel: model };
}

/**
 * Resolve "auto" model: pick a random model from autoModels (if configured) or models list.
 */
function resolveAutoModel(provider: ProviderConfig): string {
  const autoModelsStr = provider.autoModels?.trim();
  const pool = autoModelsStr
    ? autoModelsStr.split(',').map(m => m.trim()).filter(Boolean)
    : provider.models || [];

  if (pool.length === 0) {
    return 'auto'; // Fallback: no models available
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export const ConfigManager = {
  getConfig,
  resolveProvider,
};
