# My Energy Story

Light take-home challenge, option 1: an electricity dashboard built with TanStack Start, React, TypeScript, Tailwind, and Recharts. Explore three supplied households, understand their historical usage, and try an evening-reduction scenario.

The five implementation plans are implemented. The app works without API credentials or a database. Lint, TypeScript, the focused data tests, standalone/Vercel production builds, and manual browser smoke checks have passed. Live local Luna explanations and browser-cache reuse have been verified with an API key. A hosted deployment has not been verified here.

## Run locally

Use Node.js **22.x, at least 22.12** (`.nvmrc`) and npm.

```sh
nvm use
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Development automatically validates and aggregates the checked-in CSVs before starting the app; no manual data import is needed. `/api/health` returns JSON with `status: "ok"`.

## What you can explore

- Switch between low-winter, high-winter, and solar sample households; select an inclusive reporting period of up to 366 days.
- Read daily or weekly history, or a typical-day profile filtered to weekdays/weekends. Switch consumption between kWh and estimated dollars.
- See recorded consumption, estimated cost, daily average, peak day, and deterministic insights with supporting evidence.
- Reduce consumption during 5–9 PM by 0–30% and compare the scenario against recorded usage. Calculations update locally without a request for every slider movement.
- Choose Saving money, Carbon footprint, or Learning. Saving money is the default; a small localStorage record remembers the choice and onboarding status.
- Request an optional Luna explanation of verified facts, including an everyday comparison to EV batteries or LED bulbs. Matching successful explanations are reused from localStorage; the dashboard remains useful if AI is disabled or unavailable.

## Optional AI explanations

Copy `.env.example` to `.env` and configure:

```dotenv
AI_INSIGHTS_ENABLED=true
OPENAI_API_KEY=your_server_side_key
```

Restart the development server after changing these settings. The server uses **Luna (`gpt-6-luna`)** with reasoning effort `none`, structured output, and no automatic retries. Model selection is fixed in the server adapter. Do not prefix secrets with `VITE_` or put them in browser storage.

The **Explain these patterns** action checks saved results before requesting an explanation. There are no model calls on page load, priority changes, or slider movements. The server recomputes the facts from its own data, validates output shape and evidence references, and returns deterministic text on missing configuration, timeout, or invalid output. Schema validation does not prove that all model-authored prose is factually correct; review live output before a demo.

**Energy in everyday terms** compares average complete-day consumption with a 60 kWh EV battery or 10 W LED bulbs running for 24 hours. With positive scenario savings, it instead compares the saved energy across the selected period with EV batteries. The backend calculates these equivalents; Luna selects an eligible comparison and writes a sentence around a required placeholder. Application code inserts the verified quantity and units, with explicit scope and a **How we calculated this** disclosure. EV comparisons exclude charging losses. Partial days are excluded from daily averages; savings use only the actual selected period, without annualizing.

Browser storage holds one preference record and at most ten successful explanations. Explanation keys include dataset/version, dates, priority, scenario, carbon assumption, and explanation version. Display units and chart granularity do not invalidate an explanation. Storage is best-effort, local to the browser, and has no account synchronization or shared spending limit. There is **no Redis, database, or server result cache**.

## Validate and build

```sh
npm run check
npm run typecheck
npm test
npm run build:vercel
```

`npm test` runs fifteen focused `node:test` checks through `tsx` in approximately one to two seconds. They cover strict CSV validation, real-fixture totals, offset changes, daily/weekly reconciliation, period validation, pricing, simulation invariants, deterministic versions, analogy calculations, and invalid model wording. Browser interactions are reviewed manually; no heavy UI test suite is installed.

Manual browser checks covered desktop and 360px mobile layouts, saved priority after reload, daily/weekly scenario retention, household reset behavior, solar/dollar handling, typical-day charts, keyboard slider controls, explicit carbon assumptions, custom dates and partial-week tables, invalid-URL recovery, and the AI-disabled fallback. The standalone production server also loaded the chart and switched households successfully without browser errors.

Live Luna checks also covered the daily LED analogy (about 227 bulbs for 24 hours), the 20% evening-reduction analogy (about 17.76 full 60 kWh EV batteries across the default selected year), calculation disclosures, reload reuse, context switching, and the analogy panel at 360px without horizontal overflow.

Data generation runs automatically before development, type checking, tests, and builds, including on a fresh clone. To run it alone, use `npm run data:build`. `npm run format` applies formatting. GitHub Actions runs checks, type checking, these fast tests, and the Vercel build.

For a standalone Node production preview:

```sh
npm run build
npm start
```

`npm start` serves the standalone production output on port 3000. Production AI configuration must be supplied as runtime environment variables.

## Architecture and data assumptions

```text
Checked-in CSVs -> build-time validation -> versioned server JSON
                                                    |
