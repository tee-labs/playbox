# Admin UI

**Location:** `app/admin/`

## OVERVIEW

Admin interface for D1 database management with Ant Design components.

## STRUCTURE

```
admin/
├── layout.tsx # Shared layout (Sider, Header, Content)
├── page.tsx # D1 Tables page (default)
├── components/ # Shared admin components — [AGENTS.md]
├── llm-keys/ # LLM API key management
│ ├── page.tsx # Key management page
│ └── components/CreateKeyModal.tsx # Create key modal
├── github-gists/ # GitHub Gists management
│ └── page.tsx # Gists management page
├── providers/ # AI provider configuration
│ ├── page.tsx # Provider config page
│ └── components/ # Provider sub-components
│ ├── ProviderConfigTab.tsx # Provider configuration tab
│ └── ProviderModelsTab.tsx # Provider models listing tab
├── domains/ # Domain management
│ └── page.tsx # Domain management page
└── types.ts # Shared admin types
```

## WHERE TO LOOK

| Task                | Location                                     | Notes                               |
| ------------------- | -------------------------------------------- | ----------------------------------- |
| Add menu item       | `layout.tsx`                                 | Menu items array                    |
| Add new admin page  | Create dir + `page.tsx`                      | Follow existing patterns            |
| Shared components   | `components/`                                | Reusable admin widgets              |
| LLM key management  | `llm-keys/page.tsx`                          | LLM API key CRUD                    |
| Create key modal    | `llm-keys/components/CreateKeyModal.tsx`     | Key creation form                   |
| GitHub Gists        | `github-gists/page.tsx`                      | GitHub Gists management             |
| Provider config     | `providers/page.tsx`                         | Provider configuration + speed test |
| Provider config tab | `providers/components/ProviderConfigTab.tsx` | Provider settings                   |
| Provider models tab | `providers/components/ProviderModelsTab.tsx` | Model listing                       |
| Domain management   | `domains/page.tsx`                           | Domain CRUD                         |

## CONVENTIONS

- **Ant Design**: All UI uses Ant Design components
- **Custom hooks**: State management via hooks in subdirectories

## ANTI-PATTERNS

- **DO NOT** use server components — admin pages must be client-side
- **DO NOT** duplicate layout — use shared `layout.tsx`
