# Estuary Rats

**Play:** https://egar414.github.io/browser-game/

A playable single-player 3D coastal boating playground. Free roam is the default:
pick a freestyle jet ski, racing inflatable, alloy tender, sportfisher or
performance offshore racing cat. Cruise the Mooloolah estuary and its connected
northern coast based on OpenStreetMap shorelines. No account, API key or external
asset service is required to play.

## Rats Reef surfing

Choose **SURF REEF · YACHT / BOARDS** in free roam or pause. The anchored
flybridge yacht carries an original rescue ski on its stern lift. Launch and
reload alongside below 7 km/h. Choose a shortboard, prone bodyboard or big-wave
gun, paddle physically from the yacht, or use **LINE-UP PRACTICE**.

At the yacht, choose the nominal **2.2 m overhead** or **6.3 m big-reef** face,
a left- or right-hand break and Forgiving / Standard / Expert assistance.
Preferences save locally. Online rooms share the left-hand 2.2 m break so all
clients sample matching water; personal difficulty remains adjustable.

The fictional reef has a sequence of smoothly changing takeoff, open wall,
lip pocket, cutback shoulder, rebuilt barrel and final air sections. Several
continuous swells roll through a 1,060 m patch, staying broad offshore before
shoaling into the reef. Period wrapping relabels the crests without respawning
water. Paddling's camera faces the incoming set; **SWELL OVERVIEW** shows the
whole approach. The exposed shelf is behind the riding area.

- **WASD:** paddle / steer / drive the rescue ski. Angle down the wave after catching it.
- **Space:** paddle and catch; hold to compress on the descent, then release while climbing to pump. Holding it
  cannot repeatedly add pump energy. Pump returns are capped and require loading.
- **Shift:** crouch and stall. Forgiving mode helps crouch inside the barrel;
  Expert requires manual stance and has stricter landing and whitewater limits.
- **X:** release a rail/tail; use steering for a bodyboard spin. Q/E shifts fore/aft weight on the water. In the air X rolls
  a bodyboard, A/D controls limited yaw and Q/E controls pitch. Rotation needs a
  suitable launch and sufficient airtime; badly aligned landings wipe out.
- **B:** launch from the yacht or step off a ski/rear seat.
- **C:** face, chase, first person and swell overview; drag to orbit.
- **R:** restart the same practice takeoff offline; recover to the channel online.
  Restarts and wipeouts discard unbanked points.
- Landscape phones have pump, crouch/stall, rail/roll, steering and role buttons,
  with pitch controls appearing during flight.

Steering is surfer-relative: A/Left turns the board toward its left rail and
D/Right toward its right rail; it does not change with camera orientation.
Progressive rail forces redirect velocity rather than instantly rotating it.
Nose, centre and tail water samples drive critically damped moving-surface
support and pitch. Position is not snapped to a centre height each frame.
Contact fraction, relative water speed, angular velocities, compression and
available grip are explicit state. Excessive sideways slip reduces grip;
higher speed widens the natural arc. The local rider is interpolated between
60 Hz physics steps, while the camera smooths separately. Reduced-motion system
preferences disable speed-based field-of-view changes.
Gravity and moving-surface pressure provide speed; turns, drag, stalls and soft
shoulders scrub momentum. Shortboards have stronger fin/rail grip, bodyboards
release and rotate more readily, and guns prefer drawn-out lines. Water sampling
returns slope, normal and material velocity separately from wave propagation.
The same parametric curled lip provides rendering and barrel head-clearance
bounds. Whitewater can destabilize a slow board. The final lip launches only
with sufficient speed and an upward approach: there is no jump button. Flight
preserves momentum and applies gravity; landing checks angle, direction and
impact against the moving surface, with limited assistance.

A clean wave exit banks surf/barrel points and existing upgrade money. Air
rewards require landing; wipeouts lose the current wave. Solo step-offs hand
the ski to a local support pilot. For two humans, join the same authenticated
online room: one launches the ski, the other approaches and chooses **JOIN REAR
SEAT** below 11 km/h. The passenger steps off while the pilot continues driving.
One pilot and one human rear seat are allowed. Disconnects recover the passenger
to the channel. Changing online worlds returns active surfers to the yacht.

No new SQL is needed: the existing authenticated, bounded movement RPC carries
board/ski roles, seat identity, stance, airborne orientation and rail spray.
Online wave timing uses a shared wall clock. Movement remains client-simulated
and remote poses are interpolated; this is not an authoritative competitive
surf server. Surf money uses the existing device-local account wallet.

Tune sections, surface dimensions, handedness, size and GLSL in
`src/surf/break.js`; board grip, speed and air limits in `src/surf/boards.js`;
central physical parameters and separate assist presets in `src/surf/tuning.js`;
shared wave/frame/barrel sampling and damped multi-point support in
`src/surf/contact.js`; rail forces, pumping, air and landing in `src/surf/board-physics.js`;
and launch/crew roles in `src/surf/session.js`. `src/surf/view.js` controls mesh
quality, foam and cameras; `src/surf/board-spray.js` pools falling rail spray and
landing drops. Ocean physics and visible displacement use the same authored
wave train. This is an approximate constrained-surface game model with a
parametric lip, not a volumetric water/CFD simulation or surveyed Mooloolaba break.
Canal enforcement is 35 km/h; the Wharf retains its approximately 22 km/h zone.

