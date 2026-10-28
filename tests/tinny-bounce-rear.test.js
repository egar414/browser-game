import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';
import{VehiclePhysics}from'../src/vehicles/physics.js';import{setSeaState}from'../src/config.js';import{minimumHullClearance}from'../src/vehicles/shafting.js';import{tinnyBounce}from'../src/vehicles/tinny-bounce.js';import{ChaseCamera}from'../src/systems/camera.js';
test('tinny stays steady cruising, bounces only shafting with hull splashes, and settles off power',()=>{
 setSeaState('calm',0,true);
 for(const freestyle of [false,true])for(const hz of [30,60,120]){
 const events=[],v=new VehiclePhysics('tinny',()=>null,e=>events.push({...e,boatX:v.x,boatZ:v.z}));v.x=-200;v.z=-1000;v.heading=0;let low=Infinity,high=-Infinity,clear=Infinity;
 for(let i=0;i<hz*12;i++){v.update(1/hz,{throttle:1,steer:0,trim:0,freestyle},i/hz);assert(!v.wipeout&&!v.airborne);if(i>hz*5){low=Math.min(low,v.pitch);high=Math.max(high,v.pitch);clear=Math.min(clear,minimumHullClearance(v,i/hz));}}
 if(freestyle)assert(high-low>.07);else{assert(high-low<.025);assert.equal(v.bounceLoad,0);assert.equal(v.hullHits,0);}if(freestyle)assert(clear>-.31&&clear<.04,'immersed lower hull remains supported');
 const contacts=events.filter(e=>e.contact&&!e.wash);if(freestyle)assert(contacts.length>4&&contacts.length<180);else assert.equal(contacts.length,0);assert(contacts.every(e=>Math.hypot(e.x-e.boatX,e.z-e.boatZ)<1.5&&e.impact>.25&&e.impact<=4));
 for(let i=0;i<hz*5;i++)v.update(1/hz,{throttle:0,steer:0,trim:0,freestyle:false},12+i/hz);assert(v.bounceLoad<.02);v.recover();assert.equal(v.hullHits,0);assert.equal(v.contactDepths,null);
 }
});
test('bounce stays inactive at rest, airborne and on other craft',()=>{
 for(const change of [{speed:0},{airborne:true},{wipeout:1}]){const v={type:'tinny',speed:10,throttle:1,drive:{wetness:1},...change};for(let i=0;i<120;i++){const b=tinnyBounce(v,1/60);assert.equal(Math.abs(b.lift),0);assert.equal(Math.abs(b.pitch),0);}}
 assert.deepEqual(tinnyBounce({type:'cat'},1/60),{lift:0,pitch:0});
});
test('held rear view reverses camera direction and restores chase/first person immediately on release',()=>{
 for(const mode of [0,1,2]){const camera=new THREE.PerspectiveCamera(),chase=new ChaseCamera(camera),v={type:'tinny',x:1040,y:1,z:-1770,heading:Math.PI/2,speed:10,pitch:0,shaftLoad:0},input={orbit:0,dragging:false,held:()=>false};
 chase.update(1/60,v,input,mode);const forward=camera.getWorldDirection(new THREE.Vector3());input.held=()=>true;chase.update(1/60,v,input,mode);const rear=camera.getWorldDirection(new THREE.Vector3());assert(forward.dot(rear)<-.4);assert(chase.rearView);input.held=()=>false;chase.update(1/60,v,input,mode);assert(camera.getWorldDirection(new THREE.Vector3()).dot(forward)>.99);assert(!chase.rearView);
 }
});
test('sportfisher rear chase camera stays outside the longer bow',()=>{
 const camera=new THREE.PerspectiveCamera(),chase=new ChaseCamera(camera),v={type:'cruiser',x:1040,y:1,z:-1770,heading:0,speed:10},input={orbit:0,held:()=>true};chase.update(1/60,v,input,0);assert(camera.position.z-v.z>12);assert(camera.position.y-v.y>=10);
});
test('shaft touchdown sprays from the real waterline intersections with bounded origins and separate cooldowns',async()=>{
 const {hullContactSplash}=await import('../src/vehicles/tinny-bounce.js'),{sampleHullContacts,hullWaterlineContacts,HULL_CONTACT_LIMIT}=await import('../src/vehicles/hull-support.js'),{waveHeight}=await import('../src/config.js');setSeaState('calm',0,true);
 const events=[],v={type:'tinny',x:-200,z:-1000,y:.12,pitch:0,roll:0,heading:0,speed:10,shaftLoad:1,onEvent:e=>events.push(e)};
 v.contactDepths=sampleHullContacts(v,0).flatMap(row=>row.points.map(()=>.5));const expected=hullWaterlineContacts(v,0);
 hullContactSplash(v,1/60,0);assert.equal(events.length,1);assert.equal(events[0].contacts.length,expected.length);assert(expected.length>3&&expected.length<=HULL_CONTACT_LIMIT);
 for(const p of expected){assert(events[0].contacts.some(q=>q.x===p.x&&q.z===p.z));assert(Math.abs(p.y-waveHeight(p.x,p.z,0))<.001);assert(Number.isFinite(p.nx)&&Number.isFinite(p.nz));}
 hullContactSplash(v,1/60,0);assert.equal(events.length,1,'held contact does not emit repeatedly while stationary');
});
