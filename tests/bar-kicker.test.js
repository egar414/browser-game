import test from 'node:test';
import assert from 'node:assert/strict';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {BAR_RAMP} from '../src/vehicles/ramps.js';
import {BAR_LAUNCH} from '../src/systems/bar-guide.js';
import {waveHeight,setSeaState} from '../src/ocean.js';
import {collision} from '../src/systems/environment.js';
const input={throttle:1,steer:0,trim:0,freestyle:false};
test('both craft can ride the floating curved kicker and bank a clean landing',()=>{
 setSeaState('swell',0,true);
 try{for(const type of ['ski','cat']){
  const events=[],v=new VehiclePhysics(type,collision,e=>events.push(e));v.respawnAt(BAR_LAUNCH,0);let launched=false,max=0;
  for(let i=0;i<1000;i++){v.update(1/60,input,i/60,[BAR_RAMP]);if(v.airborne&&!v.waveLaunch&&Math.abs(v.z-BAR_RAMP.z)<25)launched=true;max=Math.max(max,v.y);}
  assert(launched,type);assert(max>4&&max<12);assert(events.some(e=>e.label==='Clean air'));assert(!events.some(e=>e.type==='wipeout'));
 }}finally{setSeaState('calm',0,true);}
});
test('changing hulls can respawn at the exact water location and heading with motion cleared',()=>{
 setSeaState('swell',0,true);
 try{for(const type of ['cat','ski']){
  const v=new VehiclePhysics(type==='cat'?'ski':'cat',collision),where={x:580,z:-1680,heading:.8};v.vx=12;v.vz=-5;v.setType(type);v.respawnAt(where,10);
  assert.equal(v.type,type);assert.equal(v.x,where.x);assert.equal(v.z,where.z);assert.equal(v.heading,where.heading);assert.equal(v.vx,0);assert.equal(v.vz,0);assert.equal(v.airborne,false);assert(Math.abs(v.y-waveHeight(v.x,v.z,10)-v.config.rideHeight)<1e-6);
 }}finally{setSeaState('calm',0,true);}
});
test('a legitimate deep swell trough does not trigger an absolute-height reset',()=>{
 setSeaState('swell',0,true);
 try{const v=new VehiclePhysics('ski',()=>null);v.respawnAt({x:610,z:-1650,heading:0},192.7);v.y=waveHeight(v.x,v.z,192.7)-.15;
  assert(v.y< -3);v.update(1/60,{...input,throttle:0},192.7);assert(v.y< -3);assert.equal(v.x,610);assert.equal(v.z,-1650);
 }finally{setSeaState('calm',0,true);}
});
