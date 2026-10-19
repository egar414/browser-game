import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VEHICLES, QUALITY, waveHeight } from '../src/config.js';
import { sprayState, launchSpray, bowSprayLoad, SIDE_SPRAY } from '../src/systems/spray-model.js';
import { makeRider } from '../src/vehicles/rider.js';
import { Spray } from '../src/systems/spray.js';
const boat=(type='ski')=>({type,config:VEHICLES[type],x:0,y:.14,z:0,heading:0,vx:0,vz:18,speed:18,throttle:1,steer:0,slip:0,yawRate:0,pitch:0,airborne:false,wipeout:0});

test('idle without a pump, airborne and wiped-out boats cannot emit powered spray',()=>{
  for(const change of [{speed:0},{airborne:true},{wipeout:1}]){
    const s=sprayState({...boat(),...change},true);assert.equal(s.rate,0);assert.equal(s.jet,0);assert.equal(s.left,0);assert.equal(s.right,0);
  }
});
test('spray follows actual slip and turn load, without artificial Shift multiplication',()=>{
  const v={...boat(),vx:-6,slip:-6,yawRate:1,steer:1},cruise=sprayState(boat()),turn=sprayState(v),freestyle=sprayState(v,true);
  assert(turn.left>turn.right*2);assert(turn.rate>cruise.rate);assert.equal(freestyle.left,turn.left);
  const opposite=sprayState({...v,vx:6,slip:6,yawRate:-1,steer:-1},true);assert(opposite.right>opposite.left*2);
});
test('outward launch direction mirrors correctly and originates at the chine',()=>{
  const v={...boat(),steer:1,yawRate:1,slip:-6},s=sprayState(v),left=launchSpray(v,s,-1,()=>.5),right=launchSpray(v,s,1,()=>.5);
  assert(left.x<0&&right.x>0);assert(left.vx<0&&right.vx>0);assert(Math.abs(left.z)<=v.config.length*.44&&Math.abs(right.z)<=v.config.length*.44);assert(left.y>=waveHeight(left.x,left.z,0)&&right.y>=waveHeight(right.x,right.z,0));
  const reversed=sprayState({...v,vz:-3,speed:3});assert(reversed.rate<s.rate);
});
test('emission is stable across frame rates and geometry stays within its pool',()=>{
  const run=dt=>{const scene=new THREE.Scene(),s=new Spray(scene,QUALITY.Low),v={...boat(),steer:1,yawRate:1,slip:-6};
    for(let t=0;t<2-dt*.5;t+=dt){v.z+=v.vz*dt;v.y=waveHeight(v.x,v.z,t)+.14;s.update(dt,v,t,true,{freestyle:false});}
    const emitted=s.next;assert(s.wake.history.length>4);assert(s.wake.history.length<=QUALITY.Low.wakeSamples);
    assert(s.wake.geometry.drawRange.count<=s.wake.geometry.index.count);
    assert([...s.positions].every(Number.isFinite));s.dispose();assert.equal(scene.children.length,0);return emitted;};
  const fine=run(1/60),coarse=run(1/30);assert(fine>50&&coarse>50);assert(Math.abs(fine-coarse)/Math.max(fine,coarse)<.25);
});
test('foam fades, splash rings expand, and recovery clears old spray',()=>{
  const scene=new THREE.Scene(),s=new Spray(scene,QUALITY.Low),v=boat();
  for(let i=0;i<90;i++){v.z+=.3;s.update(1/60,v,i/60,true);}
  s.splash(v,8);assert(s.wake.splashes.length>0);assert(s.particles.some(p=>p.life>0));
  const stopped={...v,speed:0,vx:0,vz:0,throttle:0};
  for(let i=0;i<510;i++)s.update(1/60,stopped,1.5+i/60,true);
  assert.equal(s.wake.history.length,0);assert.equal(s.wake.splashes.length,0);assert(s.particles.every(p=>p.life<=0));
  s.splash(v,8);s.clear();assert(s.particles.every(p=>p.life<=0));assert.equal(s.wake.geometry.drawRange.count,0);assert(s.fans.every(f=>!f.mesh.visible));s.dispose();
});