Models, reef and rescue livery are original procedural work informed by the
supplied yacht picture. Plain RED BULL / REEF RESCUE lettering is a requested
game livery, with no copied logo, licensed model or implied affiliation.
SumbaSurf's public page description was inspected; its gameplay was blocked by
certificate trust in this cloud browser. The later YouTube reference around
48 seconds was denied with HTTP 403 even after the approved network retry.
No visual or physical match to unseen footage is claimed. No additional external
asset download is needed for surfing.

`tests/surf-performance.test.js` drives the connected manoeuvre sequence using
only digital input values on both boards and both break directions. The browser
specs exercise actual keyboard/touch input, quality settings, persisted options,
recovery and two-account crew play against the existing SQL in local PGlite.
`npm run dev` also shows a development-only **SURF LAB** while surfing.
Expand it for contact/grip/rail/compression/angular-velocity readouts, contact
markers, a wave-normal arrow and deterministic takeoff/bottom-turn/barrel/air
spawns. Development spawns are disabled online; the lab is excluded from the
production bundle. `src/surf/practice.js` defines those comparisons. Restart
clears previous takeoff/rotation/turn state. Manoeuvre rewards require travel
and committed turns; passive ride points scale with distance, not time.
Cloud graphics use software SwiftShader; those results cannot establish laptop
60 fps or performance on a physical phone. The connected keyboard validation
recorded about 3.9 fps with CPU SwiftShader, 73 draw calls and 1.64 million
triangles; this is a cloud software-renderer measurement, not a laptop benchmark.

## Two-player Tender 225

The 25 hp tender seats **one online driver and one online passenger**. Join the
same public or private world, stop within 8 m of your friend's tender, then press
**J** or the **BOARD TENDER** button. Both boats must be slow; the tender must be
below about 7 km/h and have its passenger seat free. The driver keeps WASD/trim
controls; the passenger can change camera with C/P and look around. The human
passenger replaces the existing animated passenger, including its fore/aft
movement, rather than adding a third person. Names and Creator badges remain
associated with the actual signed-in accounts.

Press **J / LEAVE TENDER** below about 11 km/h to relaunch your own selected craft
alongside. **R** is an emergency exit. Disconnects, room/account changes, driver
craft changes, large recoveries and sinking safely end the ride. A stopped
network heartbeat also releases the passenger. No new Supabase SQL is required:
a reserved combination of the existing bounded pose fields carries seat state.
Concurrent claims are resolved deterministically to a single occupant by updated
clients. Like existing movement, this is client-simulated and is not a new
server-authoritative anti-cheat or atomic reservation service. Legacy clients
need a refresh to render the new passenger marker correctly.

Seat rules and packet handling: `src/systems/tender-crew.js`; shared animated seat
geometry: `src/vehicles/tinny-seat.js`; passenger rendering:
`src/systems/tender-crew-view.js`. Unit, current Auth/RLS database and two-browser
acceptance tests cover the seat limit, travel, exits and lost drivers.

## Optional online worlds and accounts

Player names are saved per account on the device and synchronized to Auth
metadata. Set your name and press **SAVE NAME**, or join a world to save it.
Reloading and signing back in restore it. Room updates do not overwrite typing;
account emails are never used as overhead display names.

Open **ONLINE / ACCOUNT** from the garage, HUD or pause screen. Email/password
accounts use Supabase Auth. The connected project currently allows signup
without email confirmation, so email addresses are unverified. A custom SMTP
sender can restore verified-email signup later. The public world and private 8-character-code rooms each hold up to
8 signed-in players. A private room expires after 24 hours. One account controls
one craft; sleeping/disconnected memberships expire after 45 seconds.

The owner must first follow [the multiplayer setup guide](public/multiplayer-setup.html):
run the setup SQL in Supabase SQL Editor and set Auth's
Site URL / allowed redirect URL to `https://egar414.github.io/browser-game/`.
`public/multiplayer.sql` bundles the base and Creator migrations; tests check the
bundle and standalone Creator SQL against their canonical migrations.
No secret/service-role key is needed or accepted by the frontend. The configured
`public/multiplayer-config.json` contains only the intentionally public publishable
key. Deployments can override it with `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` at build time.

The client loads Auth only when Online is opened. Movement is client-simulated,
exchanged through authenticated, rate-limited database RPCs approximately 3 times
per second and interpolated for rendering. Requests never block the physics loop;
network errors remove stale craft and retry with backoff. There is no arbitrary
client Broadcast, direct table access, public account email list or password table.
This is not an authoritative anti-cheat server. Player hull collisions and flooding,
AI traffic, races, scoring, fishing and selected weather are not synchronized.
Remote boats have rider, trim, paint, deck animation and pooled spray effects. All normal
single-player features remain available without signing in.

### Verified Creator badge and garage perks

The Online panel shows whether the badge is active, unassigned, missing its
database update, or temporarily unable to be checked. **COPY MY CREATOR SETUP**
copies the account-specific owner script directly from the game. Run that in
the linked SQL Editor and press **REFRESH ACCOUNT**. An older room snapshot
without a Creator field no longer cancels a separately verified account role.

A project owner can assign the optional Creator role to their own game account.
Sign in, choose **OWNER SETUP / CREATOR TAG**, copy **my Creator setup** into the
Supabase SQL Editor and run it, then **REFRESH ACCOUNT**. The guide derives the
account UUID from the signed-in session; no email or password needs to be shared.
The script installs `supabase/migrations/002_creator.sql` and inserts only that
UUID into `er_creators`. Normal API clients cannot read or write the role table.

