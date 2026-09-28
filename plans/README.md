# Implementation plans

Status: proposed implementation, ready for review. These documents describe future work; the current app is still the TanStack Start starter. Read [development guidance](../AGENTS.md) and [verified data notes](../docs/data-notes.md) alongside them.

The goal is a coherent 30-minute demo: choose an example household and priority, understand its historical electricity use, try a reduction scenario, and request a grounded explanation. The supplied v0 screenshots set the visual direction. Their numbers and claims are illustrative, and source code has not been supplied.

## Plan index and ownership

| Plan | Owns | Depends on |
| --- | --- | --- |
| [01 — Design system](01-design-system.md) | Tokens, primitives, dashboard layout, responsive and accessible presentation | Existing scaffold and screenshot reference |
| [02 — CSV parsing and caching](02-csv-parsing-and-caching.md) | Ingestion, validation, aggregates, dataset service, versioning, baseline facts | Verified fixture semantics |
| [03 — Onboarding and personalization](03-onboarding-and-personalization.md) | Priority selection, preference persistence, SSR, banner and explanation emphasis | 01 for presentation; 02 and 05 for real facts |
| [04 — Charting and simulations](04-charting-and-simulations.md) | Historical and typical-day charts, scenario controls, calculation rules | 01 and 02 |
| [05 — Insights and LLM](05-insights-and-llm.md) | Deterministic insight presentation, evidence, optional AI explanation service | 02, 03, and 04 |

Plan numbers are a reading order, not a requirement to finish each feature before starting another. Build deterministic insight facts with plan 02; plan 05 owns their display and AI explanation.

## Shared product and data decisions

| Topic | Initial decision | Reason |
| --- | --- | --- |
| Household | `low-winter`, `high-winter`, or `solar`; default `low-winter` | These are three example households, not a peer benchmark or a single home over time |
| Reporting period | Default `2024-04-22` through `2025-04-21`, inclusive | A complete shared historical year; never present it as the twelve months preceding today |
| Priority | `money`, `carbon`, or `learning`; default `money` | Follow the v0 saving-money emphasis while allowing a different preference |
| Onboarding | Inline, skippable question; explicit selection or skip saved in localStorage | A small browser-only preference needs no server endpoint; check storage after mount |
| Energy | Integer Wh in source data, aggregates, and scenario outputs | Exact sums and consistent client/server calculations |
| Estimated cost | USD at a fixed 14 cents/kWh; `usd = Wh * 14 / 100000` | Matches the brief; excludes fees, taxes, and export credits |
| Time | Preserve source-local dates/hours for display and grouping; use UTC instants for continuity | The supplied offsets do not follow ordinary named-timezone transition hours |
| Solar | Separate reported consumption and generation series | The files do not establish gross demand, total production, or self-consumption |
| Carbon | No emissions number until an explicit factor is supplied | No location or grid factor is provided; label resulting values as assumption-based estimates |
| Simulation | Reduce reported consumption during source-local hours 17:00–21:00, end exclusive, by 0–30% | A transparent historical scenario under the fixed tariff |
| AI | Luna (`gpt-6-luna`); restore matching localStorage results; explicit “Explain this” action requests only on a miss | Keeps the demo useful without credentials and avoids repeat calls for saved contexts |

The initial UI has one selected household and a daily/weekly history chart. A typical-day profile is an additional view. The comparison card selects examples; it must not claim which household is more efficient without occupancy, size, climate, and equipment data. Do not use today's weather, invented user details, tree equivalents, or unsupported annual comparisons as factual content.

## Shared contracts

These TypeScript sketches document the agreed shapes. Implementation must define runtime boundaries with Zod and infer the corresponding types; the sketches are not additional application types to maintain.

```ts
type DatasetId = 'low-winter' | 'high-winter' | 'solar'
type Priority = 'money' | 'carbon' | 'learning'
type Period = { start: string; end: string } // Valid ISO dates, inclusive
type Scenario = {
  kind: 'reduce-evening'
  reductionPercent: number // Integer 0..30; algorithm version: evening-v1
}
type CarbonAssumption = {
  kgCo2ePerKwh: number
  label: string
}
type DashboardSearch = Period & {
  household: DatasetId
  granularity: 'daily' | 'weekly'
  unit: 'kWh' | 'usd'
}
```

- The URL owns household, reporting period, historical granularity, and display unit. Validate real calendar dates and coverage, not just string format. Missing values receive the defaults above; the chart plan defines navigation behavior.
- A small localStorage record owns saved onboarding state and priority, defaulting to money. It is a display preference, not identity or authorization. Plan 03 defines validation, hydration, and an in-memory fallback when storage is unavailable.
- Component state owns the active chart view, scenario draft, and optional carbon assumption. Scenario and carbon values are validated when submitted for an explanation. Plan 05 defines factor bounds and the explanation response.
- The server owns dataset versions and source facts. Callers provide selections and the expected data version for freshness checks, never authoritative calculated metrics, cache keys, model names, or prompts. A stale version produces a refresh response before AI generation. The browser keys saved explanations by the same validated context and public explanation version; the server independently derives its response key.
- Plan 02 defines the selected-period response, including per-date/hour buckets, coverage metadata, totals, and deterministic facts. Returning hourly buckets allows the browser to recalculate scenarios without raw intervals or network traffic during dragging.
- Plan 04 owns scenario arithmetic. For each eligible date/hour bucket, compute `savedWh = Math.round(consumptionWh * reductionPercent / 100)` and subtract once. Aggregate the resulting integer buckets afterward. Keep generation unchanged. Price baseline, scenario, and savings from the same Wh totals, rounding only displayed currency.
- The same pure functions must produce browser previews and server explanation facts. Evidence IDs and explicit versions link the insight text to the data shown on screen.