test('central ski plume is flow driven, trim responsive and excluded from propeller wash',async()=>{
  const {jetPlumeSource}=await import('../src/systems/spray-model.js');
  const v={...boat(),drive:{trimAngle:0}},d={origin:{x:0,y:-.1,z:-1.6},velocity:{x:0,y:0,z:-20},flow:.15,reverse:0,aerial:false};
  const s=jetPlumeSource(v,d);assert(s.velocity.y>4 && s.velocity.y<8);assert(s.origin.z<0);assert(s.origin.y>=waveHeight(0,-1.6,0));
  assert(jetPlumeSource({...v,drive:{trimAngle:.3}},d).velocity.y>s.velocity.y);
  for(const changed of [{type:'cat'},{airborne:true},{wipeout:1},{throttle:0}])assert.equal(jetPlumeSource({...v,...changed},d),null);
  assert.equal(jetPlumeSource(v,{...d,reverse:1}),null);
});
test('central plume stays finite, expires and clears during recovery',async()=>{
  const {jetPlumeSource}=await import('../src/systems/spray-model.js');
  const v={...boat(),drive:{trimAngle:0}},d={origin:{x:0,y:.1,z:-1.6},velocity:{x:0,y:0,z:-20},flow:.15,reverse:0,aerial:false};
  const s=new Spray(new THREE.Scene(),QUALITY.Low),source=jetPlumeSource(v,d);
  for(let i=0;i<50;i++)s.plume.update(.1,source,i*.1);
  assert(s.plume.mesh.visible);assert([...s.plume.geometry.attributes.position.array].every(Number.isFinite));assert(s.plume.history.length<=100);
  for(let i=0;i<20;i++)s.plume.update(.1,null,5+i*.1);assert(!s.plume.mesh.visible);
  s.plume.update(.1,source,7);s.clear();assert(!s.plume.mesh.visible);assert.equal(s.plume.history.length,0);s.dispose();
});

test('dense central core remains bounded and keeps descending water on Low quality',async()=>{
 const s=new Spray(new THREE.Scene(),QUALITY.Low),source={origin:{x:0,y:.3,z:0},velocity:{x:0,y:13,z:4},power:1,loaded:1};let returns=0,max=0;
 for(let i=0;i<100;i++){s.plume.update(.1,source,i*.1);returns+=s.plume.impacts.length;max=Math.max(max,s.plume.geometry.instanceCount);}
 assert(max>500);assert(max<s.plume.packets.length);assert(s.plume.falling>100);assert(returns>1000);
 for(const name of ['aCenter','aSize','aAlpha','aVelocity'])assert([...s.plume.geometry.attributes[name].array].every(Number.isFinite),name);
 for(let i=0;i<60;i++)s.plume.update(.1,null,10+i*.1);assert.equal(s.plume.mesh.visible,false);s.dispose();
});

test('powered bow attitude carries wet side spray outward and up instead of aiming it underwater',()=>{
  for(const type of ['ski','cat']){
    const v={...boat(type),steer:1,yawRate:1,slip:-6},state=sprayState(v),flat=launchSpray(v,state,-1,()=>.5);
    const bow={...v,pitch:.85,riderAft:1},drop=launchSpray(bow,state,-1,()=>.5);
    assert(drop.vy>flat.vy);assert(Math.abs(drop.vx)>Math.abs(flat.vx));
    assert(drop.lifetime>flat.lifetime);assert(drop.lifetime<=SIDE_SPRAY.dropletLife);
    assert.equal(drop.x,state.contacts[0].x);assert.equal(drop.z,state.contacts[0].z);
    for(const change of [{airborne:true},{wipeout:1},{throttle:0},{riderAft:0}])assert.equal(bowSprayLoad({...bow,...change}),0);
  }
  const v={...boat('cat'),steer:1,yawRate:1,slip:-6},state=sprayState(v),cat=launchSpray(v,state,-1,()=>.5),ski=launchSpray({...v,type:'ski'},state,-1,()=>.5);
  assert(Math.abs(cat.vx)>Math.abs(ski.vx));
});