Creator accounts receive a gold CREATOR title above their overhead player name,
visible to themselves in chase view and to other players, every garage
design/tuning option, and 2× local garage XP. The local nameplate hides in first person and after sign-out. The perk flag is session-derived and
excluded from saved settings. Sign-out/revocation removes access to any unearned
garage options. This gives no account-management or database privileges and
changes no online damage rules. `tests/creator.test.js` verifies owner-only grants,
name/pose forgery rejection, revoke behaviour, setup SQL injection rejection and
non-persisted garage privileges. The two-browser suite checks one Creator and
one regular account, remote gold labels, and badge removal on sign-out.

If Supabase returns **email rate limit exceeded**, the UI explains the owner fix
and does not repeat signup requests. See the setup guide's **Email problems**
section: either turn Confirm email off (unverified addresses), or configure SMTP
and retain verification. Disabling confirmation does not remove password reset
email limits. Passwords and API secrets never belong in the SQL setup script.

Run `node --test tests/multiplayer.test.js tests/creator.test.js` for PostgreSQL (PGlite) migration,
permissions, privacy, capacity, input validation and smoothing checks. Run
`NO_PROXY=127.0.0.1,localhost npx playwright test tests/multiplayer.spec.js` for
two-browser gameplay and missing-backend fallback. That browser suite routes Auth
HTTP through a local fixture and runs the actual SQL in PGlite: it does not prove
live email delivery or production two-account connectivity. Test those separately
after the owner's database setup. The cloud runner uses Chromium software WebGL;
its frame rate is not representative of a laptop GPU.

## Rear trim plume and big-boat flooding

Jet skis now have a taller, thicker rear arc, especially at the final trim detent.
Hold **Q** to maximum trim, accelerate with **W**, then alternate **A/D** to sweep
it. At maximum trim only, grounded hull yaw is damped while the nozzle still
steers. The extra lateral deflection is about 5 degrees, bounded to roughly 32
degrees from aft; ordinary trim and airborne controls keep their handling.
Water remains in world space after emission and falls under gravity and drag.
The ordinary skis' full-power arc reached about 8–9 m in the calm-water simulation,
enough for the estimated 4.8–7.2 m canal bridge clearances; this is arcade tuning,
not a validated real waterjet model. Bridge wet-surface decals are not simulated.
Particle capacities and emission budgets are unchanged. Existing online rear-source
packets carry the new trajectory; no new SQL is needed. Tune lift, sweep, thickness
and the maximum-trim yaw assistance in `src/vehicles/trim-spray.js`, with base
plume settings in `src/systems/spray-model.js`.

The jet ski's visible rear/trim plume now counts as water aboard when its falling
heavy core crosses an open hull. Capture uses the same linear-drag/gravity
trajectory as the rendered plume, including water still falling after throttle
release. Wider Apex spray is checked out to 200 m; small-craft side fans retain
their existing droplet paths. Gameplay water volumes do not depend on graphics
quality or the number of visible particles.

Big AI sportfishers receive water through their **open rear cockpit**. Their
closed cabin and foredeck are excluded. They settle as water builds; the cockpit
shows water, then they stop, sink, lose their collision obstacle and relaunch
24 seconds after swamping. The meter is gameplay-scaled (240 capacity units),
not a real flooding or vessel-stability model. There is no battle timer needed.

Pause → **FIND BIG BOATS** sets up a pass. Hold U / REAR to watch where your rear
plume falls, or carve a sharp side fan across the open cockpit. The nearby hull's
water percentage confirms hits and shows its reset timer when swamped. A big
boat takes more water than a tender. Tune `BIG_BOAT_FLOOD` in
`src/systems/sportfishing-traffic.js` and the shared capture volume/rate values in
`src/systems/mooring-flood.js`. Multiplayer/Supabase work is deferred; this
published build remains single-player.

## Apex 300 performance jet ski

Select **APEX 300** at launch. It is an original champagne/red/black performance
PWC based on the supplied side-profile photo: pointed broad hull, sculpted
shoulders, long saddle with raised rear pad, textured footwells, vents, separate
bars, trim nozzle and reverse bucket. No copied manufacturer logo or model asset.

**300 km/h, the extreme trim and engine values are fictional arcade tuning.**
Sport mode and low trim give the full speed ceiling. Pause → OFFSHORE SPEED RUN
provides room. Steering responds quickly but retains momentum and loses some
maximum authority at speed. Braking then reverse, shared water support, intake
ventilation and swept full-hull collision remain active. In light conditions it
stays on the water; larger swell and physical ramps give actual airborne motion.

Q/E selects **11 trim positions, −12° to +36°**, the widest range in the game.
Hold W + Shift / GO + LIFT to lift the bow; high trim gives an approximately 78°
maximum powered stance and trades speed for lift. Release LIFT and settle trim
to return to the plane. This is authored handling, not real-world VTS behaviour.
Existing Sparkplug and Seago retain their nine-position trim tables.

A/D gives faster aerial spins; Q/E levels the landing. Hold **Y / HEART** in the
air for a **Heart attack**; Z/X/V remain Hangman, No-hander and Superman. Release
before touchdown. Completed air moves score only after a clean landing, with a
25% Apex aerial award bonus; wipeouts discard them. No jump or flight button.

