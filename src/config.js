// All distances are metres; performance is arcade tuning, not manufacturer data.
export const FIXED_STEP = 1 / 60;
export const WORLD = { minX: -640, maxX: 640, minZ: -610, maxZ: 740 };
export const SPAWN = { x: -125, z: 112, heading: Math.PI };
export const VEHICLES = {
  ski: {
    name: 'Sparkplug', subtitle: 'Freestyle jet ski', description: 'Light, lively and made for mischief. Lift the bow, carve a rooster tail, and spin off the ramps.',
    length: 3.0, width: 1.18, acceleration: 10.7, reverseAcceleration: 3.4, maxSpeed: 25.5,
    reverseMax: 4, drag: 0.12, waterDrag: 0.009, lateralGrip: 3.7, steer: 1.08,
    slideGrip: 1.05, spring: 42, damping: 11, rideHeight: 0.14, airSteer: 4.9,
    wheelieAngle: 0.92, wipeoutAngle: 1.22, colours: ['#ff613d', '#86df9c', '#f5bd39'],
  },
  cat: {
    name: 'Tunnel Rat 50', subtitle: 'Inflatable racing catamaran', description: 'Twin pontoons. One lively outboard. Settle onto the plane and carry a wide, heavy spray through the bends.',
    length: 4.1, width: 2.05, acceleration: 7.1, reverseAcceleration: 2.5, maxSpeed: 27,
    reverseMax: 3.3, drag: 0.15, waterDrag: 0.0065, lateralGrip: 2.6, steer: 0.69,
    slideGrip: 0.92, spring: 34, damping: 10, rideHeight: 0.16, airSteer: 0.83,
    wheelieAngle: 0.25, wipeoutAngle: 1.08, colours: ['#f5bd39', '#ef745b', '#83d4ca'],
  },
};
export const WAVES = [
  { amplitude: 0.19, kx: 0.12, kz: 0.055, speed: 1.45 },
  { amplitude: 0.105, kx: -0.24, kz: 0.18, speed: 2.1 },
  { amplitude: 0.055, kx: 0.53, kz: 0.36, speed: 2.9 },
];
export function waveHeight(x, z, time) {
  const chop = 0.3 + 0.7 * Math.max(0, Math.min(1, (z - 40) / 230));
  return WAVES.reduce((h, w) => h + Math.sin(x * w.kx + z * w.kz + time * w.speed) * w.amplitude * chop, 0);
}
export const QUALITY = {
  Low: { pixelRatio: 1, waterSegments: 100, particles: 160, shadows: false, trees: 0.5 },
  Medium: { pixelRatio: 1.4, waterSegments: 160, particles: 340, shadows: false, trees: 0.75 },
  High: { pixelRatio: 1.75, waterSegments: 220, particles: 650, shadows: true, trees: 1 },
};
export const RACE = [
  [-125, 10], [-125, -220], [-125, -470], [85, -470], [85, -275],
  [280, -275], [275, -85], [275, 140], [430, 180], [280, 280], [30, 200], [-125, 112],
];
export const STUNT = { x: 165, z: 245, radius: 125 };
