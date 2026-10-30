import test from'node:test';import assert from'node:assert/strict';
import{buildTender}from'../src/vehicles/tender.js';
import{makeVehicle}from'../src/vehicles/models.js';
import{VehiclePhysics}from'../src/vehicles/physics.js';
import{setSeaState,waveHeight}from'../src/config.js';
import{minimumHullClearance}from'../src/vehicles/shafting.js';
import{bodyPoint,propulsionPose}from'../src/vehicles/propulsion.js';
import{sprayState,launchSpray,stepDroplet,chineContact}from'../src/systems/spray-model.js';
import{Dolphins}from'../src/systems/dolphins.js';
import{collision}from'../src/systems/environment.js';import * as THREE from'three';
const keys={throttle:1,steer:0,trim:0,freestyle:true};
test('every tinny keeps its actual visible hull dry and its propeller submerged through an established shaft',()=>{
 setSeaState('calm',0,true);
 for(const type of['tinny','dinghy','skua','angler']){
  const v=new VehiclePhysics(type);v.x=-200;v.z=-1000;let power=1;
  for(let i=0;i<900;i++){if(i%12===0){if(v.shaft?.cue==='EASE THROTTLE')power=0;else if(v.shaft?.cue==='MORE THROTTLE'||!v.shaft?.active)power=1;}v.update(1/60,{...keys,throttle:power,womp:type!=='tinny'},i/60);}
  assert(v.pitch>.8);const model=makeVehicle(type,'#bdc9cc');for(const p of[model.userData.rider,model.userData.passenger,model.userData.motor])if(p)p.visible=false;model.updateMatrixWorld(true);let lowest=Infinity;
  model.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const local=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld),p=bodyPoint(v,local.toArray());lowest=Math.min(lowest,p.y-waveHeight(p.x,p.z,15));}});
  assert(lowest>.015,`${type} actual hull clears water: ${lowest}`);const prop=propulsionPose(v,v.drive.trimAngle,v.drive.steeringAngle).origin;assert(prop.y<waveHeight(prop.x,prop.z,15)-.02,type+' outboard stays wet');
 }
});
test('feathered throttle sustains a dry-hull shaft with submerged outboard and aft passenger',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('tinny');v.x=-200;v.z=-1000;v.heading=0;let power=1,held=0,min=Infinity;
 for(let i=0;i<1200;i++){if(i%12===0){if(v.shaft?.cue==='EASE THROTTLE')power=0;else if(v.shaft?.cue==='MORE THROTTLE'||!v.shaft?.active)power=1;}const t=i/60;v.update(1/60,{...keys,throttle:power},t);assert(!v.wipeout);if(v.shaft?.active&&v.pitch>.82){held+=1/60;min=Math.min(min,minimumHullClearance(v,t));const p=propulsionPose(v,v.drive.trimAngle,v.drive.steeringAngle).origin;assert(p.y<waveHeight(p.x,p.z,t));}}
 assert(held>15);assert(min>.05);assert(v.passengerAft>.95);assert(Math.abs(v.roll)>.12&&Math.abs(v.roll)<.4,'photo-inspired cant is bounded');
 // Check the actual visible hull and fittings, not only buoyancy sample points.
 const hull=buildTender();hull.remove(hull.userData.motor);hull.updateMatrixWorld(true);let visibleClearance=Infinity;
 hull.traverse(o=>{if(!o.isMesh)return;const positions=o.geometry.attributes.position;for(let i=0;i<positions.count;i++){const local=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld),p=bodyPoint(v,local.toArray());visibleClearance=Math.min(visibleClearance,p.y-waveHeight(p.x,p.z,20));}});
 assert(visibleClearance>.025,`visible tinny hull clears water: ${visibleClearance}`);
 const prop=propulsionPose(v,v.drive.trimAngle,v.drive.steeringAngle).origin,depth=waveHeight(prop.x,prop.z,20)-prop.y;assert(depth>.04&&depth<.45,`prop remains immersed below wetted stern: ${depth}`);

 const p=chineContact(v,-1,20),motor=propulsionPose(v,v.drive.trimAngle,v.drive.steeringAngle).origin;assert(p.motor);assert(Math.hypot(p.x-motor.x,p.z-motor.z)<.2);
 for(let i=0;i<180;i++)v.update(1/60,{...keys,freestyle:false},20+i/60);assert(v.pitch<.25);assert(!v.wipeout);
});
test('holding full throttle loses the shaft, while meter-guided feathering sustains it across modes and trim',()=>{
 setSeaState('calm',0,true);
 for(const mode of ['cruise','sport','freestyle'])for(const trim of [-7,0,8]){
  const results=[];
  for(const feather of[false,true]){
   const v=new VehiclePhysics('tinny');v.x=-200;v.z=-1000;v.heading=0;v.setMode(mode);v.setTrim(trim);let power=1,held=0;
   for(let i=0;i<1200;i++){
    if(feather&&i%12===0){if(v.shaft?.cue==='EASE THROTTLE')power=0;else if(v.shaft?.cue==='MORE THROTTLE'||!v.shaft?.active)power=1;}
    v.update(1/60,{...keys,throttle:power},i/60);assert(!v.wipeout);assert(v.pitch<1.2);if(v.pitch>.78)held+=1/60;
   }
   results.push(held);if(!feather){assert(v.pitch<.65);assert.equal(v.shaft.cue,'EASE THROTTLE');}
  }
  assert(results[0]<5);assert(results[1]>results[0]+8);
 }
});
test('Dolphin watch places the boat close behind visible wildlife in navigable water',()=>{
 const d=new Dolphins(new THREE.Scene());for(const t of [0,60,300,1000]){const p=d.approach(t,collision);assert(p);assert(!collision(p.x,p.z,5,0));d.render(t,p,'Low');assert(d.visible>0);assert(d.models[0].position.y>waveHeight(d.models[0].position.x,d.models[0].position.z,t));}
});
test('bow rides retain bounded hull contact in rolling bar swell without wiping out',()=>{
 setSeaState('swell',0,true);for(const type of ['tinny','cat']){const v=new VehiclePhysics(type);v.x=625;v.z=-1770;v.heading=0;let power=1,count=0;for(let i=0;i<1200;i++){if(type==='tinny'&&i%12===0){if(v.shaft?.cue==='EASE THROTTLE')power=0;else if(v.shaft?.cue==='MORE THROTTLE'||!v.shaft?.active)power=1;}v.update(1/60,{...keys,throttle:power},i/60);assert(Number.isFinite(v.y));assert(!v.wipeout);if(!v.airborne&&v.pitch>.6){count++;assert(minimumHullClearance(v,i/60)>-.301);}}assert(count>600);}setSeaState('calm',0,true);
});