Apex has the tallest/widest rear plume and strongest loaded sharp-turn fans.
The global spray sprite scale grows from 1.45 to 1.75 (about 21% over the previous
release), with unchanged particle capacities. Riptide's side and twin rear wash
also carry farther and higher; touchdown bursts spread slightly farther. Legacy
small-craft fan trajectories stay intact so existing pontoon spray passes still
work. Falling droplets, surface returns and sharp-turn side-spray gates remain.

U/REAR looks behind; P opens first person. The fast chase and eye cameras track
velocity so they stay with the craft at 300 instead of lagging into the plume.
Choice and trim save locally; the seventh craft fits a two-row selector and
landscape touch includes the new HEART button only for Apex.

Tune `VEHICLES.hyper`, `PROPULSION.hyper`, `HYDRODYNAMICS.hyper`,
`APEX_HANDLING` and `APEX_TRIM_POSITIONS` in `src/config.js`; `APEX_SPRAY` and
`SPRAY_VISUAL_SCALE` in `src/systems/spray-model.js`. The editable original model
is `src/vehicles/apex-model.js`; the Heart attack pose is in `rider.js`.

## Riptide 500 offshore racing cat

Select **RIPTIDE 500** and press Play to launch into the extended offshore run.
The original 12 m twin-hull model has an enclosed two-person cockpit, engine-bay
hatches, twin visible shafts and counter-rotating surface propellers. It uses
inboard/surface-drive styling rather than jet-ski pump propulsion. Its **500 km/h
speed ceiling is fictional arcade tuning**, not validated real-world performance.
The supplied Maritimo #12 photograph and specification table are visual/layout
references; no exact engine identity, horsepower or construction is asserted.

W/GO accelerates; S/BRAKE brakes, then reverses; A/D turns; Q/E adjusts trim;
U/REAR looks behind; C cycles views, P opens first person, and R recovers.
Steering builds progressively and loses authority as speed rises. Ease off before
turning. This craft is for offshore free roam; choose smaller craft for canal
races and trick sessions. Broad side fans and twin falling rooster tails appear
under power on the plane, including straight-line running. Existing smaller craft
keep their sharp-turn side-spray gates and normal jet-ski rear plumes.

The clear speed run is 6.2 km long, with navigation buoys and end markers, plus
1 km of further water before the eastern world limit. Pause → **OFFSHORE SPEED
RUN** returns any craft to its start. The minimap zooms out offshore and the HUD
shows distance to the end markers. Braking from maximum speed takes space.
The ocean extension is authored play space; mapped coastal geography is unchanged.

Tune `VEHICLES.racer`, `PROPULSION.racer` and `OFFSHORE_RUN` in `src/config.js`,
`RACER_HANDLING` in `src/vehicles/racing-physics.js`, and `RACER_SPRAY` in
`src/systems/spray-model.js`. The editable model is `src/vehicles/racing-cat.js`.
The existing Low/Medium/High particle limits also bound the new craft's effects.

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
bundled. The Sparkplug body is an original procedural model in
`src/vehicles/spark-model.js`; it needs no Blender installation or model download.

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
| `src/vehicles/models.js` | Craft factory, moving parts, rider and outboard |
| `src/vehicles/spark-model.js` | Reference-shaped compact PWC, materials, rigid batching and attachment dimensions |
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

The Tender Rat 225 has an added bounce only during shafting. Ordinary cruising
and turns follow the waves without a separate bounce cycle.
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


### Shaft-only bounce and broader contact spray

Added spray sprite size is increased by 45% through `SPRAY_VISUAL_SCALE`,
without enlarging the pools or altering spray trajectories/flooding reach.
Shafting touchdown checks all hull samples independently. Every wet, closing
sample emits from its own location, with a per-point cooldown; a stronger
contact no longer suppresses its neighbours. Splash particles are distributed
across those points inside a bounded burst budget. The previous continuous
cruising/turn-bounce cycle is disabled; real wave following remains.


Touchdown spray now reuses the rear jet plume's soft, grainy ballistic packets
for a denser outward fan, with a smaller set of droplets for surface detail.
It emits from all reported hull contacts and retains their falling motion.
Burst packets use the existing plume pool, have a shorter 2.6 s maximum life,
and expire on water impact. Normal rear jet packets restore their own lifetime
when a pooled slot is reused. No flat sheet meshes were reintroduced.

### Mooloolaba Beach, Alexandra Headland and Maroochydore coast

A separate map release adds approximately 2.7 km of connected northern coast,
424 mapped building footprints, Alexandra Parade/coastal roads, beaches, parks,
the mapped surf-club footprints and approximate headland relief. Cruise out of
the river mouth and north along the coast, or pause, choose a **COASTAL
DESTINATION**, then **VISIT COASTAL DESTINATION**. The whole-area map and minimap
identify the new reach. The three visit points sit in clear offshore water.

Nearby land collides as before. New beachfront buildings on Low/Auto keep mapped
footprints and use repeated window atlases instead of many individual window
meshes. Coastline data is OpenStreetMap, distributed under ODbL with exact source
XML and rebuild instructions in `src/data/sources/README.md`. Facades, missing
heights and relief are game approximations, not replicas of each real property.
The coastline does not change the tinny's shaft-only bounce or spray tuning.

## Sparkplug steering and riding view