## Architecture and cache boundaries

```text
CSV fixtures -> build-time validation/aggregation -> versioned server artifacts
                                                       |
URL selections -> thin server function -> energy service -> typed dataset response
                                                       |
                         pure calculations -> charts, cards, deterministic insights

Explicit Explain action -> localStorage lookup -> reuse matching explanation
                                      |
                                    miss -> thin server function -> insights service
                                            -> recompute facts -> Luna adapter
                                            -> validate -> explanation or fallback
                                            -> browser saves AI success locally
```

The frontend and server can import `src/domain/energy/` for pure schemas and calculations. That directory must not depend on React, filesystem APIs, provider SDKs, or secrets. Server services own orchestration and external access; hooks own UI state and call boundaries. Group UI code by feature and place genuinely shared primitives in `src/components/ui/`.

Planned locations:

| Location | Responsibility |
| --- | --- |
| `scripts/` | Deterministic data generation invoked by development/build checks |
| `src/domain/energy/` | Schemas, aggregation, pricing, simulations, and facts |
| `src/domain/preferences/` | Shared preference schema |
| `src/generated/energy/` | Generated server-only dataset artifacts; excluded from Git |
| `src/generated/data-versions.ts` | Public dataset version identifiers only |
| `src/server/functions/` | Validated TanStack Start entry points |
| `src/server/services/` | Energy and insight workflows in `.server.ts` modules |
| `src/server/providers/` | Server-only Luna/OpenAI adapter |
| `src/components/ui/` | Shared design primitives |
| `src/features/` | Dashboard, onboarding, and insight components/hooks |

Use TanStack Router's loader cache for selected dataset responses in the first implementation. Unit, granularity, priority, and scenario changes must not trigger CSV parsing. Build artifacts make cold starts correct; module memory is only an optimization. Keep dashboard HTML and server-function responses on the existing `private, no-store` policy for this version. Preferences are read only in the browser; a public CDN data endpoint remains deferred.

AI result caching is separate from dataset caching. Plan 05 uses a small, bounded localStorage record of successful explanations keyed by data, selection, and explanation version. A valid match avoids the server request entirely; a miss needs an explicit action. There is no Redis, database, shared cache, or distributed request-budget service. This is browser-local reuse, not a global spending cap. The API key stays on the server.

## Implementation slices

1. **Foundation:** implement plan 01 tokens/primitives and plan 02 ingestion/contracts independently. Add the domain test runner and ensure data generation runs for a clean clone before type checking and building.
2. **Working dashboard:** connect real totals, historical charts, and deterministic insight facts. Confirm the brief's daily/weekly chart and two insights before adding personalization.
3. **Scenario:** implement the shared evening-reduction function and connect controls, chart overlays, savings, and text summaries.
4. **Personalization:** add plan 03 first-run selection and persisted priority, then order deterministic content consistently. Skeleton UI can be built earlier against the shared contracts.
5. **Explanation:** implement plan 05 templates/fallback first, then localStorage reuse and the optional Luna provider. Verify missing credentials and provider/storage failures preserve the working dashboard.
6. **Demo readiness:** verify production deployment, mobile/keyboard flows, README setup, data assumptions, and a short reproducible walkthrough.

Keep each slice reviewable and record any changed design decision in the owning plan and this index when it affects shared contracts. Install only the dependencies needed for the active slice. Pin and verify package versions against the existing Node 22/TanStack/Vite scaffold; code examples in current documentation can differ from the installed API.

## Decisions intentionally left for implementation

- **v0 source:** screenshots suffice to implement the direction; a source export would allow evaluation of reusable components. Do not assume framework-specific v0 code is already available.
- **LLM credentials and validation:** Luna is selected; configure its server-side API key and check quality/latency on the documented example facts. Core features do not need an API key.
- **Carbon factor and meter semantics:** use the conservative behavior described above until a factor or clearer source definition is supplied. These uncertainties do not block consumption charts or the reduction scenario.
- **Hosting:** Vercel configuration and local production validation exist; the Vercel project and optional AI environment settings still need setup during deployment work. No cache service is required.

## Acceptance across all plans

- A fresh clone builds with all three published fixtures; raw CSVs and provider secrets are absent from the browser bundle.
- A daily or weekly historical chart and at least two verified insights work without an LLM call.
- Headline totals, chart buckets, scenario savings, and explanation evidence reconcile for the same household and dates.
- Changing priority does not reset the selected household, reporting period, or scenario. Changing household/period follows the explicit reset rules in plan 04.
- Unavailable AI, localStorage, or carbon assumptions do not prevent inspecting energy data. Unsupported statistics are omitted or explained, not invented.
- Loading, empty, error, mobile, reduced-motion, and keyboard states are reviewed alongside normal behavior.
- Each implemented slice runs relevant domain tests, formatting/lint checks, TypeScript, and the Vercel production build. Documentation-only edits use link and consistency checks.
