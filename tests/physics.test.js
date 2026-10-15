import test from 'node:test';
import assert from 'node:assert/strict';
import { VehiclePhysics } from '../src/vehicles/physics.js';
import { waveHeight, FIXED_STEP, RACE, VEHICLES } from '../src/config.js';
import { collision, ramps } from '../src/systems/environment.js';
import { loadSettings } from '../src/systems/storage.js';
import { Activities } from '../src/systems/activities.js';
import * as THREE from 'three';
const idle={throttle:0,steer:0,trim:0,freestyle:false};
function advance(v,seconds,input=idle,obstacles=[]){for(let i=0;i<seconds/FIXED_STEP;i++)v.update(FIXED_STEP,{...idle,...input},i*FIXED_STEP,obstacles);}
function openBoat(type='ski',events=[]){const v=new VehiclePhysics(type,()=>null,e=>events.push(e));v.x=-100;v.z=100;v.heading=0;v.safe={x:-100,z:100,heading:0};return v;}
test('both craft accelerate, brake and reverse with distinct handling',()=>{
  const speeds=[];
  for(const type of ['ski','cat']){const v=openBoat(type);advance(v,2,{throttle:1});assert(v.speed>7);speeds.push(v.speed);const max=v.speed;advance(v,1,{throttle:-1});assert(v.speed<max);advance(v,5,{throttle:-1});assert(v.vz<0);assert(v.speed<VEHICLES[type].reverseMax+1);}
  assert(speeds[0]>speeds[1]*1.2);
});
test('steering has momentum and less authority when coasting',()=>{
  const a=openBoat(),b=openBoat();advance(a,1,{throttle:1});advance(b,1,{throttle:1});advance(a,1,{throttle:1,steer:1});advance(b,1,{steer:1});assert(a.heading>b.heading*1.5);assert(a.slip!==0);
});
test('stationary idle and held trick inputs do not generate points',()=>{
  for(const input of [idle,{...idle,freestyle:true,steer:1,trim:1}]){const events=[],v=openBoat('ski',events);advance(v,90,input);assert.equal(events.filter(e=>e.type==='score').length,0);assert(v.speed<.01);}
});
test('four-point buoyancy follows the same surface without persistent clipping',()=>{
  for(const type of ['ski','cat']){const v=openBoat(type);v.z=300;let sum=0;for(let i=0;i<1200;i++){v.update(FIXED_STEP,idle,i*FIXED_STEP);if(i>600)sum+=Math.abs(v.y-waveHeight(v.x,v.z,i*FIXED_STEP)-v.config.rideHeight);}assert(sum/599<.15);assert(Number.isFinite(v.roll));}
});
test('powered bow lift scores, and over-trimming eventually wipes out',()=>{
  const events=[],v=openBoat('ski',events);v.setMode('freestyle');advance(v,4,{throttle:1,freestyle:true});assert(events.some(e=>e.label==='Bow rider'));advance(v,3,{throttle:1,freestyle:true,trim:1});assert(events.some(e=>e.type==='wipeout'));
});
test('ramps launch both craft, landing banks air score only once',()=>{
  for(const type of ['ski','cat']){const events=[],v=openBoat(type,events);v.x=ramps[0].x;v.z=205;v.vz=20;let airborne=false;for(let i=0;i<360;i++){v.update(FIXED_STEP,{...idle,throttle:i<90?1:0},i*FIXED_STEP,ramps);if(v.airborne)airborne=true;}assert(airborne,`${type} should launch`);assert(events.some(e=>e.type==='splash'),`${type} should land`);assert(events.some(e=>e.type==='score'&&e.label==='Clean air'),`${type} should score clean air`);}
});
test('land, docks and bridge approaches are respected; water routes are clear',()=>{
  assert(collision(-220,0));assert(collision(-12,-300));
  for(const [x,z] of [[-125,-235],[85,-145],[-125,110],[430,150],[425,-70],[0,200]])assert.equal(collision(x,z,2),null,`passage ${x},${z}`);
  const v=new VehiclePhysics('ski',collision);v.x=-175;v.z=-30;v.heading=-Math.PI/2;advance(v,4,{throttle:1});assert(v.x>-185);
});
test('a completed aerial spin is scored after landing and rough landings wipe out',()=>{
  const events=[],v=openBoat('ski',events);v.x=245;v.z=260;v.vz=25;
  for(let i=0;i<300;i++)v.update(FIXED_STEP,{...idle,throttle:1,steer:v.airborne&&Math.abs(v.spin)<6?1:0},i*FIXED_STEP,ramps);
  assert(events.some(e=>e.label==='360° spin · landed'));
  const bad=[],b=openBoat('cat',bad);b.launch(5,1.05);advance(b,3);assert(bad.some(e=>e.type==='wipeout'));
});
test('recovery selects nearby safe water and world limits cannot trap a boat',()=>{
  const v=new VehiclePhysics('cat',collision);v.x=-182;v.z=-20;v.recover(true);assert.equal(collision(v.x,v.z,4),null);assert(Math.hypot(v.x+182,v.z+20)<80);
  v.x=700;v.update(FIXED_STEP,idle,0);assert(v.x<640);assert.equal(v.speed,0);
});
test('the entire checkpoint route is navigable between gates',()=>{
  for(let i=1;i<RACE.length;i++){const a=RACE[i-1],b=RACE[i];for(let t=0;t<=1;t+=.025){const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;assert.equal(collision(x,z,3),null,`leg ${i} at ${x.toFixed(1)},${z.toFixed(1)}`);}}
});
test('race completes and can restart; timed challenge ends and inactivity scores zero',()=>{
  const settings={bestRace:0,bestTricks:0},a=new Activities(new THREE.Scene(),settings,()=>{});
  a.startRace();for(const p of RACE)a.update(1,{x:p[0],z:p[1]});assert.equal(a.race,null);assert(settings.bestRace>0);a.startRace();assert.equal(a.race.index,0);
  a.startChallenge();a.update(91,{x:0,z:0});assert.equal(a.challenge,null);assert.equal(settings.bestTricks,0);
});
test('holding a single repeated scoring action cannot farm unlimited points',()=>{
  const a=new Activities(new THREE.Scene(),{bestRace:0,bestTricks:0},()=>{});
  for(let i=0;i<5;i++)a.event({type:'score',label:'Bow rider',points:100});const banked=a.score;
  for(let i=0;i<100;i++)a.event({type:'score',label:'Bow rider',points:100});assert.equal(a.score,banked);
  a.event({type:'score',label:'Spray carve',points:75});assert(a.score>banked);
});
test('corrupt or unavailable preferences recover safely',()=>{
  for(const value of ['nope','null','{"vehicle":"bad","quality":"bad","master":9}']){const s=loadSettings({getItem:()=>value});assert.equal(s.vehicle,'ski');assert(s.master<=1);}
  assert.equal(loadSettings({getItem(){throw new Error('blocked');}}).vehicle,'ski');
});
