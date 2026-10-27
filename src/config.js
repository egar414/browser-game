import{SPORTFISHER_LENGTH,sportfisherZ}from'./vehicles/sportfisher-shape.js';
import mapData from './data/mooloolaba.json' with {type:'json'};
// All distances are metres; performance is arcade tuning, not manufacturer data.
export const FIXED_STEP = 1 / 60;
// The mapped coast stays unchanged; add an authored offshore run to the east.
export const OFFSHORE_RUN={start:{x:2300,z:-2600,heading:Math.PI/2},finishX:8500,maxX:9500};
export const WORLD = {...mapData.world,maxX:OFFSHORE_RUN.maxX};
export const SPAWN = mapData.spawn;
// Clear water on the mapped Wyuna Canal, in the added upstream reach.
export const UPSTREAM_LAUNCH={x:112.9,z:2502.7,heading:Math.atan2(8.6,-49.8)};
export const LOCAL_TRAFFIC={lookAhead:10,avoidDistance:14,stuckSeconds:9,
  riverSpeed:4.4,canalSpeed:3.0,viewDistance:520,visible:{Low:5,Medium:8,High:10}};
export const VEHICLES = {
  ski: {
    name: 'Sea-Doo Spark Trixx', subtitle: 'Freestyle jet ski', description: 'Light, lively and made for mischief. Lift the bow, carve a rooster tail, and spin off the ramps.',
    length: 3.0, width: 1.18, maxSpeed: 25.5,
    reverseMax: 4, lateralGrip: 4.6, steerResponse: 8,
    slideGrip: 1.15, spring: 42, damping: 11, rideHeight: 0.14, airSteer: 4.9,
    wheelieAngle: 0.92, wipeoutAngle: 1.22, colours: ['#1260f4', '#ff613d', '#86df9c'],
  },
  cat: {
    name: 'Tunnel Rat 50', subtitle: 'Inflatable racing catamaran', description: 'Twin pontoons. One lively outboard. A 110 km/h gameplay speed ceiling, with wide, heavy spray through the bends.',
    length: 4.1, width: 2.05, maxSpeed: 110 / 3.6,
    reverseMax: 3.3, lateralGrip: 2.6,
    slideGrip: 0.92, spring: 34, damping: 10, rideHeight: 0.16, airSteer: 0.83,
    wheelieAngle: 0.89, wipeoutAngle: 1.25, colours: ['#e7ece9', '#ef745b', '#83d4ca'],
  },
  tinny: {
    name:'Tender Rat 225', subtitle:'2.25 m alloy tender · 25 hp',
    description:'Open aluminium tender, bench seats and a lively 25 hp outboard. Carve, shift your weight aft and throw water off the chines.',
    length:2.25,width:1.22,maxSpeed:15.5,reverseMax:2.8,
    lateralGrip:3.05,slideGrip:.54,spring:46,damping:12,rideHeight:.12,airSteer:1.15,
    wheelieAngle:1.10,wipeoutAngle:1.55,colours:['#bdc9cc','#c7d8ca','#d8d0b9'],
  },
};
export { WAVES,WAVE_FIELD,SEA_STATES,OCEAN_SWELL,OCEAN_TUNING,waveChop,waveHeight,seaAmplitude,setSeaState,setWeatherClock,hourlyForecast,oceanReport,oceanExposure } from './ocean.js';
export const QUALITY = {
  Low: { pixelRatio: .65, waterSegments: 72, particles: 600, plumeDensity:.65, wakeSamples: 125, fanSegments: 8, reflectionSize: 0, reflectionHz:0, shadowSize:512, shadowExtent:56, shadows: false, trees: 0.4 },
  Medium: { pixelRatio: 1.0, waterSegments: 160, particles: 1400, plumeDensity:.75, wakeSamples: 180, fanSegments: 12, reflectionSize: 384, reflectionHz:8, shadowSize:1024, shadowExtent:36, shadows: true, trees: 0.75 },
  High: { pixelRatio: 1.65, waterSegments: 220, particles: 2400, plumeDensity:.85, wakeSamples: 230, fanSegments: 16, reflectionSize: 768, reflectionHz:30, shadowSize:2048, shadowExtent:48, shadows: true, trees: 1 },
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
  ski:{coastDrag:1,planingStart:4,planingEnd:13,minimumWetted:.56,pitchSpring:17,pitchDamping:6.8,rollSpring:24,rollDamping:8.2,yawInertia:275,yawDamping:2.9,yawSpeedDamping:.075},
  cat:{bowPloughDrag:.32,coastDrag:3.5,planingStart:5,planingEnd:15,minimumWetted:.62,pitchSpring:12,pitchDamping:5.4,rollSpring:19,rollDamping:7,yawInertia:550,yawDamping:2.2,yawSpeedDamping:.04,waterFollow:.65,reserveBuoyancy:80,reserveDepth:.20,maxReserve:18},
  tinny:{bowPloughDrag:.48,waterFollow:.85,reserveBuoyancy:95,reserveDepth:.13,maxReserve:20,coastDrag:2.8,planingStart:3.5,planingEnd:9,minimumWetted:.58,pitchSpring:16,pitchDamping:6.5,rollSpring:23,rollDamping:8,yawInertia:125,yawDamping:2.8,yawSpeedDamping:.065},
};
// Arcade chine catch/release during a powered tender spray turn. All reactions
// require speed, wet contact and steering load; they never trigger a jump.
export const TINNY_HANDLING={steerResponse:10,slideYawGain:.48,slideYawLimit:2.25,
  bowStart:1.3,bowRange:2.6,bowSteeringLoss:.38,surgePitch:.035,sternSupport:.33,
  bounceHz:.95,chineLift:.24,pitchBounce:.34,rollBounce:.12,loadedDamping:7.2};
