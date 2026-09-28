# 03 — Onboarding and personalization

Status: implemented design record. Depends on the [design system](01-design-system.md) and shared schemas in the [plan index](README.md). Saving money is the default, and the preference hook persists explicit choices/skip in localStorage without a server endpoint. Baseline metrics come from plan 02; plan 05 owns insight selection and explanation. Browser checks confirmed priority persistence after reload.

## Objective

Follow the v0 design with **Saving money** selected by default. Let visitors change that priority without blocking access to the dashboard, and remember their choice with a small localStorage-backed hook.

## Product decisions

- Ask one inline question above the banner on the first visit: “What matters most to you?” Offer “Saving money,” “Understanding carbon impact,” and “Learning about energy.” Choose one primary priority.
- Once browser storage has been checked, a fresh visitor sees the money banner and Saving money selected as the default. That default alone does not mark onboarding complete.
- Activating any option, including the already selected money option, applies it and records onboarding as `chosen`. “Skip for now” retains `money` and records `skipped`.
- After choosing or skipping, retain the v0-style compact “Show me more about” selector in the same location. Every choice remains editable.
- Persist only priority and completion state under one localStorage key. No preference endpoint, cookie, account, database, or separate onboarding route is needed.
- Default household is `low-winter`; default period is April 22, 2024 through April 21, 2025 inclusive. These are sample data, not the visitor's measured household.

## State and validation contract

Reuse the shared `Priority` schema: `money | carbon | learning`. Infer implementation types from Zod rather than defining a second enum in the UI.

```ts
type SavedPreference = {
  version: 1
  priority: Priority
  onboarding: 'chosen' | 'skipped'
}

type PreferenceView = {
  priority: Priority
  onboarding: 'unseen' | 'chosen' | 'skipped'
}
```

- Use the key `energy-preference` and a strict Zod schema for the stored JSON object. A skipped record must have priority `money`.
- Missing, malformed, or unsupported-version data resolves to `{ priority: 'money', onboarding: 'unseen' }`. Catch JSON parsing and storage-access failures. There is no migration or expiry framework; a future unsupported version simply uses the default.
- Choosing any priority produces `{ version: 1, priority, onboarding: 'chosen' }`. Skipping produces `{ version: 1, priority: 'money', onboarding: 'skipped' }`.
- Keep one `ready` flag separate from the preference to distinguish “storage not checked yet” from “first visit.” No save-request state machine is needed.

## Persistence and server rendering

Use a small `usePreference` hook in the stable dashboard layout. Its server render and initial browser render both have `ready: false`. Render a reserved-height placeholder for the preference selector and personalized banner until an after-mount effect reads localStorage. The rest of the dashboard renders immediately. Never show onboarding before that read finishes, which would flash the question for returning visitors.

The mount effect reads and validates the saved value, applies it or the money/unseen default, and sets `ready: true`. It does not write a default record merely because the page mounted.

On choice or skip, update React state immediately, then try `localStorage.setItem` with the normalized JSON record. Catch storage failures and retain the choice in memory for the current visit. Controls stay usable; there are no network requests, retries, cookie flags, or server synchronization. A quiet note may explain when the choice could not be saved across reloads.

Read once on mount and write only on explicit choice or skip. No global store, storage abstraction library, cross-tab synchronization, or preference-related loader is required. Dataset fetching and caching remain independent.

## Interaction and accessibility

- Present the three choices as a labeled single-choice control using plan 01 primitives. Activation must work with pointer and keyboard, including confirming the already selected default money option.
- Keep the choice control mounted when the introductory prompt becomes its compact label, preserving focus. If the skip button disappears, move focus to the compact selector deliberately.
- Keep the hook in a layout that does not remount on household or search changes. That preserves current-visit choices even when storage is unavailable; a full reload reads storage again.
- Read and write failures must never block household navigation, charts, or simulation controls.

## What personalization changes

| Priority | Opening emphasis | Banner action | Supporting explanation |
| --- | --- | --- | --- |
| `money` | Estimated cost at 14¢/kWh and the cost effect of the current evening-reduction scenario | Focus the simulation controls | Explain verified high-consumption periods and scenario savings |
| `carbon` | Explain consumption and what a disclosed emissions assumption can tell us | Open the carbon methodology/details | Explain the supported carbon estimate if configured; otherwise identify the missing grid/location assumption |
| `learning` | Strongest supported pattern, such as biggest-use day or weekday/weekend difference | Focus its supporting chart/data | Explain the measured pattern without claiming an appliance caused it |

The banner is deterministic and available as soon as the preference read completes. An LLM explanation is requested only through the explicit “Explain this” action in plan 05; choosing a priority does not initiate a model call. Pass the selected priority explicitly with an explanation request. Onboarding never waits on AI, and insight selection stays in a pure domain function/service.

Keep household, reporting period, chart granularity, units, and current scenario when priority changes. Do not silently turn on a reduction, change units to dollars, or reset the chart. Money copy may still display a dollar estimate when chart units are kWh. All priorities retain the same baseline metric cards and complete chart.

Carbon remains an educational path before an emissions factor is chosen. Never replace missing assumptions with invented avoided-carbon numbers or a tree equivalent. Selecting carbon does not request geolocation or require an extra question.

## State ownership and module boundaries

- Validated URL search owns household, `start`, `end`, `granularity` (`daily | weekly`), and `unit` (`kWh | usd`). Copied links reproduce the data view without overwriting the recipient's priority.
- `usePreference` owns the current priority, onboarding state, and readiness. localStorage persists the latest explicit choice or skip.
- Chart/scenario state follows plan 04. Personalization observes typed inputs and invokes named actions rather than manipulating chart internals.

| Implemented module | Responsibility |
| --- | --- |
| `src/domain/preferences/schema.ts` | Canonical priority schema, strict stored-record schema, and inferred types |
| `src/features/onboarding/use-preference.ts` | Read/validate once after mount, expose readiness and choose/skip actions, update local state and best-effort storage |
| `src/features/onboarding/priority-selector.tsx` | Controlled accessible choices, introductory/compact presentation, and skip action |
| `src/features/dashboard/dashboard-container.tsx` | Reserve the preference region during initialization; connect preference to banner and insight inputs |

## Implementation sequence

1. Define the small stored-record schema and money/unseen fallback.
2. Implement the hook with guarded localStorage reads and writes.
3. Build the inline prompt and compact selector using plan 01 primitives; reserve their space during the initial storage check.
4. Connect deterministic banner selection and callbacks that reveal/focus the chart or simulation section.
5. Connect preference-aware explanations when plan 05 is available; do not duplicate insight formulas here.
6. Check fresh, returning, skipped, invalid-record, and unavailable-storage behavior, then run relevant repository checks and production builds.

## Acceptance criteria

- A fresh visitor gets the money default and can use the complete dashboard without answering. Skip persists `money/skipped` when storage is available.
- Choosing any priority, including explicitly activating the default money option, completes onboarding and updates the banner immediately.
- Returning visitors get their saved choice after the storage check, without an onboarding flash or hydration warning. Server and initial browser markup agree.
- Invalid or unsupported saved data safely yields money/unseen. Storage failures preserve a usable current-visit choice without blocking interaction.
- Keyboard users can choose, skip, change priority, and follow a banner action without losing focus.
- Household/date/unit changes preserve priority; priority changes preserve household/date/unit/scenario. Preference changes do not refetch datasets or request AI explanations.

## Deferred choices

No unresolved product choice blocks implementation. Carbon-factor selection belongs to the shared domain/insight plans. Multi-select interests, account synchronization, cross-tab synchronization, analytics, and a multi-step onboarding wizard are outside this version.
