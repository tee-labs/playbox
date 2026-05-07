-- Providers Table
-- Stores AI provider configurations
-- Provides runtime configuration with D1 as the primary source

CREATE TABLE IF NOT EXISTS providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  family TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  key TEXT NOT NULL,
  models TEXT NOT NULL DEFAULT '[]',
  auth_type TEXT DEFAULT 'bearer',
  sort_order INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
CREATE INDEX IF NOT EXISTS idx_providers_family ON providers(family);
CREATE INDEX IF NOT EXISTS idx_providers_enabled ON providers(enabled);
CREATE INDEX IF NOT EXISTS idx_providers_sort_order ON providers(sort_order);

-- Seed data for providers
INSERT OR IGNORE INTO providers (name, type, family, endpoint, key, models, auth_type, sort_order, enabled, created_at, updated_at)
VALUES
  ('ollama', 'openai', 'openai', 'https://ollama.com', 'Ollama', '["gemma4:31b","glm-4.7","minimax-m2.5","qwen3-vl:235b","qwen3-coder:480b","qwen3-vl:235b-instruct"]', 'bearer', 0, 1, datetime('now'), datetime('now')),
  ('longcat', 'openai', 'openai', 'https://api.longcat.chat/openai', 'LongCat', '["LongCat-Flash-Chat","LongCat-Flash-Lite","LongCat-Flash-Thinking","LongCat-Pro-Preview","LongCat-Flash-Chat-2602-Exp","LongCat-2.0-Preview","Sphynx"]', 'bearer', 1, 1, datetime('now'), datetime('now')),
  ('longcat_claude', 'anthropic', 'anthropic', 'https://api.longcat.chat/anthropic', 'LongCat', '["LongCat-Flash-Chat","LongCat-Flash-Lite","LongCat-Flash-Thinking","LongCat-Pro-Preview","LongCat-Flash-Chat-2602-Exp","LongCat-2.0-Preview","Sphynx"]', 'bearer', 2, 1, datetime('now'), datetime('now')),
  ('modelscope', 'openai', 'openai', 'https://api-inference.modelscope.cn', 'ModelScope', '["deepseek-ai/DeepSeek-V3.2","deepseek-ai/DeepSeek-V4-Flash","MiniMax/MiniMax-M2.5","moonshotai/Kimi-K2.5","Qwen/Qwen3.5-397B-A17B","Qwen/Qwen3.5-35B-A3B","Qwen/Qwen3.5-27B","Qwen/Qwen3.5-122B-A10B","ZhipuAI/GLM-5","ZhipuAI/GLM-5.1","ZhipuAI/GLM-4.7-Flash"]', 'bearer', 3, 1, datetime('now'), datetime('now')),
  ('nvidia', 'openai', 'openai', 'https://integrate.api.nvidia.com', 'Nvidia', '["z-ai/glm-5.1","qwen/qwen3-coder-480b-a35b-instruct","qwen/qwen3.5-397b-a17b","qwen/qwen3.5-122b-a10b","google/gemma-4-31b-it","minimaxai/minimax-m2.5","minimaxai/minimax-m2.7","nvidia/nemotron-3-super-120b-a12b","nvidia/nemotron-3-nano-omni-30b-a3b-reasoning","deepseek-ai/deepseek-v4-flash","deepseek-ai/deepseek-v4-pro"]', 'bearer', 4, 1, datetime('now'), datetime('now')),
  ('doubao', 'openai', 'openai', 'https://ark.cn-beijing.volces.com/api/coding/v3', 'Doubao', '["ark-code-latest"]', 'bearer', 5, 1, datetime('now'), datetime('now')),
  ('gitee-ai', 'openai', 'embedding', 'https://ai.gitee.com', 'GiteeAI', '["bge-m3","Qwen3-Embedding-8B"]', 'bearer', 6, 1, datetime('now'), datetime('now')),
  ('gitee-ai-rerank', 'openai', 'rerank', 'https://ai.gitee.com', 'GiteeAI', '["bge-reranker-v2-m3","Qwen3-Reranker-8B"]', 'bearer', 7, 1, datetime('now'), datetime('now'));