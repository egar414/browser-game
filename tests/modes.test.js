import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { setSeaState, seaAmplitude } from '../src/config.js';
import { VehiclePhysics } from '../src/vehicles/physics.js';
import { earnProgress, validLoadout } from '../src/systems/progression.js';
import { Activities } from '../src/systems/activities.js';
import { sprayExposure, floodStep, SprayBattle } from '../src/systems/spray-battle.js';
import { loadSettings } from '../src/systems/storage.js';
const drive={throttle:1,steer:0,trim:0,freestyle:false};
test('sea conditions blend continuously and changing weather varies without phase resets',()=>{
 setSeaState('calm',0,true);const before=seaAmplitude(20);setSeaState('swell',20);assert.equal(seaAmplitude(20),before);assert(seaAmplitude(26)>before);assert.equal(seaAmplitude(33),3.4);
 setSeaState('changing',40,true);assert.notEqual(seaAmplitude(90),seaAmplitude(180));setSeaState('calm',0,true);
});
test('both craft launch from natural swell and bank wave hops after landing',()=>{
 try{setSeaState('swell',0,true);for(const type of ['ski','cat']){
  const events=[],v=new VehiclePhysics(type,()=>null,e=>events.push(e));v.x=1650;v.z=-1650;v.safe={x:1650,z:-1650,heading:0};v.heading=0;let air=0;
  for(let i=0;i<1800;i++){v.update(1/60,drive,i/60);if(v.airborne)air++;}
  assert(air>20);assert(events.some(e=>e.label==='Wave hop · landed'));assert(!events.some(e=>e.type==='wipeout'));
 }}finally{setSeaState('calm',0,true);}
});
test('combos earn durable garage unlocks and locked or corrupt loadouts fall back safely',()=>{
 const s=loadSettings({getItem:()=>null}),a=new Activities(new THREE.Scene(),s,()=>{});
 assert(earnProgress(s,260).includes('Race stripes'));s.design='race';validLoadout(s);assert.equal(s.design,'race');s.tuning='race';validLoadout(s);assert.equal(s.tuning,'stock');
 a.event({type:'score',label:'Clean air',points:100});a.event({type:'score',label:'Spray carve',points:100});assert(s.careerPoints>460);assert(a.combo>1);
 const roundtrip=loadSettings({getItem:()=>JSON.stringify(s)});assert.equal(roundtrip.careerPoints,s.careerPoints);assert.equal(roundtrip.design,'race');
});
test('only a real loaded spray volume floods a nearby hull; pools do not affect damage',()=>{
 const v=new VehiclePhysics('ski',()=>null);Object.assign(v,{x:0,z:0,y:.14,heading:0,vx:-6,vz:18,speed:18,slip:-6,yawRate:1,steer:1,throttle:1});
 const target={x:-2,y:.14,z:-3},wet=sprayExposure(v,target,0);assert(wet>.1);assert.equal(sprayExposure({...v,airborne:true},target,0),0);assert.equal(sprayExposure(v,{x:50,y:.14,z:0},0),0);
 let water=0;for(let i=0;i<600;i++)water=floodStep(water,wet,1/60);assert.equal(water,100);assert(floodStep(water,0,1)<water);
});
test('battle swamping starts a finite sinking interval and automatically recovers',()=>{
 const events=[],b=new SprayBattle(new THREE.Scene(),e=>events.push(e)),p=new VehiclePhysics('ski',()=>null);
 b.active=true;b.remaining=30;b.water=100;b.update(1/60,p,0);assert(b.sinking>0);assert(events.some(e=>e.type==='battle-sink'));
 for(let i=0;i<300;i++)b.update(1/60,p,i/60);assert.equal(b.sinking,0);assert.equal(b.water,0);assert(events.some(e=>e.type==='battle-recover'));b.cancel();assert(!b.active);
});
