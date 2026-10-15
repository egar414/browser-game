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

## Hourly swell, video-referenced spray and coastal detail update

15 October 2026, same Linux/Chromium 154 SwiftShader environment. The supplied
22.8-second video was sampled across its different shots and visually inspected.
It informed the spray; no calibrated real-world measurements are claimed.

- **51 Node checks pass.** Added deterministic hourly-boundary continuity,
  deep-water dispersion, sheltering, long-run finite waves, rotated house
  footprint frames, source provenance, and one-time saved-weather migration.
  Both craft still hop natural swell and bank a landed trick, and the
  Thundercat retains its tested minute-long powered bow ride beyond 60 game km/h.
- A real WebGL 2 floating-point render/readback check compares the shared GPU
  wave function with CPU heights offshore, at the mouth, at the ramps and in
  sheltered water. Maximum sampled difference was **0.0000101 m**. This is a
  numerical consistency check, not physical accuracy or full mesh-fit validation.
- The production build passes. Assets, textures, geometry and simulated weather
  are local; no imagery/forecast service, account or API key is needed to play.
- World views of the entrance/headland, ocean at riding height, close waterfront
  house, marina and aluminium tinny were opened in Chromium. Initial inspection
  found exposed headland edges and overly expensive window geometry; terrain
  skirts were closed, and an original window atlas plus colour batching reduced
  geometry/draw calls. Alpha-masked leaf cards subsequently replaced solid
  polygon canopy balls. The result remains stylised, not photorealistic.
- The mapped data remains 422 building footprints, 828 road segments, 60
  residential areas and the entrance breakwater. 313 additional homes have
  estimated positions within residential areas. 19 original moored tinnies use
  three styles and sampled water height/pitch/roll. Mooring placements use a
  separate deterministic seed so visual quality does not alter their collision
  layout. Major collision/bridge/route checks still pass.
- The first extended browser run passed nine of eleven flows. Thundercat reverse
  reached -0.879 m/s before a 35-second wall-time limit, and its trim reached
  4.2° before a five-second limit. These checks are rerun separately with the
  same motion/trim assertions and more software-rendering time. The combined
  settings/reload/focus flow passed after closing the old rendered tab.
- Physical phones, mobile Safari, hardware GPU frame rates and subjective human
  handling feel remain unverified. Phone checks are Chromium touch emulation.
  A real-time one-hour unattended session has not been run; deterministic tests
  cross 72 hourly boundaries and the runtime uses the clock.

Final browser/race/deployment results follow below when complete.

The four targeted reruns **all passed** on the final application build, including
the two unchanged Thundercat assertions with longer software-rendering budgets,
portrait rotate/fallback and landscape touch controls, and sea/garage/battle
menus. The new optional-mode flow checks two AI rivals, pause freezing the battle
clock, recovery, switching back to race/free roam, and saving sea/design/tuning.
No error was fixed by reducing motion/trim thresholds. The initial combined
run plus targeted reruns cover all twelve browser flows (seven desktop, three
phone, one shared GPU/CPU, one coastal menus), with no unresolved assertion
failure. A single uninterrupted twelve-test run has not been claimed.

An additional continuous-passage test confirms a three-metre-clear route from
the launch river, around the mapped entrance wall, to exposed ocean, while the
wall itself blocks hulls. The new scenery still uses estimated elevations.

The full keyboard-only island race completed all 15 gates in **70.03 simulated
seconds**, then restarted successfully, with no page errors. Low 800×500
SwiftShader finished at **3.3 FPS**. A first attempt was interrupted partway
through after its wall-time budget proved too short; the completed rerun used
a seven-minute budget with identical gameplay controls and completion criteria.
These software frame rates do not establish hardware GPU performance.

Final Low/Medium/High rendering and reflection switching passed again after
alpha-masked canopy cards and the wider High-quality shadow region were added.
The final High screenshot was visually inspected; no shader/runtime errors were
reported. Prior GPU wave/race checks use unchanged wave/handling coefficients.
