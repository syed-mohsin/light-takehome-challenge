# Challenge fixtures

Copy the three supplied challenge files into `data/raw/`:

- `high-winter-interval-data.csv`
- `low-winter-interval-data.csv`
- `solar-interval-data.csv`

```sh
mkdir -p data/raw
```

These files contain household electricity readings and are excluded from the public repository by `.gitignore`. Keep the originals unchanged. The starter currently runs without them; the data pipeline will be added after product direction is agreed.

Expected columns: `datetime,duration,unit,consumption,generation`. Each supplied row represents 900 seconds; consumption and generation are energy in Wh, not power in watts. Preserve source timestamp offsets when parsing.
