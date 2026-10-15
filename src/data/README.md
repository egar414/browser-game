# Mooloolaba / Mooloolah estuary geometry

`mooloolaba.json` is a derived geographic database, © OpenStreetMap contributors,
available under the **Open Database License 1.0** (ODbL):
https://www.openstreetmap.org/copyright
https://opendatacommons.org/licenses/odbl/1-0/

The database is distributed in editable form in this public repository. Its
licence is separate from the original game code, procedural meshes and sounds.
The game displays attribution in the launch screen and beside the minimap.
No map tile server is contacted at runtime.

## Inputs retrieved on 2026-10-15

Download the following XML resources to the filenames shown, then run the builder:

| Filename | OpenStreetMap API URL |
| --- | --- |
| mooloolaba-osm-map | https://www.openstreetmap.org/api/0.6/map?bbox=153.115,-26.697,153.139,-26.68 |
| mooloolaba-map-south | https://www.openstreetmap.org/api/0.6/map?bbox=153.108,-26.711,153.142,-26.694 |
| mooloolaba-map-north | https://www.openstreetmap.org/api/0.6/map?bbox=153.108,-26.680,153.142,-26.677 |
| mooloolaba-river-full | https://www.openstreetmap.org/api/0.6/relation/1380756/full |

```sh
python -m pip install shapely
python scripts/build-mooloolaba-map.py --source-dir /path/to/extracts
```

The JSON records source extract SHA-256 hashes. Future OSM edits may change the
output. Node/npm are sufficient to build/play the checked-in game; Python and
Shapely are needed only to regenerate this database.

River relation 1380756 is joined with coastline-derived ocean geometry. The
connected river/ocean component defines playable water. Isolated ponds are
omitted. Shorelines are simplified to approximately 1.2 m, coordinates rounded
to 0.1 m. Projection is a local planar metre approximation about 153.124° E,
26.694° S, with east +X and south +Z. Horizontal distances are approximately 1:1;
this is not survey accuracy. Extent is approximately 3.4 × 3.8 km.

The database also contains mapped buildings, roads, piers, bridges, parks,
beaches and named channels. Missing building heights use original estimates.
Road and jetty widths are simplified. Terrain elevations are not surveyed, and
bridge clearance is deliberately enlarged for gameplay. Floating ramps, race
gates, moored decorative boats and planted palms are original game additions,
not claims about real navigation facilities. Never use the game as a chart.

The 128 × 128 wave-exposure field is derived from shoreline clearance and ocean
distance. CPU buoyancy and GPU water use the same bilinear interpolation. Narrow
canals are calmer, the river is intermediate and the ocean is choppier.

## Additional extract tags used in the ocean/detail update

The same hashed XML inputs now retain building kind, any mapped roof shape,
and height provenance (`mapped height`, `mapped levels`, or `estimate`). Road
name/class, 60 clipped residential areas and the `Rock Wall Mooloolaba`
breakwater alignment are retained. Counts are 422 building footprints, 828
road segments, 166 piers and nine road bridges. No satellite imagery or Google
Earth geometry was used. Additional waterfront houses, facade/roof details,
rock dressing and moored boats remain artistic additions; the physical
headland heights are estimated.
