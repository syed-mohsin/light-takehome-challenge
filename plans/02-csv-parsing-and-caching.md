# 02 — CSV parsing and caching

Status: implemented design record. Depends on the shared decisions in [README](README.md); supplies [charts](04-charting-and-simulations.md) and [insights](05-insights-and-llm.md). All 202,176 source intervals validate; eight focused Node tests pass in about one second. The largest measured 366-day response is approximately 61 KB gzip.

## Outcome and scope

Turn the three checked-in CSV fixtures into validated, reproducible data artifacts before deployment. Serve only the selected household and reporting window to the browser, with enough detail for immediate local simulation. No database, uploads, runtime CSV parsing, or persistent cache service is needed for this fixed dataset.

The implementation uses TanStack Start, React, TypeScript, Nitro/Vercel, npm, Zod, and `csv-parse`. [Data notes](../docs/data-notes.md) establish 202,176 intervals across about 7.9 MB of source files, with continuous UTC timestamps and unusual source offset transitions.

## Decisions and rationale

| Decision | Rationale |
| --- | --- |
| Build-time Node script; `csv-parse/sync` plus Zod | Each file is about 2.7 MB or less; processing one at a time is simple and bounded. A mature parser handles quoting and BOMs. |
| Store integer Wh; sum before formatting | Avoid unit mistakes and cumulative display rounding. Duration is already represented in the energy value. |
| Preserve source-local calendar labels and UTC instants | Local labels define reporting; UTC detects duplicates and gaps without assuming a named timezone. |
| Retain per-date/per-hour buckets | Daily totals alone cannot support an evening-only scenario or an hourly profile. |
| Server-only JSON artifacts, client-safe version manifest | Avoid shipping every household's history or importing Node filesystem code into client bundles. |
| Router loader cache, no second client cache library initially | A single dashboard route has a small number of reusable dataset/window combinations. |
| No shared HTTP caching for SSR or server functions | The Router's existing application cache is sufficient for this small dashboard; browser-only preferences need no server persistence. |

The parser's synchronous API is intended for datasets that fit in memory. Use `bom: true`, validated header columns, `skip_empty_lines: true`, and strict column counts; disable automatic numeric/date casting and validate values explicitly. Never skip malformed records. [Parser API](https://csv.js.org/parse/api/sync/), [parser options](https://csv.js.org/parse/options/)

## Ingestion and time semantics

1. Resolve paths through an allowlisted dataset registry: `low-winter`, `high-winter`, `solar`. Never accept a user-supplied filesystem path.
2. Read each original file unchanged; verify the exact five unique column names: `datetime,duration,unit,consumption,generation`.
3. Validate each row with a shared Zod boundary schema: explicit-offset ISO timestamp, `duration=900`, `unit=Wh`, and nonnegative safe integer consumption/generation. Reject empty numbers, decimals, infinities, and coercions such as an empty string becoming zero.
4. Parse the timestamp into its original string, epoch milliseconds, source date `YYYY-MM-DD`, source hour `0..23`, and offset minutes. Validate calendar dates rather than relying on JavaScript date rollover.
5. Check chronological UTC order, unique UTC instants, and consecutive 900-second steps. Fail the build with dataset and row context on violations; do not silently sort, deduplicate, interpolate, or drop records.
6. Sum into source date/hour buckets and daily totals. Assert every accumulated sum remains a safe integer. Record source coverage, row counts, UTC continuity, offset transitions, and per-day interval counts.
7. Emit a quality summary. A 92- or 100-interval day is legitimate when the source's continuous UTC sequence explains it. Repeated local clock times contribute to the same hour bucket; retain their interval count. Missing source-local hours remain absent, never manufactured zeros.
8. Flag partial first/last source dates using source-local boundary times and observed UTC continuity. The default shared year excludes partial boundary dates; do not advertise every covered date as a full day.

Do not reinterpret the timestamps in `America/Chicago` or the viewer's timezone. Date-only calendar arithmetic, including weekdays and Monday week starts, must produce identical results in every runtime timezone. Grouping uses source-local labels; chronology checks use UTC.

## Contracts

Define Zod schemas first and infer TypeScript types. The following shapes describe the intended contract, not independently maintained interfaces:

```ts
type DatasetId = 'low-winter' | 'high-winter' | 'solar'
type EnergyRequest = {
  household: DatasetId
  start: string // inclusive source-local ISO date
  end: string   // inclusive source-local ISO date
}
type DayHour = {
  date: string
  hour: number
  consumptionWh: number
  generationWh: number
  intervalCount: number
}
type EnergyWindow = {
  dataVersion: string
  household: DatasetId
  period: { start: string; end: string; observedDays: number }
  dayHours: DayHour[]
  totals: { consumptionWh: number; generationWh: number }
  quality: WindowQuality
  facts: InsightFact[]
}
```

`WindowQuality` contains coverage bounds, complete/partial dates, observed interval count, and relevant offset-transition notes. `InsightFact` is defined in plan 05. All arrays have a stable date/hour ordering. Facts include their supporting dates and denominators, not just formatted percentages.

Request validation requires real dates, `start <= end`, dates within the selected dataset's coverage, and at most 366 calendar dates. Return a typed invalid-period error instead of silently clipping. The initial range is `2024-04-22` through `2025-04-21`, inclusive; `low-winter` is the default household. An optional internal half-open range uses the next calendar date as its end, not an assumed number of milliseconds per local day.

Return only the selected window's hourly buckets, totals, quality, and deterministic facts. The browser derives daily/weekly chart series from those same buckets; avoid sending redundant copies of every granularity. At most 8,784 date/hour positions are needed for a 366-day request. Dataset labels and coverage bounds can be a small shared catalog, without other households' measurements.

## Generated artifacts and deployment

