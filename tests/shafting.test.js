import test from'node:test';import assert from'node:assert/strict';
import{buildTender}from'../src/vehicles/tender.js';
import{VehiclePhysics}from'../src/vehicles/physics.js';
import{setSeaState,waveHeight}from'../src/config.js';
import{minimumHullClearance}from'../src/vehicles/shafting.js';
import{bodyPoint,propulsionPose}from'../src/vehicles/propulsion.js';
import{chineContact}from'../src/systems/spray-model.js';
import{Dolphins}from'../src/systems/dolphins.js';
import{collision}from'../src/systems/environment.js';import * as THREE from'three';
const keys={throttle:1,steer:0,trim:0,freestyle:true};
test('meter-guided throttle sustains dry-hull shafting with submerged prop and aft passenger',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('tinny');v.x=-200;v.z=-1000;v.heading=0;let power=1,held=0,min=Infinity;
 for(let i=0;i<1200;i++){if(i%12===0){if(v.shaft?.cue==='EASE THROTTLE')power=0;else if(v.shaft?.cue==='MORE THROTTLE'||!v.shaft?.active)power=1;}const t=i/60;v.update(1/60,{...keys,throttle:power},t);assert(!v.wipeout);if(v.shaft?.active&&v.pitch>1.1){held+=1/60;min=Math.min(min,minimumHullClearance(v,t));const p=propulsionPose(v,v.drive.trimAngle,v.drive.steeringAngle).origin;assert(p.y<waveHeight(p.x,p.z,t));}}
 assert(held>15);assert(min>.07);assert(v.passengerAft>.95);
 // Check the actual visible hull and fittings, not only buoyancy sample points.
 const hull=buildTender();hull.remove(hull.userData.motor);hull.updateMatrixWorld(true);let visibleClearance=Infinity;
 hull.traverse(o=>{if(!o.isMesh)return;const positions=o.geometry.attributes.position;for(let i=0;i<positions.count;i++){const local=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld),p=bodyPoint(v,local.toArray());visibleClearance=Math.min(visibleClearance,p.y-waveHeight(p.x,p.z,20));}});
 assert(visibleClearance>.07,`visible tinny hull clears water: ${visibleClearance}`);
 const prop=propulsionPose(v,v.drive.trimAngle,v.drive.steeringAngle).origin,depth=waveHeight(prop.x,prop.z,20)-prop.y;assert(depth>.04&&depth<.20,`only lower unit and prop immersed: ${depth}`);

 const p=chineContact(v,-1,20),motor=propulsionPose(v,v.drive.trimAngle,v.drive.steeringAngle).origin;assert(p.motor);assert(Math.hypot(p.x-motor.x,p.z-motor.z)<.2);
 for(let i=0;i<180;i++)v.update(1/60,{...keys,freestyle:false},20+i/60);assert(v.pitch<.25);assert(!v.wipeout);
});
test('holding full throttle overbalances instead of giving an unlimited automatic shaft',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('tinny');let wipes=0;for(let i=0;i<480;i++){v.update(1/60,keys,i/60);if(v.wipeout)wipes++;}assert(wipes>0);
});
test('Dolphin watch places the boat close behind visible wildlife in navigable water',()=>{
 const d=new Dolphins(new THREE.Scene());for(const t of [0,60,300,1000]){const p=d.approach(t,collision);assert(p);assert(!collision(p.x,p.z,5,0));d.render(t,p,'Low');assert(d.visible>0);assert(d.models[0].position.y>waveHeight(d.models[0].position.x,d.models[0].position.z,t));}
});
test('bow rides retain bounded hull contact in rolling bar swell without wiping out',()=>{
 setSeaState('swell',0,true);for(const type of ['tinny','cat']){const v=new VehiclePhysics(type);v.x=625;v.z=-1770;v.heading=0;let power=1,count=0;for(let i=0;i<1200;i++){if(type==='tinny'&&i%12===0){if(v.shaft?.cue==='EASE THROTTLE')power=0;else if(v.shaft?.cue==='MORE THROTTLE'||!v.shaft?.active)power=1;}v.update(1/60,{...keys,throttle:power},i/60);assert(Number.isFinite(v.y));assert(!v.wipeout);if(!v.airborne&&v.pitch>.6){count++;assert(minimumHullClearance(v,i/60)>-.301);}}assert(count>600);}setSeaState('calm',0,true);
});
