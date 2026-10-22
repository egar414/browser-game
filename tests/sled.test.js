import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';
import{VehiclePhysics}from'../src/vehicles/physics.js';import{SLED,onSledLane,sledStart}from'../src/vehicles/sled-physics.js';import{makeSled}from'../src/vehicles/sled-model.js';import{setSeaState,VEHICLES,QUALITY}from'../src/config.js';import{collision}from'../src/systems/environment.js';import{packPose,validPose,RemoteStates}from'../src/systems/network-state.js';import{encodeSledPose,decodeSledPose,isSledPose}from'../src/systems/sled-protocol.js';import{packSpray}from'../src/systems/network-spray.js';import{Spray}from'../src/systems/spray.js';import{loadSettings}from'../src/systems/storage.js';
const keys={throttle:1,steer:0,trim:0,freestyle:false};
function run(v,seconds,hz=60,input=keys,start=0){for(let i=0;i<seconds*hz;i++)v.update(1/hz,input,start+i/hz);}
test('land run-up reaches entry speed and sustains water skipping at 30, 60 and 120 Hz',()=>{
 setSeaState('calm',0,true);for(const hz of[30,60,120]){const v=new VehiclePhysics('sled',collision);assert(onSledLane(v.x,v.z));assert(collision(v.x,v.z,1),'the run-up really is on mapped land');let entered=false,entry=0;for(let i=0;i<hz*12;i++){const was=v.sledMode;v.update(1/hz,keys,i/hz);if(was==='land'&&v.sledMode==='water'){entered=true;entry=v.speed;}assert.notEqual(v.sledMode,'sinking');assert(v.speed<=VEHICLES.sled.maxSpeed+.001);assert(!v.airborne);assert(Number.isFinite(v.x+v.y+v.z+v.pitch+v.roll));}assert(entered&&entry>=SLED.entrySpeed);assert(v.sledDistance>150);assert(v.sledMode==='water');}
});
test('short run-ups, water starts and slowing below support speed swamp and reset onto land',()=>{
 setSeaState('calm',0,true);for(const start of[{x:SLED.shoreX-2,z:SLED.z},{x:SLED.shoreX+20,z:SLED.z}]){const v=new VehiclePhysics('sled',()=>null);Object.assign(v,start);for(let i=0;i<180&&v.sledMode!=='sinking';i++)v.update(1/60,keys,i/60);assert.equal(v.sledMode,'sinking');run(v,SLED.sinkSeconds+.2,60,{...keys,throttle:0},3);assert(onSledLane(v.x,v.z));assert.equal(v.speed,0);assert.equal(v.sledMode,'land');}
 const v=new VehiclePhysics('sled',()=>null);run(v,10);let sank=false;for(let i=0;i<1200;i++){v.update(1/60,{...keys,throttle:-1},10+i/60);sank ||=v.sledMode==='sinking';if(sank&&v.sledMode==='land')break;}assert(sank);assert(onSledLane(v.x,v.z));
});
test('water bow ride raises front skis, steering is progressive and recovery always starts dry',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('sled',collision);run(v,8);run(v,2,60,{...keys,freestyle:true},8);assert(v.pitch>.8&&v.pitch<1.2);const h=v.heading;run(v,1,60,{...keys,steer:.6,freestyle:true},10);assert(v.heading-h>.25);assert(!v.airborne);v.recover(true);assert.deepEqual({x:v.x,z:v.z,heading:v.heading},sledStart());assert(onSledLane(v.x,v.z));v.respawnAt({x:2300,z:-2600,heading:0});assert(onSledLane(v.x,v.z));
});
test('snowmobile has two front skis, a cleated track, helmeted rider and finite animated transforms',()=>{
 const m=makeSled();assert.equal(m.userData.skis.length,2);assert(m.userData.rider);const b=new THREE.Box3().setFromObject(m);assert(b.max.z-b.min.z>2.5&&b.max.z-b.min.z<3.5);m.userData.rider.userData.update({steer:.8,riderAft:1,animationTime:3},1/60);m.traverse(o=>assert([...o.position,...o.scale,...o.quaternion].every(Number.isFinite)));
});
test('track spray emits in water, falls, and never draws a water wake on the land run-up',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('sled',()=>null),s=new Spray(new THREE.Scene(),QUALITY.Low);run(v,2);for(let i=0;i<10;i++)s.update(1/60,v,2+i/60);assert.equal(s.wake.history.length,0);assert.equal(s.plume.geometry.instanceCount,0);run(v,7,60,keys,2);assert(packSpray(v,9).some(p=>p.kind==='rear'));for(let i=0;i<240;i++)s.update(1/60,v,9+i/60);assert(s.plume.falling>0);assert(s.plume.geometry.instanceCount>0);s.dispose();
});
test('snowmobile round-trips through existing pose validation without interpolating its role marker',()=>{
 const v=new VehiclePhysics('sled',()=>null),settings={colour:0,design:'classic'};run(v,8);const a=encodeSledPose(packPose(v,settings,{active:false},true,8),v);assert(validPose(a));assert(isSledPose(a));assert.equal(decodeSledPose(a).type,'sled');const r=new RemoteStates();r.accept([{id:'driver',name:'Track rider',seq:1,pose:a}],null,1000);r.accept([{id:'driver',name:'Track rider',seq:2,pose:{...a,x:a.x+6}}],null,1400);const p=r.sample(r.players.get('driver'),1600);assert(isSledPose(p));assert(p.x>a.x&&p.x<a.x+6);assert.equal(loadSettings({getItem:()=>JSON.stringify({vehicle:'sled',trimSled:99})}).vehicle,'sled');assert.equal(loadSettings({getItem:()=>JSON.stringify({trimSled:99})}).trimSled,8);
});

test('snowmobile chase stays beside its rear spray at speed and rear view stays ahead',async()=>{
 const{ChaseCamera}=await import('../src/systems/camera.js');const camera=new THREE.PerspectiveCamera(),chase=new ChaseCamera(camera),v={type:'sled',x:2300,y:.6,z:-2600,heading:Math.PI/2,vx:30,vz:0,speed:30,config:VEHICLES.sled},input={orbit:0,held:()=>false};for(let i=0;i<180;i++){v.x+=.5;chase.update(1/60,v,input,0);}assert(v.x-camera.position.x>12&&v.x-camera.position.x<19);assert(Math.abs(camera.position.z-v.z)>=6.9);input.held=()=>true;for(let i=0;i<180;i++){v.x+=.5;chase.update(1/60,v,input,0);}assert(camera.position.x>v.x+4,'rear camera remains ahead of sled');
});