// Broader twin-pontoon support: slower catch/release and less pitch authority
// than the short tender. Clip-inspired arcade values, not real craft limits.
export const CAT_HANDLING={steerResponse:7.8,slideYawGain:.60,slideYawLimit:1.75,
  bowStart:2.4,bowRange:3.5,bowSteeringLoss:.48,surgePitch:.025,sternSupport:.34,
  bowSpeedStart:10,bowSpeedRange:6,bowSpeedLoss:.18,
  bounceHz:.83,chineLift:.17,pitchBounce:.14,rollBounce:.06,loadedDamping:7.4};
export const PROPULSION = {
  ski:{
    kind:'waterjet',effectiveMass:330,maximumRpm:8000,idleFraction:.13,
    hydraulicPower:55000,nozzleArea:.0048,nozzleRadius:.039,steeringAngle:.43,
    nozzleMount:[0,-.04,-1.5],nozzleLength:.16,intake:[0,-.27,-.95],fullImmersion:.11,
    linearResistance:20,quadraticResistance:2.17,reverseEfficiency:.46,trimRate:9,
  },
  cat:{
    kind:'propeller',effectiveMass:360,maximumRpm:5500,idleFraction:.14,
    shaftPower:37300,propellerArea:.053,steeringAngle:.49,
    motorMount:[.18,.4,-1.65],propeller:[0,-.72,-.23],fullImmersion:.13,
    linearResistance:14,quadraticResistance:.15,reverseEfficiency:.5,trimRate:6,
  },
  tinny:{
    kind:'propeller',effectiveMass:185,maximumRpm:5600,idleFraction:.14,
    shaftPower:18640,propellerArea:.034,steeringAngle:.55,
    motorMount:[.12,.27,-1.12],propeller:[0,-.65,-.18],fullImmersion:.12,
    linearResistance:13,quadraticResistance:1.25,reverseEfficiency:.44,trimRate:5,
  },
};

// Heavy twin-screw sportfisher; gameplay values, not manufacturer performance.
VEHICLES.cruiser={...VEHICLES.cat,name:'Reef Runner 38',subtitle:'Flybridge sportfisher',description:'Drive a big fishing boat. Slow down, press J to leave the helm, walk the rear cockpit and cast beyond the bar.',length:SPORTFISHER_LENGTH,width:3.96,maxSpeed:15.5,reverseMax:2.6,rideHeight:.1,colours:['#254761','#2c7e85','#b0bbbe']};
PROPULSION.cruiser={...PROPULSION.cat,effectiveMass:6500,motorMount:[0,.3,sportfisherZ(-4.5)],propeller:[0,-.8,-.4],maximumRpm:4000};
HYDRODYNAMICS.cruiser={...HYDRODYNAMICS.cat};

