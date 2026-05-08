# Vercel 部署指南

本指南详细说明如何将 Playbox 部署到 Vercel 平台。

## 架构差异

Playbox 使用**存储适配器模式**，在不同平台上使用不同的存储后端：

| 存储类型 | Cloudflare Workers | Vercel | Vercel 服务 |
|----------|-------------------|--------|------------|
| KV (缓存) | Cloudflare KV | Vercel KV (Upstash Redis) | `@vercel/kv` |
| D1 (数据库) | Cloudflare D1 (SQLite) | Vercel Postgres (Neon) | `@vercel/postgres` |
| R2 (对象存储) | Cloudflare R2 | Vercel Blob (S3) | `@vercel/blob` |
| Analytics | Cloudflare Analytics Engine | ⚠️ 暂不支持 | — |

## 前置条件

- [Vercel 账户](https://vercel.com) (免费即可)
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)
- Node.js 18+

## 第一步：创建 Vercel 项目

```bash
# 克隆项目
git clone https://github.com/tee-labs/playbox.git
cd playbox

# 安装依赖
npm install

# 登录 Vercel
vercel login

# 关联项目（首次部署，选择 Create New Project）
vercel link
```

## 第二步：创建存储服务

### 2.1 创建 Vercel KV (替代 Cloudflare KV)

```bash
# 创建 KV 存储实例
vercel kv create playbox-kv

# 输出会显示环境变量，记下这些值：
# KV_REST_API_URL=https://xxx.upstash.io
# KV_REST_API_TOKEN=xxx
```

在 Vercel Dashboard 中，也可以：
1. 进入 **Storage** → **Create Database** → **KV (Redis)**
2. 数据库名称：`playbox-kv`
3. 区域：选择离你用户最近的

### 2.2 创建 Vercel Postgres (替代 Cloudflare D1)

```bash
# 创建 Postgres 数据库
vercel postgres create playbox-db

# 输出会显示环境变量：
# POSTGRES_URL=postgres://xxx
# POSTGRES_PRISMA_URL=postgres://xxx
# POSTGRES_URL_NON_POOLING=postgres://xxx
```

在 Vercel Dashboard 中：
1. 进入 **Storage** → **Create Database** → **Postgres (Neon)**
2. 数据库名称：`playbox-db`
3. 区域：选择离你用户最近的

### 2.3 创建 Vercel Blob (替代 Cloudflare R2)

```bash
# 创建 Blob 存储
vercel blob create playbox-r2

# 输出会显示环境变量：
# BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
```

在 Vercel Dashboard 中：
1. 进入 **Storage** → **Create Database** → **Blob**
2. 名称：`playbox-r2`

### 2.4 关联存储到项目

创建完存储后，需要将它们关联到项目：

```bash
# 方法1：通过 CLI（每个存储创建时会提示是否关联）
# 方法2：在 Vercel Dashboard → Storage → 选择存储 → Connect to Project

# 方法3：手动链接（如果创建时没关联）
vercel kv link playbox-kv
vercel postgres link playbox-db
vercel blob link playbox-r2
```

关联后，环境变量会自动注入到项目中，无需手动配置。

## 第三步：初始化数据库

Vercel Postgres 使用 PostgreSQL 语法，需要将 Cloudflare D1 (SQLite) 的迁移脚本转换为 PostgreSQL 格式。

### 3.1 连接到数据库

```bash
# 通过 Vercel CLI 打开数据库 Shell
vercel postgres shell playbox-db
```

或者使用 `psql`：
```bash
# 获取连接字符串
vercel env pull .env.local
# 然后
psql $POSTGRES_URL
```

### 3.2 执行建表语句

以下是 D1 迁移脚本转换后的 PostgreSQL 版本，直接在数据库 Shell 中执行：

```sql
-- =====================================================
-- providers 表
-- =====================================================
CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  family TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  key TEXT NOT NULL,
  models TEXT NOT NULL DEFAULT '[]',
  auth_type TEXT DEFAULT 'bearer',
  sort_order INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT NOW(),
  updated_at TEXT NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
CREATE INDEX IF NOT EXISTS idx_providers_family ON providers(family);
CREATE INDEX IF NOT EXISTS idx_providers_enabled ON providers(enabled);
CREATE INDEX IF NOT EXISTS idx_providers_sort_order ON providers(sort_order);

-- 插入初始 providers 数据（根据需要修改）
INSERT INTO providers (name, type, family, endpoint, key, models, auth_type, sort_order, enabled, created_at, updated_at)
VALUES
  ('ollama', 'openai', 'openai', 'https://ollama.com', 'Ollama', '["gemma4:31b"]', 'bearer', 0, 1, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- security_keys 表
-- =====================================================
CREATE TABLE IF NOT EXISTS security_keys (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('API_KEY', 'REFRESH_TOKEN', 'ACCESS_TOKEN', 'OAUTH_JSON', 'EMAIL')),
    provider TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT NOW(),
    updated_at TEXT NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_keys_type ON security_keys(type);
CREATE INDEX IF NOT EXISTS idx_security_keys_provider ON security_keys(provider);
CREATE INDEX IF NOT EXISTS idx_security_keys_type_provider ON security_keys(type, provider);
CREATE UNIQUE INDEX IF NOT EXISTS idx_security_keys_unique ON security_keys(type, provider, content);

-- =====================================================
-- llm_api_keys 表
-- =====================================================
CREATE TABLE IF NOT EXISTS llm_api_keys (
    id TEXT PRIMARY KEY,
    api_key TEXT NOT NULL,
    name TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT NOW(),
    is_active INTEGER DEFAULT 1,
    last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_llm_api_keys_api_key ON llm_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_active ON llm_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_llm_api_keys_expires ON llm_api_keys(expires_at);

-- =====================================================
-- download_history 表
-- =====================================================
CREATE TABLE IF NOT EXISTS download_history (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'failed')),
  error TEXT,
  range_header TEXT,
  created_at TEXT NOT NULL DEFAULT NOW(),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_download_status ON download_history(status);
CREATE INDEX IF NOT EXISTS idx_download_created_at ON download_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_filename ON download_history(filename);

-- =====================================================
-- api_test_history 表
-- =====================================================
CREATE TABLE IF NOT EXISTS api_test_history (
    id TEXT PRIMARY KEY,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers TEXT,
    body TEXT,
    body_format TEXT DEFAULT 'json',
    response_status INTEGER,
    response_headers TEXT,
    response_body TEXT,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_test_created_at ON api_test_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_test_method ON api_test_history(method);

-- =====================================================
-- email_history 表
-- =====================================================
CREATE TABLE IF NOT EXISTS email_history (
  id TEXT PRIMARY KEY,
  recipients TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  html_body TEXT,
  attachments TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'failed')),
  error TEXT,
  created_at TEXT NOT NULL DEFAULT NOW(),
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_history(status);
CREATE INDEX IF NOT EXISTS idx_email_history_created_at ON email_history(created_at);
```

