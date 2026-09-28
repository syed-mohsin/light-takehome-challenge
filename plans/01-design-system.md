# 01 — Design system setup

Status: proposed implementation plan. Depends on the [shared decisions](README.md); enables plans 03–05.

## Objective

Turn the supplied v0 screenshots into a compact, reusable visual system for My Energy Story. Preserve their calm hierarchy: priority control, dark insight banner, metric cards, one large chart, and supporting insights. The screenshots are visual references; their numbers and claims are placeholder content.

## Decisions and rationale

- Add Tailwind CSS v4 and `@tailwindcss/vite` to the existing Vite configuration. Retain the current TanStack Start, React, and Nitro plugins. Keep `src/styles.css` as the single entry for Tailwind, tokens, and base styles; the root route already includes that stylesheet. This follows the [official Vite integration](https://tailwindcss.com/docs/installation/using-vite).
- Declare semantic tokens with Tailwind's `@theme`, so JSX uses classes such as `bg-surface`, `text-ink`, and `border-line`. Chart SVG props can reference the same CSS variables. Avoid a duplicate palette in TypeScript. See [theme variables](https://tailwindcss.com/docs/theme).
- Use small, typed components over a prebuilt dashboard kit. Prefer native buttons, selects, radio inputs, and range inputs, retaining browser semantics and avoiding an accessibility-heavy custom widget dependency.
- Start with a system sans-serif font, one light theme, and a single consistent outline icon family. No font network request, dark theme, or theme editor is needed for this scope.
- Keep styles beside JSX. Component variants are finite maps of complete Tailwind class strings; do not construct dynamic utility names that scanning cannot discover. Use a class-name helper only where composition warrants it.
- Extract components for recurring appearance or behavior, not every wrapper. Keep data retrieval, persistence, and calculations out of design primitives.

## Token proposal

Values below are starting design choices, to be verified in the browser rather than treated as sampled screenshot values.

| Token / category | Initial choice | Purpose |
| --- | --- | --- |
| `canvas`, `surface` | `#F5F8F7`, `#FFFFFF` | Page background and card surfaces |
| `ink`, `muted` | `#20323A`, `#566A73` | Main and secondary text; readable chart labels |
| `line`, `control-line` | `#DEE7E5`, `#73858D` | Subtle card boundaries; stronger input boundaries |
| `banner`, `on-banner` | `#20323A`, `#F8FAFA` | Priority insight banner |
| `accent`, `accent-ink`, `accent-soft` | `#F59E0B`, `#8A4800`, `#FFF5E5` | Orange chart/highlight; darker text on pale surfaces |
| `positive`, `positive-soft` | `#2E704A`, `#EEF7F0` | Supported positive outcomes and AI explanation surface |
| `danger`, `focus` | `#B42318`, `#215E89` | Error feedback and visible focus outline |
| Chart series | consumption = `#A85700`; scenario = `#356A91`; generation = `#2E704A` | Stable identities across all datasets and priorities |
| Radius | control 8px; card 12px | Match screenshot softness without excessive rounding |
| Spacing | Tailwind 4px scale; 16/24/32px layout gaps | Shared rhythm without bespoke component margins |
| Typography | body 16px; secondary 14px; card title 18px; heading 28–36px | Increase legibility over the screenshot's small labels |
| Container | maximum 1200px; 16/24/32px responsive side padding | Keep charts readable on large screens and usable on phones |

Use tabular numbers for metrics and money, explicit units beside values, and normal case for functional labels. Reserve uppercase tracking for short section eyebrows. Decorative orange should not become low-contrast body text. Validate text and essential graphical contrast after final colors are chosen.

## Page composition

1. Compact header with product title, household selector, and actual reporting period. Omit invented user names, current weather, and greetings that imply live meter data.
2. Inline first-visit priority question, later becoming the compact priority selector from plan 03.
3. Dark `PriorityBanner` with one verified takeaway and a specific action, such as “Try a reduction.”
4. Four `MetricCard` instances: consumption, estimated cost, daily average, and biggest-use day. Solar generation is an additional context-sensitive metric, not an implied feature of every sample household.
5. `ChartPanel` with title, units, period/granularity controls, baseline/scenario legend, and simulation controls; see plan 04 for behavior.
6. Example-household exploration and deterministic/AI insight cards. Label the three homes as samples, not population benchmarks.
7. Short data/methodology note with the flat-rate assumption and access to fuller explanations.

Maintain this document order across breakpoints. Personalization changes the banner and explanation emphasis, not the location of every card.

## Component boundaries

Proposed files are implementation targets, not files created by this planning change.

| Module | Responsibility / contract |
| --- | --- |
| `src/components/ui/button.tsx` | Typed native button props; primary, secondary, and quiet variants; pending/disabled states; links remain actual links |
| `src/components/ui/card.tsx` | Shared surface, spacing, border, and optional header slots; no data fetching |
| `src/components/ui/field.tsx` | Label, description, control, and error associations; compose native select/radio/range controls |
| `src/components/ui/segmented-control.tsx` | Visually grouped, labeled native radio options; controlled value/change callback; generic typed option values |
| `src/components/ui/status-panel.tsx` | Loading, empty, and error presentation with optional retry callback and appropriate status semantics |
| `src/components/ui/skeleton.tsx` | Stable placeholder geometry; decorative to assistive technology; respect reduced motion |
| `src/features/dashboard/components/metric-card.tsx` | Formatted value/unit, optional comparison and sparkline, accessible text summary; no arithmetic |
| `src/features/dashboard/components/priority-banner.tsx` | Heading, body, icon, and typed action supplied by its container |
| `src/features/dashboard/components/dashboard-layout.tsx` | Responsive region composition; no preference or chart state |
| `src/features/dashboard/dashboard-container.tsx` | Coordinate loader data and feature hooks; supply typed view models and handlers |

Use `React.ComponentProps<'button'>` or the corresponding native element type for primitive contracts. Infer data and preference types from shared Zod schemas. Keep schema parsing at runtime boundaries; presentational components receive already-validated props.

Share formatting helpers for energy, money, dates, and percentages. The chart plan owns date/unit semantics; UI components should never independently divide or reprice input data.

## Responsive behavior and accessibility

- At 360px: one metric column, full-width chart, stacked header controls, and no page-level horizontal scrolling. At approximately 640px use two metric columns; at 1024px use four. Supporting cards become two columns only when their text remains readable.
- Let priority options wrap or stack; do not hide choices behind an unlabeled overflow menu. Labels remain visible beside icons where space permits.
- Give interactive controls approximately 44px hit areas, persistent visible focus, and meaningful accessible names. Mark decorative icons as hidden from assistive technology.
- Use a logical heading hierarchy and landmark regions. Priority selection is a radio group, not ARIA tabs: it changes emphasis across the dashboard rather than selecting one exclusive tab panel.
- Make explanations accessible through visible text or expandable details. Tooltips may supplement text, but must not be the sole location of units, assumptions, or essential chart values.
- Distinguish chart series with labels and line patterns as well as color. Mini sparklines are decorative when an adjacent metric supplies their meaning; full charts also need the summaries/data access specified in plan 04.
- On data updates, preserve card geometry and label any retained previous data. An unavailable metric displays “Unavailable” with a reason, never a fabricated zero or an unexplained dash.
- Limit motion to subtle state transitions. Respect `prefers-reduced-motion`; do not animate through every chart point on every slider update.

## Implementation sequence

1. Add the Tailwind Vite integration and replace scaffold-wide `main`/`p` styling with semantic tokens and minimal base styles.
2. Build the button, card, field, segmented control, and status primitives alongside their first dashboard use. Add more primitives only when a concrete use requires them.
3. Compose the dashboard shell with representative typed fixtures covering long labels, zero values, missing data, loading, and errors. Fixtures must be clearly separate from real data services.
4. Implement metric and banner presentation using the agreed visual direction; connect containers only after these states are reviewable.
5. Check desktop and mobile rendering, keyboard flow, and contrast. Use targeted component tests for behavior; do not snapshot every Tailwind class.
6. Remove obsolete scaffold selectors and temporary fixtures from the production path. Run the repository's formatting/lint, type, and production build checks.

## Acceptance criteria

- The page visibly follows the supplied v0 hierarchy while showing accurate historical/data labels.
- Tokens control repeated colors, typography, spacing, radii, and chart series; there are no per-feature stylesheets for routine layout.
- At 360px, 768px, and 1440px, content is readable and no control overlaps or pushes the page sideways. Browser zoom does not hide essential controls.
- All controls are operable by keyboard, labels are programmatically associated, and normal text meets a 4.5:1 contrast target; essential graphics/control boundaries meet 3:1 where required.
- Loading, empty, error, disabled, pending, focus, and selected states can be demonstrated without changing component internals.
- Existing routes and both local/Vercel production builds still work after the styling integration.

## Deferred choices

- Exact font and icon artwork can be refined after the first browser review; the default system font and one outline family are sufficient to begin.
- If the user supplies v0 source later, reuse compatible presentational markup selectively after inspecting its dependencies. Screenshots alone do not establish code reuse.
- Dark mode, a separate component-gallery deployment, complex date-picker widgets, and a broad third-party design kit are outside the first version.
