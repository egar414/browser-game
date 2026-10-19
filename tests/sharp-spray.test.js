import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';
import{sprayState,jetPlumeSource}from'../src/systems/spray-model.js';import{Spray}from'../src/systems/spray.js';import{VEHICLES,QUALITY,setSeaState}from'../src/config.js';import{createMooredTinnies}from'../src/systems/moored-boats.js';
const craft=type=>({type,config:VEHICLES[type],x:0,y:.14,z:0,heading:0,speed:18,vx:0,vz:18,throttle:1,steer:0,yawRate:0,slip:0,pitch:0,drive:{flow:.16,wetness:1,neutral:false,trimAngle:0,steeringAngle:0},airborne:false,wipeout:0});
test('big sprays need a sharp loaded turn; straight runs and gentle steering retain only wake',()=>{
 setSeaState('calm',0,true);for(const type of ['ski','seago','cat','tinny']){const v=craft(type);assert.equal(sprayState(v).rate,0);assert.equal(sprayState({...v,steer:.15,yawRate:.1,slip:.3}).rate,0);const turn=sprayState({...v,steer:1,yawRate:1,slip:-6});assert(turn.rate>30);assert(turn.turnGate>.8);}
 const v=craft('ski'),d={origin:{x:0,y:.1,z:-1.5},velocity:{x:0,y:2,z:-20},flow:.16,reverse:0};assert.equal(jetPlumeSource(v,d,0,sprayState(v)),null);assert(jetPlumeSource(v,d,0,sprayState({...v,steer:1,yawRate:1,slip:-6})));
});
test('falling fan droplets make bounded impact rings and rebound drops, then settle',()=>{
 const s=new Spray(new THREE.Scene(),QUALITY.Low),v={...craft('cat'),steer:1,yawRate:1,slip:-6};let rebounds=0,rings=0;
 for(let i=0;i<300;i++){v.z+=v.vz/60;if(i===75)Object.assign(v,{steer:0,yawRate:0,slip:0});s.update(1/60,v,i/60,true);rebounds=Math.max(rebounds,s.particles.filter(p=>p.life>0&&p.secondary).length);rings=Math.max(rings,s.wake.returns.length);assert(s.wake.returns.length<=24);}assert(s.waterImpacts>0);assert(rebounds>0);assert(rings>0);assert(s.fans.every(f=>!f.mesh.visible));s.dispose();
});
test('AI prop boats use no jet packet pool and idle fans retain no trajectory history',()=>{
 const s=new Spray(new THREE.Scene(),{...QUALITY.Low,particles:80,plumeCapacity:0});for(let i=0;i<120;i++)s.update(1/60,craft('tinny'),i/60,true);assert.equal(s.plume.packets.length,0);assert(s.fans.every(f=>f.history.length===0&&!f.mesh.visible));assert(s.wake.history.length>0);s.dispose();
});
test('moored boat has a cheap distant silhouette after its detailed draw range',()=>{
 const root=new THREE.Group(),render=createMooredTinnies(root,[{x:0,z:0,heading:0}],undefined,320);render(0,{x:450,z:0});assert.equal(render.visibleCount,0);assert.equal(root.getObjectByName('Persistent distant boats').count,1);render(0,{x:1600,z:0});assert.equal(root.getObjectByName('Persistent distant boats').count,0);
});
