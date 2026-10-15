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
assisted, medium-speed bow-ride window under power and aft weight shift; releasing
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
