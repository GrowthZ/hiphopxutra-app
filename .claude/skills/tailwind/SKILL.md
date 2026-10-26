---
name: tailwind
description: Tailwind CSS v4 conventions for this app. Use when writing or editing className strings, adding styles, colors, typography, responsive layouts or animations in any src/components file.
---

# Tailwind v4 — project conventions

Tailwind v4 is wired through `@tailwindcss/vite`; `src/index.css` starts with `@import "tailwindcss";`.
There is **no `tailwind.config.js`** — customize with `@theme` / `@utility` in `src/index.css`.

## Palette (match existing code)

| Role | Classes |
|---|---|
| Dark surfaces (stage, battle, judge) | `bg-zinc-950`, `bg-zinc-900`, `bg-zinc-800`, borders `border-zinc-800/700` |
| Light surfaces (admin tables, modals) | `bg-white`, `bg-zinc-50/100`, borders `border-zinc-200/300` |
| Text | primary `text-zinc-900` / `text-white`, secondary `text-zinc-400/500` |
| Brand accent / highlight | `amber-400/500` (scores, active, winners) |
| Danger / live / LED | `red-400/500/600` |
| Success / qualified | `emerald-400/500` |

Do not introduce new hues (blue, purple, pink…) without a reason; extend the palette in `@theme` if needed.

## Typography

- Body: Inter (default). Headlines, names, scores: `font-condensed` (Barlow Condensed) + `uppercase` + `font-black`/`font-extrabold`.
- Any number that updates live (scores, timers, ranks): add `tabular-nums`.
- Stage/LED views use very large sizes (`text-6xl`–`text-9xl`, `clamp` via arbitrary values) — readable from 20 m.

## Project utilities (defined in `src/index.css`)

`font-condensed`, `tabular-nums`, `border-subtle`, `perspective-800`, `preserve-3d`,
`backface-hidden`, `rotate-y-180`, plus team entrance keyframes. Reuse these before adding new ones.

## Rules

- Utilities only. No `@apply` chains for one-off components; extract a React component instead.
- Inline `style={{}}` only for runtime values (progress widths, background image URLs).
- Order classes: layout → box → spacing → typography → color → effects → state (`hover:`, `focus-visible:`) → responsive.
- Mobile first: base classes target phones (judge portal), then `sm:` / `md:` / `lg:` upward.
- Always pair `hover:` with `focus-visible:` styles on interactive elements; add `cursor-pointer` on clickable non-buttons.
- Use `transition-colors` / `transition-transform` (not `transition-all`) on frequently re-rendered elements.
- Conditional classes: template literal or a small array `.join(' ')`; keep each branch a full class name (no string building like `` `bg-${color}-500` `` — Tailwind can't detect it).

## Adding a theme token (v4)

```css
/* src/index.css */
@theme {
  --color-led: #ff2d2d;
  --font-condensed: 'Barlow Condensed', 'Arial Narrow', sans-serif;
}
```
Then use `bg-led`, `text-led`, `font-condensed`.