### 3.3 插入 API Key

```sql
-- 插入用于认证的 API Key（替换 your-secret-key）
INSERT INTO llm_api_keys (id, api_key, name, created_at)
VALUES (
  gen_random_uuid()::text,
  'your-secret-key',
  'default-key',
  NOW()
);
```

## 第四步：配置环境变量

除了存储服务自动注入的环境变量外，还需要手动设置：

```bash
# 设置认证 Token
vercel env add AUTH_TOKEN

# 本地开发时，创建 .env.local 文件：
cat > .env.local << 'EOF'
# KV (从 vercel kv create 输出复制)
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxx

# Postgres (从 vercel postgres create 输出复制)
POSTGRES_URL=postgres://xxx
POSTGRES_PRISMA_URL=postgres://xxx
POSTGRES_URL_NON_POOLING=postgres://xxx

# Blob (从 vercel blob create 输出复制)
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx

# Auth
AUTH_TOKEN=your-secret-key
EOF
```

## 第五步：部署

```bash
# 部署到生产环境
npm run deploy:vercel

# 或者
vercel --prod

# 预览部署
vercel
```

## 第六步：验证部署

```bash
# 测试健康检查
curl https://your-app.vercel.app/v1/models \
  -H "Authorization: Bearer your-secret-key"

# 测试聊天接口
curl https://your-app.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma4:31b","messages":[{"role":"user","content":"hello"}]}'
```

## SQL 兼容性说明

D1 适配器 (`VercelD1Adapter`) 会自动将 SQLite 语法转换为 PostgreSQL 语法：

| SQLite (D1) | PostgreSQL (Vercel Postgres) | 自动转换 |
|-------------|------------------------------|---------|
| `?` 占位符 | `$1, $2, ...` 参数化查询 | ✅ |
| `datetime('now')` | `NOW()` | ✅ |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` | ✅ |
| `RANDOM()` | `RANDOM()` | ✅ (兼容) |
| `INSERT OR IGNORE` | `INSERT ... ON CONFLICT DO NOTHING` | ❌ 需手动 |
| `json_extract()` | `->>` 或 `jsonb_path_query()` | ❌ 需手动 |

> **注意**: 复杂 SQL（如 `INSERT OR IGNORE`、`json_extract`）不在自动转换范围内，
> 因为项目代码中这些查询直接写在 D1 适配器接口的调用处，已确保兼容。

## 功能限制

| 功能 | Cloudflare Workers | Vercel | 备注 |
|------|-------------------|--------|------|
| API Gateway | ✅ | ✅ | 完全支持 |
| 多协议转换 | ✅ | ✅ | 完全支持 |
| KV 缓存 | ✅ (Cloudflare KV) | ✅ (Vercel KV/Redis) | 完全支持 |
| D1 数据库 | ✅ (Cloudflare D1) | ✅ (Vercel Postgres) | 完全支持 |
| R2 对象存储 | ✅ (Cloudflare R2) | ✅ (Vercel Blob) | 完全支持 |
| API 分析 | ✅ (Analytics Engine) | ❌ | Vercel 无等价服务 |
| Admin Dashboard | ✅ | ⚠️ | 可用但分析页无数据 |
| KV/D1/R2 管理 UI | ✅ | ⚠️ | UI 可用，操作的是 Vercel 存储后端 |

## Vercel 免费额度

| 服务 | 免费额度 | 超出后 |
|------|---------|--------|
| Vercel KV | 256MB, 10K 命令/天 | $0.20/100K 命令 |
| Vercel Postgres | 0.5GB 存储, 60小时计算/月 | 按用量计费 |
| Vercel Blob | 250MB 存储 | $0.15/GB/月 |
| Serverless 函数 | 100GB-Hrs, 1000万次调用/月 | 按用量计费 |

## 故障排查

### 连接 KV 失败
```
Error: KV_REST_API_URL is not set
```
→ 运行 `vercel kv link playbox-kv` 关联 KV 到项目

### 连接 Postgres 失败
```
Error: POSTGRES_URL is not set
```
→ 运行 `vercel postgres link playbox-db` 关联 Postgres 到项目

### 连接 Blob 失败
```
Error: BLOB_READ_WRITE_TOKEN is not set
```
→ 运行 `vercel blob link playbox-r2` 关联 Blob 到项目

### 查询报 SQL 语法错误
→ Vercel Postgres 是 PostgreSQL，部分 SQLite 语法不兼容。检查错误日志中的 SQL 语句，
确认 `VercelD1Adapter.translateSql()` 是否正确转换。