URL household/dates -> server function -> energy service -> hourly buckets
                                                    |
                             shared pure calculations -> charts and facts

Explain action -> browser cache -> on a miss, server facts -> Luna -> validation
```

Original CSVs remain unchanged in `data/raw/`, published with permission. Every source value is **Wh per 15-minute interval**. Calculations keep integer Wh and convert to kWh at presentation time; they do not multiply those energy values by interval duration.

The default shared year is **April 22, 2024–April 21, 2025**. It is historical data, not the year preceding today. Source-local dates and hours are preserved; UTC instants establish continuity. Source offset changes produce legitimate 92- and 100-interval days, including repeated local hours. Missing observations are never filled with invented zeros.

Daily and Monday–Sunday weekly totals sum the same selected hourly buckets. Typical-day values divide each hour's measured energy by its observed-day count. The scenario rounds each eligible hourly bucket's saved Wh once, then aggregates. Generation stays unchanged.

Consumption cost uses a flat **$0.14/kWh**, excluding taxes, fees, and export credits. Shifting equal usage between hours would not save money under this tariff. Reported consumption and generation remain separate: the files do not establish solar self-consumption, gross demand, or export credits. Carbon figures require an explicit, labeled factor and remain hypothetical consumption-equivalent estimates.

Generated artifacts are ignored by Git and bundled only on the server. A request returns one household and window, with a five-minute Router memory cache. Measurements are not embedded in a shared client dataset bundle; response correctness does not depend on a warm server process. Measured 366-day payloads are approximately **55–61 KB gzip**.

See [data notes](docs/data-notes.md) for source coverage and reproducible reference calculations, and the [design records](plans/README.md) for technical decisions.

## Short demo walkthrough

1. Open the default low-winter household and confirm Saving money is selected. Its recorded consumption is **19,857.267 kWh**, rounded to **19,857 kWh** on the headline card.
2. Switch Daily to Weekly, then dollars. Totals remain consistent; the view regroups or formats the same measurements.
3. Set a 20% evening reduction. Compare recorded/scenario lines and the period's energy and cost difference. Switch to Typical day to see the affected hours.
4. Explore the peak day (**August 18, 2024; 114.053 kWh**) and weekend/weekday insight. Open the supporting data table.
5. Choose the solar household and return to kWh. Its separate generation series appears; the new household starts at a zero-percent scenario.
6. Change priorities, optionally add a labeled carbon assumption, then choose Explain. With AI enabled, repeat the same context or reload to reuse its saved explanation. Without credentials, use the deterministic explanation and evidence.

## Deploy to Vercel

1. Import `syed-mohsin/light-takehome-challenge` as a new Vercel project.
2. Use the repository root, **TanStack Start** framework preset, and **Node.js 22.x**.
3. Keep the detected build command (`npm run build`) and output settings. Data generation is part of the build.
4. Optionally configure `AI_INSIGHTS_ENABLED=true` and `OPENAI_API_KEY` in Vercel environment settings. The rest of the app needs neither.
5. Deploy and check the homepage, household/date navigation, and `/api/health`.

The Nitro Vite plugin builds server routes and SSR into Vercel Functions; `vercel.json` makes framework detection explicit. `npm run build:vercel` validates `.vercel/output` locally. Run `npm run build` again before `npm start` to restore standalone Node output. Once connected, GitHub pushes to `main` can trigger Vercel deployments.

References: [TanStack hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting), [Vercel TanStack Start setup](https://vercel.com/docs/frameworks/full-stack/tanstack-start).

## Project layout

```text
data/raw/                 Original published CSV fixtures
scripts/                  Build-time parser/generator and fast data tests
src/domain/energy/        Zod schemas, dates, aggregation, pricing, scenarios, facts
src/domain/insights/      Explanation contracts, evidence, context keys, fallback text
src/domain/preferences/   Browser preference schema
src/generated/            Ignored artifacts and client-safe version metadata
src/server/               Thin server functions, services, and Luna adapter
src/components/ui/        Shared design primitives
src/features/             Dashboard, charts, onboarding, and explanation hooks/UI
src/routes/               Dashboard route and health endpoint
src/styles.css            Tailwind, semantic tokens, and global base styles
plans/                    Implemented design records and review criteria
```
