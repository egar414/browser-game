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
python scripts/build-mooloolaba-map.py --source-dir /path/to/extracts --extended
```

The JSON records source extract SHA-256 hashes. Future OSM edits may change the
output. Node/npm are sufficient to build/play the checked-in game; Python and
Shapely are needed only to regenerate this database.

River relation 1380756 is joined with coastline-derived ocean geometry. The
connected river/ocean component defines playable water. Isolated ponds are
omitted. Shorelines are simplified to approximately 1.2 m, coordinates rounded
to 0.1 m. Projection is a local planar metre approximation about 153.124° E,
26.694° S, with east +X and south +Z. Horizontal distances are approximately 1:1;
this is not survey accuracy. Extent is approximately 4.3 × 5.7 km.

The database also contains mapped buildings, roads, piers, bridges, parks,
beaches and named channels. Missing building heights use original estimates.
Road and jetty widths are simplified. Terrain elevations are not surveyed, and
bridge clearance is deliberately enlarged for gameplay. Floating ramps, race
gates, moored decorative boats and planted palms are original game additions,
not claims about real navigation facilities. Never use the game as a chart.

The 192 × 192 wave-exposure field is derived from shoreline clearance and ocean
distance. CPU buoyancy and GPU water use the same bilinear interpolation. Narrow
canals are calmer, the river is intermediate and the ocean is choppier.

## Additional extract tags used in the ocean/detail update

The same hashed XML inputs now retain building kind, any mapped roof shape,
and height provenance (`mapped height`, `mapped levels`, or `estimate`). Road
name/class, 60 clipped residential areas and the `Rock Wall Mooloolaba`
breakwater alignment are retained. The original pass contained 422 building footprints, 828
road segments, 166 piers and nine road bridges. Current counts are below. No satellite imagery or Google
Earth geometry was used. Additional waterfront houses, facade/roof details,
rock dressing and moored boats remain artistic additions; the physical
headland heights are estimated.

The Wharf launch now uses clear water beside the mapped retail footprint rather
than the former island launch. `canal-playground.json` contains original game
spray-target and advisory-sign placements derived from named channel centrelines.
They are not a surveyed list of actual signs. Estimated entrance sandbanks are
separate authored constants in `src/ocean.js`; no bathymetry was present in the
retained extracts. Neither source is suitable for navigation.


## Upstream / western extension — 2026-10-16

The extended build additionally requires:

| Filename | OpenStreetMap API URL |
| --- | --- |
| mooloolaba-map-upstream | https://www.openstreetmap.org/api/0.6/map?bbox=153.099,-26.728,153.142,-26.710 |
| mooloolaba-map-west | https://www.openstreetmap.org/api/0.6/map?bbox=153.099,-26.711,153.108,-26.677 |

All six input SHA-256 hashes are included in the derived database. With these
inputs, `--extended` regenerates the shipped JSON byte-for-byte. Omitting the
flag builds the original smaller bounds. The new bounding box is 153.099–153.142°
E, 26.728–26.677° S. It adds upstream river bends, more Wyuna Canal, western
Mountain Creek and Hideaway Waters coverage. Channel guides are clipped to
water with a navigation margin; land and water remain geographic geometry.

Current counts: 759 mapped building footprints, 2,962 road/path segments,
168 piers, 37 bridge alignments, 26 channel line parts, 83 residential areas
and 45 mapped pools. Bridge ways can represent parallel lanes or sidewalks
of one structure. Footways/cycleways and available width, lane and real
bridge-name tags are retained. Explicit widths have `widthSource: mapped width`;
others are estimates. `gameDeckTop` is an authored gameplay elevation, including
shared road/sidewalk levels. It is not a measured clearance or structural survey.

Original façade/roof details and gap-filling houses remain artistic. Building
outlines do not establish present-day façades or parcel boundaries. No LiDAR,
Google imagery or Microsoft footprint geometry has been imported in this pass.
The latter source is pending access to its openly licensed download host.

Generate `public/estuary-map.svg` with `python scripts/build-estuary-map.py`.
The map and the geographic JSON remain ODbL-derived and retain attribution.

## Alexandra Headland / northern coast — 2026-10-19

The separate coastal update extends the northern bound from −1892.4 m to
−4564.1 m, approximately 2.67 km north, covering Mooloolaba Beach, Alexandra
Headland and the southern Maroochydore Beach reach. It adds 424 mapped building
footprints, 860 road/path sections, 19 parks, three beach polygons and 73 pools.
The main beach coastline joins the existing land/water geometry. New offshore
visit points and a clear cruising route are authored game aids, not real
navigation marks. Existing canals and bridges are retained.

Exact XML source, licence and reproducible incremental build instructions are
in `sources/README.md`. The extension was built separately from the spray
handling update. Relief around Alexandra's bluff is authored and approximate;
OSM provides plan geometry, not a complete survey of houses, heights or depths.
