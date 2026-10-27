import test from'node:test';import assert from'node:assert/strict';import*as THREE from'three';
import{ANGLER_SHAPE,WASP_SCALE,WASP_DIMENSIONS,anglerSurface,anglerInner,anglerHullGeometry}from'../src/vehicles/angler-hull.js';
import{makeAnglerShell}from'../src/vehicles/angler-model.js';
import{makeVehicle}from'../src/vehicles/models.js';import{VehiclePhysics}from'../src/vehicles/physics.js';import{VEHICLES,PROPULSION,setSeaState}from'../src/config.js';
import{packPose,validPose,RemoteStates}from'../src/systems/network-state.js';import{decodeAnglerPose,isAnglerPose}from'../src/systems/angler-protocol.js';import{loadSettings}from'../src/systems/storage.js';import{minimumHullClearance}from'../src/vehicles/shafting.js';import{database,rpc,users}from'./multiplayer-fixture.js';
import{ramps}from'../src/systems/environment.js';
const neutral={throttle:0,steer:0,trim:0,freestyle:false,womp:false};
test('Wasp loft is symmetric, keeps distinct inside/outside skins and has no open or nonmanifold plate edges',()=>{
 const g=anglerHullGeometry(),p=g.attributes.position,n=g.attributes.normal,edgeCounts=new Map(),key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
 assert([...p.array].every(Number.isFinite));assert([...n.array].every(Number.isFinite));
 for(let i=0;i<p.count;i+=3){const a=key(i),b=key(i+1),c=key(i+2);assert.notEqual(a,b);assert.notEqual(a,c);assert.notEqual(b,c);for(const[u,v]of[[a,b],[b,c],[c,a]]){const k=[u,v].sort().join('|');edgeCounts.set(k,(edgeCounts.get(k)||0)+1);}}
 assert([...edgeCounts.values()].every(n=>n===2));
 for(let i=0;i<=64;i++)for(const s of[.103333333,.2,.62,.8,1]){const t=i/64,a=anglerSurface(t,s),b=anglerSurface(t,-s),inside=anglerInner(t,s);assert(Math.abs(a.x+b.x)<1e-9);assert(Math.abs(a.y-b.y)<1e-9);if(t<=.9)assert(Math.abs(a.distanceTo(inside)-ANGLER_SHAPE.plate)<1e-8);assert(inside.x>=-1e-8,'inner bow skin must not cross the centreline');}
 assert.equal(WASP_DIMENSIONS.length,3.1);g.dispose();
});
test('Wasp has separately manageable hull, three seats and centred 25 hp motor within a browser asset budget',()=>{
 const shell=makeAnglerShell(),{hull,benches,motor,propeller}=shell.userData;assert.equal(shell.name,'310 Wasp');assert.equal(shell.userData.powerLabel,25);assert.equal(benches.length,3);assert(hull.children.length>0);assert(benches.every(b=>b.children.length>0&&b.userData.fullWidth));assert(benches[0].userData.seatZ<benches[1].userData.seatZ&&benches[1].userData.seatZ<benches[2].userData.seatZ);assert.deepEqual(motor.position.toArray(),PROPULSION.angler.motorMount);assert.deepEqual(propeller.position.toArray(),PROPULSION.angler.propeller);
 let triangles=0,draws=0;shell.traverse(o=>{if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert([...o.geometry.attributes.position.array].every(Number.isFinite));});assert(triangles<35000);assert(draws<36);
 const size=new THREE.Box3().setFromObject(hull).getSize(new THREE.Vector3());assert(size.z>3.09&&size.z<3.15);assert(size.x>1.38&&size.x<1.44);
 const model=makeVehicle('angler','#c6ccce');assert(model.userData.referenceHull.userData.benches.every(b=>b.children.length>0));const v=new VehiclePhysics('angler',()=>null);v.steer=.6;model.userData.motor.rotation.set(.1,-.3,0,'YXZ');model.userData.rider.userData.update(v,1,model.userData);const hand=model.userData.rider.getObjectByName('right-hand'),target=new THREE.Vector3(-.32,.27,.54).applyEuler(model.userData.motor.rotation).add(model.userData.motor.position);assert(hand.position.distanceTo(target)<1e-6);
 assert.equal(loadSettings({getItem:()=>JSON.stringify({vehicle:'angler'})}).vehicle,'angler');assert(Math.abs(WASP_SCALE*3.7-3.1)<1e-9);
});
test('25 hp-labelled Wasp uses the 50 hp arcade performance with finite trim, steering and shaft contacts',()=>{
 setSeaState('calm',0,true);assert.equal(VEHICLES.angler.hp,25);assert.equal(VEHICLES.angler.maxSpeed,VEHICLES.skua.maxSpeed);assert.equal(PROPULSION.angler.shaftPower,PROPULSION.skua.shaftPower);
 const v=new VehiclePhysics('angler',()=>null);v.x=-200;v.z=-1000;let peak=0;
 for(let i=0;i<1800;i++){v.update(1/60,{...neutral,throttle:1},i/60);peak=Math.max(peak,v.speed);assert(Number.isFinite(v.y));assert(v.speed<=25.01);assert.equal(v.wipeout,0);}assert(peak>21,`reaches 50 hp class speed, got ${peak}`);
 const h=v.heading;for(let i=0;i<90;i++)v.update(1/60,{...neutral,throttle:1,steer:.6},30+i/60);assert(Math.abs(v.heading-h)>.3);
 v.recover();for(let i=0;i<480;i++)v.update(1/60,{...neutral,throttle:1,womp:i>120,freestyle:i>300},32+i/60);assert(v.womp.ready);assert(v.pitch>.65);assert.equal(v.wipeout,0);assert(minimumHullClearance(v,40)>-.12);
});
test('Wasp model identity is discrete online and cannot collide with tow, deck or Creator roles',()=>{
 const v=new VehiclePhysics('angler',()=>null),p=packPose(v,{colour:0,design:'classic'},{},true);assert(validPose(p));assert(isAnglerPose(p));assert.equal(p.type,'skua');assert.equal(decodeAnglerPose(p).type,'angler');assert.equal(decodeAnglerPose({...p,deck:true}).type,'skua');
 const r=new RemoteStates(),ordinary={...p,deckX:0,deckZ:0};r.accept([{id:'other',pose:ordinary,seq:1}],null,0);r.accept([{id:'other',pose:p,seq:2}],null,333);assert(isAnglerPose(r.sample(r.players.get('other'),400)));
 r.accept([{id:'other',pose:ordinary,seq:3}],null,666);assert(!isAnglerPose(r.sample(r.players.get('other'),700)));
});
test('existing authenticated database round-trips Wasp identity and spray without a new SQL migration',async()=>{
 const f=await database();try{await rpc(f,users[0],'er_join',{p_name:'Wasp tester',p_code:'PUBLIC'});const v=new VehiclePhysics('angler',()=>null),p=packPose(v,{colour:0,design:'classic'},{},true);const room=await rpc(f,users[0],'er_exchange',{p_pose:p,p_seq:1});assert.equal(room.creator,false);assert(isAnglerPose(room.players[0].pose));assert.equal(decodeAnglerPose(room.players[0].pose).type,'angler');}finally{await f.db.close();}
});
test('I / WOMP builds a bounded rhythm on every tinny and Thundercat, and cannot charge dry or at rest',()=>{
 setSeaState('calm',0,true);
 for(const type of['tinny','dinghy','skua','angler','cat'])for(const hz of[30,60,120]){
  const v=new VehiclePhysics(type,()=>null);v.x=-200;v.z=-1000;for(let i=0;i<hz;i++)v.update(1/hz,{...neutral,womp:true},i/hz);assert.equal(v.wompEnergy,0);
  for(let i=0;i<hz*5;i++)v.update(1/hz,{...neutral,throttle:1},1+i/hz);let low=Infinity,high=-Infinity;
  for(let i=0;i<hz*5;i++){v.update(1/hz,{...neutral,throttle:1,womp:true},6+i/hz);if(i>hz){low=Math.min(low,v.pitch);high=Math.max(high,v.pitch);}assert(!v.wipeout);assert(Number.isFinite(v.y));}assert(v.wompReady);assert(v.bounceLoad>.3);assert(high-low>.025,`${type} visibly pitches with womp`);
  for(let i=0;i<hz*4;i++)v.update(1/hz,{...neutral,throttle:.4},11+i/hz);assert(v.wompLoad<.001);if(type==='cat')assert(v.bounceLoad<.01);
 }
});
test('Wasp takes off and lands from the existing ramp while its real mesh remains attached and finite',()=>{
 setSeaState('calm',0,true);const events=[],v=new VehiclePhysics('angler',()=>null,e=>events.push(e)),model=makeVehicle('angler','#c6ccce');v.x=ramps[0].x;v.z=ramps[0].z-ramps[0].length/2-35;v.heading=0;v.vz=20;let air=false;
 for(let i=0;i<480;i++){v.update(1/60,{...neutral,throttle:i<90?1:0},i/60,ramps);model.position.set(v.x,v.y,v.z);model.rotation.set(-v.pitch,v.heading,v.roll,'YXZ');model.userData.rider.userData.update(v,1/60,model.userData);model.updateMatrixWorld(true);if(v.airborne){air=true;const box=new THREE.Box3().setFromObject(model);assert([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));}}
 assert(air);assert(events.some(e=>e.type==='splash'));assert(events.some(e=>e.label==='Clean air'));assert(model.userData.referenceHull.userData.benches.every(b=>b.children.length>0));
});
