import mapData from './data/mooloolaba.json' with {type:'json'};
// All distances are metres; performance is arcade tuning, not manufacturer data.
export const FIXED_STEP = 1 / 60;
export const WORLD = mapData.world;
export const SPAWN = mapData.spawn;
export const VEHICLES = {
  ski: {
    name: 'Sparkplug', subtitle: 'Freestyle jet ski', description: 'Light, lively and made for mischief. Lift the bow, carve a rooster tail, and spin off the ramps.',
    length: 3.0, width: 1.18, maxSpeed: 25.5,
    reverseMax: 4, lateralGrip: 3.7,
    slideGrip: 1.05, spring: 42, damping: 11, rideHeight: 0.14, airSteer: 4.9,
    wheelieAngle: 0.92, wipeoutAngle: 1.22, colours: ['#1679e8', '#ff613d', '#86df9c'],
  },
  cat: {
    name: 'Tunnel Rat 50', subtitle: 'Inflatable racing catamaran', description: 'Twin pontoons. One lively outboard. Settle onto the plane and carry a wide, heavy spray through the bends.',
    length: 4.1, width: 2.05, maxSpeed: 27,
    reverseMax: 3.3, lateralGrip: 2.6,
    slideGrip: 0.92, spring: 34, damping: 10, rideHeight: 0.16, airSteer: 0.83,
    wheelieAngle: 0.75, wipeoutAngle: 1.08, colours: ['#e7ece9', '#ef745b', '#83d4ca'],
  },
  tinny: {
    name:'Tender Rat 225', subtitle:'2.25 m alloy tender · 25 hp',
    description:'Open aluminium tender, bench seats and a lively 25 hp outboard. Carve, shift your weight aft and throw water off the chines.',
    length:2.25,width:1.22,maxSpeed:15.5,reverseMax:2.8,
    lateralGrip:3.05,slideGrip:.54,spring:46,damping:12,rideHeight:.12,airSteer:1.15,
    wheelieAngle:.90,wipeoutAngle:1.13,colours:['#bdc9cc','#c7d8ca','#d8d0b9'],
  },
};
export { WAVES,WAVE_FIELD,SEA_STATES,OCEAN_SWELL,OCEAN_TUNING,waveChop,waveHeight,seaAmplitude,setSeaState,setWeatherClock,hourlyForecast,oceanReport,oceanExposure } from './ocean.js';
export const QUALITY = {
  Low: { pixelRatio: .75, waterSegments: 100, particles: 600, plumeDensity:.65, wakeSamples: 125, fanSegments: 8, reflectionSize: 0, shadows: false, trees: 0.5 },
  Medium: { pixelRatio: 1.25, waterSegments: 160, particles: 1400, plumeDensity:.75, wakeSamples: 180, fanSegments: 12, reflectionSize: 256, shadows: false, trees: 0.75 },
  High: { pixelRatio: 1.65, waterSegments: 220, particles: 2400, plumeDensity:.85, wakeSamples: 230, fanSegments: 16, reflectionSize: 512, shadows: true, trees: 1 },
};
export const RACE = mapData.race;
export const STUNT = mapData.stunt;

// Effective simulation values, not measured manufacturer specifications.
export const RIDE_MODES = {
  cruise: { name:'Cruise', power:.64, throttleResponse:2.25, brakePower:.52, reversePower:.38, gateResponse:7, description:'Smooth throttle and relaxed cruising.' },
  sport: { name:'Sport', power:1, throttleResponse:3.6, brakePower:.72, reversePower:.48, gateResponse:9, description:'Full power with the familiar responsive handling.' },
  freestyle: { name:'Freestyle', power:1, throttleResponse:5.2, brakePower:.82, reversePower:.58, gateResponse:14, description:'Sharper throttle, brake and reverse response. Shift moves your weight aft.' },
};
// Nine VTS selections are documented by BRP; these angles are original game tuning.
export const SKI_TRIM_POSITIONS = [-10,-7.5,-5,-2.5,0,4,8,13,19];
export const HYDRODYNAMICS = {
  ski:{coastDrag:1,planingStart:4,planingEnd:13,minimumWetted:.56,pitchSpring:17,pitchDamping:6.8,rollSpring:24,rollDamping:8.2,yawInertia:340,yawDamping:2.7,yawSpeedDamping:.09},
  cat:{bowPloughDrag:.32,coastDrag:3.5,planingStart:5,planingEnd:15,minimumWetted:.62,pitchSpring:12,pitchDamping:5.4,rollSpring:19,rollDamping:7,yawInertia:550,yawDamping:2.2,yawSpeedDamping:.04},
  tinny:{bowPloughDrag:.48,coastDrag:2.8,planingStart:3.5,planingEnd:9,minimumWetted:.58,pitchSpring:16,pitchDamping:6.5,rollSpring:23,rollDamping:8,yawInertia:125,yawDamping:2.8,yawSpeedDamping:.065},
};
// Arcade chine catch/release during a powered tender spray turn. All reactions
// require speed, wet contact and steering load; they never trigger a jump.
export const TINNY_HANDLING={steerResponse:9,slideYawGain:.38,slideYawLimit:2.15,
  bowStart:1.6,bowRange:3.2,bowSteeringLoss:.42,
  bounceHz:1.12,chineLift:.22,pitchBounce:.20,rollBounce:.085,loadedDamping:7.8};
export const PROPULSION = {
  ski:{
    kind:'waterjet',effectiveMass:330,maximumRpm:8000,idleFraction:.13,
    hydraulicPower:55000,nozzleArea:.0048,nozzleRadius:.039,steeringAngle:.43,
    nozzleMount:[0,-.04,-1.5],nozzleLength:.16,intake:[0,-.27,-.95],fullImmersion:.11,
    linearResistance:20,quadraticResistance:2.17,reverseEfficiency:.46,trimRate:9,
  },
  cat:{
    kind:'propeller',effectiveMass:360,maximumRpm:5500,idleFraction:.14,
    shaftPower:37300,propellerArea:.053,steeringAngle:.44,
    motorMount:[.18,.4,-1.65],propeller:[0,-.72,-.23],fullImmersion:.13,
    linearResistance:14,quadraticResistance:1.45,reverseEfficiency:.5,trimRate:6,
  },
  tinny:{
    kind:'propeller',effectiveMass:185,maximumRpm:5600,idleFraction:.14,
    shaftPower:18640,propellerArea:.034,steeringAngle:.55,
    motorMount:[.12,.27,-1.12],propeller:[0,-.65,-.18],fullImmersion:.12,
    linearResistance:13,quadraticResistance:1.25,reverseEfficiency:.44,trimRate:5,
  },
};