The compact jet ski responds faster to steering input, carries more lateral grip
and carves a tighter powered turn while preserving momentum and coasting steering
loss. In the calm-water simulation, a two-second full powered turn at roughly
83 km/h changed heading by 100° rather than 82°; ordinary cruising still uses
the same engine and top-speed values. Shift keeps the deliberate slide/bow ride.
Handling is tuned in `src/config.js` (`VEHICLES.ski`, `HYDRODYNAMICS.ski`).

P (or C twice from wide chase) enters first person. Jet skis now use a fixed
riding eye behind the bars, a slight downward view, a wider field of view and
vertical smoothing. Horizontal position stays with the interpolated craft, so
acceleration cannot pull the camera backwards through the rider. Mouse drag
looks around; U looks behind. Tune the eye and view in `JET_RIDING_VIEW` in
`src/systems/camera.js`. Other boat cockpit views retain their existing anchors.

## Creator Sparkplug and restored account badge

The reference-sculpted compact Sparkplug is now a verified Creator-account perk.
Other accounts and signed-out players receive the regular procedural jet ski;
all players retain the improved steering and first-person controls. The local
model follows the server-checked role. Remote models use the role in the server
roster, never a name or a client pose flag. Signing out removes the personal
model. This is an account unlock in the ordinary game; browser assets and local
physics are not protected against someone modifying their own client.

Saved accounts now restore at launch without opening Online / Account. Creator
access is checked with the authenticated server RPC before unlocking the craft
and badge; no role is restored from local preferences. An unavailable backend
leaves solo play usable and exposes a retry message in Online / Account.

For an owner who has exactly one Auth account, `public/sole-account-creator.sql`
installs the badge functions and grants that one account. It refuses to choose
between multiple users, is safe to rerun and returns a **Creator enabled** result.
Copy **all** of it into a fresh Supabase SQL Editor query, click Run as project
owner, then click REFRESH ACCOUNT in the game. The game also offers COPY
SINGLE-ACCOUNT SETUP. If more accounts exist, COPY MY CREATOR SETUP generates the
existing signed-in-account-specific grant instead. A public publishable key
cannot run either owner-only grant; this change does not itself assign a role
in the production database.

## Private Apex 300 development craft

Apex is reserved for the server-verified Creator role. The garage hides it for
other accounts and signed-out players, rejects direct button activation, and
ignores saved Apex/role flags until the real account is verified. An authorised
saved Apex is restored after sign-in. Signing out or losing the role switches
to the regular ski at the current position. The private craft's physics,
trim, spray and trick tuning remain in `src/config.js` and its model remains
editable in `src/vehicles/apex-model.js`.

Remote Apex craft are rendered only for Creator-marked server roster entries.
The updated Creator SQL also installs a database trigger rejecting Apex pose
writes for accounts without the role, including older clients. Existing
production projects must apply `public/creator.sql` once to install this server
check; frontend publication cannot migrate a Supabase database. A signed-in
Creator can use COPY OWNER DATABASE UPDATE in Online / Account, run the entire
script in the Supabase SQL Editor, then Refresh Account. Existing grants are
preserved. For an unassigned sole account, COPY SINGLE-ACCOUNT SETUP installs
both the guard and the existing one-account grant. Role access remains an
account unlock, not authoritative simulation or protection against modifying
a private copy of the browser client. Do not grant Creator to another account
unless it should also receive these development craft.

## Apex high-speed stability and rear-jet flooding

At high speed, Apex steering progressively uses slower input response, more
lateral grip, additional yaw damping and an input-sensitive turn limit. This
keeps small corrections gentle and reduces the sideways skid and opposite
fishtail after release. Low-speed manoeuvring, its 300 km/h gameplay ceiling,
extended trim and exclusive Creator access remain. Tune the high-speed values
in `APEX_HANDLING` in `src/config.js`. At a 60 Hz calm-water simulation, the same
two-second full powered turn from 300 km/h retained about 260 km/h instead of
210, with peak lateral slip roughly 10.6 m/s instead of 19.3. These are arcade
simulation values, not real-world craft measurements or laptop FPS claims.

Rear trim spray already contributed to flooding; capture now samples the dense
wet core of the visible plume rather than only a packet's centre. Rear strands
also sample the interior of the plume over time, reducing gaps over small
cockpits. Only the portion crossing an open cockpit on the downward arc adds
water; misses, rising water, cabin roofs and dry intakes still do not. The
rear gameplay contribution increases from 260 to 360 litres per unit power per
second. This deliberately scaled quantity is not a real pump-flow measurement.

Sparkplug, Seago and Apex rear hits feed the same moored tender, cruising local
boat and sportfisher flooding systems. A receiving boat's hint says REAR JET
WATER COUNTED, and diagnostics expose cumulative `rearWater` litres until its
next relaunch. Falling packets keep working after throttle release. Capture is
independent of visual quality and retains the existing 1,024-packet pool; no
extra visual particles were added. Tune `MOORING_FLOOD` and `sprayCapture` in
`src/systems/mooring-flood.js`. Online player craft remain outside the local AI
flooding simulation and cannot be sunk by another player in this release.

### Police patrols, shared spray and automatic online flooding