- `scripts/build-energy-data.ts` runs through `node --import tsx` and uses `csv-parse` plus Zod. Focused parser/domain/service checks live in `scripts/energy.test.ts`, using Node's built-in `node:test` with `tsx`; `npm test` runs them. This replaces the original Vitest/React Testing Library proposal to keep verification fast. UI checks are manual.
- Generate `src/generated/energy/<dataset>.<hash>.json`, its `registry.server.ts`, and client-safe `src/generated/data-versions.ts` containing only dataset IDs, hashes, and coverage metadata. Keep generated outputs ignored by Git; retain immutable originals in `data/raw/`.
- `dataVersion = SHA-256(raw bytes + parserVersion + schemaVersion + aggregationVersion)`, with explicit separators or canonical version serialization. Pin parser dependencies in the lockfile and bump the pipeline version for behavior changes.
- Serialize deterministically: stable key/array order, no generation timestamp, random identifiers, or environment-dependent values. Publish a manifest only after all outputs validate; never reuse a partial generation.
- Register literal JSON imports in `registry.server.ts` so the bundler includes artifacts in the server output. Protect the registry with a server-only boundary. Runtime services use the registry, never `fs.readFile` against the deployed repository.
- `data:build` runs from `predev`, `prebuild`, `pretypecheck`, and `pretest`. A standalone `npm test` works on a fresh clone without manually generating artifacts. The generator skips unchanged writes.
- The existing Vercel build must run generation before Vite/Nitro bundles the application. A cold function reconstructs results from bundled JSON without contacting another service or writing to ephemeral disk.

TanStack loaders run on both server and client; keep data imports behind a server function handler calling a `.server.ts` service. Client-safe schemas and pure math stay outside that boundary. Verify isolation in the production client bundle. [Execution model](https://tanstack.com/start/latest/docs/framework/react/guide/execution-model)

## Request path and cache policy

`route loader → validated server function → energy service → generated registry + pure selectors/metrics`

`src/server/functions/energy.ts` validates transport inputs and maps domain errors; `src/server/services/energy.server.ts` selects the dataset/window, derives quality and facts, and returns the typed response. Shared pure functions and schemas live in `src/domain/energy/` and implement sums, calendar grouping, and insight calculations.

| Layer | Key and behavior |
| --- | --- |
| Build output | Content/version hash; regenerate only when inputs or transformation versions change. |
| Server module | Bundled immutable artifacts; ordinary module reuse is an optimization, never a requirement. No unbounded per-request map. |
| Router loader | Dependencies `{ dataVersion, household, start, end }`; use five-minute `staleTime`/`preloadStaleTime` and 30-minute `gcTime` as starting values. |
| HTTP/CDN | Keep `Cache-Control: private, no-store` for dashboard HTML and dashboard/insight RPC responses; do not attach public cache headers in the loader. Normal hashed JS/CSS asset caching remains unchanged. |
| LLM explanations | Browser-local reuse through localStorage, owned by plan 05; a matching entry avoids an explanation request. It does not control energy data availability. |

Only `household`, `start`, and `end` affect fetching. URL `granularity` and `unit` affect local rendering; priority and slider movement must not refetch energy. The loader includes the client manifest's version and checks the returned version. A deployment-version mismatch shows recoverable feedback with a refresh action; this implementation deliberately avoids an automatic reload loop.

Router caching is in memory and follows explicit loader dependencies; it does not make serverless responses durable or cache full HTML. SSR receives a fresh router per request and hydrates its selected data. Do not include preferences in an immutable energy result. [Router data loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading), [server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)

## Implementation sequence

1. Add schemas, fixture registry, calendar/unit helpers, and targeted synthetic test fixtures.
2. Implement strict parsing and quality profiling; reproduce the checked-in data notes.
3. Implement deterministic hourly/daily aggregation and versioned output generation.
4. Implement pure period selection and deterministic facts, with shared contracts agreed with plan 05.
5. Add the thin server function, energy service, route search validation, and loader cache settings.
6. Connect build scripts; verify standalone and Vercel output, response sizes, cold loads, and client bundle isolation.

## Verification and acceptance

- Baseline totals for the default year exactly match high winter `28,923,047 Wh`, low winter `19,857,267 Wh`, and solar `20,979,789 Wh`; solar generation is `6,304,030 Wh`. Peaks match [data notes](../docs/data-notes.md).
- Tests cover bad headers/quotes/numbers, UTC duplicate/gap detection, offset transitions, 92/96/100-interval dates, boundary dates, repeated hours, and timezone-independent weekday calculations.
- Daily/hourly sums reconcile exactly. Rebuilding the same bytes produces identical hashes and JSON; changing one row or a pipeline version changes the version.
- Invalid dates/ranges cannot traverse paths or silently truncate. No complete-year metric uses a partial day without labeling it.
- Cold production and Vercel builds work without raw-file reads at request time. No raw CSV or all-household JSON appears in the browser bundle/network payload.
- Revisiting a cached household/window is immediate within the configured cache window; changing units, granularity, priority, or slider does not fetch energy again.
- Measure compressed payload size and parsing time for the largest allowed request. Aim below 150 KB compressed for the energy response; if exceeded, compact the hourly transport representation before introducing infrastructure.
- Run formatter/linter, type checks, targeted tests, and both applicable production build modes.

## Open questions and later work

- Ask the data provider whether source-local labels, interval start/end semantics, consumption, and generation have the meanings assumed here. Preserve current explicit conventions until clarified.
- Uploaded or changing data would require asynchronous ingestion, persisted artifacts, ownership controls, and invalidation. That is a separate scope; this plan deliberately optimizes the supplied fixtures.
- Measure before adding shared response caching or wider history. The 366-day cap is an explicit v0 product limit that can expand independently of raw-data preservation.
