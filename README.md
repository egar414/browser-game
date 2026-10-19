# Estuary Rats

**Play:** https://egar414.github.io/browser-game/

A playable single-player 3D coastal boating playground. Free roam is the default:
pick a compact freestyle jet ski, twin-pontoon racing inflatable, or 2.25 m alloy tender and launch
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

## Search visibility

The game page includes a descriptive title, canonical URL, social previews and
VideoGame structured data. A readable no-JavaScript introduction and the linked
[About Estuary Rats](https://egar414.github.io/browser-game/about.html) page explain
what the game is and how to play. The About page and structured data also include
“Eastary Rats” as an alternate spelling. The sitemap lists the game and About page:
<https://egar414.github.io/browser-game/sitemap.xml>.

These changes help discovery but do not confirm search-engine indexing or a
ranking. To request a Google crawl, the owner can add the URL-prefix property
`https://egar414.github.io/browser-game/` in Google Search Console, verify ownership
using its supplied HTML tag/file, submit the sitemap, and use URL Inspection →
Request indexing. No verification token has been invented or installed. Supply
Google's public verification tag/file before adding it to the project. A sitemap
at a GitHub Pages project path is submitted through Search Console; a robots.txt
inside that subdirectory does not control the origin's root crawler policy.

Update canonical URLs, social-image URLs, JSON-LD and the sitemap together if the
public address changes. Do not add fake ratings, keyword lists or indexing pings.

## Thundercat support in larger waves

The Thundercat now damps motion relative to its supporting water and has bounded
reserve buoyancy as immersion increases. This reduces the complete tube-crown
submergence seen when a fast-rising bar crest overtook the hull. It changes the
physics response rather than lifting only the rendered model. Four bow/stern,
port/starboard water samples, bow rides and powered turns remain in use.
Tune `waterFollow`, `reserveBuoyancy`, `reserveDepth` and `maxReserve` in
`HYDRODYNAMICS.cat` in `src/config.js`. These are arcade simulation values.

## Sculpted coastal art direction

The current look uses original, Fortnite-inspired coastal styling: bright painted
houses, softened corners, bold green tree crowns, warm sand, blue skies and
clean teal water. It uses no Fortnite assets, models or textures. Map geometry,
vehicle controls and activities retain their existing behavior.

Trees use solid overlapping crowns with painted vertex colours. Their silhouettes
remain readable when viewed from the water and participate in the existing sun
shadows. Each source canopy is 160 triangles and reuses the existing instanced
foliage tiles. Terrain micro-grain is reduced so large shapes and colours read
more cleanly. Low/Medium/High and the laptop Auto fallback remain available.

Tune the palette in `src/systems/art-direction.js`, tree forms in `foliage.js`,
and lighting/shadows in `scenery-lighting.js` and `main.js`.

## Laptop lighting and scenery pass

Warm sunlight and cooler ambient light give hulls and shore buildings more depth.
Grass and sand have world-space colour variation and fine detail; facades darken
near their bases. A single instanced soft-shade layer anchors 3,600+ houses and
trees without requiring cast shadows on Low. This is authored contact shading.

**Auto** starts desktop browsers at Medium and touch devices at Low, then retains
the existing frame-rate fallback. CPU core count is no longer used to assume a
powerful GPU. Medium adds a focused 1,024 px sun-shadow map; High uses 2,048 px.
Planar reflections use 384 px / up to 20 captures per second on Medium and 768 px /
up to 30 on High. The main camera and simulation still update independently.
Low keeps reflection rendering and cast shadows off. Manually choose a quality
level in Pause → Visual quality. Actual frame rates depend on the device.

Tune rendering budgets in `QUALITY` in `src/config.js`, procedural ground/contact
shade in `src/systems/scenery-lighting.js`, and sun/ambient light in `src/main.js`.
Coastal surface images are bundled with the game and cached after loading;
no external art host, API key, third-party plugin or account is needed.

## Free-roam local boaters

Ten AI drivers cruise the Wharf, Kawana canals and upstream water in original
tinnies and Thundercats. They follow mapped routes, keep passing lanes in canals,
yield to nearby boats and leave small wakes. They are ambient traffic: no battle
clock, rivals or spray score. Normal powered turns can throw falling spray into
their open boats; drivers duck, and a swamped craft relaunches after 16 seconds.
Capture volumes and flooding are scaled for play, not real marine safety physics.

Use **Pause → Find local boaters** to join the nearest cruiser, then accelerate,
pull alongside and carve with **W + Shift + A/D**. On phones use **GO**, **LIFT**
and a steering arrow. Pause → Local boaters offers quiet water and saves that
choice locally. Race and Spray Battle temporarily hide traffic, then free roam
restores it. Low quality draws at most five nearby small boats, Medium eight, High ten; large cruisers have a separate 950 m draw limit, capped at two on Low and four on Medium/High.
Tune routes/controller budgets in `src/systems/local-traffic.js` and
`LOCAL_TRAFFIC` in `src/config.js`; visuals live in `local-boaters.js`.

## Ocean and coastal detail update

The river mouth now blends into directional 7–10 second ocean swell, smaller
wind chop and changing wave sets. Whitecaps, reflected scenery and finer ripples
sit on the same displaced surface sampled by boat buoyancy. Hourly ocean
conditions change smoothly using an offline simulated forecast tied to the
clock, including across reloads. This is gameplay weather, not live observations.
Pause → Sea conditions offers lighter seas, chop, swell and hourly conditions.
An older save adopts hourly conditions once; later manual choices are preserved.

The land follows 759 OSM building footprints, 2,962 road/path segments, 83 mapped
residential areas and the mapped entrance rock wall. Roof shapes/heights use
available OSM tags; missing details are original estimates. Individual windows,
gutters, roof materials, doorways and garages replace plain blocks. There are
311 additional estimated waterfront homes within mapped residential areas, not
surveyed house replicas. Sloping shore edges, improved palms/clouds and
wave-following moored aluminium tenders enrich the surroundings. The playable
Tender Rat 225 adds a third craft, with an original 25 hp outboard. Residential
pontoons and flooding tenders are described below.

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
| C | Wide chase / close chase / first-person camera |
| U (hold) | Look behind; release to restore the selected view |
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
river mouth beside Point Cartwright. Its approximately 4.3 × 5.7 km horizontal
layout is in metres. 37 mapped bridge alignments include road spans and pedestrian ways; their clearances are gameplay estimates.
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
water and leave foam. The estimated entrance shoals steepen
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
river entrance and left into the larger offshore bar zone. Follow the arrow and orange minimap
route to the three labelled buoys, or use **Pause → VISIT BAR WAVES** for a direct trip. **MAP ↗** opens the [larger route map](public/bar-route.svg).
Calm conditions switch smoothly to Rolling swell; hourly weather is retained.
The bar is an original estimated game shoal to the left as you head out through the entrance.
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


### Bigger left-hand bar, curved kicker and boat swaps

The bar is on the **left heading out of the entrance**. N / BAR WAVES, the
three buoys and the full route map all follow the new location. Pause →
VISIT BAR WAVES lines you up with a wide gold curved kicker. Its gradual
entry and rising takeoff face float with the same water used by physics.
Both craft can use it; hold throttle, then level the hull for landing.
The larger bar has taller, sharper wave faces, with the canals kept sheltered.
These remain original game features, not a surveyed real-world sandbar/ramp.

Changing watercraft now returns you to your current water location and heading,
with motion cleared. If the larger hull cannot fit, recovery selects nearby
clear water. First launch after loading the page still starts at The Wharf.
Tune the bank in `ENTRANCE_SHOALS` / `BAR_BREAKERS` in `src/ocean.js`, the
kicker in `BAR_RAMP` in `src/vehicles/ramps.js`, and route/buoys in
`src/systems/bar-guide.js`. Rebuild the SVG map with the supplied Python script.


### Tender Rat 225 and house pontoons

The third garage tab selects a **2.25 m aluminium tender with a 25 hp outboard**,
based on the supplied photograph. The original open V-hull has rolled gunwales,
ribs/rivets, black-topped bench seats, a red fuel tank and hose, a small outboard
with a 25 marking, lower unit and animated propeller. Its driver sits on the rear
bench, follows acceleration/steering and keeps a hand on the turning tiller.
Colours and unlocked designs work on the new hull. No photographed brand logos
or third-party model files are copied.

**WASD** drives; **W + Shift + A/D** throws a powered sliding chine spray;
**W + Shift** shifts weight aft for a bow ride. **Q/E** trims the outboard,
**S** brakes then shifts into reverse, and **R** recovers. The existing phone
GO/arrows/LIFT/BOW controls do the same. Tender choice and trim save locally.
Handling, top speed and the engine label are game specifications, not measured
real-world performance or a real tender's capacity rating.

Short house pontoons now serve eligible mapped and estimated waterfront homes:
317 additional pontoon sites and 335 moored tenders in the current map. Locations
are authored and checked against land, mapped piers, bridge corridors and central
water routes. Inland homes and sites that cannot fit safely receive no pontoon.
Moored tenders use instanced meshes with a limited draw distance on Low quality;
distant boats keep their flooding state without drawing every hull.
Pontoons, gangways and visible boats collide; fully submerged boats stop blocking
the water until they reset. These are game moorings, not actual property records.

Use **Pause → VISIT HOUSE PONTOONS** to try a canal run. Falling side spray from
all three craft, and the jet ski's rear plume, can enter an open tender. The boat
shows water inside, settles lower, rolls and sinks when full; it resets after
16 seconds of active simulation. The nearby HUD shows water aboard and reset
time. Flooding remains when changing craft, pauses with gameplay and is
independent of graphics quality. It is session-local and clears on page reload.

Physics emits a bounded pool of water packets using the same chine/plume sources
as the visible spray. Only descending packets crossing an open gunwale add water;
nearby driving, idle and dry/airborne craft cannot flood boats by proximity.
Water volumes and reset timing are gameplay tuning, not a fluid simulation.
Tune `VEHICLES.tinny`, `PROPULSION.tinny` and `HYDRODYNAMICS.tinny` in
`src/config.js`; edit the hull in `src/vehicles/tender.js`, sites in
`src/systems/residential-moorings.js`, and flooding in
`MOORING_FLOOD` in `src/systems/mooring-flood.js`.


### More playful tender handling

The tinny lifts its bow sooner with **W + Shift** (GO + LIFT on phones).
Add A/D to kick the stern into a tighter powered slide. Let go of Shift and
ease the steering to regain grip. Its smaller side fans now pulse with a
bounded chine catch/release bounce: the hull bobs and rocks while the loaded
turn keeps water contact. Coasting, idle and airborne craft cannot generate
this powered bounce, and there is still no jump key.

Tune the response in `TINNY_HANDLING` in `src/config.js` and the fan size in
`TINNY_SPRAY` in `src/systems/spray-model.js`. These are arcade reactions to
turn loading, not a validated hydrodynamic porpoising model.


Moored tenders now collect roughly twice as much water from successful hits
and drain half as quickly between passes. The smaller fan still needs to land
inside the open hull. Flooding keeps its existing sink animation, reset delay
and scoring cooldown; it does not come from proximity or idle boats.

### Video-reference outboard handling

The tender and Thundercat now raise their bows earlier and keep more bow
height while steering under power. A short acceleration response and loaded
chine/pontoon catch-and-drop motion feed the existing physics springs. The
Thundercat rocks more slowly and has less yaw/pitch authority than the tender;
its bow balances a little lower as speed builds while remaining raised.
Release Shift/LIFT to settle and regain normal grip. No extra key is needed.

Tune `TINNY_HANDLING` / `CAT_HANDLING`, `VEHICLES` and `PROPULSION` in
`src/config.js`; the shared outboard response is in
`src/vehicles/tender-handling.js`. These are visual-reference arcade values,
not measured craft performance. Successful falling-spray hits now carry 3.75×
the preceding release's gameplay water volume, with slower drainage again.
The smaller tender fan and actual open-hull hit requirement remain in place.

### Extended canals and mapped bridge pass

The geographic area now spans roughly **4.3 × 5.7 km**, extending west into
Mountain Creek / Hideaway Waters and south through the Wyuna Canal / upstream
river bends. **Pause → VISIT UPSTREAM CANALS** launches in clear Wyuna water;
**ESTUARY MAP** opens the full-area map. The Wharf remains the default spawn.

The checked-in source has 759 mapped building footprints, 45 mapped pools,
2,962 road/path segments and 37 mapped bridge alignments (including parallel
carriageways and pedestrian ways, not 37 distinct bridge structures). Bridge
names and widths are retained where mapped; otherwise widths use tagged lanes
or explicit estimates. Sidewalks beside road bridges share their deck level.
Bank supports, underside beams, rails and connected mapped-road approaches
replace the old uniform slabs. Rendered supports and deck collisions share a
layout, leaving surface-water passages clear.

This is a first accuracy pass. Existing artistic houses still fill gaps in OSM
coverage; façades, roof details, terrain heights, bridge structure details and
vertical clearances remain estimates. The supplemental Microsoft footprint
source was identified but its download domain is not yet allowed by this
cloud environment; none of that data is claimed as imported. No aerial
imagery is bundled. See `src/data/README.md` for provenance and regeneration.

Tune bridge profiles in `src/systems/bridge-layout.js`; source widths and
pairing are built by `scripts/build-mooloolaba-map.py --extended`. Generate the
whole-area guide with `python scripts/build-estuary-map.py`.

### Offshore fishing and sportfishing traffic

Free roam now has ten small local boats plus four original large sportfishing cruisers. The tall cruisers patrol the main river, offshore and the wider Kawana canal. Height checks stop them entering bridge spans without enough clearance; the canal patrol turns back before an obstructing low span. Vertical bridge clearances are gameplay estimates. Pause → **GO FISHING · OFFSHORE** visits the turquoise-flag fishing grounds beyond the bar; the same grounds can be reached by driving east past the entrance.

Slow below 5 km/h, press **K** to cast, then **K** on **BITE** to hook. Hold **Space** to reel; release to cool line tension, especially during a fish's run. A full tension meter breaks the line. Driving away retrieves the tackle. On phones, **FISH** casts/hooks and **REEL** is held. Catches are released; catch count and the heaviest fish save locally. Mackerel, tuna, mahi-mahi and rare small marlin use approximate game weights.

Tune grounds, species and reel balance in `src/systems/fishing.js`; large-boat patrol routes and speed in `sportfishing-traffic.js`; original cruiser geometry, fish schools, wakes and tackle in `offshore-view.js`. Local boat density is capped by `LOCAL_TRAFFIC.visible` in `src/config.js`. Traffic can be switched off with **LOCAL BOATERS → Quiet water** without disabling fishing. The Reef Runner is also selectable as BIG BOAT; the other cruisers remain ambient AI.

Choose **BIG BOAT** to drive the Reef Runner 38. It has slower acceleration, momentum, broad turns, reverse, multi-point wave following and tower clearance checks. **J** (or phone **DECK**) switches between the helm and walking around the rear fishing cockpit when speed is below 5 km/h. **WASD** walks inside the cockpit rails; on phones use arrows sideways and GO/BRAKE forward/back. The boat settles to a stop while you are on deck. Cast from the deck with K / FISH and return to the helm with J. Big boats use free roam and fishing; racing, trick sessions and spray battle use one of the smaller craft. Original smooth beachwear characters use procedural matching shirt and boardshort fabrics; no Fortnite assets are used.

Tune the player sportfisher's acceleration, braking, speed, steering and walking speed in `CRUISER_HANDLING` in `src/vehicles/cruiser.js`; wardrobe fabrics and the deck avatar live in `src/vehicles/wardrobe.js`. All new boats, fish and fabric textures are generated locally from original geometry, without downloaded art, accounts or API keys. Browser checks use Linux Chromium with software WebGL at 960 × 640 desktop and 844 × 390 phone emulation; these checks do not establish real laptop/mobile frame rates or replace testing on a physical phone.

## Seago, daylight and waterfront update

Select **SEAGO** for an original longer black performance PWC inspired by the supplied silhouette, with separate mass/handling and a **120 km/h gameplay ceiling**. It retains a waterjet, nine Q/E trim positions, brake/reverse bucket and Shift weight shift; settle trim to reach full speed. The existing Sparkplug remains available. The large sportfisher now has a tall braced tuna tower, ladder, radar, long outriggers and teak-style cockpit/transom based on the supplied reference. Its 10.8 m game air draft is included in bridge clearance checks for player and AI craft.

**C / VIEW** cycles wide chase, close chase and **first person**, including the big boat's helm and walking/fishing cockpit. Drag to look around; the camera follows the rider's actual eye position with the camera 42 cm ahead of the eye, the own face/torso/legs hidden and hands retained. On deck, J / DECK still returns to the helm.

**Pause → TIME OF DAY** selects sunrise, daylight, sunset, night or a 24-minute passing-day cycle. Passing time pauses with gameplay. Presets and camera choice save locally. Dawn/dusk give shorter bite waits and a better chance of a small marlin; night bites are slower. These are game rules, not forecasts. Sky, sun direction/colour, ambient lighting, fog and water respond to the clock. A small pod of original bottlenose dolphins surfaces and leaps beyond the bar near the fishing grounds; they cannot be hooked.

**Pause → VISIT WATERFRONT WALKERS** joins people walking on mapped solid jetties. Carve alongside and aim a side fan toward them. Actual swept spray droplets must intersect a person's approximate body volume; proximity alone does nothing. They take a harmless tumble, recover and continue walking. There are no points or injury mechanics. Six nearby walkers draw on Low, ten on Medium and sixteen on High, using four instanced material batches.

Tune daylight and bite periods in `src/systems/day-cycle.js`, Seago's drive/hull values in `src/config.js`, the sportfisher geometry in `src/systems/offshore-view.js`, dolphins in `src/systems/dolphins.js`, and walkers/capture in `pedestrians.js`, `pedestrian-view.js` and `spray-capture.js`. New geometry and textures are original/procedural, with no added API keys or external art downloads. The small environment-lighting capture stays fixed to keep laptop costs low; direct lighting, sky and water change with time.


### Tinny shaft balance and finding wildlife

Hold W + Shift / phone GO + LIFT once moving. The lower 50–60° stance is
bounded during ordinary held throttle. Deliberately holding Q / TRIM UP
with full throttle and LIFT can now overbalance into a backward loop and wipeout;
release trim-up early to save it. Release LIFT to
settle; steering transitions to a lower spray slide. Two crew ride the tender:
the passenger moves forward during takeoff and aft when planing. Dry-hull bow
rides keep the alloy hull clear of the surface, with the lower unit and propeller
immersed. The smaller falling spray comes from that wet motor contact.
This is an assisted arcade stance, not a validated real-world model.

P / phone EYES directly toggles first person; C / VIEW still cycles three views.
O or Pause → DOLPHIN WATCH places you behind the offshore pod. Dolphins show
more of their back and breach periodically. L or Pause → VISIT WATERFRONT
WALKERS finds the jetty walkers; a gold ring and label highlight the selected person for
40 seconds. Wildlife and walkers are local to those areas, not everywhere.

Tune balance, passenger response and hull contact in `src/vehicles/shafting.js`,
bounce in `TINNY_HANDLING` and flotation in `HYDRODYNAMICS` (`src/config.js`),
and motor wash in `TINNY_SPRAY` (`src/systems/spray-model.js`).


The photo-inspired tinny shaft uses a roughly 52° balance target and a bounded
quarter lean from prop torque/crew weight. Crew sit lower and aft; water-contact
constraints keep the hull clear. Shaft prop wash is low and narrow, starts at
the wet lower unit and trails aft into falling droplets and foam. Normal powered
spray turns use the broader chine fans. Tune the pose in `SHAFTING` and wash in
`TINNY_SPRAY`; the single photo is a visual reference, not measured physics data.


The sportfisher now has a longer foredeck and rear fishing cockpit (12.55 m
hull length in gameplay). Cabin, tower, beam and characters retain their original
proportions. Shape extensions, deck limits and hull length are shared in
`src/vehicles/sportfisher-shape.js`; player/AI collision, buoyancy, wake and camera
framing follow the revised hull. The third-person deck camera stays aft of the
cabin so walking and fishing have a clear view. This is an original game boat,
not a scale model.


The 225 now holds its shaft on continuous W + Shift / GO + LIFT, using a
roughly 50–60° supported stance instead of a near-vertical throttle balance.
Held throttle alone does not cause a backflip; continuing to hold trim-up can. The hull stays visibly clear with the
lower unit/propeller immersed; the chase camera moves closer and slightly aside
to show that gap. Release LIFT to settle, or steer into the lower spray slide.

### Sharp-turn spray and distant visibility

Large side sprays require a sharp powered turn
with actual yaw/slip load. Straight cruising and gentle steering keep the normal jet-ski rear plume,
wake and low outboard wash. Straight tinny shafting produces low prop wash. Already-emitted spray remains
in world space and falls; sampled water impacts add short rebound droplets and
expanding foam rings from bounded pools, without an endless splash chain.

Idle fans no longer build trajectory histories. AI outboards allocate zero jet
plume packets, and Medium reflections capture at 8 Hz to reduce extra scene
renders. Distant tinnies and local boats retain simple instanced silhouettes out
to 1.1 km beyond the full-detail range; the camera far plane covers 6.5 km of
terrain. These changes reduce cutoff popping and unused spray work; hardware
performance still varies. Turn thresholds are in `sharpTurnLoad` in
`src/systems/spray-model.js`; distant geometry is in `src/systems/boat-lod.js`.

A local Node 24 CPU microbenchmark of 1,000 idle AI-outboard spray updates
measured 17 ms with the former 1,664-packet allocation and 6 ms with zero jet
packets. This isolated timing does not measure overall browser FPS. Gameplay
checks use Linux Chromium software WebGL; real laptop/phone speed remains
hardware-dependent.


### Laptop performance and restored rear spray

The normal jet-ski rear plume runs under throttle again; sharp-turn side fans
keep their separate trigger. Side mist uses the rear plume's soft, grainy blue-white
look, with falling droplets and water impacts retained. Auto starts on Low and
reduces render resolution toward 0.45 pixel ratio if the frame rate stays low;
manual settings remain selectable. Low batches opaque scenery by material,
simplifies wall bevels/foliage, and keeps the mapped land/buildings present.
Distant shore/jetty segments are rejected before exact collision-distance tests.

A matched 960×640 Linux Chromium software-WebGL test with local boaters enabled
reported 862 draw calls before and 215 after scene batching. Triangle counts
were 1.67 million and 1.83 million respectively because larger batches retain
more distant geometry. This is a reduction in submissions, not a claim of a
particular laptop frame rate; software-renderer FPS is not representative of
hardware-accelerated Chrome.


### Tinny catch, rebound and deliberate loops

A sharp powered turn now loads the 225 bow down first, rebounds through its
buoyancy springs and settles when steering straightens. Shift loosens the slide
but is not required for this catch/rebound. Gentle turns, idle, dry prop contact
and airtime do not start the cycle. No extra particles or water samples were added.
Tune `TINNY_HANDLING.bounceHz`, `chineLift`, `pitchBounce` and `loadedDamping`.

For a deliberate backward loop, build speed, hold W + Shift, then keep holding
Q (trim up). The shaft meter warns before overbalance. Release Q early to save
it; pushing past the balance point animates a backward tumble, breaks the combo
and automatically recovers in safe water. R still recovers manually. On touch,
use GO + LIFT + TRIM UP. Loop buildup, decay and rotation rate live in `SHAFTING`.
This is an arcade manoeuvre, not a validated prediction of real tender behaviour.

### Generated realistic coastal texture pass

The game now bundles original generated photographic-style water, panoramic
clouds, sand, coastal grass, rock and jetty timber. The six WebP textures add
about 703 KiB compressed and are shared across world/quality rebuilds instead
of being downloaded again. Vite's fingerprinted asset URLs support caching.
Sky uses the existing single background dome; on Low, water also samples it
for cloud reflections without an extra scene capture. Daylight and sunset
colour the backdrop, while night retains the procedural stars.

The animated ocean and boat buoyancy still share the same analytic waves;
the water photograph adds two drifting scales of surface detail and highlights.
Ground keeps lightweight normal/macro variation. Boats, nearby houses and land
remain 3D so driving/collision/exploration work. This is a material improvement,
not a replacement for geometry or a claim of photorealistic rendering or faster
FPS. Existing Low/Auto resolution and scene batching remain in effect.

The loader waits for textures and craft before Play, tolerates failed image
loads with neutral surfaces, and exposes loaded/failed texture names in
`window.__ESTUARY__.status.graphics.textures`. Tune URLs, loading and shared
materials in `src/systems/surface-textures.js`, the water blend in `water.js`,
cloud/day blending in `atmosphere.js`, and terrain scale in
`scenery-lighting.js`. Asset origin/encoding details are in
`src/assets/textures/README.md`.

### Continuous tinny bounce, contact spray and rear view

The Tender Rat 225 bounces under powered straight cruising too, with a stronger
shafting bounce. Sharp turns blend into the existing catch/rebound response.
It settles off throttle; idle and airborne boats do not receive this support
oscillation. A shafting downstroke can briefly touch the stern against the
visible wave surface; the hull-contact constraint bounds penetration rather
than letting the boat phase through the water.

Crossing hull contacts emit a small splash from the actual sampled contact
point, with a cooldown and impact threshold. Already emitted water continues
falling. Flat side-sheet meshes have been removed from every craft; falling
spray particles, the jet ski's rear plume, low prop wash and fading wakes remain.
Particle pools have not been enlarged.

Hold **U** to look behind and release it to return immediately to your selected
camera. It works in both chase views and first person without changing the
saved camera choice. On phones, hold **REAR**. Blur/pause clears the held input.
Tune bounce and contact thresholds in `src/vehicles/tinny-bounce.js`, shafting
clearance in `shafting.js`, and rear framing in `src/systems/camera.js`.
These are assisted arcade reactions, not measured tender hydrodynamics.
