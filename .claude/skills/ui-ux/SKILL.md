---
name: ui-ux
description: UI/UX design principles for the tournament app's views (admin, judge portal, battle operator, LED stage, guest). Use when designing a new screen or modal, reworking a layout, or reviewing usability and accessibility of a component.
---

# UI/UX — designing for a live breaking event

Every screen is used **live, under pressure, in a loud dark venue**. Optimize for speed,
legibility and zero ambiguity over decoration. Visual language: "Swiss sports broadcast" —
condensed type, hard grids, amber accent on dark.

## Know the audience of each view

| View | Who | Device | Priority |
|---|---|---|---|
| `prelim`, `dancers`, `teams`, `bracket`, `sheets`, `storage` | Organizers | Laptop | Density, bulk actions, clear state |
| `battle` | Battle operator | Laptop | One obvious next action, keyboard-friendly |
| `judge` | Judges | Phone / tablet | Big tap targets, one-hand use, no mistakes |
| `stage` | Audience | LED wall / projector | Huge type, high contrast, no controls |
| `prelim_guest`, `prelim_results` | Audience / dancers | Phone | Fast scan of rank and name |

## Principles

1. **One primary action per screen.** Make it the only amber filled button; secondary actions are outline/ghost.
2. **State is always visible.** Current round, current battle, which judges have voted, saved/syncing/error — shown, not implied.
3. **Prevent irreversible mistakes.** Confirm destructive or result-changing actions (reset scores, redraw teams, declare winner) and offer undo where possible.
4. **Touch targets ≥ 44×44 px** on judge and guest views; keep critical buttons in the bottom thumb zone on phones.
5. **Legibility from distance.** Stage view: min ~5% of screen height for names, scores larger; contrast ≥ 7:1. No thin weights, no small grey text.
6. **Motion has meaning.** Animate state changes (score in, winner reveal, team entrance) — keep it under ~400 ms for UI, longer only for stage reveals. Respect `prefers-reduced-motion` with `motion-safe:` / `motion-reduce:`.
7. **Feedback within 100 ms** for every tap: pressed state, then toast/inline confirmation; show a spinner only after ~300 ms.
8. **Empty, loading and error states** are designed, not left blank — say what happened and what to do next, in Vietnamese.
9. **Consistency.** Reuse existing modal shells, headers and button styles from sibling components before inventing new ones.

## Accessibility checklist

- Text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 24 px bold). Don't rely on color alone — pair red/green with icon or label.
- Every interactive element is a real `<button>`/`<a>`/`<input>`, reachable by Tab, with visible `focus-visible` ring.
- Icon-only buttons get `aria-label` (Vietnamese).
- Modals: trap focus, close on `Esc`, return focus to the trigger.
- Live score updates on non-stage views: `aria-live="polite"`.

## Layout recipes

- **Admin page**: sticky header (title + primary action) → filters row → table/grid; max width with `mx-auto`, `gap-4`/`gap-6` rhythm.
- **Judge vote**: dancer/team names top, two giant split buttons (left/right side colors) bottom, tie option smaller in the middle, confirmation state after submit.
- **Stage**: full-bleed `bg-zinc-950`, center stage content, round label top, branding bottom; no cursor, no scrollbars.

## Review before shipping

- [ ] Works at 360 px wide and at 1920×1080 (stage).
- [ ] Primary action obvious in < 2 s for a first-time user.
- [ ] All copy Vietnamese with diacritics; numbers `tabular-nums`.
- [ ] Loading / empty / error states covered.
- [ ] Keyboard and focus-visible verified.
