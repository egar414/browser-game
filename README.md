# Estuary Rats

**Play:** https://egar414.github.io/browser-game/

A playable single-player 3D coastal boating playground. Free roam is the default:
pick a compact freestyle jet ski or a twin-pontoon racing inflatable and launch
into a Mooloolah River estuary based on actual OpenStreetMap shorelines. No account, API key, or external asset
service is required to play.

The graphics upgrade adds textured sand/grass, waterfront homes with verandas
and gardens, branching mangroves, headland relief, and a moving cloud sky, reflected scenery on Medium/High,
layered water ripples and sun highlights, shallow-water colour and shoreline
foam, photo-referenced blue/black jet-ski panels and white/navy inflatable tubes, sky-lit glossy hulls, and a wider chase view across the water. Spray now
comes from the chines and jet/propeller, with stronger outside-turn fans,
curving spray sheets that retain their recent positions, ballistic droplets,
soft mist, persistent V wakes, and expanding landing foam. Thundercat fans
spread mainly sideways from the pontoons; its propeller has a separate wash.
Powered steering is now quicker on both craft, with less excessive yaw damping
and separate effective inertias. The latest handling update adds water-dependent pump/propeller thrust, persistent nozzle trim, nine-position jet-ski trim, Cruise/Sport/Freestyle modes and contact-based spray with droplet drag. Map routes and activities remain available. See [RESEARCH.md](RESEARCH.md) for sources, equations and realism limits.

## Ocean and coastal detail update

The river mouth now blends into directional 7–10 second ocean swell, smaller
wind chop and changing wave sets. Whitecaps, reflected scenery and finer ripples
sit on the same displaced surface sampled by boat buoyancy. Hourly ocean
conditions change smoothly using an offline simulated forecast tied to the
clock, including across reloads. This is gameplay weather, not live observations.
Pause → Sea conditions offers lighter seas, chop, swell and hourly conditions.
An older save adopts hourly conditions once; later manual choices are preserved.

The land follows 422 OSM building footprints, 828 road segments, 60 mapped
residential areas and the mapped entrance rock wall. Roof shapes/heights use
available OSM tags; missing details are original estimates. Individual windows,
gutters, roof materials, doorways and garages replace plain blocks. There are
313 additional estimated waterfront homes within mapped residential areas, not
surveyed house replicas. Sloping shore edges, improved palms/clouds and 19
wave-following moored aluminium tinnies enrich the surroundings. The three tinny
styles are scenery; the jet ski and Thundercat remain the two drivable craft.

The supplied 22.8-second video informed denser, taller loaded-turn sheets,
broader Thundercat pontoon spray and finer falling droplets. Straight-line rear
wash stays lower; trim and turn loading raise the plume. This is a visual
approximation, not reconstructed or measured real fluid flow. The video is not
bundled. The jet-ski body is an original Blender asset; its source is editable.

On touch devices, rotate sideways for the preferred riding view. FULL requests
full screen and a landscape lock where the browser supports it. A rotate prompt
with a portrait fallback handles browsers that refuse a lock. Hold GO, steer
with the arrows, hold BRAKE to stop/reverse, tap LIFT for bow riding and BOW + / −
for trim. Auto quality starts Low. The optional home-screen manifest requests
landscape; installation is not required and offline play is not provided.

Optional spray battles, landed trick scoring, combo-earned garage designs/kits,
races and local save records remain available. B starts a two-minute spray
battle; R / RESET bails out. This uses gameplay water meters rather than actual
fluid flooding. No multiplayer or player accounts are needed.

Rebuild the original editable model with:

```sh
blender -b -t 2 -P art/build_sparkplug.py
```

`art/sparkplug.blend` and `src/assets/sparkplug.glb` are included. No Google Earth
imagery is shipped. Access to additional building data and the Google Earth
reference was blocked, so OSM geometry and original scenery remain the basis.
Photographic accuracy of every house and photorealism are not established.

## Run locally

Use Node.js 22.12+ (Node 24 is used in this cloud environment).

```sh
npm ci
npm run dev
```

The development server uses port 5173. For a production build:

```sh
npm run build
npm run preview
```

Preview uses port 4173. Upload the contents of `dist/` to a static HTTPS host.
Asset URLs are relative, including for subdirectory hosting.

## Controls

