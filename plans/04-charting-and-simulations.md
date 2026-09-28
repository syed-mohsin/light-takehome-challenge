# 04 — Charting and simulations

Status: implemented design record. Depends on [design system](01-design-system.md), [energy data](02-csv-parsing-and-caching.md), and the shared contracts in [README](README.md). Recharts history/profile views, household/date controls, units, the data table, and shared simulation math are connected. Fast domain tests verify reconciliation and scenario invariants. Manual checks covered daily/weekly retention, household reset, solar/dollars, typical-day view, keyboard controls, custom dates, and partial-week tables.

## Outcome and product direction

Let a customer read their historical usage, identify a pattern, and try a clearly labeled reduction scenario. Reuse the v0 chart card's hierarchy, restrained palette, legend, and inline controls. Replace the mock hourly-only chart with a real daily/weekly history; offer a typical-day view as a second way to explore the same reporting period.

Start with one selected example household and one reporting period, not three overlapping households. The examples are distinct datasets, not a benchmark of comparable homes. Initial state: `low-winter`, `2024-04-22`–`2025-04-21`, daily, kWh, no reduction.

## Library and rendering decisions

Use Recharts for React composition, SVG rendering, responsive sizing, line overlays, bars, and keyboard exploration. The installed version is pinned through the lockfile. Use supported public props, not chart-internal state.

- Main history: `LineChart` with linear baseline and dashed scenario series, zero-based y-axis, grid, readable date ticks, and shared tooltip. Daily totals are the default; weekly totals reduce visual density when selected.
- Typical day: a 24-slot `ComposedChart` with reported hourly consumption bars and an optional scenario line. Shade the 5–9 PM intervention window and expose the same explanation in text.
- Solar generation: a separately labeled series in kWh, visually distinct from consumption. Do not stack or subtract it. Hide the generation series in USD mode with visible copy explaining that only reported consumption is priced.
- Sparklines derive monthly aggregates from the same selected-window buckets and remain supplementary; the main chart must satisfy the daily/weekly requirement. Mark partial months rather than presenting them as complete-month comparisons.

