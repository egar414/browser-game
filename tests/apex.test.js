import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VehiclePhysics } from '../src/vehicles/physics.js';
import { makeApex } from '../src/vehicles/apex-model.js';
import { OFFSHORE_RUN, VEHICLES, SKI_TRIM_POSITIONS, APEX_TRIM_POSITIONS, jetTrimPositions, setSeaState, QUALITY } from '../src/config.js';
import { minimumHullClearance } from '../src/vehicles/shafting.js';
import { sprayState, launchSpray, pumpDischarge, jetPlumeSource } from '../src/systems/spray-model.js';
import { Spray } from '../src/systems/spray.js';
import { ChaseCamera } from '../src/systems/camera.js';
import { loadSettings } from '../src/systems/storage.js';
const input={throttle:1,steer:0,trim:0,freestyle:false};
const make=(events=[])=>{const v=new VehiclePhysics('hyper',()=>null,e=>events.push(e));v.respawnAt(OFFSHORE_RUN.start);return v;};
function advance(v,seconds,start=0,controls=input,hz=60){for(let i=0;i<seconds*hz;i++)v.update(1/hz,controls,start+i/hz);}
test('Apex reaches 300 without overspeed, carves progressively and brakes into reverse across fixed steps',()=>{
 setSeaState('calm',0,true);for(const hz of[30,60,120]){const v=make();let peak=0;for(let i=0;i<12*hz;i++){v.update(1/hz,input,i/hz);peak=Math.max(peak,v.speed);assert(v.speed<=VEHICLES.hyper.maxSpeed+.001);}assert(peak*3.6>299.9&&v.speed*3.6>295);assert(!v.airborne&&!v.wipeout);assert(minimumHullClearance(v,12)>-.30);const heading=v.heading;advance(v,1.5,12,{...input,steer:.6},hz);assert(v.heading-heading>.4&&v.heading-heading<1.5);assert(!v.wipeout&&!v.airborne);assert(v.speed>40);advance(v,15,13.5,{...input,throttle:-1},hz);const forward=v.vx*Math.sin(v.heading)+v.vz*Math.cos(v.heading);assert(forward< -4&&forward>=-5.01);}
});
test('eleven extreme trim selections leave existing skis unchanged and support the highest controlled bow ride',()=>{
 setSeaState('calm',0,true);assert.equal(jetTrimPositions('ski'),SKI_TRIM_POSITIONS);assert.equal(jetTrimPositions('seago'),SKI_TRIM_POSITIONS);assert.equal(APEX_TRIM_POSITIONS.length,11);const v=make();v.setTrim(999);assert.equal(v.trimDegrees,36);assert.equal(v.trimIndex,10);advance(v,12,0,{...input,freestyle:true});assert(v.pitch>1.25&&v.pitch<1.5);assert(v.drive.wetness>0);assert(!v.airborne&&!v.wipeout);const stance=v.pitch;advance(v,4,12,input);assert(v.pitch<stance*.5);v.setTrim(-999);assert.equal(v.trimDegrees,-12);
});
test('Apex high-speed sweep catches a narrow barrier across the hull instead of tunnelling through it',()=>{
 const wall=2304,v=new VehiclePhysics('hyper',(x,z,r)=>Math.abs(x-wall)<r?'Pier':null);v.respawnAt(OFFSHORE_RUN.start);v.vx=83;v.speed=83;v.throttle=1;v.update(.1,input,0);assert(v.wipeout>0);assert.equal(v.x,OFFSHORE_RUN.start.x);
});
test('new Heart attack is aerial only, banks once on a clean landing and is lost in a wipeout',()=>{
 setSeaState('calm',0,true);for(const rough of[false,true]){const events=[],v=make(events);advance(v,2,0,{...input,throttle:0,pose:'heartattack'});assert.equal(events.length,0);v.y+=1;v.launch(7.5,0);for(let i=0;i<200&&v.airborne;i++){if(rough&&i>40)v.pitch=1.3;v.update(1/60,{...input,throttle:0,pose:'heartattack'},2+i/60);if(v.airborne)assert.equal(events.filter(e=>e.type==='score').length,0);}const awards=events.filter(e=>e.label==='Heart attack · landed');assert.equal(awards.length,rough?0:1);if(!rough)assert(awards[0].points>450);else assert(v.wipeout>0);assert.equal(v.airTricks.completed.size,0);}
});
test('photo-inspired Apex has separate shaped hull, raised red tail, steerable bars, trim nozzle and attached hands',()=>{
 const m=makeApex();m.userData.rider.userData.update({steer:0,riderAft:0,pitch:0},1,m.userData);m.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());assert(size.x>1.25&&size.x<1.6);assert(size.z>3.6&&size.z<4);assert(m.userData.nozzle&&m.userData.bucket&&m.userData.handlebars);let meshes=0,tris=0;const colours=new Set();m.traverse(o=>{if(o.isMesh){meshes++;tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;colours.add(o.material.color?.getHexString());}});assert(meshes<45&&tris<35000);assert(colours.has('dc3b21')&&colours.has('b9b49b'));const grip=new THREE.Vector3(.3,0,-.12).add(m.userData.handlebars.position);assert(m.userData.rider.getObjectByName('right-hand').position.distanceTo(grip)<1e-5);
});
test('Apex has the largest bounded rear plume and loaded fans, needs real sharp turns and leaves falling water',()=>{
 setSeaState('calm',0,true);const v=make();advance(v,10);v.setTrim(36);advance(v,3,10,{...input,freestyle:true});const rear=jetPlumeSource(v,pumpDischarge(v,13),13,sprayState(v,false,13));assert(rear.packetScale>1.85);assert(rear.velocity.y>18&&rear.velocity.y<=22);assert(Math.hypot(rear.velocity.x-v.vx,rear.velocity.z-v.vz)>40);assert.equal(sprayState(v,false,13).rate,0);Object.assign(v,{steer:1,yawRate:1,slip:-6,lateralAcceleration:12});const turn=sprayState(v,false,13),old=sprayState({...v,type:'seago'},false,13);assert(turn.left>old.left);assert(launchSpray(v,turn,-1,()=>.5).vy>launchSpray({...v,type:'seago'},old,-1,()=>.5).vy);
 const spray=new Spray(new THREE.Scene(),QUALITY.Low);let falling=0;for(let i=0;i<360;i++){v.x+=v.vx/60;spray.update(1/60,v,13+i/60,true);falling=Math.max(falling,spray.plume.falling);}assert(falling>0);assert(spray.plume.geometry.instanceCount<=spray.plume.packets.length);for(let i=0;i<420;i++)spray.update(1/60,{...v,speed:0,throttle:0,vx:0,vz:0,steer:0,yawRate:0,slip:0},19+i/60,false);assert.equal(spray.plume.geometry.instanceCount,0);assert(spray.particles.every(p=>p.life<=0));spray.dispose();
});
test('Apex high-speed chase, first person and rear view stay with the ski, and choice/trim persist',()=>{
 const camera=new THREE.PerspectiveCamera(),chase=new ChaseCamera(camera),v={type:'hyper',x:2300,y:.3,z:-2600,heading:Math.PI/2,vx:300/3.6,vz:0,speed:300/3.6},input={orbit:0,held:()=>false};for(let i=0;i<200;i++){v.x+=v.vx/60;chase.update(1/60,v,input,0);}assert(v.x-camera.position.x>14&&v.x-camera.position.x<18);assert(Math.abs(v.z-camera.position.z)>8);chase.reset();for(let i=0;i<200;i++){v.x+=v.vx/60;chase.update(1/60,v,input,2,false,new THREE.Vector3(v.x,v.y+1.5,v.z));}assert(Math.abs(camera.position.x-v.x)<.3);const s=loadSettings({getItem:()=>JSON.stringify({vehicle:'hyper',trimApex:28})});assert.equal(s.vehicle,'hyper');assert.equal(s.trimApex,28);assert.equal(loadSettings({getItem:()=>JSON.stringify({trimApex:999})}).trimApex,36);
});
