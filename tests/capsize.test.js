import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {setSeaState,OFFSHORE_RUN,waveHeight} from '../src/config.js';
import {beginCapsize,capsizedPose,CAPSIZE} from '../src/vehicles/capsize.js';
import {CapsizeView} from '../src/systems/capsize-view.js';
import {makeVehicle} from '../src/vehicles/models.js';
import {packPose,RemoteStates,validPose} from '../src/systems/network-state.js';
import {canTow} from '../src/systems/tow-protocol.js';
import {tenderDriver} from '../src/systems/tender-crew.js';
import {ChaseCamera} from '../src/systems/camera.js';
import {beachWear} from '../src/vehicles/wardrobe.js';
const neutral={throttle:0,steer:0,trim:0,freestyle:false};
function warm(type,hz=60){const v=new VehiclePhysics(type);v.respawnAt(OFFSHORE_RUN.start);for(let i=0;i<hz*10;i++)v.update(1/hz,{...neutral,throttle:1},i/hz);return v;}
test('sustained full-lock spray slides capsize every small craft, eject once, stop power and wait for manual righting',()=>{
 setSeaState('calm',0,true);
 for(const hz of[30,60,120])for(const type of['tinny','ski','seago','hyper','cat']){
  const v=warm(type,hz),events=[];v.onEvent=e=>events.push(e);let i=0;
  for(;i<hz*12&&!v.capsized;i++)v.update(1/hz,{...neutral,throttle:1,steer:1,freestyle:true},10+i/hz);
  assert(v.capsized,type);assert(events.some(e=>e.type==='capsize'));assert(v.ejection&&v.wipeout);let clock=10+i/hz;
  for(let k=0;k<hz*12;k++)v.update(1/hz,{...neutral,throttle:1,steer:-1},clock+k/hz);clock+=12;
  assert(v.capsized&&v.wipeout,type+' no automatic respawn');assert(Math.abs(v.roll)>3);assert(v.ejection.floating);assert(v.throttle===0&&v.drive.flow===0);assert(Math.abs(v.ejection.y-waveHeight(v.ejection.x,v.ejection.z,clock))<.1);assert.equal(events.filter(e=>e.type==='capsize').length,1);
  for(let k=0;k<hz*.8;k++)v.update(1/hz,{...neutral,righting:true},clock+k/hz);clock+=.8;assert(v.rightProgress>.3&&v.capsized);
  for(let k=0;k<hz;k++)v.update(1/hz,neutral,clock+k/hz);clock++;assert.equal(v.rightProgress,0,'releasing stops recovery');assert(v.capsized);
  const position={x:v.x,z:v.z};for(let k=0;k<hz*(CAPSIZE.rightSeconds+.2);k++)v.update(1/hz,{...neutral,righting:true},clock+k/hz);
  assert(!v.capsized&&!v.wipeout&&!v.ejection);assert(Math.hypot(v.x-position.x,v.z-position.z)<.2,'righted in place');assert(events.some(e=>e.type==='righted'));assert(Math.abs(v.roll)<.1);
 }
});
test('brief or controlled spray turns, stationary controls and straight running do not eject riders',()=>{
 setSeaState('calm',0,true);
 for(const type of['tinny','ski','seago','hyper','cat']){
  const v=warm(type);for(let i=0;i<90;i++)v.update(1/60,{...neutral,throttle:1,steer:1,freestyle:true},10+i/60);assert(!v.capsized);for(let i=0;i<180;i++)v.update(1/60,{...neutral,throttle:1,steer:.65,freestyle:true},11.5+i/60);assert(!v.capsized);assert.equal(v.capsizeRisk,0);
  v.recover();for(let i=0;i<180;i++)v.update(1/60,{...neutral,steer:1,freestyle:true},15+i/60);assert(!v.capsized);assert.equal(v.capsizeRisk,0);
 }
});
test('overturned boats and overboard riders render online through existing roll fields and stop crew/towing roles',()=>{
 setSeaState('calm',0,true);const v=warm('tinny');beginCapsize(v,'Spray turn capsize',1);for(let i=0;i<180;i++)v.update(1/60,neutral,10+i/60);
 const p=packPose(v,{colour:0,design:'classic'},{},true,13);assert(validPose(p));assert(capsizedPose(p));assert.equal(p.spray.length,0);assert(!canTow(p)&&!tenderDriver(p));
 const scene=new THREE.Scene(),model=makeVehicle('tinny','#bdc9cc'),view=new CapsizeView(scene);scene.add(model);view.update(model,{...p,ejection:v.ejection},1/60,13);assert(view.group.visible&&view.actor.visible);assert(!model.userData.rider.visible);assert(!model.userData.passenger.visible);assert(Math.hypot(view.actor.position.x-v.x,view.actor.position.z-v.z)>.5);
 view.update(model,{...p,roll:0},1/60,14);assert(!view.group.visible&&model.userData.rider.visible);view.dispose();assert(!view.group.parent);
 const states=new RemoteStates();const base={id:'peer',name:'Boater'};states.accept([{...base,pose:{...p,pitch:Math.PI*2,roll:.1},seq:1}],null,0);states.accept([{...base,pose:{...p,pitch:0,roll:0},seq:2}],null,500);const sample=states.sample(states.players.get('peer'),650);assert(Math.abs(Math.sin(sample.pitch))<1e-6,'righting does not interpolate a phantom reverse loop');
});
test('overboard camera frames the boat and floating rider closely, and actor disposal preserves fleet materials',()=>{
 const camera=new THREE.PerspectiveCamera(80,1.6,.1,10000),chase=new ChaseCamera(camera),v={type:'tinny',config:{length:2.25,width:1.22},x:2300,z:-2600,y:.24,heading:0,pitch:0,roll:3.1,capsized:true,ejection:{x:2305,z:-2603,y:.08,age:3,floating:true}},input={orbit:0,held:()=>false};
 chase.update(1/60,v,input,2);camera.updateMatrixWorld(true);assert.equal(camera.fov,74);for(const point of[new THREE.Vector3(v.x,v.y,v.z),new THREE.Vector3(v.ejection.x,v.ejection.y,v.ejection.z)]){const projected=point.clone().project(camera);assert(Math.abs(projected.x)<.85&&Math.abs(projected.y)<.85&&projected.z<1);assert(camera.position.distanceTo(point)<18);}
 let disposed=0;const listener=()=>disposed++;beachWear.shirt.addEventListener('dispose',listener);const model=makeVehicle('tinny','#bdc9cc'),view=new CapsizeView(new THREE.Scene());view.update(model,v,1/60,0);assert.equal(view.actor.rotation.x,-Math.PI/2);view.dispose();assert.equal(disposed,0);beachWear.shirt.removeEventListener('dispose',listener);
});
test('all tinnies can deliberately loop over and remain capsized for manual recovery',()=>{
 setSeaState('calm',0,true);
 for(const type of['tinny','dinghy','skua','angler']){const v=new VehiclePhysics(type);v.respawnAt(OFFSHORE_RUN.start);const keys={...neutral,throttle:1,freestyle:true,womp:type!=='tinny'};for(let i=0;i<360;i++)v.update(1/60,keys,i/60);let peak=0;for(let i=0;i<360;i++){v.update(1/60,{...keys,trim:1},6+i/60);peak=Math.max(peak,v.pitch);}assert(v.capsized&&v.ejection);assert(peak>Math.PI*2);assert(Math.abs(v.roll)>3);assert.equal(v.wipeoutReason,'Looped the tinny');}
});
