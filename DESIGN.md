---
version: alpha
name: Playbox
description:
  AI API Gateway & Protocol Converter — admin dashboard with Ant Design, flat aesthetic, utility-first spacing

colors:
  primary: '#1890ff'
  secondary: '#722ed1'
  tertiary: '#13c2c2'
  neutral: '#666666'
  surface: '#ffffff'
  on-surface: '#0f172a'
  error: '#ff4d4f'
  error-deep: '#f5222d'
  warning: '#faad14'
  success: '#52c41a'
  magenta: '#eb2f96'
  orange: '#fa8c16'
  border: '#f0f0f0'
  surface-subtle: '#fafafa'
  surface-warning: '#fffbe6'
  text-secondary: '#666666'
  text-muted: '#475569'

typography:
  headline-display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 1.35
  headline-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 1.4
  headline-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 1.5
  body-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 1.5
  body-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 1.5
  body-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 1.5
  label-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 1.5
  label-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 1.5
  label-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 1.5
  monospace:
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 1.5

rounded:
  none: 0px
  sm: 3px
  md: 4px
  lg: 8px
  xl: 12px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px

components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '#ffffff'
    typography: '{typography.label-lg}'
    rounded: '{rounded.md}'
    height: 32px
  button-primary-hover:
    backgroundColor: '#40a9ff'
    textColor: '#ffffff'
  button-default:
    backgroundColor: '#ffffff'
    textColor: '{colors.on-surface}'
    typography: '{typography.label-lg}'
    rounded: '{rounded.md}'
    height: 32px
  button-danger:
    backgroundColor: '#ffffff'
    textColor: '{colors.error}'
    typography: '{typography.label-lg}'
    rounded: '{rounded.md}'
    height: 32px
  button-danger-hover:
    backgroundColor: '{colors.error}'
    textColor: '#ffffff'
  table:
    backgroundColor: '#ffffff'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.lg}'
    size: small
  modal:
    backgroundColor: '#ffffff'
    typography: '{typography.body-md}'
    rounded: '{rounded.lg}'
  card:
    backgroundColor: '#ffffff'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.lg}'
  input:
    backgroundColor: '#ffffff'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.md}'
    height: 32px
  alert-error:
    backgroundColor: '#fff2f0'
    textColor: '{colors.error-deep}'
    typography: '{typography.body-md}'
    rounded: '{rounded.md}'
  alert-warning:
    backgroundColor: '{colors.surface-warning}'
    textColor: '{colors.warning}'
    typography: '{typography.body-md}'
    rounded: '{rounded.md}'
  sidebar:
    backgroundColor: '#ffffff'
    textColor: '{colors.on-surface}'
    width: 220px
  header:
    backgroundColor: '#ffffff'
    textColor: '{colors.on-surface}'
    height: 64px
  content-area:
    backgroundColor: '#ffffff'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.lg}'
    padding: '{spacing.lg}'
  content-area-mobile:
    padding: '{spacing.md}'
  badge:
    typography: '{typography.label-sm}'
    rounded: '{rounded.xl}'
  chart-palette:
    backgroundColor: "['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']"
---

## Overview

Playbox is an AI API Gateway & Protocol Converter with an admin dashboard built on **Ant Design**. The visual identity
is functional and utilitarian — a flat design language with no shadows, relying on borders and background contrast for
hierarchy. The primary blue (`#1890ff`) ties all interactive elements together, while Ant Design's component library
provides consistency out of the box.

**Brand & Style:** Clean, dense, information-first. The UI prioritizes data density and functional clarity over
decorative aesthetics. It feels like an operations console — quick to scan, efficient to navigate.

## Colors

The palette extends Ant Design v4 defaults with a small set of semantic and chart colors. No custom dark mode — the
surface is always white.

| Token             | Hex       | Role                                                        |
| ----------------- | --------- | ----------------------------------------------------------- |
| `primary`         | `#1890ff` | Interactive elements — buttons, links, icons, active states |
| `secondary`       | `#722ed1` | Chart accent, secondary highlights                          |
| `tertiary`        | `#13c2c2` | Chart accent, informational badges                          |
| `neutral`         | `#666666` | Secondary text, muted labels                                |
| `surface`         | `#ffffff` | Card backgrounds, content areas, modals                     |
| `on-surface`      | `#0f172a` | Primary text, headings                                      |
| `error`           | `#ff4d4f` | Error text, danger buttons, validation                      |
| `error-deep`      | `#f5222d` | Stronger error emphasis, alert borders                      |
| `warning`         | `#faad14` | Warning text, caution indicators                            |
| `success`         | `#52c41a` | Success states, positive indicators                         |
| `magenta`         | `#eb2f96` | Chart accent                                                |
| `orange`          | `#fa8c16` | Chart accent                                                |
| `border`          | `#f0f0f0` | All dividers, card borders, separators                      |
| `surface-subtle`  | `#fafafa` | Hovered rows, subtle backgrounds                            |
| `surface-warning` | `#fffbe6` | Warning alert backgrounds                                   |
| `text-secondary`  | `#666666` | Muted body text                                             |
| `text-muted`      | `#475569` | Badge text, low-priority labels                             |

Chart visuals cycle through 8 colors: primary → success → warning → error-deep → secondary → tertiary → magenta →
orange.

## Typography

The system uses the platform's default sans-serif stack — no custom web fonts. This keeps load times minimal and
respects the user's OS preferences. Monospace is used exclusively for code, JSON payloads, and technical identifiers.