| Key | Action |
| --- | --- |
| W / Up | Progressive throttle |
| S / Down | Brake, then reverse |
| A, D / Left, Right | Steer; rotate while airborne |
| Shift | Shift weight aft for jet-ski/Thundercat bow rides; powered sliding turns |
| Q / E | Select jet-ski trim positions (tap/hold), outboard trim; aerial pitch |
| T | Cycle Cruise / Sport / Freestyle riding modes |
| C | Close or wide chase camera |
| Mouse drag | Orbit camera; automatically recentres |
| R | Recover in nearby clear water |
| F | Start or restart the checkpoint race |
| G | Start a 90-second trick session |
| B | Start/restart a two-minute spray battle |
| H | Controls and special move guide |
| M | Mute |
| Escape | Pause and settings |

**Thundercat bow ride:** W + Shift under power; trim up with Q, use E or
release Shift to settle the bow. Stern contact and high-bow drag let it hold the bow ride under power;
releasing Shift settles it back onto the plane.

**Bow rider:** select Freestyle with T, accelerate on the jet ski and hold Shift without steering. E
settles the bow; adding too much Q tips it. **Rooster tail:** carry speed into a
short setup turn, then carve the opposite way under power. Shift allows more
sideways slip; a fixed half-turn is not required. **Air and spins:** approach the gold floating ramps from
the north and travel south, away from the minimap’s N label (+Z). Use A/D in the air and Q/E to level out.
The taller eastern ramp gives the best 360 opportunity. There is no jump key.
Aerial points are banked only on a successful landing. Wipeouts break combos.
Repeated actions have diminishing rewards and cooldowns; idling scores nothing.

The map follows the real Mooloolah River, Minyama and Mooloolah Islands,
connected residential canals, Tuckers Creek, marina, Mooloolaba Spit and the
river mouth beside Point Cartwright. Its approximately 3.4 × 3.8 km horizontal
layout is in metres. Nine mapped road bridges have enlarged gameplay clearance.
Gold squares on the
minimap mark the ramps. Gates appear only during races. Vehicle choice, colour,
riding mode, trim for each craft, quality, audio, camera, best race time and best trick session are saved locally.
The mapped island course has a new record identifier, so times from the old
fictional course are cleared while other preferences remain. Storage failures fall back to playable defaults.

## Project structure and tuning

| File | Responsibility |
| --- | --- |
| `src/config.js` | Vehicle tuning, quality profiles and race route |
| `src/ocean.js` | Shared CPU/GPU swell equations, hourly forecast and sea tuning |
| `src/vehicles/physics.js` | Fixed-step movement, four-point buoyancy, planing, slides, air control, scoring events |
| `src/vehicles/propulsion.js` | Pump/propeller momentum, intake immersion, nozzle poses and reaction force |
| `src/vehicles/rider.js` | Articulated rider with fixed hand/foot contacts and posture response |
| `src/vehicles/models.js` | Blender shell loading, procedural fallback, moving parts, rider and outboard |
| `src/systems/water.js` | Adaptive water mesh, ripples, shallow colour, sun highlights and planar reflections |
| `src/systems/atmosphere.js` | Sky/cloud lighting, shared sun direction and filtered material reflections |
| `src/systems/spray.js` | Pooled droplets, turn fans, jet stream, foam wake ribbons and landing rings |
| `src/systems/spray-model.js` | Hull waterline contacts, physical discharge and aerodynamic droplet drag |
| `src/systems/environment.js` | Shoreline and solid-object collision queries |
| `src/systems/geography.js` | Geographic database queries and named areas |
| `src/systems/terrain-materials.js` | Tileable original ground colour/normal textures |
| `src/systems/scenery.js` | Mapped land, shoreline slopes, roads, vegetation, piers and rock wall |
| `src/systems/architecture.js` | Footprint-aligned roofs, facade atlas and house detail |
| `src/systems/moored-boats.js` | Three original instanced aluminium tinny styles and water following |
| `src/data/mooloolaba.json` | ODbL shoreline/features and shared wave-exposure field; [source/rebuild guide](src/data/README.md) |
| `src/systems/input.js` | Keyboard, touch input, orbit drag, blur/visibility cleanup |
| `src/systems/touch-controls.js` | Multi-touch driving buttons and lift toggle |
| `src/systems/jet-plume.js` | Historical, pooled central spray volume |
| `src/systems/spray-battle.js` | Optional AI rivals and spray-flood game rules |
| `src/systems/progression.js` | Garage designs, handling kits and XP thresholds |
| `src/systems/camera.js` | Chase camera, smoothing, views and shoreline avoidance |
| `src/systems/audio.js` | Interaction-started procedural engine, water and impact audio |
| `src/systems/activities.js` | Race gates, trick timer, combos and records |
| `src/systems/ui.js` | Menus, controls, HUD, minimap and settings |
| `src/main.js` | Initialization, fixed-step accumulator and interpolated render loop |

