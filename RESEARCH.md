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

These support the physical principles; they are not measurements of a personal
watercraft. No source prose or diagrams are redistributed. Attempts to access
BRP's trim information and NASA's thrust page were blocked by the cloud proxy.
Manufacturer trim angles, pump curves, hull drag and thrust have therefore not
been checked against factory documentation. The network draft includes the
relevant research domains for future access.

## Implemented relations

Water density is approximated as 1000 kg/m³. The jet calculation solves the
positive branch of:

```
Q = nozzleArea * exitSpeed
massFlow = density * Q
hydraulicPower = 0.5 * massFlow * (exitSpeed² - inletSpeed²)
thrust = massFlow * (exitSpeed - inletSpeed)
```

Available hydraulic power scales approximately with the cube of simulated pump
RPM. Cruise limits power and softens throttle response. Sport and Freestyle
share full power; Freestyle extends the adjustable nozzle range. The impeller
is inside the pump; the visible stream leaves the stern nozzle. The nozzle
steers and trims with the same transformation used for the discharge source.
An upward exhaust component pushes the stern down; hull bow pitch also rotates
the nozzle, so world exhaust elevation depends on both trim and hull attitude.

The outboard uses an ideal actuator-disk approximation with an effective
speed-dependent efficiency applied to shaft power. Induced speed `vi` solves
`P = 2 rho A vi (u + vi)²`; thrust is `2 rho A vi (u + vi)`. Its submerged
propeller creates turbulent wash, not a jet-ski nozzle stream.

The inlet/propeller samples the same waves used by the visible water. An exposed
inlet stops liquid flow immediately, and re-immersion recovers flow gradually.
This approximates **ventilation** (air ingestion), not vapor cavitation.
Reverse on the jet ski redirects discharge forwards/downwards through an
approximate reverse bucket; reverse on the outboard reverses the wash. Geometry
for an animated reverse bucket is not included.

Chine/pontoon emission starts near each hull's sampled waterline. Contact,
speed, yaw and lateral slip determine the two sides' spray independently.
Holding Shift without changing the physical state does not multiply spray.
Droplets inherit the vessel's velocity plus an ejection velocity, then experience
gravity and approximate quadratic aerodynamic drag. Millimetre droplets use
`k = 3 rho_air Cd / (4 rho_water diameter)`, with `Cd = 0.47`; this is an effective
spherical-droplet approximation. Rendered points represent groups of droplets.
Submerged discharge remains low surface froth unless an upward ski stream
actually crosses the surface. A short translucent core connects the visible
outlet to the breaking stream; foam and wakes are pooled and expire.

## Tuning and limits

`RIDE_MODES` and `PROPULSION` in `src/config.js` hold the mode, power, effective
mass, intake, nozzle, resistance and trim tuning. `propulsion.js` contains the
momentum calculations; `spray-model.js` contains contact and droplet rules.
Trim degrees are game tuning, not advertised factory trim angles. Q/E latches
trim on water and controls pitch in air. T cycles modes. Each craft's trim and
the riding mode are saved locally.

The spring buoyancy, powered wheelie assistance, yaw response, sliding modifier,
ramps and aerial trick control retain arcade approximations. The simulation
does not solve full rigid-body torque, a free surface fluid volume, pump blade
flow, real cavitation, individual droplet breakup, or wake buoyancy. The hull
stability assistance makes the game controllable; these equations alone cannot
establish real-world accuracy. Hardware play testing and measured manufacturer
curves would be needed to calibrate it further.