Use `type="linear"` and `connectNulls={false}` for historical lines: connect observed samples without smoothing away peaks or connecting missing data. Recharts exposes these interpolation and null-handling controls. [Line API](https://recharts.github.io/en-US/api/Line/)

Use a fixed-height responsive chart frame with `min-width: 0` inside grid layouts. Render the chart after mount in a reserved frame while SSR renders headings, totals, and the accessible summary; initial server/client markup must agree. Lazy-load the chart module and use a same-size skeleton until ready. Keep animations off for the initial version and during slider interaction. [Responsive container API](https://recharts.github.io/en-US/api/ResponsiveContainer/)

## Controls and state ownership

| State | Owner | Behavior |
| --- | --- | --- |
| `household`, `start`, `end` | Validated router search | Shareable selection; changes fetch only the selected energy window. |
| `granularity: daily \| weekly` | Validated router search | Regroups local buckets; no energy request. |
| `unit: kWh \| usd` | Validated router search | Converts presentation values; no energy request or canonical rounding. |
| `view: history \| typical-day` | Local dashboard hook | Defaults to history; period controls apply to both views. |
| Typical-day filter: all/weekday/weekend | Local dashboard hook | Changes the profile denominator and labels. Defaults to all days. |
| Scenario reduction percentage | Local scenario hook | Starts at zero; changes chart and scenario summary synchronously. |
| Priority | Onboarding preference hook | Changes explanatory emphasis, never the measured data. |

URL fields follow the shared README exactly. Use Zod defaults for omitted fields; reject invalid enum/date values with recoverable feedback. Navigating browser back/forward restores URL state. Household or period changes reset the scenario to zero; unit, granularity, view, and priority changes retain it. The reset is explicit so an old experiment is not silently applied to another household.

Place the household and period controls above the dashboard. Place daily/weekly and kWh/USD controls beside the history title. Keep the typical-day view and day-type filter visibly separate from historical granularity so “Daily” cannot mean both daily totals and an hourly profile.

## Aggregation and presentation contracts

Use the selected window's `dayHours` from plan 02 as the only measured input. Pure functions derive baseline series, scenario series, and text summaries; presentational chart components accept ready-to-render points and formatters.

```ts
type HistoryPoint = {
  start: string
  end: string
  observedDays: number
  partial: boolean
  baselineWh: number | null
  scenarioWh: number | null
  generationWh: number | null
}
type Scenario = {
  kind: 'reduce-evening'
  reductionPercent: number // Zod integer, 0..30
}
```

Define runtime schemas and infer these types in implementation. `null` means unavailable; a measured zero is `0`. No output can use the viewer's local timezone to move a date into another reporting bucket.

- **Daily:** sum the selected date's buckets. A tooltip shows source date, consumption, scenario, reduction, and generation when applicable.
- **Weekly:** use Monday–Sunday source-local calendar weeks; sum only selected dates. Mark clipped first/last weeks as partial and show their exact span and observed day count. Never extrapolate a partial week into seven days.
- **Typical day:** for each local clock hour, sum energy across eligible dates and divide by the number of dates with an observed bucket for that hour. Repeated hours retain all measured energy; omitted clock hours do not become zero. Tooltip includes the sample-day denominator and a note when interval counts differ because of source offset changes.
- **Averages:** retain integer numerator and count until display; fractional mean kWh is valid. Apply scenarios to individual date/hour integers before averaging, not to an already averaged profile.
- **Units:** chart values are derived `Wh / 1000` or `Wh * 14 / 100000` USD. Format currency at display time; add exact hourly/date savings before rounding displayed dollars. USD means estimated consumption cost, excluding fees, taxes, and credits.
- **Axes:** visible units, zero minimum, sparse but meaningful date ticks, full dates in tooltips. Keep the y-domain based on unchanged baseline and any visible generation series so moving the reduction slider does not exaggerate changes by rescaling.

## Simulation definition: `evening-v1`

Label the control “Reduce consumption from 5–9 PM” and provide a range input from 0% to 30%, step 1, plus an editable numeric input and reset button. Explain: “What if recorded consumption between 5 PM and 9 PM had been lower during this period?” This is a historical scenario, not a forecast or promised saving.

The canonical scenario is `{ kind: 'reduce-evening', reductionPercent }`. Hours use the source-local timestamp convention: `17 <= hour < 21`. For each date/hour bucket:

```ts
savedWh = isEvening ? Math.round(consumptionWh * reductionPercent / 100) : 0
scenarioWh = consumptionWh - savedWh
```

Run this exact pure implementation in both the browser and server. Round saved Wh once per date/hour bucket, then sum into dates, weeks, periods, and insight facts. Never apply the percentage to a total that includes non-evening usage; never round each original interval or the entire reporting year instead. Generation remains unchanged.

Scenario invariants: zero percent reproduces the baseline exactly; all saved/scenario values are nonnegative safe integers; non-evening buckets are unchanged; `baselineWh = scenarioWh + savedWh`; increasing the percentage cannot increase simulated consumption. Applying or rendering a scenario must not mutate the baseline buckets.

Show a compact summary beside/below the chart: baseline energy, scenario energy, energy reduction, and estimated cost reduction for the selected period. Keep the main measured-usage cards labeled as recorded values; a scenario must not silently replace history throughout the dashboard. Suppress the duplicate overlay at 0% and show “Choose a reduction to compare.”

The banner's “See how” action opens the simulation controls and moves keyboard focus to the slider without changing its value. Any displayed savings refer to the currently active scenario and reporting period. At zero reduction, use an invitation to try the controls rather than an invented savings number.

Do not offer load shifting as a money-saving scenario under the flat tariff. No appliance, thermostat, solar self-consumption, battery, or carbon savings simulation is included without the additional modeling inputs it requires.

## Components and service boundaries

| Module | Responsibility |
| --- | --- |
| `src/domain/energy/simulation.ts` | Schema-backed scenario application and `evening-v1` constant; no React, network, or environment reads. |
| `src/domain/energy/aggregation.ts` | Daily/weekly/profile sums, date grouping, partial-period annotations. |
| `src/domain/energy/format.ts` | Unit/currency/date formatting with explicit locale/calendar conventions. |
| `src/features/dashboard/hooks/use-energy-chart.ts` | Selects view/filters and memoizes derived series and summaries. |
| `src/features/dashboard/hooks/use-scenario.ts` | Input state, reset rules, current scenario, and committed scenario for explanations. |
| `EnergyChartSection` container | Combines loaded data, router controls, hooks, and accessible state handling. |
| `HistoryChart`, `TypicalDayChart`, `ChartTooltip` | Pure presentation, labels, series, legend, and point exploration. |
| `ScenarioControls`, `ScenarioSummary` | Shared design-system controls and presentational results. |

The energy service returns baseline buckets. Slider changes remain local; no per-tick requests. The insights request sends the scenario parameters, `expectedDataVersion`, household, and dates—not client-computed savings for the server to trust. The insights service compares the expected version with its manifest, then reloads canonical buckets and applies the same pure function before constructing facts. A mismatch returns a refresh result without generating an explanation. Plan 05 owns the explicit explanation request, deduplication, and caching.

## Accessibility and incomplete states

Keep Recharts' accessibility support enabled and verify keyboard point navigation with the real tooltip. Its accessibility layer supports focus and arrow-key exploration, but does not replace a clear title, description, or equivalent data access. [Recharts accessibility documentation](https://github.com/recharts/recharts/blob/main/storybook/stories/API/Accessibility.mdx)

- Provide a concise text summary and a “View data table” disclosure for the currently displayed daily/weekly/profile rows. Paginate the table if needed; users must be able to reach every value without pointer hover.
- Use dash pattern plus labels to distinguish scenario from recorded consumption; do not rely on color. Keep tooltips readable and labels large enough on mobile.
- Label the range and numeric inputs, expose percentage and hour window, and support keyboard increments. Announce committed summary changes politely, without reading every drag event.
- On a new dataset/window load, show a correctly labeled skeleton or pending state; never show old-household lines under new-household labels. On failure, show retry and preserve controls. Clear pending explanation results when the scenario changes.
- An empty period has explanatory copy and no misleading zero chart. Genuine zero usage still renders a meaningful zero baseline. Missing measurements produce gaps and a quality note.
- Reserve chart space to avoid layout shift; check 360 px mobile layouts, visible keyboard focus, zoomed text, and reduced-motion behavior.

## Implementation sequence and acceptance

1. Implement and test shared simulation and aggregation functions before connecting charts.
2. Build the historical chart against real service output, router controls, tooltips, and data table.
3. Add the profile view and clear denominator/offset explanations.
4. Add scenario controls, the second series, period savings summary, and banner action.
5. Connect committed scenarios to the insights flow; verify stale results never replace current context.
6. Run formatting, type checks, the fast shared domain tests, production build, and manual responsive/keyboard inspection. No heavy component test suite is included.

Acceptance requires a working daily/weekly chart for each supplied CSV, exact reconciliation to the data-service totals, and a historical label instead of “Now.” Test partial weeks, year boundaries, all/weekday/weekend filtering, zero usage, missing values, source-offset changes, and USD/kWh formatting.

Test `0`, `1`, and `30` percent and reject out-of-range/fractional inputs. Include a rounding-sensitive bucket such as 5 Wh at 10% (1 Wh saved), multiple eligible buckets, and ineligible hours immediately before/after the window. Browser and server must produce identical totals and insight facts from the same input.

Measure slider responsiveness with a full 366-day window; aim for derived calculations below 16 ms on a representative laptop and confirm no network request per slider change. Memoize by data version/window/scenario before considering workers or more infrastructure.

## Deferred decisions

Carbon overlays need a separately agreed emissions factor and methodology. Solar coverage/net-cost charts need confirmed meter semantics. Custom intervention hours, arbitrary forecasts, comparison overlays, brushes, and appliance breakdowns are later extensions, not prerequisites for the first demo.