Four local police craft (two grey console boats and two jet skis) now patrol a
waterway navigation graph through the river, connected canals and coastal water.
Pause → **FIND POLICE PATROL** or **PATROL WATCH** finds an officer without
staging a crime. Innocent proximity does not start a pursuit. Officers need line
of sight to speeding in the marked Wharf/canal no-wake zones, a dangerous close
spray, or an actual spray hit on a patrol. AI boaters are never suspects.
The units share a last-seen position and take pursuer, interceptor and flanking
roles. Break sight and stay at least 95 m away for 12 seconds to escape; there
is no automatic one-minute expiry while still visible. A low-speed interception
within 7.5 m for 2.5 seconds impounds the local player's craft for 30 wall-clock
seconds. Driving, recovery and destination shortcuts are blocked during impound;
settings and account menus still work. The countdown survives a reload in local
storage where available. On release you relaunch beside the Wharf.
Police can flood, sink and relaunch. Their AI, offence detection and impound are
**local gameplay**, not authoritative or synchronised across online clients.
Other players' poses and spray hits are shared by the server; police positions
can differ between devices. This is not an anti-cheat or account ban.
Tune `POLICE` in `police-patrol.js` and routes/zone limits in
`police-navigation.js`. Grounded clear-path edges respect shore and bridge
clearance; emergency stuck recovery is retained for pathological obstructions.
The wide chase camera now uses a 72–78 degree field of view; C still cycles views.

Remote craft now have bounded spray and wake pools, released on departure or
when outside spray range. Actual emission points/velocities are sent with poses,
including the rear trim plume and sharp-turn side fans. Pools are intentionally
smaller than the local player's effects for laptop performance.

For an existing Supabase project, run **all of `public/online-update.sql`** once
in its SQL Editor, then reload the game. New projects can use the full
`public/multiplayer.sql`. No passwords or service-role keys are needed in the
browser. Existing Creator grants remain intact. This chat cannot apply production
SQL without a project administration connector.

Once installed, spray hits count automatically in public and private rooms;
there is no opt-in prompt. Private codes restrict who can join. Server-owned
ballistic water packets must cross another same-room craft's deck while falling.
Rear trim plumes and sharp-turn fans can swamp every craft, including large
boats (their open aft cockpit receives water). Clients never send a claimed
victim or damage value. Water drains slowly; 100% water sinks a craft for six
seconds, then it recovers with eight seconds of protection. Movement and source
poses remain client-simulated; this is casual multiplayer, not competitive
anti-cheat. The server clamps sources, rate-limits poses and bounds packet pools.

Tests use two isolated browser accounts against a local PostgreSQL-compatible
fixture to verify shared spray, room isolation, reconnects and driving. Database
checks cover actual descending hits, shields, automatic sinking/relaunch and
rejected forged damage. Production PvP is unavailable until the owner runs the
SQL update; basic online driving continues with the previous backend.

### Seago-like Apex steering (separate handling update)

Apex's high-speed steering response is now 10/s (was 7/s), yaw authority scale
.75 (was .58), and high-speed lateral grip multiplier 2.3 (was 1.8). At 60 Hz,
a two-second 60% steering input at each craft's top speed changes Apex heading
about 1.01 radians versus Seago's 1.05. Apex retains its 300 km/h arcade ceiling,
Creator restriction, extended trim and existing freestyle controls. Full-key
turns remain bounded and steering release settles without sustained fishtailing.
Tune these values together in `APEX_HANDLING` in `src/config.js`.

Validation for this update: 172 Node checks passed, along with Chromium browser
flows for two-account shared spray/private-room isolation, police pursuit and
recovery, and Apex's 300 km/h drive/turn/brake/reverse/trim/camera/reload sequence.
The cloud runner uses Chromium with SwiftShader software rendering, not a laptop
GPU; one offshore Low-quality sample was 3.2 fps / 60 draw calls. This is test-runner
evidence, not a claim about player-device frame rates.

### Police visibility fix

Two patrol boats start near the Wharf; the two skis cover canal and upstream
reaches. Blue lights, POLICE markers, minimap dots and a distance indicator make
patrols discoverable. FIND POLICE and PATROL WATCH face a nearby patrol. The
new offence and escape rules above replace the older automatic sighting chase.
Police have small pooled wakes so effects do not hide a pursuit.

### Online spray velocity correction

Side spray serialisation now uses a launched droplet's `vx/vy/vz`, rather than
its `x/y/z` position. At Wharf coordinates the old payload could exceed server
velocity limits and interrupt exchanges while carving. Received rear plumes
likewise map `vx/vy/vz` into the renderer's velocity vector; using absolute
positions incorrectly fired remote packets far away. Regression checks exercise
an actual sharp-turn payload through the server and verify remote packet speeds.
Players must reload the latest game build on both devices. This correction does
not require another SQL migration when automatic flooding is already installed.

### Photo-inspired 50 hp tinnies and WOMP

Two original selectable craft join the Tender Rat 225: **Dingi 200 / 50** (2.00 m
silver alloy hull) and **Super Skua 370 / 50** (3.70 m black-and-gold racing hull).
Both use a larger visible outboard and 37.3 kW gameplay shaft power. Hull length
is measured without the projecting motor. These are fictional arcade rigs, not
manufacturer-approved specifications or validated performance reproductions.

