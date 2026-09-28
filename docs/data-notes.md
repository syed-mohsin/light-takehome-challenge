# Interval data notes

Read-only profiling of the supplied files in `data/raw/`. These findings inform the proposed dashboard; ingestion, aggregation, charts, and insights are **not implemented yet**.

## What the files contain

| File | Records | Source-local dates, inclusive | Bytes |
| --- | ---: | --- | ---: |
| `high-winter-interval-data.csv` | 69,408 | 2023-05-01–2025-04-22 | 2,714,323 |
| `low-winter-interval-data.csv` | 66,336 | 2023-06-01–2025-04-21 | 2,597,647 |
| `solar-interval-data.csv` | 66,432 | 2023-06-01–2025-04-22 | 2,611,971 |

All **202,176 records** parse successfully. Each interval has `duration=900` seconds and `unit=Wh`, with nonnegative integer consumption and generation. Divide energy by 1,000 to obtain kWh; do not multiply by interval duration. Records are chronological and continuous at 15-minute intervals in UTC, without duplicate instants or gaps.

The files contain nearly two years of historical data. A comparable default year for all three households is **2024-04-22 through 2025-04-21**, inclusive: 365 source-local dates. Label this period explicitly rather than implying the data runs through today.

| Shared 365-day window | High winter | Low winter | Solar |
| --- | ---: | ---: | ---: |
| Reported consumption, kWh | 28,923.047 | 19,857.267 | 20,979.789 |
| Reported generation, kWh | 0 | 0 | 6,304.030 |
| Largest consumption day | 2025-01-21 | 2024-08-18 | 2024-08-21 |
| Consumption on that day, kWh | 336.923 | 114.053 | 156.796 |

Two example insights computed over that same window:

- High winter's mean daily consumption in December–February is **34.3% higher** than in June–August. Low winter's is **53.1% lower**. These describe seasonality; the files do not establish which appliances caused it.
- Low winter averages **58.22 kWh per weekend day**, versus **52.88 kWh per weekday**, a **10.1% increase**. Compare averages per day, since there are more weekdays than weekend days.

Across the full solar file, generation first becomes positive at **2024-09-19T10:45:00-05:00**. This establishes when reported generation appears, not when panels were installed. The largest reported generation day is **2025-04-08: 65.410 kWh**.

## Time and meter semantics

- Timestamps contain explicit `-05:00` or `-06:00` offsets but no named timezone. Offset changes occur at unusual midnight boundaries, rather than at America/Chicago's DST transition hours. For example, `2023-11-06T00:45:00-05:00` is followed by `2023-11-06T00:00:00-06:00`. These remain consecutive UTC instants.
- Each file has 100 intervals on **2023-11-06** and **2024-11-04**, and 92 on **2024-03-10** and **2025-03-09**. All other source-local dates have 96. Preserve source offsets and local date labels; use UTC instants to test continuity. Do not discard repeated clock times, assume every day has 96 intervals, or silently reinterpret the data in the viewer's timezone. Source date labels are the convention used in this document, pending clarification from the provider.
- The brief describes energy flowing through a meter. It does not settle whether `consumption` means grid import or gross household demand, or whether `generation` means grid export or total solar production. Initially show the two reported series separately. Self-consumption, solar coverage, export credits, and battery savings require confirmed semantics and additional assumptions.
- The proposed dollar view is a consumption-cost estimate at the brief's **$0.14/kWh**, excluding fixed charges, taxes, and export credits. Moving usage between hours does not change that estimate under a flat tariff.
- Carbon estimates require a disclosed emissions factor and ideally a grid location. The CSVs alone cannot establish a household's carbon footprint or appliance-level energy use.

## Proposed implementation

1. Validate and aggregate these immutable fixtures at build time. Keep integer Wh for exact sums, then expose kWh at the presentation boundary. Retain data-quality metadata, source-local daily totals, monthly summaries, hour-of-day summaries, and deterministic insight facts. The full files reduce to **2,106 daily points**, rather than sending 202,176 raw records to the browser.
2. Version generated data by source content hash and parser version. A typed TanStack Start server function or loader can return the selected household and period. Cache immutable responses and client query results by that version. Do not depend on a warm serverless process for correctness; uploaded or changing data would need a separate ingestion and persistent-storage design.
3. Start with biggest-use day, weekday/weekend daily averages, seasonal daily averages, and evening consumption share. Compare equivalent periods and disclose incomplete periods. Avoid claiming appliance causes or weather effects from correlations alone.
4. Offer a historical scenario such as reducing recorded evening consumption by 0–30%, with an explicit hour range and before/after chart. Compute the energy and cost difference deterministically. Describe it as a scenario, not a forecast or a promised saving.
5. Give an LLM only computed facts, metric identifiers, the selected priority, and stated assumptions. Ask it to explain and prioritize those facts, validate its structured response, and retain a deterministic fallback. Cache by data version, period, priority, and prompt/model version. Keep arithmetic outside the model.

