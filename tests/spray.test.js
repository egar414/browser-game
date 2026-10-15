import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VEHICLES, QUALITY, waveHeight } from '../src/config.js';
import { sprayState, launchSpray } from '../src/systems/spray-model.js';
import { Spray } from '../src/systems/spray.js';
const boat=(type='ski')=>({type,config:VEHICLES[type],x:0,y:.14,z:0,heading:0,vx:0,vz:18,speed:18,throttle:1,steer:0,slip:0,yawRate:0,pitch:0,airborne:false,wipeout:0});

test('stationary, airborne and wiped-out boats cannot emit powered spray',()=>{
  for(const change of [{speed:0},{airborne:true},{wipeout:1}]){
    const s=sprayState({...boat(),...change},true);assert.equal(s.rate,0);assert.equal(s.jet,0);assert.equal(s.left,0);assert.equal(s.right,0);
  }
});
test('spray follows actual slip and turn load, with stronger freestyle carving',()=>{
  const v={...boat(),vx:-6,slip:-6,yawRate:1,steer:1},cruise=sprayState(boat()),turn=sprayState(v),freestyle=sprayState(v,true);
  assert(turn.left>turn.right*2);assert(turn.rate>cruise.rate);assert(freestyle.left>turn.left);
  const opposite=sprayState({...v,vx:6,slip:6,yawRate:-1,steer:-1},true);assert(opposite.right>opposite.left*2);
});
test('outward launch direction mirrors correctly and originates at the chine',()=>{
  const v=boat(),s=sprayState(v),left=launchSpray(v,s,-1,()=>.5),right=launchSpray(v,s,1,()=>.5);
  assert(left.x<0&&right.x>0);assert(left.vx<0&&right.vx>0);assert(left.z<0&&right.z<0);assert.equal(left.y,right.y);
  const reversed=sprayState({...v,vz:-3,speed:3});assert(reversed.jet<s.jet*.5);
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