export const isJet=type=>type==='ski'||type==='seago'||type==='hyper';
export const SPORTFISHER_HEIGHT=10.8;
// Original long-hull performance PWC; 120 km/h is a game speed ceiling.
VEHICLES.seago={...VEHICLES.ski,name:'Seago 120',subtitle:'Performance touring jet ski',description:'A longer, black performance hull with a 120 km/h game speed ceiling. Nine trim settings, powerful carving and a balanced bow ride.',length:3.65,width:1.32,maxSpeed:120/3.6,reverseMax:4,lateralGrip:5.1,steerResponse:11,slideGrip:1.2,spring:45,damping:12,airSteer:2.8,wheelieAngle:.82,wipeoutAngle:1.27,colours:['#b83836','#3a91ba','#b2bfc4']};
PROPULSION.seago={...PROPULSION.ski,effectiveMass:420,hydraulicPower:128000,nozzleArea:.0065,nozzleMount:[0,-.06,-1.8],intake:[0,-.29,-1.2],linearResistance:23,quadraticResistance:2.15,steeringAngle:.49};
HYDRODYNAMICS.seago={...HYDRODYNAMICS.ski,planingStart:5,planingEnd:16,yawInertia:430,yawSpeedDamping:.055,pitchSpring:21,pitchDamping:8};

// Fictional offshore racing cat: the requested 500 km/h is arcade performance.
VEHICLES.racer={...VEHICLES.cat,name:'Riptide 500',subtitle:'Twin-engine offshore racing cat',description:'A 12 m closed-cockpit racing cat with twin inboard bays and surface drives. Massive planing spray. 500 km/h is fictional arcade tuning. Launches on the offshore speed run.',length:12.4,width:4.4,maxSpeed:500/3.6,reverseMax:4.5,rideHeight:.18,wheelieAngle:.10,wipeoutAngle:1.5,colours:['#28a8c4','#f36545','#8ac9a7']};
PROPULSION.racer={...PROPULSION.cat,effectiveMass:4000,maximumRpm:7000,motorMount:[0,.1,-5.7],propeller:[0,-.28,-.58],shaftPower:1_200_000};
HYDRODYNAMICS.racer={...HYDRODYNAMICS.cat};

// Original photo-inspired flagship PWC. All high-speed/extended-trim values are arcade.
export const APEX_TRIM_POSITIONS=[-12,-8,-4,0,4,8,12,17,22,28,36];
export const jetTrimPositions=type=>type==='hyper'?APEX_TRIM_POSITIONS:SKI_TRIM_POSITIONS;
export const APEX_HANDLING={steerResponse:10,yawLimit:2.8,turnSpeedScale:45,highSpeedStart:35,highSpeedEnd:83.333,highSpeedYawScale:.75,highSpeedGrip:2.3,highSpeedSteerResponse:10,highSpeedYawDamping:.7,airPitch:1.25,airPitchLimit:1.22,bowTargetLimit:1.36,landingPitchLimit:1.02,trickMultiplier:1.25,boundaryMargin:350};
VEHICLES.hyper={...VEHICLES.seago,name:'Apex 300',subtitle:'Extreme performance freestyle jet ski',description:'Champagne hull, red shoulders and a sculpted black deck. 300 km/h arcade speed, eleven extended-trim positions, huge falling spray and the quickest aerial spins. Q trims up, Shift lifts; Y adds a Heart attack in the air. High trim trades speed for bow lift.',length:3.62,width:1.30,maxSpeed:300/3.6,reverseMax:5,lateralGrip:6.4,slideGrip:1.55,spring:62,damping:16,rideHeight:.16,airSteer:8.5,wheelieAngle:.88,wipeoutAngle:1.56,colours:['#b9b49b','#d0dce0','#414b53']};
PROPULSION.hyper={...PROPULSION.seago,effectiveMass:390,maximumRpm:9500,hydraulicPower:850000,nozzleArea:.0075,nozzleMount:[0,-.06,-1.81],intake:[0,-.34,-1.38],fullImmersion:.12,linearResistance:16,quadraticResistance:.65,steeringAngle:.42};
HYDRODYNAMICS.hyper={...HYDRODYNAMICS.seago,planingStart:4,planingEnd:16,yawInertia:1100,yawDamping:3.8,yawSpeedDamping:.025,pitchSpring:24,pitchDamping:10,rollSpring:29,rollDamping:10,waterFollow:.75,reserveBuoyancy:80,reserveDepth:.2,maxReserve:12};


