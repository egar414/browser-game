# Pump, trim and spray model

This implementation uses elementary fluid momentum and energy relations rather
than an arbitrary spray boost. It is an approximate game simulation, not a
validated model of a Sea-Doo, Yamaha or any other production craft. Original
vehicle models and names carry no copied manufacturer logos.

## Sources inspected

The following official OpenStax College Physics source modules were retrieved
and read from the publisher's GitHub repository during this change:

- [Rocket propulsion and momentum](https://github.com/openstax/osbooks-college-physics-bundle/blob/main/modules/m42166/index.cnxml): reaction force from expelled mass.
- [Flow rate and velocity](https://github.com/openstax/osbooks-college-physics-bundle/blob/main/modules/m42205/index.cnxml): volume flow `Q = A v` and mass flow `rho Q`.
- [Bernoulli's equation](https://github.com/openstax/osbooks-college-physics-bundle/blob/main/modules/m42206/index.cnxml): the relationship between fluid speed, pressure and energy.
- [Projectile motion](https://github.com/openstax/osbooks-college-physics-bundle/blob/main/modules/m42042/index.cnxml): gravity and vector motion.
- [Drag forces](https://github.com/openstax/osbooks-college-physics-bundle/blob/main/modules/m42080/index.cnxml): drag opposing relative fluid motion, including the quadratic approximation.

## Manufacturer references inspected in this update

Research access became available for the following sources on 15 October 2026:

- [2026 Spark Series operator guide, BRP](https://operatorsguides.brp.com/readguide/14342), guide 219002469. The stable [guide catalogue entry](https://operatorsguides.brp.com/M/2438) also links to the English PDF. Read the sections on jet thrust and steering (printed p.17), steering/brake/reverse (pp.93–96), VTS (pp.97–98) and operating modes (pp.103–105).
- [2026 Spark Trixx specification page, Sea-Doo](https://sea-doo.brp.com/us/en/models/previous-models/2026/spark-trixx.html). This describes the 90 hp model, its proportions and the extended VTS, step wedges and adjustable handlebar riser. The default product URL now describes the different 2027 110 hp model, so it was not treated as the 2026 specification.
- [Keep Your Boat in Fighting Trim, Yamaha Outboards](https://yamahaoutboards.com/blog/boating/keep-your-boat-in-fighting-trim), Alan Jones, 13 August 2026. Read its explanation of trim angle, bow attitude, planing, wetted hull, spray position, steering and air ingestion.

The BRP guide describes nine selectable trim positions. It distinguishes that
hardware adjustment from Trixx mode, which changes throttle response and
brake/reverse behaviour. It also explains the need for power to steer a PWC,
reversed steering when backing, and the brake-gate plume. Yamaha describes how
trimming out raises the bow, moves the spray source aft and can reduce wetted
area; excessive trim can reduce grip through air ingestion. These are qualitative
operating relationships, not measured pump or hull coefficient curves.

The game now offers all nine original trim selections in every jet-ski mode.
Q/E taps select a position and holding the key repeats. The gauge shows a
position index rather than claiming a verified factory angle. The actual nozzle
actuator follows the selected position under forward power. Cruise, Sport and
Freestyle remain simplified game modes; Freestyle has a sharper brake/reverse
response. No manufacturer UI, logos, diagrams, photos or manual prose are
redistributed. The PDF was read for research and is not shipped in the game.

## Geographic sources and photo references

On 15 October 2026, OpenStreetMap API access became available. The game now
uses actual river relation 1380756 and coastline geometry, preserving the
Mooloolah River / Minyama Island / Mooloolah Island / Tuckers Creek / marina /
Spit / river-mouth topology and approximate metre distances. Mapped building
footprints, piers, road bridges, parks and beaches replace the previous compressed
fictional shoreline. [The database guide](src/data/README.md) records the exact
extract URLs, projection, simplification, source hashes, regeneration and ODbL
attribution. The 128² exposure field is sampled identically by CPU/GPU so canal
and ocean waves agree with buoyancy. Elevations and many building heights are
estimated; bridge clearance is enlarged for play. This is not a navigational chart.

The user's two supplied still photographs were visually inspected. They guide
the jet ski's blue seat/shoulders, angular black foredeck, rub rail, raised bars
and guards, and the catamaran's continuous white tapered tubes, navy upper/lower
stripes, open dark deck and stern-mounted outboard. These are original procedural
meshes, with no copied logos, textures or photos shipped. The user mentioned
videos, but none had been supplied at this update; no video-motion analysis is
claimed.

## Carving spray and sustained bow riding

The BRP guide's steering section (printed pp.93–94) describes throttle, loading and water
conditions affecting a turn. It does not prescribe a mandatory half-turn before spray.
The user's setup-turn observation is implemented as a consequence of retained
momentum: a carve builds lateral hull motion, and reversing steering changes
stern cross-flow while the hull retains its prior motion. Chine emission uses
stern cross-flow `slip - yawRate × aftDistance`, actual lateral acceleration and
sampled wet contact. It follows the loaded side even during a steering reversal,
then changes sides as the load changes. There is no scripted half-turn trigger
or spray bonus from pressing Shift alone. The ejection coefficients and fan
shape remain calibrated for a readable game effect, not measured spray footage.

Thundercat high-bow resistance now samples the actual aft pontoon support instead
of a point near the middle of the hull that became dry during a bow ride. A
pitch-dependent ploughing drag term slows the stern-supported hull, allowing it
to remain in the assisted medium-speed balance window. Continuous holds exceed
15 seconds in simulation with neutral or raised trim; releasing the aft stance
settles the bow and restores planing acceleration. This is a reduced-order,
assisted game powerstand, not a validated prediction of real-boat stability.

## Implemented relations

Water density is approximated as 1000 kg/m³. The jet calculation solves the
positive branch of:

```
Q = nozzleArea * exitSpeed
massFlow = density * Q
hydraulicPower = 0.5 * massFlow * (exitSpeed² - inletSpeed²)
axialThrust = massFlow * (exitSpeed - inletSpeed)
forceVector = massFlow * (inletVelocityVector - outletVelocityVector)
```

Available hydraulic power scales approximately with the cube of simulated pump
RPM. Cruise limits power and softens throttle response. Sport and Freestyle
share full power; Freestyle changes throttle and brake/reverse response. The
nine-position extended trim range is available in every jet-ski mode. The impeller
is inside the pump; the visible stream leaves the stern nozzle. The nozzle
steers and trims with the same transformation used for the discharge source.
An upward exhaust component pushes the stern down; hull bow pitch also rotates
the nozzle, so world exhaust elevation depends on both trim and hull attitude.

The force vector now includes inlet momentum in every axis rather than rotating
a scalar net thrust. Its lateral component at the stern creates a yaw moment;
angular inertia and speed-dependent damping determine yaw response. Low-RPM
inlet admission is reduced by an effective loss factor so an unpowered ideal
ram duct does not falsely retain nearly full steering power. This factor is
original tuning rather than a measured pump curve.

Pitch and roll use second-order angular spring/damping responses to the sampled
water plane. A gradual planing state reduces effective wetted area, moves the
chine contact search aft and changes hull resistance. These are reduced-order
models, not a Savitsky solution or full rigid-body hydrostatics. At larger bow
angles a stern-support height adjustment raises the body around its aft support
instead of burying the transom. The intake is placed under the aft hull; its
position remains original model tuning.

The outboard uses an ideal actuator-disk approximation with an effective
speed-dependent efficiency applied to shaft power. Induced speed `vi` solves
`P = 2 rho A vi (u + vi)²`; thrust is `2 rho A vi (u + vi)`. Its submerged
propeller creates turbulent wash, not a jet-ski nozzle stream.

The inlet/propeller samples the same waves used by the visible water. An exposed
inlet stops liquid flow immediately, and re-immersion recovers flow gradually.
This approximates **ventilation** (air ingestion), not vapor cavitation.
Reverse on the jet ski smoothly redirects discharge forwards/downwards through
an animated approximate bucket, with a separate small brake-gate plume under
forward braking. The bucket bends the longitudinal jet while retaining its
lateral component: a handlebar turn moves the backing stern oppositely, as
described in the guide. The reversing outboard propeller reverses its lateral
thrust component as well. The outboard first coasts in neutral, then shifts into reverse
at low speed. A latched shift state prevents oscillation at the speed threshold.
Reverse on the outboard reverses its propeller wash.

Chine/pontoon emission starts near each hull's sampled waterline. Contact,
speed, stern cross-flow and lateral acceleration determine the two sides' spray independently.
Holding Shift without changing the physical state does not multiply spray.
Droplets inherit the vessel's velocity plus an ejection velocity, then experience
gravity and approximate quadratic aerodynamic drag. Millimetre droplets use
`k = 3 rho_air Cd / (4 rho_water diameter)`, with `Cd = 0.47`; this is an effective
spherical-droplet approximation. Rendered points represent groups of droplets.
Submerged discharge remains low surface froth unless an upward ski stream
actually crosses the surface. A short translucent core connects the visible
outlet to the breaking stream; foam and wakes are pooled and expire.

## Tuning and limits

`RIDE_MODES`, `SKI_TRIM_POSITIONS`, `HYDRODYNAMICS` and `PROPULSION` in `src/config.js` hold the mode, power, effective
mass, intake, nozzle, resistance and trim tuning. `propulsion.js` contains the
momentum calculations; `spray-model.js` contains contact and droplet rules.
Internal trim degrees are game tuning, not advertised factory trim angles; the
jet-ski HUD shows the nine position indices. Q/E latches
trim on water and controls pitch in air. T cycles modes. Each craft's trim and
the riding mode are saved locally.

The user's later spray photo guided a broader, denser white sheet with softer
mist and finer droplets. Emission angles spread through an arc. The mesh retains
recent real contact positions and velocities, so it curves through a turn and
falls under gravity rather than rotating as one narrow ribbon. The Thundercat
throws a wider, lower side fan and keeps propeller wash separate. This is visual
reference matching at a stylised level, not a reconstruction of measured footage.

After feedback that steering was too heavy, effective yaw inertia and especially
speed-dependent damping were reduced independently for both craft. Powered
steering remains thrust-driven and coast steering remains reduced. A repeatable
two-second turn after four seconds of acceleration now has roughly a 17 m
jet-ski radius versus roughly 52 m before this change, and a sub-40 m Thundercat
radius versus roughly 149 m. These are scenario-specific simulation observations,
not real-world turning-circle specifications.

Original tileable grass/sand normal and colour maps, waterfront infill homes,
gardens, verandas, roots and headland relief enrich the mapped land. Infill houses
and headland height are artistic additions, not new geographic measurements.
Static meshes are batched in spatial tiles and trees are instanced in tiles so
geometry outside the view can be culled. The sky follows the camera across the
larger map to avoid leaving the original fixed dome near the mouth.

Rider hands/feet use two-link inverse kinematics and stay attached to the moving
handlebar/tiller and footwells while the torso moves. The Thundercat now has an
assisted bow-ride regime with a speed ceiling but no high-speed lift cutoff under power and aft weight shift; releasing
Shift or reducing power settles it. This is a gameplay move, not a validated
prediction of safe operation of a real boat. The engine sounds use distinct
synthesized firing cadence/harmonics and the landing sound uses broadband noise;
no recorded manufacturer engine sound is claimed.

The spring buoyancy, powered wheelie assistance, sliding modifier,
ramps and aerial trick control retain arcade approximations. The simulation
does not solve full rigid-body torque, a free surface fluid volume, pump blade
flow, real cavitation, individual droplet breakup, or wake buoyancy. The hull
stability assistance makes the game controllable; these equations alone cannot
establish real-world accuracy. Hardware play testing and measured manufacturer
curves would be needed to calibrate it further.

## Playable preview additions

The central jet-ski plume now uses a pooled historical volume and larger spray
clusters behind the actual nozzle. Its height, thickness and breakup have been
artistically amplified at the player's request; they do not represent measured
Spark discharge or a validated droplet distribution. Physical pump thrust stays
separate. Existing chine/pontoon turn fans retain their contact-based rules.

Calm, chop, swell and changing settings multiply the same wave displacement for
GPU water and CPU buoyancy, blending across twelve simulated seconds. Natural
crest launches require speed and upward separation, without a jump button;
normal airborne controls and successful-landing scoring apply. This is reduced
order wave hopping, not a wave-breaking or surfing simulation.

Spray battles accumulate gameplay water using side-fan/rear-plume exposure
volumes, independent of visual particle budgets. A full meter starts a finite
sinking animation and safe-water recovery. Garage kits and designs use earned
combo XP; the tuning changes are original gameplay coefficients.

Google Earth reference access was attempted and retried with the required
network approval, but the proxy returned 403. No Google imagery was inspected
or used. Existing OSM geometry remains the geographic source.

## Hourly ocean and supplied video (15 October 2026)

The user supplied `v14044g50000db5mr1fog65ue57glbeg.mp4` (576×1024, 30 fps,
22.8 seconds). Key frames across the clip were extracted and inspected. They
show a dense high loaded-turn sheet, finer spray at its edges and falling
droplets, and lower turbulent wash behind the ski. These observations informed
the breakup/opacity and load-sensitive plume. No exact distances, discharge
velocities, manufacturer identity or calibrated measurements are inferred
from the video. It is not bundled or used as a texture.

The central plume now tapers and loses momentum through a small effective air
drag term; fine particles keep their aerodynamic drag. Straight-line lift is
lower, while nozzle trim and actual chine load produce a taller turn plume.
Thundercat fans are wider and primarily lateral; their spray sheets persist
long enough to rise, break up and fall. Dense visual volumes remain artistic
representations of groups of droplets.

Offshore components use deep-water dispersion `omega² = g k`, with periods
7, 8.5 and 10.2 seconds, differing directions, a slowly moving set envelope and
a small second harmonic for sharper crests. The exposure field introduces
these components across the mouth and removes them in the canals. Shorter
wind chop remains. Height/analytic slope GLSL is generated from the CPU wave
coefficients. A GPU readback check compares actual rendered heights to CPU
buoyancy at multiple ocean/river/canal samples; numerical agreement does not
validate hydrodynamic realism. Natural crest launch also allows unweighting
when maintaining water contact would demand downward acceleration beyond gravity.

The hourly forecast is deterministic offline gameplay weather, smoothly blended
through 3600-second clock intervals. No forecast API is contacted. Displayed
height is an approximate game swell setting, not a local navigational forecast.
Refraction around the headland, tides/currents, shoaling from real bathymetry,
breaking curls, wave interference with solid objects and fluid flooding are
not solved. An official BOM wave-reference URL was attempted with the required
retry but returned proxy 403; it was not inspected. Additional open building
search via ArcGIS was likewise blocked. Existing OSM extract tags were inspected
and reused; no additional imagery or building survey was obtained.

## Wharf, entrance banks and spray fallout (16 October 2026)

The retained OSM extracts locate The Wharf Mooloolaba at approximately
(-194, -1143) in the game projection. The launch is now in clear water at
(-220, -1080), within 70 m of that footprint centre, with at least 12 m
collision clearance. These are approximate in-game coordinates.

The extracts contain no surveyed sandbar depths or shoal polygons. Three
estimated underwater sandbank lobes on the Point Cartwright side of the
entrance follow the user's description. Their authored ellipses are in
`ENTRANCE_SHOALS` in `src/ocean.js`. They increase swell amplitude and its
second harmonic locally, with matching CPU/GPU equations, shallow water
colour and crest foam. They do not obstruct the navigation channel. This is
an artistic near-breaking wave model, not measured bathymetry, a tide model,
physical breaking curls or a navigation chart. No new imagery was obtained.

Rear spray no longer uses a connected tube. A bounded independent pool of
soft, noisy camera-facing packets approximates clumps of water and fine mist.
Each packet inherits the nozzle trajectory, spreads and follows gravity with
effective linear drag. Larger packets persist through the descending arc until
they meet the shared moving water, leaving small foam rings. Fine chine
particles retain their separate quadratic drag. These representations are
visual approximations; the plume is still amplified and not calibrated to
manufacturer discharge measurements. The existing hydraulic force calculation
is separate and unchanged. The supplied video informed the rising/falling
shape; no frames or branding are shipped.

Eight canal bullseyes use the same side/rear spray exposure rule as battles,
require speed and actual spray overlap, and bank one hit per pass. A target
needs both a 25-second cooldown and departure beyond 40 m to recharge.
Target and speed-sign positions are original game placements beside OSM
canals. The 6 KNOTS / NO WASH signs are game advisory markers, not a verified
inventory of local legal speed limits. They do not impose a speed limiter.

Hangman, No-hander and Superman are stylised rider poses with IK hands/feet.
A deliberate 0.35-second aerial hold qualifies each pose once per jump; points
are banked only by the existing successful-landing checks. Ground input does
not jump or score. These moves are a game animation, not instruction in real
watercraft stunts.

## Denser reference-style jet plume (16 October 2026)

The follow-up uses the same supplied spray clip and photos: a dense white core,
finer turbulent edges, elongated falling water and a substantial landing wash.
The central pool now emits more overlapping core packets, with larger core
cross-sections and separate fine mist/streak fractions. The white-water shader
adds grain and internal light variation; core packets and streaks orient along
their projected current velocity, so the descending section points downward.
Turn load broadens the breakup. Water still follows the existing ballistic
trajectory and returns to the shared wave surface.

Pool capacity and emission are coupled to maximum packet lifetime, keeping
water alive through its falling arc instead of recycling it early. Low quality
also receives the dense core. A short near-camera fade preserves the driving
view when a heavy plume crosses the chase camera. Pump force, handling, trim
limits and spray-hit rules are unchanged. Density/appearance remain artistic
approximations of water groups, not calibrated CFD or manufacturer measurements.
Tune the central values in `JET_PLUME` in `src/systems/spray-model.js`.


## Thundercat / bow-ride spray refinement — 15 October 2026

The retained photo/video references guide broader pontoon fans and dense
water with fine breakup. Side spray is emitted from the sampled wet contact
and directed above the water plane. Applying the full bow-high body rotation
to the spray's vertical direction had incorrectly aimed the sheet downward;
that orientation error is corrected. Powered aft-weighted bow attitude adds
artistic reach and lift without changing hydraulic thrust or handling.

A time-sampled, interpolated sheet history retains the falling arc at fast
frame rates. Droplet lifetimes account for launch speed and gravity, while
drag and shared-wave contact still end individual drops. Finite emission
budgets reserve pool capacity for falling water. Rider hip and torso shifts
follow steering and lateral load, with attachment-point IK for the tiller,
bars and feet. Animation is smoothed rather than instantaneously flipping.

No new measured spray data, manufacturer tests or CFD were available for
this refinement. Fan width, opacity and bow-ride amplification are original
game tuning, not claims of engineering or training accuracy.


## Spray rendering and a findable bar — 16 October 2026

The supplied Google Maps view centres on latitude -26.6880674, longitude
153.1294513. A request to the supplied Maps URL was denied by the cloud
network proxy (403). Queensland Globe, ELVIS elevation and the Queensland
data portal also returned 403, including an escalated retry. No additional
satellite imagery, elevation, canal survey or measured bathymetry was obtained.
The existing OSM geometry is retained; the authored entrance shoals remain
estimates. No claim of newly surveyed accuracy is made.

A route follows the retained river centreline, clears the rock walls and rounds
the headland to the estimated bar. Orange buoys, minimap shading, next-turn
guidance and an original ODbL-attributed SVG map make that location findable.
The route is a game guide, not real marine advice.

The dense rear effect was expensive because growing overlapping sprites shaded
large screen areas repeatedly. Early circular/transparent rejection, bounded
packet growth and quality-scaled density reduce this overdraw while retaining
the opaque core and falling water. Analytical drag now supplies velocity with
one decay evaluation. The side fan has a fresh current contact sample each
render frame, independent of its lower-frequency history, removing the stored
sample delay at the hull. Rear visual exit speed increases from 10.5 to 15 m/s
relative to the moving hull at full visual flow; hydraulic forces are unchanged.
These speeds are effect tuning, not manufacturer measurements.

The isolated 1000×650 Low-quality plume benchmark in Linux Chromium 154 with
SwiftShader measured median frame intervals of 416.7 ms before and 100.0 ms
after (40 recorded frames per version, 10 warm-up frames). P90 was 483.3 ms
and 166.6 ms respectively. The fixed source and camera are identical. This
intentionally heavy software-rendered stress case is not a hardware-GPU or
whole-game FPS benchmark. Particle counts were 874 and 570; random breakup
adds variation. No universal device performance is claimed.

The bar now also has a local short-period set, gated by the authored shoal and
ocean exposure. `BAR_BREAKERS` shares coefficients between CPU and GPU: an
approximately 44 m wavelength, 5.7 s period and sea-state-scaled amplitude,
with a second harmonic sharpening the crests. This is artistic shallow-water
tuning; no actual depths, stationary tidal standing-wave solver or overturning
breaking curl is implied. Pause → VISIT BAR WAVES is an explicit game travel
action to a collision-checked launch within the shoal field. Primary Play
still launches beside The Wharf.


## Left-hand bar and curved kicker — 16 October 2026

The user's corrected placement moves the authored shoals left of the outbound
entrance, west of the rock-wall exit. Three overlapping lobes broaden the
field; the short local set has higher amplitude and stronger crest sharpening.
CPU and GPU still use the same wave coefficients. Route, launch, buoys and
map have moved together. No new imagery or surveyed bathymetry was obtained.

The gold kicker is an original floating game ramp: 18 m wide, 28 m long and
3.6 m high, with a quadratic rising deck and a bounded takeoff speed. Its
rendered profile and physical support/tangent use the same helper functions.
A sampled moving water base provides heave. This is not a real-world structure
or structural/dynamics simulation. Both craft completed launch/clean landing
checks at seven swell phase offsets (14 runs) without a wipeout.

Garage entry now remembers horizontal position and heading; returning from a
vehicle change respawns at that point with zero velocity and the new hull's
water height. Nearby-water recovery handles a larger hull that cannot fit.
The instability guard uses depth below the local wave, so a legitimate deep
trough no longer triggers a fixed world-height reset.


## Photo-referenced Tender 225 and residential moorings — 16 October 2026

The user corrected the requested engine from 6 hp to 25 hp. The original
procedural tender follows the photograph's short open alloy hull, shallow V
chines, tapering bow, rolled rim, transverse bench seats, exposed framing, fuel
tank and compact dark outboard. Its model source is `src/vehicles/tender.js`.
The shared moored version uses instanced geometry, not a hotlinked asset.

The propulsion solver now supports the third outboard configuration explicitly.
Its selected 18.64 kW shaft power corresponds approximately to the requested
25 hp label; all mass, drag, steering inertia, trim, planing and performance
values remain original game tuning. No real model's load capacity, safe engine
rating or measured handling has been established. The tender is lighter and
shorter than the Thundercat, with a smaller propeller disk, lower speed ceiling
and a quicker powered yaw response. It shares propeller-neutral/reverse logic
rather than a jet-ski reverse bucket. Bow rides pivot about stern support and
retain the existing angular bounds and recovery.

Waterfront house placement projects each eligible home's nearest bank onto a
short gangway and pontoon. Candidates reserve the mapped channel, race and bar
route corridors, bridge clearance, existing piers and neighbouring moorings.
320 safe house sites are generated from available mapped houses plus original
estimated homes. These do not establish actual legal parcels or mooring locations.

The flooding model emits quality-independent water packets from `launchSpray`
and `jetPlumeSource`, integrates falling trajectories using the existing droplet
gravity/drag, and checks downward gunwale crossings against a tapered open-hull
footprint. A spatial hash and fixed packet pool bound work. Viewer-based instance
compaction excludes distant tender geometry; flooding and collision state remain
independent of visibility. Water volume per
sample is deliberately gameplay-scaled; this does not conserve a full ocean
fluid field. Collected water is drawn inside the hull and lowers freeboard,
then triggers finite sinking, collision removal and a 16-second reset.
Score cooldowns prevent an immediately respawned tender awarding repeated points.
No new external research, map survey or asset license was required for this
photo-based original model and game-mechanics update.


## Tender bow lift, stern slides and chine bounce — 16 October 2026

The user found the tender hard to shaft/slide, its side sprays too large and
its hull too settled during spray turns. Bow lift now begins at lower forward
speed and retains more support while steering. Faster tiller response, a
slightly wider motor angle, less lateral grip under Shift and bounded extra
powered yaw authority let the stern break away; ordinary grip returns on release.

A speed-, throttle-, wetness- and steering-load gate drives a bounded 1.12 Hz
chine pressure cycle through the existing vertical, pitch and roll springs.
The source lift is limited to 0.22 m and damps away when load is removed.
It supplies no airborne impulse; airtime still needs a ramp or wave launch.
This is intentionally arcade catch/release behaviour, not a measured fluid
instability or a validated real tender manoeuvre.

In matched 60 Hz scripted runs with four seconds of full powered steering,
total heading change rose from 5.05 to 6.88 rad and measured hull heave range
relative to water/stern support rose from 0.117 to 0.258 m. Neither run launched
or wiped out. At three seconds of straight powered bow riding, pitch rose
from 0.801 to 0.954 rad. Comparisons use the preceding a2afeb9 source archive.

A fixed loaded-turn spray sample reduced outward exit speed from 11.28 to
8.76 m/s and upward speed from 8.76 to 6.39 m/s. This only changes the tender's
side fans; existing jet-ski and Thundercat parameters are unchanged. The
pontoon approach uses an 18 m run-up to suit its shorter fan and tighter carve.


The user's follow-up asks for easier moored-tinny sinking. Side and rear capture
volumes are doubled, while slow background drainage is halved. Receiving hull
geometry, capacity, sink animation, reset interval and score cooldown are
unchanged. Across six wave phases, a scripted clean tender spray pass now
leaves approximately 19–23% water aboard, rather than approximately 9–11%.
These remain gameplay-scaled water volumes, independent of visual fan size.

## Three user video references — 16 October 2026

Inspected sampled frames throughout the three uploaded MP4s (durations 9.7,
28.5 and 63 seconds), plus denser 3 fps sequences at 0–5 s, 3–9 s and 1–6 s
respectively. The first and third show steep stern-supported tender bow rides
and a drop into a wet turning catch; the second shows a shallower bow-high
pass with changing pitch/roll through the turn. The footage does not supply
speed, scale, mass, thrust or hull measurements, and does not establish a
Thundercat physics calibration. No video imagery or sound is shipped as an asset.

The response translates those visible motions into original game tuning:
earlier aft-weight bow lift, more bow authority through steering, a small
powered acceleration-pitch response, and distinct slower twin-pontoon
catch/release motion. Stern support was moved aft to avoid dipping the deck
at the steeper attitude. High-speed Thundercat bow angle relaxes continuously
without dropping to the plane, retaining its sustained >60 gameplay km/h ride.

Matched 60 Hz calm-water starts against 8fc7856 reach approximately 1.20 rad tender pitch
at three seconds (previously 0.954), and approximately 0.965 rad Thundercat pitch (previously
0.824). The unchanged power settings remain 25 hp / 50 hp game specifications.
These are arcade reference motions, not validated real-world manoeuvres or a
full free-surface fluid model. Existing gravity, wet propeller admission,
reverse interlock, collisions, wave launches and landing checks still apply.

Moored-tender sinking is easier again: side/rear captured-water scales are
480/150 rather than 128/40, and drainage is 0.02 rather than 0.03 litres per
simulation second. These volumes are gameplay-scaled. Capacity, receiver
geometry, pool size, animation, reset and score cooldown are unchanged.
Six normal-input tender passes at different calm-wave phases leave about
30–44% aboard with the new handling; idle, nearby or missed spray adds none.

## Extended geographic area / bridge geometry — 16 October 2026

Downloaded two additional OSM API extracts covering the upstream/southern and
western strips. The 153.099–153.142° E / 26.728–26.677° S bounds cover roughly
4.3 × 5.7 km, retaining the previous Wharf and entrance. The same local metre
projection is used; no fake islands or disconnected decorative canals were
added. Shoreline simplification remains 1.2 m. A 192-square shared wave field
preserves sheltered-water sampling over the larger area.

The combined data contains 759 mapped building outlines, 45 pools and 37 bridge
way alignments. Bridge lane/width, road type, surface and bridge:name tags are
retained, including McKenzies Bridge and the 5 m tagged Mooloolaba Walk and Ride
Bridge. Parallel road and pedestrian ways are distinct alignments of the same
structure; the count is not 37 separate bridges. Connected road vertices supply
approaches; bank intersections place shared visual/collision supports. Sidewalk
ways beside a road span share its estimated deck top. Structural design,
clearance and approach elevation are game approximations, not source surveys.
Actual mapped outlines are preserved horizontally. Roofs/façades, gap-filling
houses, terrain heights and decorative moorings remain original estimates.

Extending the channel data exposed an old fixed-index dependency in BAR_ROUTE.
Its stable entrance anchors are now independent of upstream vertex counts.
Channel guide paths are clipped to water with a clearance margin instead of
retaining sections that cross unrepresented/narrow water. Original entrance,
race and central-channel collision checks continue to pass.

Investigated Microsoft Global ML Building Footprints. The author's current
README identifies CDLA Permissive 2.0 data and the 13 August 2026 index at
https://bfppub.blob.core.windows.net/%24web/2026-08-13/dataset-links.csv . The
host is absent from the runtime network allowlist, so no such footprint data
has been imported or claimed as present. ArcGIS catalogue search is likewise
blocked. Required domains were saved in the environment configuration draft,
preserving the existing allowed destinations; saving does not apply the change.
OSM and its ODbL licence remain the only geographic data actually shipped here.

## Ambient AI boaters

Free-roam traffic uses the existing mapped channel lines and race loop, local
look-ahead steering, speed feedback and starboard lane offsets. Every cruiser
uses the same vehicle buoyancy/propulsion simulation as its playable hull type.
This is a small arcade traffic controller, not a navigation or COLREG simulator.
Moving open-hull receivers rebuild their spatial hash before checking descending
spray packets against the current deck plane. A nearby fan alone cannot flood a
boat. Drivers duck with hands still constrained to the tiller. Ambient reactions
award no score; the optional timed battle remains separate. The 55-litre capture
threshold and 16-second relaunch are deliberate gameplay values.

## Laptop scenery lighting

This visual pass uses original procedural shading and the existing Three.js
renderer. No map imagery, third-party textures or new models were imported.
Ground colour is modulated by two scales of world-space noise, with close-range
fine detail. Building bases receive baked vertex-colour attenuation. One
instanced soft rectangle field supplies authored contact shade for buildings and
trees, fading at distance. It is not screen-space ambient occlusion or a physical
shadow simulation. Medium/High also use the real directional-light shadow map
with a smaller camera-relative footprint for improved nearby texel density.
Planar reflection captures have a wall-clock refresh limit independent of fixed
physics steps. This limits extra scene passes on capable GPUs without reducing
simulation frequency. Desktop Auto begins conservatively at Medium; the existing
measured-frame-rate downgrade remains active. There is no dependency on Blender
or an external graphics plugin.

## Sculpted coastal style

This pass adopts broad stylistic qualities requested by the player: saturated
coastal colour, readable masses, soft building edges, blue atmospheric distance
and solid, lobed tree silhouettes. It does not reproduce Fortnite assets or
claim parity with that game's renderer. Original canopy geometry combines one
80-triangle centre lobe and four 20-triangle side lobes. Vertex-colour height
ramps suggest cooler undergrowth and sunlit tips, with per-instance tint variation.
This replaces the previous crossed alpha-card crowns. Solid foliage adds geometry
but removes alpha-card overdraw; laptop gains depend on the actual GPU and view.
The existing tile instancing and quality density limits are retained. Painted
walls, roofs, ground, sky and water share a small editable art-direction module.
The same wave equations and boat physics continue to drive the simulation.

## Thundercat heave and tube-crown submergence

A deterministic bar run reproduced complete crown submergence in strong swell:
the highest of six upper-tube samples briefly reached about 0.15 m below the
visible wave function. World-relative heave damping opposed the motion needed
to follow a rising crest. The correction adds bounded water-velocity feedforward
from the existing four support samples and a capped nonlinear reserve term for
larger immersion error. Recovery clears the sampling history. This approximates
water-relative damping and increasing displaced volume; it is not a validated
hydrostatics model. No render-only height offset or change to wave equations is
used. Tests retain contact with water, exercise calm/chop/swell/hourly conditions
and cover cruising, powered turns and bow riding. Only the Thundercat opts into
the new heave terms; the jet ski and tender use their existing tuning.

## Offshore racing-cat reference and limits — 2026-10-19

The user supplied a Maritimo #12 racing-cat photograph and a general table:
approximately 40 ft / 12 m, twin high-performance inboards, Number Six stern
or surface-drive examples, composite construction and hydraulic steering.
Those are layout references supplied by the user, not independently verified
specifications for the exact pictured boat. Attempts to retrieve manufacturer
racing pages in this environment returned HTTP/tunnel 403, including a retry
outside the sandbox. Exact model year, engine identity and output remain unknown.

The original Riptide 500 therefore uses two vented inboard bays, two shafts and
surface propellers, an open forward tunnel and an enclosed two-person cockpit.
It does not copy Maritimo graphics or claim a licensed manufacturer model.
Two wet aft chines produce planing fans; each surface drive produces a separate
ballistic rooster tail. Packets retain world-space momentum, drag and gravity,
then create surface impacts when they fall. It is not a jet-pump-powered craft.

The requested 500 km/h is explicitly fictional arcade performance. Its thrust,
steering response, surface-drive wash, mass and RPM are effective game values;
the implementation does not infer or validate that speed from horsepower.
Its wave response samples both hulls and constrains immersion; high-speed
handling is intentionally stable rather than a validated offshore hydrodynamic
or safety simulator. The added offshore run is authored sea, not a new surveyed
bathymetric or coastal dataset. Tuning is documented in README.md.