Both craft share the simulation architecture but have separate propulsion,
steering, inertia, lateral grip, spring/damping, trim, air authority and models.
The displayed speeds and “50” engine specification are approximate arcade
values, not verified manufacturer performance. The game uses no copied logos.

## Tests

```sh
npm test
npm run test:browser
```

Browser tests use the installed `/usr/bin/chromium`. Override `CHROMIUM_PATH`
for another Chromium executable. The supplied headless flags permit SwiftShader
in environments with no GPU. Browser checks drive both craft using actual
keyboard input, check spray and reverse, exercise menus and persistence, and
start/restart activities. Physics tests cover ramps and spins through landing,
buoyancy, steering differences, collisions, route clearance, wipeouts, recovery,
world limits and score exploits. Read-only runtime diagnostics are available at
`window.__ESTUARY__.status`; the shipped application exposes no teleport or score
mutation interface.

Low retains the water shading and spray systems at reduced render resolution
without the extra reflection pass. Medium uses 256-pixel reflections; High uses
512-pixel reflections and shadows. `QUALITY` in `src/config.js` controls render
resolution, water density, particle/wake budgets, fan density and reflections.
`RIDE_MODES` and `PROPULSION` in `src/config.js` control modes, trim and pump/propeller tuning. `HYDRODYNAMICS` controls planing and angular response.
`OCEAN_TUNING`, `OCEAN_SWELL` and `SEA_STATES` in `src/ocean.js` control wave periods, height, groups, one-hour forecast interval and twelve-second manual transitions. The shared `WAVE_GLSL` is generated from the same coefficients used by CPU buoyancy. `JET_PLUME` in `src/systems/spray-model.js` controls central spray height, spread and lifetime. The central plume is visually amplified, not a measured factory discharge.
`SPRAY_TUNING` in `src/systems/spray-model.js` controls wake lifetime/spread. The water shader's colours and optical detail are in
`src/systems/water.js`. These visual parameters do not alter boat physics.

To run the complete keyboard-controlled race acceptance drive against a frozen
production build (avoids development hot reload interrupting the test):

```sh
npm run build
npm run preview
# In another terminal:
node tests/race-drive.mjs
```

## Hosting

`.github/workflows/pages.yml` builds, runs physics checks and deploys `dist/`
through GitHub Pages on pushes to `main`. Before the first deployment, set the
repository's **Settings → Pages → Source** to **GitHub Actions**. Publishing a
Pages site generally makes the playable game publicly accessible. Deployment
was explicitly approved by the repository owner in this onboarding task.
The public site is now deployed and verified in Chromium.

The required network destinations are `api.github.com` and
`egar414.github.io`. They are allowed in the prepared cloud configuration.
Pages is configured to use GitHub Actions. Future application changes pushed to
`main` run the installation, physics checks, build and deployment workflow.
The published site was opened over verified HTTPS in Chromium, and both
vehicles were launched, accelerated, steered and checked for spray with no
runtime errors or failed requests.

## First-release limits

- Original procedural/Blender models and approximate facades rather than photogrammetry or measured replicas of each house.
- Keyboard and touch controls; multiplayer is not included. Physical mobile browsers remain untested.
- Reduced-order buoyancy/planing and land collisions; optional spray battles use approximate exposure volumes, not fluid dynamics or real hull damage.
- Actual OSM horizontal shoreline/feature layout with simplified widths, original facade details, estimated heights and enlarged bridge clearance; not a navigation map.
- Physical coefficients and trim angles remain original tuning; see manufacturer research and limits in RESEARCH.md.
- Visible foam wakes persist, but their trails do not add separate buoyancy forces.
- Camera avoids shores and major low objects; it has no general mesh raycast solver.
- Procedural audio; no recorded real engine samples or external music.
- SumbaSurf's supplied reference URL is https://wavedash.com/games/sumbasurf.
  Access is currently blocked by the cloud network policy; `wavedash.com` has
  been added to the environment draft for review. No visual-parity claim is made.
