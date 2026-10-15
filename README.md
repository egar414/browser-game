# Estuary Rats

A playable single-player 3D coastal boating playground. Free roam is the default:
pick a compact freestyle jet ski or a twin-pontoon racing inflatable and launch
into a fictional Australian estuary. No account, API key, or external asset
service is required to play.

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
| `src/systems/water.js` | Adaptive water mesh, shader, pooled spray and foam wakes |
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
must be explicitly approved before this project's source is pushed and hosting
is enabled from this onboarding task.

The cloud instance initially blocks `api.github.com` (proxy HTTP 403); API access
is necessary for automated Pages setup. `egar414.github.io` is also needed to
validate the hosted result. A successful local preview is not evidence of a
published site. No permanent hosted URL is claimed until deployment succeeds.

## First-release limits

- Original stylised procedural models/scenery rather than licensed photoreal assets.
- Desktop keyboard play; mobile/touch controls and multiplayer are not included.
- Approximate arcade buoyancy and land collisions; no fluid simulation or hull damage.
- Visible foam wakes persist, but their trails do not add separate buoyancy forces.
- Camera avoids shores and major low objects; it has no general mesh raycast solver.
- Procedural audio; no recorded real engine samples or external music.
- No comparison to SumbaSurf has been established; that reference was not inspected.
- Software rendering in the cloud is useful for correctness checks and does not
  establish performance or subjective handling quality on an ordinary laptop.

See `ATTRIBUTION.md` for asset origins and `VALIDATION.md` for measured checks.
