# Estuary Rats

**Play:** https://egar414.github.io/browser-game/

A playable single-player 3D coastal boating playground. Free roam is the default:
pick a compact freestyle jet ski or a twin-pontoon racing inflatable and launch
into a fictional Australian estuary. No account, API key, or external asset
service is required to play.

The graphics upgrade adds a moving cloud sky, reflected scenery on Medium/High,
layered water ripples and sun highlights, shallow-water colour and shoreline
foam, sky-lit glossy hulls, and a wider chase view across the water. Spray now
comes from the chines and jet/propeller, with stronger outside-turn fans,
ballistic droplets, mist, persistent V wakes, and expanding landing foam.
Vehicle movement tuning, controls, map routes and activities are preserved.

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
| Shift | Jet ski bow lift; powered sliding turns on both craft |
| Q / E | Bow up / bow down; limited aerial pitch |
| C | Close or wide chase camera |
| Mouse drag | Orbit camera; automatically recentres |
| R | Recover in nearby clear water |
| F | Start or restart the checkpoint race |
| G | Start a 90-second trick session |
| H | Controls and special move guide |
| M | Mute |
| Escape | Pause and settings |

**Bow rider:** accelerate on the jet ski and hold Shift without steering. E
settles the bow; adding too much Q tips it. **Rooster tail:** carry speed into a
W + Shift + A/D turn. **Air and spins:** approach the gold floating ramps from
the north and travel south, away from the minimap’s N label (+Z). Use A/D in the air and Q/E to level out.
The taller eastern ramp gives the best 360 opportunity. There is no jump key.
Aerial points are banked only on a successful landing. Wipeouts break combos.
Repeated actions have diminishing rewards and cooldowns; idling scores nothing.

The canals, marina, two bridges, mangrove creek, island, beaches, river mouth,
and stunt area are connected through navigable water. Gold squares on the
minimap mark the ramps. Gates appear only during races. Vehicle choice, colour,
quality, audio, camera, best race time and best trick session are saved locally.
Storage failures fall back to playable defaults.

## Project structure and tuning

| File | Responsibility |
| --- | --- |
| `src/config.js` | Vehicle tuning, quality profiles, shared wave equations, race route |
| `src/vehicles/physics.js` | Fixed-step movement, four-point buoyancy, planing, slides, air control, scoring events |
| `src/vehicles/models.js` | Original procedural craft, rider, outboard and tiller |
| `src/systems/water.js` | Adaptive water mesh, ripples, shallow colour, sun highlights and planar reflections |
| `src/systems/atmosphere.js` | Sky/cloud lighting, shared sun direction and filtered material reflections |
| `src/systems/spray.js` | Pooled droplets, turn fans, jet stream, foam wake ribbons and landing rings |
| `src/systems/spray-model.js` | Spray tuning and speed/throttle/slip/turn response |
| `src/systems/environment.js` | Land polygons, simplified collision shapes, scenery and floating ramps |
| `src/systems/input.js` | Keyboard, orbit drag, blur/visibility cleanup |
| `src/systems/camera.js` | Chase camera, smoothing, views and shoreline avoidance |
| `src/systems/audio.js` | Interaction-started procedural engine, water and impact audio |
| `src/systems/activities.js` | Race gates, trick timer, combos and records |
| `src/systems/ui.js` | Menus, controls, HUD, minimap and settings |
| `src/main.js` | Initialization, fixed-step accumulator and interpolated render loop |

Both craft share the simulation architecture but have separate acceleration,
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
`SPRAY_TUNING` in `src/systems/spray-model.js` controls spray force response and
wake lifetime/spread. The water shader's colours and optical detail are in
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

- Original stylised procedural models/scenery rather than licensed photoreal assets.
- Desktop keyboard play; mobile/touch controls and multiplayer are not included.
- Approximate arcade buoyancy and land collisions; no fluid simulation or hull damage.
- Visible foam wakes persist, but their trails do not add separate buoyancy forces.
- Camera avoids shores and major low objects; it has no general mesh raycast solver.
- Procedural audio; no recorded real engine samples or external music.
- SumbaSurf's supplied reference URL is https://wavedash.com/games/sumbasurf.
  Access is currently blocked by the cloud network policy; `wavedash.com` has
  been added to the environment draft for review. No visual-parity claim is made.
- Software rendering in the cloud is useful for correctness checks and does not
  establish performance or subjective handling quality on an ordinary laptop.

See `ATTRIBUTION.md` for asset origins and `VALIDATION.md` for measured checks.