export const TINNY_TYPES=['tinny','dinghy','skua'];
export const isTinny=type=>TINNY_TYPES.includes(type);
VEHICLES.tinny.restPitch=.065;VEHICLES.tinny.restRoll=-.018;
VEHICLES.dinghy={...VEHICLES.tinny,name:'Dingi 200 / 50',subtitle:'2.00 m alloy dinghy · 50 hp arcade',description:'Short silver alloy hull, oversized 50 hp outboard and a stern-heavy stance. I / WOMP builds the bounce; Shift carries it into a shaft or a sharp spray turn.',length:2,width:1.16,maxSpeed:22,lateralGrip:3.6,slideGrip:.65,restPitch:.14,restRoll:-.035,wompRequired:true,sprayScale:1.55,colours:['#c3c9c7','#d1d6d0','#aebdc1']};
VEHICLES.skua={...VEHICLES.tinny,name:'Super Skua 370 / 50',subtitle:'3.70 m racing tinny · 50 hp arcade',description:'Longer black-and-gold racing alloy hull with two crew and a 50 hp outboard. Build a rhythm with I / WOMP, then lift into a shaft or carve a broad falling spray.',length:3.7,width:1.58,maxSpeed:25,lateralGrip:3.3,slideGrip:.7,spring:40,damping:12.5,restPitch:.095,restRoll:-.024,wompRequired:true,sprayScale:1.8,colours:['#252e34','#233f49','#4a3035']};
for(const type of ['dinghy','skua']){
 const c=VEHICLES[type];PROPULSION[type]={...PROPULSION.tinny,effectiveMass:type==='dinghy'?220:310,shaftPower:37300,maximumRpm:5600,propellerArea:.052,motorMount:[.12,.4,-c.length*.498],propeller:[0,-.8125,-.225],linearResistance:15,quadraticResistance:type==='dinghy'?1.2:1.35};
 HYDRODYNAMICS[type]={...HYDRODYNAMICS.tinny,yawInertia:type==='dinghy'?150:280,pitchSpring:type==='dinghy'?18:14,pitchDamping:7.2,rollSpring:25,rollDamping:8};
}

// Original photo-inspired dive launches. Dimensions and handling are gameplay approximations.
export const isDiveBoat=type=>type==='dive'||type==='rib';
for(const [type,name,length,width,speed,height] of [
 ['dive','Reef Buddy 28',8.6,3.0,12.5,3.5],['rib','Reef Scout 22',6.8,2.65,19,2.9]]){
 VEHICLES[type]={...VEHICLES.cruiser,name,subtitle:type==='dive'?'Cabin dive launch':'Centre-console dive RIB',description:type==='dive'?'White cabin launch with open dive deck, tank racks, stern platform and boarding ladder. Take it to Buddy Reef to snorkel, freedive and spearfish.':'Dark inflatable tubes, teak-style deck, shaded console and rear swim platforms. A nimble launch for reef diving and selling your catch.',length,width,maxSpeed:speed,rideHeight:.1,height,colours:type==='dive'?['#27758b','#2d719d','#59a49a']:['#3b4851','#536d62','#344d68'],diveBoat:true,cruiseHandling:{forwardSpeed:speed,turnRate:type==='rib'?.68:.46,powerResponse:type==='rib'?.45:.32}};
 PROPULSION[type]={...PROPULSION.cruiser,effectiveMass:type==='rib'?1200:3200,motorMount:[0,.35,-length*.46],propeller:[0,-.8,-.3]};
 HYDRODYNAMICS[type]={...HYDRODYNAMICS.cruiser};
}

// Original snowmobile water-skipper; dedicated land-start physics.
VEHICLES.sled={...VEHICLES.ski,name:'Track Rat',subtitle:'Land-launch water-skipping snowmobile',description:'Build 54+ km/h on the marked beach run-up, then skim on the rear track. Stay above 42 km/h; slowing down swamps it. Shift lifts the skis, Q/E balances the nose, R returns to dry land. Arcade physics.',length:3.05,width:1.3,maxSpeed:34,reverseMax:2,rideHeight:.22,colours:['#d4ed35','#ff7040','#49b8d1']};
PROPULSION.sled={...PROPULSION.cat,kind:'track',effectiveMass:300,motorMount:[0,0,-.7],propeller:[0,-.2,-.15],trimRate:6};
HYDRODYNAMICS.sled={...HYDRODYNAMICS.ski};