**I / WOMP** is a held, water-loaded bouncing input. F remains the race key.
Build speed with W / GO, hold I / WOMP until READY, then add Shift / LIFT to enter
a full shaft on the two new boats, or steer sharply under power for a large
falling fan. A sustained shaft can be carried after releasing WOMP. Womping
requires forward speed, throttle and a wet lower unit; it cannot charge at rest,
while airborne or during a wipeout. Its bounded heave/pitch forces drive the
normal water-contact simulation and touchdown splashes. Both crew shift with the
stance. The existing 225 retains its familiar Shift shaft entry and gains optional
WOMP bouncing and spray loading. All tinny rigs sit stern-low at rest; the weight
bias fades onto the plane. The water, land and other vehicles keep their existing
visual style. Static hull/motor parts are batched to limit draw calls.

Tune `VEHICLES.dinghy`, `VEHICLES.skua`, their `PROPULSION`/`HYDRODYNAMICS` entries,
`vehicles/womping.js`, `tinny-bounce.js`, and `systems/spray-model.js`.

For matching new hulls in online worlds, the owner runs `public/tinny-fleet.sql`
once after the existing spray/flooding setup. `public/online-update.sql` and the
full `public/multiplayer.sql` also include it. Until installed, the local new boat
still drives and broadcasts a compatible 225 silhouette to older backends, rather
than disconnecting. Server-verified Creator access is unchanged.

Research limitation: public Google search returned a JavaScript challenge and
DuckDuckGo/Bing access was blocked by the environment proxy (403), including the
approved external retry. No authoritative definition of the regional slang
“womping” was verified. The move therefore implements the user's clarified
bouncing description as authored arcade physics; it is not presented as a
research-validated real-world technique. Models use the supplied photos as visual
references, with original hull graphics and no copied sponsor logos.

### Authenticator 2FA and online spray follow-up

ONLINE / ACCOUNT → **SET UP 2FA** enrols a TOTP authenticator. Scan the QR or
enter the manual key in an authenticator app, then verify its six-digit code.
Later password sign-ins require that authenticator before entering rooms or
using Creator privileges. Setup secrets and codes are not saved in game settings
or sent to peers. Keep access to the authenticator; this release has no
self-service lost-factor recovery. The Supabase project owner can manage a lost
factor. Removal requires an AAL2-verified session. Single player stays available.

The owner must apply `supabase/migrations/005_account_security.sql` after
001–004, or copy **COPY OWNER DATABASE UPDATE** in the account menu and run all
of it in Supabase SQL Editor. Existing Creator grants are preserved. The new
server RPC guards reject lower-assurance requests for accounts with verified
factors, including direct attempts to call private helper functions. This
migration does not enrol anybody: each player must set up their own app.
TOTP must be enabled in the Supabase project's Auth settings. No provider setting
or production account factor was changed by the development environment.

Remote spray now interpolates source vectors with the craft and uses denser,
smaller falling packets instead of sparse opaque blobs. Remote effects have an
independent advancing clock, so pausing the receiving client's vehicle cannot
pile particles up at one age. Teleports clear the old source history. Pools are
bounded (900 rear packets and 240 side droplets per nearby peer), and released
outside 240 m or on departure. All nine selectable craft types, including the
large fishing/racing boats and both 50 hp tinnies, pass server flooding checks.
Large cruisers receive water through the aft cockpit; missing, rising or shielded
water still does not flood. Online sinking needs the existing owner SQL update.

Validation uses Chromium + SwiftShader software rendering in the cloud, not a
physical laptop/GPU benchmark. Browser account/authenticator checks use isolated
Auth fixtures and real PostgreSQL-compatible migrations; the owner's production
factor and sign-in must be verified by the owner after setup.

Moored cabin boats now join the same flood/reset fleet as pontoon tinnies, with
a rear receiving area and disabled collision when submerged. Their hull models
stay separate from static land batches so sinking moves the entire boat. Tall
online fishing boats descend far enough to submerge their tower; local and
remote views share that visual timing. Patrols stop searching after a remote
suspect leaves the room.

### Dry wharf and trick-money upgrades

Use the **DRY WHARF** HUD button (or Pause → DRY WHARF · UPGRADES) to find the
approach beside the Wharf. Drive between the gold markers, slow below 9 km/h
and hold in the middle of the open bay. The lift raises the current boat onto
its dry cradle and opens the parts menu. LOWER BOAT & LEAVE, or Escape, lowers
the boat and faces the open exit. Driving is disabled while on the lift.
A pursuit, impound, race, challenge, wipeout or airborne boat cannot enter.

Banked vehicle tricks earn $1 of fictional trick money per 5 points, after the
existing repeat penalty. Idle time, wipeouts, spray hits on other boats and
repeated score messages do not generate money. The new wallet is separate from
legacy garage XP. Basic parts improve steering, acceleration or ride damping.
The higher power kit requires three distinct banked moves including clean air;
the higher steering kit requires three Bow riders and six Spray carves. Both
also need their basic part purchased first. Owned parts can be reinstalled or
switched back to stock without another charge. Acceleration upgrades retain the
original speed ceilings, including the Apex and Riptide arcade limits.

Equipment is purchased for each craft separately. Wallets and purchases save in
local storage per signed-in account, with a separate guest wallet. They are
**device-local, client-managed progression**, not a server-authoritative or
cross-device economy. Blocked storage falls back to session memory. While in
the workshop, the boat is inactive in online rooms. No new owner SQL is needed.

