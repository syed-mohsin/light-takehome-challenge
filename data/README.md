# Challenge fixtures

The three supplied challenge files are included unchanged in `data/raw/`:

- `high-winter-interval-data.csv`
- `low-winter-interval-data.csv`
- `solar-interval-data.csv`

Keep the originals unchanged. The starter currently runs without reading them; the data pipeline will be added after product direction is agreed. See [data notes](../docs/data-notes.md) for the verified profile and proposed processing approach.

Expected columns: `datetime,duration,unit,consumption,generation`. Each supplied row represents 900 seconds; consumption and generation are energy in Wh, not power in watts. Preserve source timestamp offsets when parsing.
