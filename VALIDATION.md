# Validation record

Mooloolah estuary, photo-referenced craft, easier steering and spray update,
15 October 2026.

Environment: Node.js 24.19.0, npm 11.9.0, Chromium 154 on Linux, AMD EPYC
virtual CPU (5 reported CPUs), SwiftShader software rendering. These are
correctness checks, not a hardware GPU/laptop benchmark or human driving review.

## Completed local checks

- **38 Node tests pass.** Coverage includes distinct acceleration, brake/reverse,
  powered/coasting steering, buoyancy, ramps and landed spins, wipeouts, recovery,
  score exploits, corrupt storage, pump energy/momentum, propeller power, inlet
  wetness, nine latched trim positions, reverse-bucket steering and finite pooled
  spray geometry. New geographic checks verify the real landmarks, metre extent,
  clear central passages at all nine mapped bridges, connected channel
  centrelines, piers/support collision and calmer canal wave exposure.
- Thundercat simulations hold the bow continuously for over 15 seconds at trim
  0°, 5° and 8°, keep water support, then settle and accelerate when Shift is
  released. A countersteering test checks retained loaded-side spray, a larger
  carve fan, and the later change of loaded side. Idle inputs still score zero.
- Powered steering now uses separate, lower effective yaw inertia and damping.
  A repeatable two-second turn after four seconds of acceleration has a roughly
  17 m jet-ski radius (previously ~52 m) and sub-40 m cat radius (previously ~149 m).
  These are approximate game scenario observations, not real craft specifications.
- **All seven Chromium browser flows pass** after the map, steering, models and
  land graphics changes: both craft drive/spray/brake/reverse/recover; graphics
  profiles/reflections work; wheelies, pause, camera, mute, guide, focus, resize,
  persistence, modes, trim and optional activities work. The final spray-history
  change is additionally checked in both driving flows and all graphics profiles.
- The new 15-gate island course completed and restarted with only keyboard
  controls in **70.35 simulated seconds** before the steering ease adjustment,
  without page errors. The final changed-steering/spray build also completed all gates and restarted
  in **70.05 simulated seconds**, without page errors. Its 800×500 Low software
  samples were approximately 2–7 FPS, with 7.0 FPS at the finish.
- Production build passes; procedural assets and geographic data are bundled.
  There are no runtime CDN, account, map tile or API-key dependencies.
- Both photo-based craft, water/reflections, waterfront houses and Thundercat bow
  ride were visually inspected. Turning-spray checks used keyboard driving and
  mouse camera orbit. The initial sheet was too narrow and mist too round;
  spread, finer droplets and softer mist were adjusted, and sheet geometry now
  retains past contact positions/velocities so it curves through the turn.
  The result remains stylised rather than a photoreal reproduction of the photo.
- Low 960×640 software-rendered turning checks measured ~6.4 FPS (ski) and
  ~4.8 FPS (cat), with ~92k / 152k triangles in the observed views. Spatial mesh
  batching and instanced tree tiles cull distant geometry. Universal 60 FPS is
  not established; hardware GPU performance remains untested.

## Geographic and realism limits

Actual OSM river/coastline/feature extracts were retrieved and inspected. See
[src/data/README.md](src/data/README.md) for URLs, hashes, projection, geometry
processing and ODbL attribution. Horizontal layout is approximately 1:1 metres.
Mapped shoreline and buildings coexist with original infill houses, planted
palms, estimated elevations/heights and enlarged bridge clearances. This is not
a surveyed environment or navigational chart. Isolated lakes are not playable.

BRP's 2026 Spark guide and Yamaha's trim article informed operating relationships;
[RESEARCH.md](RESEARCH.md) records links, equations and approximations. The two
user-supplied craft photos and later spray photo were inspected. No videos have
been supplied, so no video-motion analysis is claimed. No manufacturer imagery,
logos or measured factory performance curves are shipped.

Physics retains assisted bow riding, spring buoyancy, reduced-order planing,
sliding and aerial control. It does not solve full fluid dynamics, six-axis
rigid-body torques, vapor cavitation, droplet breakup or wake buoyancy. Keyboard
browser automation and visual inspection do not establish human handling feel
or real-world accuracy. Firefox, Safari, touch and hardware GPUs are untested.
Engine sounds are synthesized rather than recorded or verified against real craft.
The supplied SumbaSurf reference remains inaccessible; no parity is claimed.

## Deployment

The previous public release was application commit
`9e5965dd417aa52556068c90ffb12be86b880e0f`, Actions run `38685285349`, and was
verified over HTTPS with both craft. That historical record does not establish
validation of this update. The new deployment result is appended once published.

Application commit **6c675e555632915db301499cd580ca690340603d** published
successfully in [GitHub Actions run 38696693707](https://github.com/egar414/browser-game/actions/runs/38696693707).
https://egar414.github.io/browser-game/?v=6c675e5 returned HTTP 200 in Chromium,
and the new island-course identifier confirmed the revised build was served.
Both craft selected Freestyle, latched trim, accelerated, steered through loaded
spray turns and verified their distinct reverse steering. Hosted Low 960×640
samples were approximately 5.7 FPS on SwiftShader for both craft. The Thundercat
then held a bow ride continuously for **13 simulated seconds** through the normal
keys and trick-session clock, remained afloat without wipeout, and settled on
release. Final pitch during the hold was ~0.893 rad. No runtime errors or failed
requests occurred. Hosted spray and bow-ride screenshots were inspected. HTTPS
certificate validation remained enabled.

## Current work-in-progress preview (15 October 2026)

- 46 Node checks pass, including a minute-long powered Thundercat bow ride
  beyond 60 gameplay km/h, finite rear-plume geometry, natural swell launch and
  landed tricks for both craft, weather blending, garage unlock persistence,
  spray exposure and automatic recovery after swamping.
- Production build passes with the original Blender GLB bundled locally.
- The new jet-ski menu was opened and visually inspected in Chromium.
- Three mobile-emulation input flows passed earlier in development. The full
  updated ten-flow desktop/mobile suite is running at preview publication;
  its eventual result must be recorded separately. Previous release results
  above do not validate every addition in this preview.
- Physical phones, Safari and hardware-GPU performance are untested. Software
  rendering performance is not representative of a phone or laptop GPU.
- Extended play checks of battle AI, flooding balance and garage progression
  remain in progress. This preview is published at the player's request.
