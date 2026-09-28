# My Energy Story

Light take-home challenge, option 1. A TanStack Start + React + TypeScript foundation for a residential electricity dashboard, configured for Vercel with Nitro.

**Current state:** starter page, server health endpoint, supplied challenge CSVs, formatting/type checks, and deployment setup. Energy parsing, charts, onboarding, simulations, and AI insights are the next phase.

## Run locally

Use Node.js 22.12+ (Node 22 is selected by `.nvmrc`) and npm.

```sh
nvm use
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). No API keys or database are required. The server endpoint at `/api/health` returns JSON with `status: "ok"`.

## Validate and build

```sh
npm run check
npm run typecheck
npm run build
npm start
```

`npm start` serves the local production build on port 3000. `npm run format` applies formatting. Route types are generated automatically during development/build; `typecheck` generates them before checking TypeScript.

GitHub Actions runs formatting/lint checks, TypeScript, and the Vercel build on pushes and pull requests.

## Deploy to Vercel

1. In Vercel, choose **Add New → Project** and import `syed-mohsin/light-takehome-challenge`.
2. Keep the repository root as the root directory and **TanStack Start** as the framework preset.
3. Use Node.js **22.x**. Leave build/output settings at their detected defaults (`npm run build`).
4. Deploy. Check the homepage and `/api/health` on the resulting URL.

The Nitro Vite plugin builds server routes and SSR into Vercel Functions. `vercel.json` makes framework detection explicit. No environment variables are needed yet. Future server API keys can be added in Vercel's environment settings; do not prefix secrets with `VITE_`.

To verify Vercel output locally:

```sh
npm run build:vercel
```

This creates `.vercel/output`. Run `npm run build` again before `npm start` to restore the standalone Node output. GitHub pushes to `main` deploy automatically after the repository is connected to a Vercel project. This repository is deployment-ready; a hosted Vercel project is not provisioned by this setup.

References: [TanStack hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting), [Vercel TanStack Start setup](https://vercel.com/docs/frameworks/full-stack/tanstack-start).

## Project layout

```text
data/raw/              Supplied interval CSV fixtures (not public web assets)
docs/data-notes.md      Verified data profile and proposed processing approach
src/routes/            File-based pages and server endpoints
src/router.tsx         Router setup
src/styles.css         Base styles
vite.config.ts         TanStack Start, React, and Nitro integration
vercel.json            Vercel framework configuration
```

The supplied CSVs are included unchanged in `data/raw/`. Their `consumption` and `generation` columns contain **Wh per 15-minute interval**; divide by 1,000 for kWh. The proposed cost view uses the brief's flat **$0.14/kWh**, excluding taxes, fees, and any assumed export credit. No runtime data pipeline or LLM provider is configured yet.

See [data notes](docs/data-notes.md) for coverage, reproducible insights, timezone/meter caveats, and the proposed aggregation approach.
