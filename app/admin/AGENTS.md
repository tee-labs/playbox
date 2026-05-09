# Admin UI

**Location:** `app/admin/`

## OVERVIEW

Admin interface for D1 database, KV storage, chat testing, and analytics with Ant Design components and Recharts
visualizations.

## STRUCTURE

```
admin/
├── layout.tsx # Shared layout (Sider, Header, Content)
├── page.tsx # D1 Tables page (default)
├── components/ # Shared admin components — [AGENTS.md]
├── kv/ # KV namespace management
├── chat/ # Chat test interface
│   └── page.tsx # Chat testing page
├── analytics/ # API usage analytics
│   └── page.tsx # Analytics dashboard with charts
├── llm-keys/ # LLM API key management
│   └── page.tsx # Key management page
├── github-gists/ # GitHub Gists management
│   └── page.tsx # Gists management page
├── providers/ # AI provider configuration
│   └── page.tsx # Provider config page
├── domains/ # Domain management
│   └── page.tsx # Domain management page
└── types.ts # Shared admin types
```

## WHERE TO LOOK

| Task                | Location                | Notes                                                |
| ------------------- | ----------------------- | ---------------------------------------------------- |
| Add menu item       | `layout.tsx`            | Menu items array                                     |
| Add new admin page  | Create dir + `page.tsx` | Follow existing patterns                             |
| Chat test page      | `chat/page.tsx`         | Chat interface with model selector                   |
| Analytics dashboard | `analytics/page.tsx`    | Charts with Recharts (PieChart, BarChart, LineChart) |
| Shared components   | `components/`           | Reusable admin widgets                               |
| LLM key management  | `llm-keys/page.tsx`     | LLM API key CRUD                                     |
| GitHub Gists        | `github-gists/page.tsx` | GitHub Gists management                              |
| Provider config     | `providers/page.tsx`    | Provider configuration + speed test                  |
| Domain management   | `domains/page.tsx`      | Domain CRUD                                          |
| KV management       | `kv/page.tsx`           | KV namespace management                              |

## CONVENTIONS

- **Ant Design**: All UI uses Ant Design components
- **Recharts**: Analytics page uses Recharts for visualizations
- **Custom hooks**: State management via hooks in subdirectories

## ANTI-PATTERNS

- **DO NOT** use server components — admin pages must be client-side
- **DO NOT** duplicate layout — use shared `layout.tsx`
