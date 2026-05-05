# Playbox - AI API Gateway & Protocol Converter

AI API Gateway & Protocol Converter — converts between AI provider protocols (OpenAI, Anthropic, Google, Gemini CLI) on
Next.js with Cloudflare Workers deployment.

## Overview

Playbox is a Next.js-based API gateway that translates between different AI provider protocols. It allows you to use a
single API endpoint to interact with multiple AI providers, handling protocol conversion, authentication, and token
management automatically.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Testing**: Vitest + Cloudflare Workers pool
- **Deployment**: Cloudflare Workers (via OpenNext for Cloudflare)
- **UI**: Ant Design + Recharts

## Project Structure

```
./
├── app/                    # Next.js App Router
│   ├── v1/                 # Public API (non-standard location - NOT under app/api/)
│   │   ├── chat/completions/  # OpenAI-compatible chat completions
│   │   ├── models/         # Model listing endpoint
│   │   └── messages/       # Anthropic-compatible messages API
│   ├── v1beta/             # Gemini native API endpoints (Google standard paths)
│   │   └── models/         # Gemini API: models listing + generateContent/streamGenerateContent
│   ├── api/
│   │   ├── admin/          # Admin API endpoints
│   │   │   ├── kv/         # KV namespace management
│   │   │   ├── tables/     # D1 table management
│   │   │   ├── download/history/  # Download history
│   │   │   └── analytics/  # Cloudflare Analytics Engine API
│   │   ├── download/       # Download proxy endpoint
│   ├── admin/              # Admin UI (React + Ant Design)
│   │   ├── kv/             # KV management UI
│   │   ├── download/       # Download proxy management
│   │   ├── chat/           # Chat test interface
│   │   ├── api-test/       # API testing interface
│   │   ├── analytics/      # API usage analytics
│   │   └── components/     # Shared admin components
│   ├── components/         # React components
│   │   └── Chat/           # Chat UI components
│   └── lib/                # Client-side utilities
├── src/
│   ├── protocols/          # Protocol adapters (OpenAI, Anthropic, Google, Gemini CLI)
│   ├── managers/           # KeyManager (KV/D1 token management)
│   ├── config/             # ConfigManager, provider configs
│   ├── utils/              # Logger, CORS constants, SSRF protection
│   ├── lib/                # Auth middleware, response helpers
│   └── types/              # Protocol, request, response types
├── test/                   # Vitest + Cloudflare Workers pool
│   ├── unit/               # Protocol + manager tests
│   └── factories/          # Mock data generators
├── prisma/migrations/      # D1 schema migrations
├── wrangler.jsonc          # Cloudflare Workers config (D1, KV, secrets)
└── vitest.config.mts       # Test config with CF pool
```

## Features

- **Multi-protocol Support**: OpenAI, Anthropic, Google, Gemini CLI formats
- **Protocol Conversion**: Automatic translation between provider protocols
- **Gemini Native API**: Standard Google Gemini REST paths (`/v1beta/models/{model}:generateContent`)
- **Authentication**: API key verification and management
- **Token Caching**: KV-based caching for access tokens with automatic refresh
- **CORS Support**: Configurable CORS headers for cross-origin requests
- **Admin Dashboard**: React + Ant Design UI for management
- **Analytics**: Cloudflare Analytics Engine integration with Recharts visualizations
- **Download Proxy**: Secure file downloads with SSRF protection

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Deploy to Cloudflare
npm run deploy
```

### Configuration

Configuration is managed through environment variables and `wrangler.jsonc`:

```bash
# Set secrets via wrangler
wrangler secret put AUTH_TOKEN

# Local development uses .dev.vars file
```

## API Endpoints

### OpenAI-Compatible Endpoints

```bash
# List models
GET /v1/models

# Chat completions
POST /v1/chat/completions
```

### Anthropic-Compatible Endpoints

```bash
# Messages API
POST /v1/messages
```

### Gemini Native Endpoints

```bash
# List models
GET /v1beta/models

# Generate content
POST /v1beta/models/{model}:generateContent

# Stream generate content
POST /v1beta/models/{model}:streamGenerateContent
```

### Admin Endpoints

```bash
# KV management
GET/POST/DELETE /api/admin/kv/{namespace}/{key}

# Download history
GET /api/admin/download/history

# Analytics
GET /api/admin/analytics
```

## Protocol Support

### OpenAI

- Chat Completions API
- Models API
- Streaming support

### Anthropic

- Messages API
- Streaming support

### Google

- Chat API
- Streaming support

### Gemini CLI

- OAuth-based authentication
- Token caching in KV
- Automatic token refresh

## Development

### Adding a New Protocol

1. Create a new protocol adapter in `src/protocols/`
2. Implement the `ProtocolAdapter` interface
3. Export a `createXProtocol()` factory function
4. Register in `src/protocols/index.ts`

### Adding a New API Route

- **Public API**: Add to `app/v1/` (NOT `app/api/v1/`)
- **Gemini Native**: Add to `app/v1beta/`
- **Admin API**: Add to `app/api/admin/`

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run smoke tests
npm run smoke-test
```

## Deployment

### Local Development

```bash
npm run dev
```

### Cloudflare Workers

```bash
# Deploy to Cloudflare
npm run deploy

# Preview deployment
npm run preview
```

## Security

- **SSRF Protection**: All external URLs validated via `validateSafeUrl()`
- **API Key**: Required for all endpoints (set via `AUTH_TOKEN` secret)
- **Secrets**: Use `wrangler secret put` for sensitive values

## Documentation

- [AGENTS.md](./AGENTS.md) - Project knowledge base for AI agents
- [DESIGN.md](./DESIGN.md) - Design system tokens and UI patterns (colors, typography, spacing, components)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