test('all craft retain falling spray without flat side-sheet meshes',()=>{
 for(const type of ['ski','seago','cat','tinny']){const scene=new THREE.Scene(),s=new Spray(scene,QUALITY.Low),v={...boat(type),steer:1,slip:-6,yawRate:.8};
 for(let i=0;i<90;i++){v.z+=v.vz/60;s.update(1/60,v,i/60,true);}
 assert.equal(s.fans.length,0);assert(s.particles.some(p=>p.life>0));assert([...s.positions].every(Number.isFinite));
 for(let i=0;i<300;i++)s.update(1/60,{...v,throttle:0,speed:0,steer:0,yawRate:0,slip:0},1.5+i/60,false);
 assert(s.particles.every(p=>p.life<=0));assert(!s.plume.mesh.visible);s.dispose();
 }
});

test('rear jet retains forward boat momentum while carrying water farther aft through a full falling arc',async()=>{
 const {jetPlumeSource}=await import('../src/systems/spray-model.js');
 const {plumeTrajectory}=await import('../src/systems/jet-plume.js');
 const v={...boat(),drive:{trimAngle:0}},d={origin:{x:0,y:.2,z:-1.6},velocity:{x:0,y:0,z:-20},flow:.16,reverse:0,aerial:false},source=jetPlumeSource(v,d);
 assert(source.velocity.z>0); // Inherited forward momentum is not discarded.
 const p={...source.origin,vx:source.velocity.x,vy:source.velocity.y,vz:source.velocity.z,drag:.32};
 const apex=plumeTrajectory(p,.5),fall=plumeTrajectory(p,1);
 assert(apex.y>p.y);assert(fall.vy<0);assert(v.vz-(source.velocity.z)>14);
});

test('rider shifts weight smoothly through a bow-ride countersteer and keeps the tiller hand attached',()=>{
  const parent=new THREE.Group(),motor=new THREE.Group();motor.position.set(.18,.4,-1.65);
  const rider=makeRider(parent,'cat'),parts={motor};
  const run=(v,n=90)=>{for(let i=0;i<n;i++)rider.userData.update(v,1/60,parts);return rider.userData.balance;};
  const idle={steer:0,riderAft:0,pitch:0},rest=run(idle),bow={...idle,steer:1,lateralAcceleration:-8,riderAft:1,pitch:.8},left=run(bow);
  assert(left.hip[2]<rest.hip[2]-.2);assert(left.hip[0]<rest.hip[0]-.1);
  const next=run({...bow,steer:-1,lateralAcceleration:8},1);assert(Math.abs(next.lean-left.lean)<.1);
  const right=run({...bow,steer:-1,lateralAcceleration:8});assert(right.hip[0]>rest.hip[0]+.1);
  const grip=new THREE.Vector3(-.25,.45,.65).applyEuler(motor.rotation).add(motor.position);
  assert(rider.getObjectByName('right-hand').position.distanceTo(grip)<1e-6);
  rider.traverse(o=>{assert([...o.position,...o.scale,...o.quaternion].every(Number.isFinite));});
  assert(Math.abs(run(idle).lean)<.01);
});
test('multi-point touchdown distributes a bounded splash across all supplied contact positions',()=>{
 const s=new Spray(new THREE.Scene(),QUALITY.Low),v=boat('tinny'),contacts=[{x:-.5,z:-1},{x:.5,z:-1},{x:0,z:.7}];s.splash(v,2,contacts);
 const drops=s.particles.filter(p=>p.life>0);assert(drops.length<=s.count*.25+1);for(const point of contacts)assert(drops.some(p=>p.x===point.x&&p.z===point.z));s.dispose();
});
test('touchdown fan uses dense ballistic plume packets at each contact, then falls and expires',()=>{
 const s=new Spray(new THREE.Scene(),QUALITY.Low),v=boat('tinny'),contacts=[{x:-.5,z:-1},{x:.5,z:-1},{x:0,z:.7}];s.splash(v,2,contacts);const emitted=s.plume.packets.filter(p=>p.active);assert(emitted.length>=contacts.length*12);assert(emitted.length<s.plume.packets.length*.15);for(const point of contacts)assert(emitted.some(p=>p.x===point.x&&p.z===point.z));assert(emitted.some(p=>p.vx>0)&&emitted.some(p=>p.vx<0));
 let fell=false;for(let i=0;i<240;i++){s.update(1/60,{...v,throttle:0,speed:0,steer:0,yawRate:0,slip:0},i/60,false);fell ||= s.plume.falling>0;}assert(fell);assert(!s.plume.mesh.visible);s.dispose();
});
