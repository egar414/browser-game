# Generated coastal surfaces

Original image-generation assets created for Estuary Rats on 2026-10-19.
These are invented material/sky imagery, not photographs or surveyed imagery
of Mooloolaba. No Google Earth screenshots, stock photographs or hotlinks.

- `coastal-water.webp`: 1024², overhead teal coastal water with fine organic ripples.
- `coastal-sky.webp`: 1536×768 equirectangular blue maritime sky and cumulus, no terrain.
- `coastal-sand.webp`, `coastal-grass.webp`, `coastal-rock.webp`,
  `coastal-timber.webp`: 512² each, extracted from one generated 2×2 material atlas.

Generated with the image generation tool; generation instructions requested
photographic natural surfaces, no logos/text, neutral lighting and tileable
edges. The source atlas has sand/grass above rock/timber. Asset preparation
used ImageMagick to extract exact quarters, resize and encode WebP at quality
82 (sky/water) or 83 (terrain). Full generation originals were retained in the
workspace's `generated_images` directory. The shipped WebP files are editable.
Total compressed payload: approximately 703 KiB (716 KiB allocated on disk).

`surface-textures.js` shares one texture per kind, supplies a neutral fallback
on load failure and lets startup report honest readiness. Vite fingerprints
asset names for browser caching and base-path-safe deployment. Quality changes
reuse these textures. Mipmaps and modest anisotropy limit distant shimmer.
Approximate additional RGBA GPU storage including mipmaps: 17 MiB.

Sand/grass use world-space mapping and the existing procedural small normal
map; rock/timber use mesh UVs. Water uses two slow surface flows plus the
existing analytic waves/normals, hull contacts, foam, and live reflections.
The photo is visual detail, not a displacement map or measured PBR material.
Sky uses a single dome draw, is tinted for daylight/sunset, keeps the procedural
night sky, and is sampled by the water for cloud reflections on Low too.
The small environment-light capture refreshes once after loading.

Limitations: generated edges are not mathematically guaranteed seamless;
multiple scales and macro variation reduce repetition. This does not replace
nearby terrain/boats with flat pictures, alter mapped geometry or guarantee a
higher frame rate. The sky is an image backdrop, not volumetric weather.
