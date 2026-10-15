import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VEHICLES, QUALITY, waveHeight } from '../src/config.js';
import { sprayState, launchSpray } from '../src/systems/spray-model.js';
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
  const v=boat(),s=sprayState(v),left=launchSpray(v,s,-1,()=>.5),right=launchSpray(v,s,1,()=>.5);
  assert(left.x<0&&right.x>0);assert(left.vx<0&&right.vx>0);assert(Math.abs(left.z)<=v.config.length*.44&&Math.abs(right.z)<=v.config.length*.44);assert(left.y>=waveHeight(left.x,left.z,0)&&right.y>=waveHeight(right.x,right.z,0));
  const reversed=sprayState({...v,vz:-3,speed:3});assert(reversed.rate<s.rate);
});
test('emission is stable across frame rates and geometry stays within its pool',()=>{
  const run=dt=>{const scene=new THREE.Scene(),s=new Spray(scene,QUALITY.Low),v=boat();
    for(let t=0;t<2-dt*.5;t+=dt){v.z+=v.vz*dt;v.y=waveHeight(v.x,v.z,t)+.14;s.update(dt,v,t,true,{freestyle:false});}
    const emitted=s.next;assert(s.wake.history.length>4);assert(s.wake.history.length<=QUALITY.Low.wakeSamples);
    assert(s.wake.geometry.drawRange.count<=s.wake.geometry.index.count);
    assert([...s.positions].every(Number.isFinite));s.dispose();assert.equal(scene.children.length,0);return emitted;};
  assert(Math.abs(run(1/60)-run(1/30))<=3);
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