test('shaft prop wash travels aft in a low falling trail, rather than a tall side fan',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('tinny');Object.assign(v,{x:-200,z:-1000,heading:0,pitch:1.22,roll:-.25,shaftLoad:1,riderAft:1,throttle:1,speed:11,vx:0,vz:11,y:1.3,drive:{...v.drive,flow:.8,wetness:1,trimAngle:0,steeringAngle:0,neutral:false}});
 assert.equal(sprayState(v,false,0).rate,0,'straight shaft has only low prop wash');v.steer=1;v.yawRate=1;v.slip=-6;const state=sprayState(v,false,0);assert(state.rate>120);for(const side of [-1,1])for(const sample of [.1,.5,.9]){const p=launchSpray(v,state,side,()=>sample),start={...p};assert(p.vy>0&&p.vy<2.7);assert(Math.abs(p.vx)<2);assert(p.vz-v.vz< -10);let peak=p.y;for(let i=0;i<60;i++){stepDroplet(p,1/60);peak=Math.max(peak,p.y);}assert(peak-start.y<.4);assert(p.y<start.y);}
});

test('deliberate held trim-up loops and capsizes the tinny until manually righted, while early release saves it',()=>{
 setSeaState('calm',0,true);
 for(const save of [false,true]){const events=[],v=new VehiclePhysics('tinny',()=>null,e=>events.push(e));v.x=-200;v.z=-1000;v.heading=0;
 for(let i=0;i<360;i++)v.update(1/60,keys,i/60);
 let loopPitch=0;
 for(let i=0;i<360;i++){v.update(1/60,{...keys,trim:!save||i<35?1:0},6+i/60);if(v.looping)loopPitch=Math.max(loopPitch,v.pitch);}
 if(save){assert(!events.some(e=>e.type==='wipeout'));assert(v.pitch<1.15);assert(v.loopLoad===0);}else{assert(events.some(e=>e.label==='Looped the tinny'));assert(loopPitch>Math.PI*2,'visible backwards rotation');assert(v.capsized&&v.wipeout,'loop stays capsized until righted');for(let i=0;i<180;i++)v.update(1/60,{throttle:0,steer:0,trim:0,righting:true},12+i/60);assert(!v.capsized&&!v.wipeout&&!v.looping);}
 }
});