- Software rendering in the cloud is useful for correctness checks and does not
  establish performance or subjective handling quality on an ordinary laptop.

See `ATTRIBUTION.md` for asset origins and `VALIDATION.md` for measured checks.

After deployment, `node tests/hosted-smoke.mjs` opens the public HTTPS site,
checks both craft, mode switching, persistent trim and powered spray turns.
`ESTUARY_URL` can target another deployment; HTTPS certificate validation stays on.

For development-only world inspection, run the dev server and open
`/tools/scenery-preview.html?view=mouth` (`homes` / `marina` also available).
This separate scene viewer is not a gameplay test or part of the production build.

`node tests/hosted-phone.mjs` checks the public preview with Chromium touch
emulation, full-screen request, driving, craft selection and rotation fallback.
This does not establish Android/iOS hardware compatibility.

### Wharf / spray / sandbar update

Launch beside The Wharf Mooloolaba. Carve past orange canal bullseyes to soak
them for garage XP. They recharge after 25 seconds once you leave the area.
White canal signs advise 6 knots / no wash (~11 gameplay km/h).

Get air from a wave or ramp, then **hold Z: Hangman, X: No-hander, V: Superman**.
Release to tuck in before landing. Hold for at least 0.35 seconds; a clean
landing banks the pose once per jump. On phones use HANG / NO HANDS / SUPER.
There is no jump button. Mobile still prefers landscape and supports portrait.

The rear plume now separates into soft water packets which fall back into the
water and leave foam. The estimated Point Cartwright entrance shoals steepen
waves locally and show shallow colour/crest foam. Their depths and locations
are approximate, not a surveyed reconstruction or navigational information.

Tune rear packets in `src/systems/jet-plume.js` and `JET_PLUME` in
`src/systems/spray-model.js`; shoals and swell in `src/ocean.js`; pose awards in
`src/vehicles/air-tricks.js`; target/sign sites in `src/data/canal-playground.json`.
`node scripts/place-canal-targets.mjs` rebuilds the authored site selection from
the retained map geometry. Existing vehicle handling tuning remains in
`src/config.js`. See `RESEARCH.md` for geographic and physics limitations.

The latest spray refinement adds a substantially denser white rear core, grain,
velocity-aligned water streaks and heavier falling breakup based on the supplied
references. Low quality keeps the thick core. The pool retains water through its
full falling arc; pump force and vehicle handling are unchanged.


### Thundercat spray and rider weight

The pontoon fans are broader and denser. Powered bow riding carries side spray
farther and extends the jet-ski rear plume; falling side water is retained
independently of frame rate. Riders shift aft and across the hull while
keeping their hands on the controls. Use W + Shift, Q/E trim and A/D to carve;
the existing mobile throttle, LIFT, BOW +/− and steering controls do the same.
Tune `SIDE_SPRAY` / `JET_PLUME` in `src/systems/spray-model.js` and `RIDER_WEIGHT`
in `src/vehicles/rider.js`. These visual changes preserve vehicle handling.


### Finding the bar and smoother rear spray

Press **N** or tap **BAR WAVES** to mark the route from The Wharf through the
river entrance and around the headland. Follow the arrow and orange minimap
route to the three labelled buoys, or use **Pause → VISIT BAR WAVES** for a direct trip. **MAP ↗** opens the [larger route map](public/bar-route.svg).
Calm conditions switch smoothly to Rolling swell; hourly weather is retained.
The bar is an original estimated game shoal on the Point Cartwright side.
Its shorter, steeper inshore sets use the same CPU/GPU wave functions. It is not surveyed
bathymetry, and the map is not a navigation chart.

Rear spray now carries water farther aft, avoids oversized overlapping mist
sprites and uses quality-dependent emission density. The side fan's live edge
follows its current contact every frame while its older water retains its
falling history. Adjust `QUALITY.*.plumeDensity` in `src/config.js`, or the
`JET_PLUME` exit speed and size limits in `src/systems/spray-model.js`.
`tools/spray-benchmark.html` measures a repeatable isolated plume workload;
it is a development scene, not a claim about gameplay frame rates. Rebuild
the route map with `python3 scripts/build-bar-guide-map.py` after changing
`BAR_ROUTE` in `src/systems/bar-guide.js`.