Video reward buttons are visibly disabled. There is no ad SDK, ad loading,
watch-video simulation or video reward grant. Ad-based alternatives can be
connected later after an ad provider and verified reward delivery are ready.
Before monetising or syncing currency, move its authority to the backend.

Tune prices, part effects and trick requirements in
`src/systems/workshop-economy.js` (`UPGRADES`); adjust the bay and lift in
`src/systems/dry-wharf.js` (`DRY_WHARF`). The desktop browser test drives into
and out of the bay using real controls; purchase tests use a seeded wallet.
Separate checks cover actual acceleration, trick award integration, persistent
purchases, account isolation and landscape phone menu layout.

### Reef diving, kept fish and fisheries

Choose **Reef Buddy 28** (white cabin dive launch) or **Reef Scout 22** (dark centre-console RIB), both original procedural models based on the supplied photos. Use **REEF TRIP** to visit the authored Buddy Reef offshore, or cruise to its orange dive buoy. Stop below 5 km/h, then **B / ENTER WATER**. Snorkelling follows the visible wave surface; **FREEDIVE** switches to breath-limited diving. WASD swims/turns, drag aims, Q descends, E ascends, Space fires the spear, B boards at the surface within 10 m, and R rescues you while losing that dive's unbanked catch. Landscape touch controls have DOWN, UP and SPEAR alongside the existing steering/swim pedals.

Fish must be aimed at within 9 m. A successful shot hides that fish for 90 simulation seconds; the 8-fish dive bag transfers to the boat only on boarding. The saved catch box holds 20 fish. **FISH MARKET** returns to the Wharf, where **SELL CATCH** converts the catch's fixed value to the same wallet used by dry-wharf upgrades. Existing rod fishing remains catch-and-release. Bag/catch data is saved per account on this device, using the existing storage fallback; it is not a server-authoritative or cross-device economy.

The fictional game bag limit is **8 fish aboard**. A local green fisheries RIB inspects an overloaded player boat it encounters within 90 m. Stopping near the inspector for 4 seconds confiscates the catch and charges up to $150 from available funds; it never creates a negative balance. You can instead drive over 120 m clear for 12 seconds to escape, retaining the catch. Inspection and pursuit pause with gameplay. Reef/market travel shortcuts and the dry lift are unavailable during fisheries pursuit. These are authored gameplay rules, not Queensland fishing regulations or diving advice. The reef is not a real bathymetric survey.

Reef fish, breath, capacity, spear range and terrain are tuned in `src/systems/reef-diving.js`; prices there feed `workshop-economy.js`. Patrol rules are in `fisheries-patrol.js`, reef rendering in `reef-view.js`, hull shapes in `src/vehicles/dive-boats.js`, and distinct hull handling in `config.js`. Static coral, stone and seagrass use instancing; distant reef geometry is hidden. The underwater view uses the same animated water surface as boats, with a visible underside, underwater fog, fish and speargun/projectile feedback.

Current online compatibility: the two dive boats transmit as the existing cruiser to the current backend; other players see a cruiser, not the exact new hull or a swimming diver. Reef fish, inspectors and catch progression are local. This update needs no new SQL or ads configuration. Targeted checks: `node --test tests/reef.test.js` and `npx playwright test tests/reef.spec.js`.
Touch interaction is also exercised with `npx playwright test tests/reef-mobile.spec.js` in a landscape Chromium touch viewport. This is emulation, not a performance measurement on a physical phone.

Verified Creator access makes all dry-wharf parts free, including trick-gated reward kits, without requiring videos. This is transient authenticated account access, not a local-storage role flag; switching accounts resets it. Owned purchases stay in their separate account wallet. Creator fisheries inspections still confiscate an over-limit catch but waive the cash fine. Dive modes require surfacing before returning to snorkelling, and both dive craft have enough speed to outrun the fisheries RIB when driven clear.

Creator accounts now receive every current upgrade on every boat when their server-verified role loads. The strongest engine/steering kits and ride control are fitted on the first activation for each boat, without spending money. Later sign-ins preserve manual equipment choices. **CREATOR · EQUIP BEST ON ALL BOATS** in the dry-wharf shop restores the full preset in one action. The access flag is never loaded from local storage and guests/other accounts receive no grant.

### Steering, spray and camera update · 22 October 2026

Thundercat has a 110 km/h gameplay ceiling on the offshore run. Its resistance and powered-turn response are retuned to reach it; this is arcade tuning, not a real 50 hp performance claim. Seago has stronger nozzle steering, quicker steering response and more rail grip. Apex suppresses powered yaw and damps rotation promptly when the steering keys are released, including while coasting. Air controls and max-trim spray assistance retain their separate behaviour.

C / VIEW now cycles wide, close, first person and **extra wide**, with the fourth view raised and offset beside the rear plume. P remains the first-person shortcut; U / REAR still looks behind. The choice saves across reloads. Spray keeps its falling packets and landing splashes; plume buffers upload only live instances, and trajectory evaluation reuses scratch storage to reduce per-frame allocations. This does not establish a universal frame-rate improvement.

Tune the craft in `src/config.js`, yaw-release behaviour in `src/vehicles/physics.js`, view positioning in `src/systems/camera.js`, and ballistic spray in `src/systems/jet-plume.js`. Targeted tests are `thundercat-speed`, `apex-high-speed`, `handling-release`, and `extra-wide` in `tests/`. Browser tests use headless Chromium with SwiftShader in the cloud; physical laptop/phone performance still needs checking.
