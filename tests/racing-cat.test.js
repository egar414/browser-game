import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VehiclePhysics } from '../src/vehicles/physics.js';
import { makeRacingCat } from '../src/vehicles/racing-cat.js';
import { minimumHullClearance } from '../src/vehicles/shafting.js';
import { collision } from '../src/systems/environment.js';
import { OFFSHORE_RUN, WORLD, WAVE_FIELD, VEHICLES, QUALITY, setSeaState } from '../src/config.js';
import { sprayState, launchSpray, jetPlumeSource, pumpDischarge } from '../src/systems/spray-model.js';
import { Spray } from '../src/systems/spray.js';
import { ChaseCamera } from '../src/systems/camera.js';
import { loadSettings } from '../src/systems/storage.js';
const input={throttle:1,steer:0,trim:0};
function racer(collide=()=>null){const v=new VehiclePhysics('racer',collide);v.respawnAt(OFFSHORE_RUN.start,0);return v;}
test('racer reaches its fictional 500 km/h ceiling, stays on shared waves and can brake into reverse',()=>{
 setSeaState('swell',0,true);for(const hz of[30,60,120]){const v=racer(collision);for(let i=0;i<hz*17;i++){v.update(1/hz,input,i/hz);assert(!v.wipeout);assert(minimumHullClearance(v,i/hz)>=-.27001);assert(Number.isFinite(v.y+v.pitch+v.roll));}assert(Math.abs(v.speed*3.6-500)<.01);assert(v.planing>.99);assert(v.x>OFFSHORE_RUN.start.x+1400);for(let i=0;i<hz*11;i++)v.update(1/hz,{...input,throttle:-1},17+i/hz);assert(v.vx< -4);assert(v.speed<=VEHICLES.racer.reverseMax+.01);assert(!v.wipeout);}
});
test('racer steering has inertia and less authority at speed; swept full hull cannot tunnel through a quay',()=>{
 setSeaState('calm',0,true);const slow=racer(),fast=racer();for(const[v,speed]of[[slow,10],[fast,130]]){v.vx=speed;v.speed=speed;v.throttle=speed/VEHICLES.racer.maxSpeed;for(let i=0;i<30;i++)v.update(1/60,{throttle:v.throttle,steer:1,trim:0},i/60);}assert(slow.yawRate>fast.yawRate*2);assert(Math.abs(fast.roll)<=.25);
 const wall=2308,v=racer((x,z,r)=>x+r>=wall?'Quay':null);v.vx=139;v.speed=139;v.throttle=1;v.update(.1,input,0);assert(v.wipeout>0);assert.equal(v.x,OFFSHORE_RUN.start.x);assert(v.x+6.2<wall);
});
test('long offshore run remains clear, has recovery room and retains mapped wave sampling bounds',()=>{
 assert(WORLD.maxX-OFFSHORE_RUN.finishX>=1000);assert(OFFSHORE_RUN.finishX-OFFSHORE_RUN.start.x>=6000);assert(WAVE_FIELD.bounds.maxX<OFFSHORE_RUN.start.x);
 for(let x=OFFSHORE_RUN.start.x;x<=OFFSHORE_RUN.finishX+500;x+=10)assert.equal(collision(x,OFFSHORE_RUN.start.z,9,0),null);
 const v=racer();v.safe={...OFFSHORE_RUN.start};v.x=WORLD.maxX+10;v.update(1/60,input,0);assert(v.x<WORLD.maxX);assert.equal(v.speed,0);
});
test('racing model has separate bows and open forward tunnel, twin moving surface props and cockpit crew',()=>{
 const m=makeRacingCat();m.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(m);assert(b.max.z-b.min.z>12&&b.max.z-b.min.z<13.2);assert(b.max.x-b.min.x>4.3&&b.max.x-b.min.x<4.7);assert.equal(m.userData.propellers.length,2);assert.equal(m.userData.rider.userData.faceParts.length,4);assert(m.userData.rider.userData.eye);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,3,4.7),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(m,true).length,0,'no rigid slab fills the forward twin-bow tunnel');let meshes=0;m.traverse(o=>{if(o.isMesh)meshes++;});assert(meshes<45);
});
test('only the racer has huge straight-line planing side spray and twin surface-prop rooster tails, all pooled and falling',()=>{
 setSeaState('calm',0,true);const v=racer();for(let i=0;i<240;i++)v.update(1/60,input,i/60);const state=sprayState(v,false,4);assert(state.left>2&&state.right>2&&state.rate>600);const left=launchSpray(v,state,-1,()=>.5),right=launchSpray(v,state,1,()=>.5);assert(left.vz>0&&right.vz<0);assert(left.vy>4&&right.vy>4);const source=jetPlumeSource(v,pumpDischarge(v,4),4,state);assert.equal(source.origins.length,2);assert(Math.hypot(source.origins[0].x-source.origins[1].x,source.origins[0].z-source.origins[1].z)>2.5);assert(source.velocity.y>10);
 const spray=new Spray(new THREE.Scene(),QUALITY.Low);let falling=0;for(let i=0;i<180;i++){v.x+=v.vx/60;spray.update(1/60,v,4+i/60,true);falling=Math.max(falling,spray.plume.falling);assert(spray.plume.geometry.instanceCount<=spray.plume.packets.length);}assert(falling>0);assert(spray.plume.mesh.visible);Object.assign(v,{throttle:0,speed:0,vx:0,planing:0});assert.equal(sprayState(v).rate,0);assert.equal(jetPlumeSource(v,pumpDischarge(v),0),null);for(let i=0;i<360;i++)spray.update(1/60,v,7+i/60,true);assert.equal(spray.plume.geometry.instanceCount,0);spray.dispose();
});
test('racer choice and trim survive valid preferences and malformed values are clamped',()=>{
 const settings=loadSettings({getItem:()=>JSON.stringify({vehicle:'racer',trimRacer:3.5})});assert.equal(settings.vehicle,'racer');assert.equal(settings.trimRacer,3.5);assert.equal(loadSettings({getItem:()=>JSON.stringify({trimRacer:999})}).trimRacer,8);
});

test('500 km/h chase keeps its distance and held rear view stays ahead of the racing hull',()=>{
 const camera=new THREE.PerspectiveCamera(),chase=new ChaseCamera(camera),v={type:'racer',x:2300,y:.3,z:-2600,heading:Math.PI/2,vx:500/3.6,vz:0,speed:500/3.6},input={orbit:0,held:()=>false};
 for(let i=0;i<300;i++){v.x+=v.vx/60;chase.update(1/60,v,input,0);}
 assert(v.x-camera.position.x>23&&v.x-camera.position.x<27);assert(Math.abs(v.z-camera.position.z)>9);assert(camera.getWorldDirection(new THREE.Vector3()).x>.8);
 input.held=()=>true;for(let i=0;i<300;i++){v.x+=v.vx/60;chase.update(1/60,v,input,0);}assert(camera.position.x-v.x>12);assert(camera.getWorldDirection(new THREE.Vector3()).x<-.8);
});