| Token              | Size | Weight | Use                                         |
| ------------------ | ---- | ------ | ------------------------------------------- |
| `headline-display` | 24px | 600    | Page titles                                 |
| `headline-lg`      | 20px | 600    | Section headers, modal titles               |
| `headline-md`      | 16px | 600    | Card titles, sub-sections                   |
| `body-lg`          | 16px | 400    | Feature descriptions, prominent body text   |
| `body-md`          | 14px | 400    | Default body text, table cells, form labels |
| `body-sm`          | 13px | 400    | Compact text, metadata                      |
| `label-lg`         | 14px | 500    | Button labels, form headings                |
| `label-md`         | 12px | 500    | Small badges, secondary labels              |
| `label-sm`         | 11px | 500    | Micro-labels, status tags                   |
| `monospace`        | 13px | 400    | Code blocks, JSON display, API keys         |

## Layout & Spacing

The admin shell uses Ant Design's `Layout` with a fixed sidebar (220px, collapsible) and a 64px header. Content sits on
a `#f0f0f0` background with white cards providing contrast.

**Breakpoint:** 768px — below this, the sidebar collapses into a Drawer and content padding reduces from 24px to 12px.

| Token  | Value | Use                                          |
| ------ | ----- | -------------------------------------------- |
| `xs`   | 4px   | Micro gaps, inline spacing, tag radius       |
| `sm`   | 8px   | Small margins, icon-to-text gaps             |
| `md`   | 12px  | Mobile content padding, compact spacing      |
| `base` | 16px  | Standard margins, grid gutters, form spacing |
| `lg`   | 24px  | Desktop content padding, section margins     |
| `xl`   | 32px  | Major section separation                     |

Grid uses Ant Design `Row`/`Col` with `gutter={16}` (matching `spacing.base`).

## Elevation & Depth

Playbox uses a **flat design language** — no `box-shadow` anywhere in the interface. Visual hierarchy is achieved
through:

- **Borders** (`1px solid #f0f0f0`) to separate regions (sidebar, header, cards)
- **Background contrast** (white cards on `#f0f0f0` page background)
- **Color emphasis** (primary blue for interactive elements, semantic colors for status)

This is intentional: the admin console prioritizes scan speed and information density. Shadows add visual noise without
functional benefit in a data-dense layout.

## Shapes

Rounding follows a minimal scale consistent with Ant Design defaults.

| Token  | Value  | Applied to                           |
| ------ | ------ | ------------------------------------ |
| `none` | 0px    | —                                    |
| `sm`   | 3px    | Download tags, micro elements        |
| `md`   | 4px    | Buttons, inputs, alerts, small cards |
| `lg`   | 8px    | Content cards, modals, tables        |
| `xl`   | 12px   | Badge containers, feature panels     |
| `full` | 9999px | Pills, avatar borders                |

## Components

All components inherit from Ant Design's defaults, overridden only by the `colorPrimary: '#1890ff'` token set in the
root `ConfigProvider`. The tokens below document where Playbox extends or constrains Ant Design defaults.

### Button

Primary (solid blue), Default (white with border), Text (no chrome), Danger (red text → red fill on hover). All at 32px
height with `rounded.md`. Hover state for primary lightens to `#40a9ff`.

### Table

Small-sized, white background, responsive columns with `ellipsis: true`. Pagination at bottom. Bordered variant used for
data-dense views. No row shadows.

### Card

White background, `rounded.lg` corners. Used as the primary content container. No elevation — borders only when
separation is needed.

### Modal

White background, `rounded.lg` corners. Standard Ant Design modal pattern for all CRUD forms. Confirm/Cancel footer.

### Input

White fill, `rounded.md`, 32px height. Search inputs may use `allowClear`. Textarea for longer content.

### Alert

Error: `#fff2f0` background with `error-deep` text. Warning: `surface-warning` background with `warning` text. Both at
`rounded.md`.

### Sidebar

220px fixed width, white background, collapsible. Brand text at top with primary color icon. `1px solid #f0f0f0` right
border as separator. Menu items in `inline` mode.

### Header

64px height, white background. `1px solid #f0f0f0` bottom border. Contains page title and mobile menu trigger.

### Content Area

White card on `#f0f0f0` background. `rounded.lg`, `padding.lg` (desktop) or `padding.md` (mobile). `margin.lg` on all
sides (desktop) or `margin.md` (mobile).

### Chart Palette

8-color cycle for Recharts visualizations: `#1890ff` → `#52c41a` → `#faad14` → `#f5222d` → `#722ed1` → `#13c2c2` →
`#eb2f96` → `#fa8c16`. Used in Bar, Line, and Pie charts across the analytics dashboard.

## Do's and Don'ts

### Do's

- **Do** use `border` color (`#f0f0f0`) for all separators and card borders
- **Do** use the chart palette in order for consistent data visualization
- **Do** reduce padding to `spacing.md` on mobile (<768px)
- **Do** use Ant Design components as-is — override only via ConfigProvider tokens
- **Do** use semantic colors (`error`, `warning`, `success`) for status indicators
- **Do** use `typography.monospace` for any code, JSON, API key, or technical identifier display
- **Do** keep content within white cards on the gray page background

### Don'ts

- **Don't** add `box-shadow` — the design is intentionally flat
- **Don't** use custom fonts — the system font stack is the standard
- **Don't** hardcode hex values inline — reference design tokens or Ant Design variables
- **Don't** use primary color for decorative/non-interactive elements
- **Don't** create dark mode variants — the admin UI is light-only
- **Don't** exceed 8 colors in chart visualizations without revisiting the palette
- **Don't** use `rounded.full` on rectangular elements — reserved for pills and avatars only
- **Don't** introduce spacing values outside the defined scale without adding a token first
