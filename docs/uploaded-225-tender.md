# Uploaded 225 Tender hull

The project owner supplied `single_color_261030100313_WUGV.stl` on 30 October
2026 and requested that it replace/rebuild the 225 Tender. This is the actual
uploaded geometry, not a new approximation built from its screenshot.

The STL has 500,000 triangles and no motor, textures or colour data. Offline
decimation preserves the shell, two benches, floor ridges, ribs, bow deck,
gunwales and handles at 20,000 triangles for player/online craft and 5,500 for
instanced moorings. The existing independently animated 25 hp outboard is
retained. All accounts use the same new Tender; other boat types retain their
own models. Palette choices remain available through the brushed alloy finish.

The source is converted from Z-up into the game's Y-up/+Z-forward axes. Length
is fitted to the existing 2.25 m craft and width to its 1.22 m envelope. Vertical
fitting places bench tops at roughly 0.31 m, the existing crew-seat height, and
the lower hull near the existing keel. This is a gameplay fit, not a claim that
the STL's unspecified original scale describes a real 2.25 m production boat.
Normals preserve creases; geometry is quantised to 0.05 mm and indexed. The
packed, self-contained mesh data is 437,007 bytes before HTTP compression.

`tools/convert_tender_stl.py` reproduces the asset with Blender 4.3:

```sh
blender -b -t 4 --python tools/convert_tender_stl.py -- /path/to/source.stl
```

The generated JSON records its source SHA-256. `uploaded-tender.js` caches the
decoded source and clones geometry for each assembly, so batching/disposal does
not consume a subsequent boat's mesh. Benches, interior structure, bow deck and
shell retain separate groups. The source-derived underside profile is shared
by the ocean exclusion mask and wave/spray contacts. An extra stern sample
captures the uploaded hull's steep transom-to-keel transition.

Existing propulsion, throttle-balance difficulty, trim, spray tuning, passenger
seating, steering and camera controls are retained. A studio render measures
26,760 visible triangles and 12 draws with riders hidden; the complete craft
with both crew is 42,204 triangles. Moored hulls retain the existing instancing
path. These costs are not a laptop FPS measurement.

Validation covers source identity for regular/Creator accounts, geometry and LOD
budgets, motor/crew attachments, fleet movement and flooding, actual wet hull
contacts, trim balance and loops. Browser review includes multiple studio
angles, wharf/cruising/shafting/turning/reverse/first-person views and swell.
