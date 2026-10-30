# Uploaded Seago body

The owner supplied `single_color_261030124659_AOMZ.stl` and requested that it be
used for Seago with a pointier end. The uploaded model is a touring jet ski;
the front/bow was interpreted as the end to sharpen. The actual source mesh
is used, including its stepped saddle, deck panels, mirrors and side details.
It is not a generic procedural replacement.

`tools/convert_seago_stl.py` converts the 500,000-triangle STL into a 20,000-
triangle indexed mesh. Original +X points forward; it becomes game +Z, with
STL +Z becoming game +Y. The front 30% is tapered smoothly, with up to 72%
less lateral width at the tip, and the final body is fitted to the existing
3.65 m / 1.32 m gameplay envelope. The saddle and keel are fitted vertically
to the rider and wet intake. The source SHA-256 is embedded in the JSON.

```sh
blender -b -t 4 --python tools/convert_seago_stl.py -- /path/to/source.stl
```

Positions are quantised to 0.1 mm; crease-aware normals are packed separately.
The self-contained JSON is 376,995 bytes before HTTP compression. Geometry is
decoded once and cloned before batching. Smooth vertex colours retain the
dark hull/grey saddle with the selected garage accent colour. No source
textures are required by this single-colour STL.

Original working handlebars, grips/levers, display, nozzle and reverse bucket
are added independently. Rider hands follow the lowered steering assembly.
The source body is shared by all accounts and the online model factory. No
permission grant, SQL migration or craft identifier change is needed.

The sharpened source underside is sampled for the shared ocean exclusion and
wave-contact profile. Existing Seago power, speed cap, steering parameters,
trim settings and spray tuning remain configured as before. Other jet skis
and the uploaded Tender retain their own separate models.

The studio model is 22,340 visible triangles and 11 draws with the rider hidden;
the complete craft is 29,964 triangles / 31 meshes before runtime visibility.
These are geometry costs, not claims about laptop frame rates. Validation
covers the narrow bow, authentic source identity, finite normals/colours,
account availability, grip IK, animation attachments and the full unit suite.
Browser checks cover studio angles, launching, acceleration, turns, trim plume,
reverse, first-person/rear cameras and online spray rendering.