## Reproduce the profile

Use Python 3.9+; no third-party packages are needed. Save the following snippet as `/tmp/profile-intervals.py`, then run `python3 /tmp/profile-intervals.py` from the repository root. It only reads the three CSVs and prints JSON. Daily and seasonal calculations use the source-local dates described above.

```python
import csv
import json
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path
from statistics import mean

START, END = date(2024, 4, 22), date(2025, 4, 21)
FILES = (
    "high-winter-interval-data.csv",
    "low-winter-interval-data.csv",
    "solar-interval-data.csv",
)

for name in FILES:
    path = Path("data/raw") / name
    with path.open(newline="") as source:
        rows = list(csv.DictReader(source))
    assert all(r["duration"] == "900" and r["unit"] == "Wh" for r in rows)
    data = [
        (datetime.fromisoformat(r["datetime"]), int(r["consumption"]), int(r["generation"]))
        for r in rows
    ]
    assert all(c >= 0 and g >= 0 for _, c, g in data)
    instants = [int(t.timestamp()) for t, _, _ in data]
    unique = sorted(set(instants))
    daily = defaultdict(lambda: [0, 0, 0])
    for t, consumption, generation in data:
        day = daily[t.date()]
        day[0] += consumption
        day[1] += generation
        day[2] += 1
    year = {d: v for d, v in daily.items() if START <= d <= END}
    assert len(year) == 365
    peak = max(year, key=lambda d: year[d][0])
    generation_peak = max(daily, key=lambda d: daily[d][1])
    weekday = mean(v[0] for d, v in year.items() if d.weekday() < 5) / 1000
    weekend = mean(v[0] for d, v in year.items() if d.weekday() >= 5) / 1000
    winter = mean(v[0] for d, v in year.items() if d.month in (12, 1, 2))
    summer = mean(v[0] for d, v in year.items() if d.month in (6, 7, 8))
    result = {
        "file": name,
        "bytes": path.stat().st_size,
        "records": len(data),
        "first": data[0][0].isoformat(),
        "last": data[-1][0].isoformat(),
        "source_local_days": len(daily),
        "duplicate_instants": len(instants) - len(unique),
        "non_15_minute_steps": sum(b - a != 900 for a, b in zip(unique, unique[1:])),
        "out_of_order": sum(a > b for a, b in zip(instants, instants[1:])),
        "intervals_per_day": dict(Counter(v[2] for v in daily.values())),
        "non_96_days": {str(d): v[2] for d, v in daily.items() if v[2] != 96},
        "offset_changes": [
            [a[0].isoformat(), b[0].isoformat()]
            for a, b in zip(data, data[1:])
            if a[0].utcoffset() != b[0].utcoffset()
        ],
        "generation_first_positive": next((t.isoformat() for t, _, g in data if g > 0), None),
        "full_period_generation_peak": {
            "date": str(generation_peak) if daily[generation_peak][1] else None,
            "kwh": daily[generation_peak][1] / 1000,
        },
        "shared_year": {
            "start": str(START),
            "end": str(END),
            "consumption_kwh": sum(v[0] for v in year.values()) / 1000,
            "generation_kwh": sum(v[1] for v in year.values()) / 1000,
            "peak_date": str(peak),
            "peak_consumption_kwh": year[peak][0] / 1000,
            "weekday_daily_kwh": weekday,
            "weekend_daily_kwh": weekend,
            "weekend_change_percent": 100 * (weekend / weekday - 1),
            "winter_daily_kwh": winter / 1000,
            "summer_daily_kwh": summer / 1000,
            "winter_change_from_summer_percent": 100 * (winter / summer - 1),
        },
    }
    print(json.dumps(result, indent=2))
```
