# Northern coastline source

`alexandra-north-2026-10-19.osm.gz` retains the exact OpenStreetMap XML used for
the northern coastal extension, compressed with gzip. © OpenStreetMap
contributors, ODbL 1.0: https://www.openstreetmap.org/copyright and
https://opendatacommons.org/licenses/odbl/1-0/ . No tile or imagery assets.

Retrieved 2026-10-19 from:
https://www.openstreetmap.org/api/0.6/map?bbox=153.099,-26.6775,153.142,-26.653

Uncompressed SHA-256 is recorded in `mooloolaba.json.coastalExtension`.
This archive is source data only and is not downloaded by the running game.

To reproduce with Python + Shapely, extract the pre-extension database from
commit `7b5a163` (for example `git show 7b5a163:src/data/mooloolaba.json`
redirected into `/tmp/estuary-base.json`), then run:

```
python scripts/extend-northern-coast.py \
  --extract src/data/sources/alexandra-north-2026-10-19.osm.gz \
  --base /tmp/estuary-base.json \
  --output /tmp/estuary-extended.json
```

The rebuilt file was compared byte-for-byte with the shipped database.
Running against a database that already records the extension is a no-op.
Only new beachfront building footprints within 650 m of the coast are retained;
new roads/parks/beaches/pools are clipped to the added strip. Existing river,
canal, bridge, race and spawn geometry is preserved. The wave-exposure field
is resampled to 256² so CPU/GPU continue to share a single field across the
larger world. Physical elevation, facade style and missing heights remain game
estimates, not a measured reconstruction of each property.
