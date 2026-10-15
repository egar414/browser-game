import test from 'node:test';
import assert from 'node:assert/strict';
import { waterjetSolution, propellerSolution, propulsionPose, WATER_DENSITY } from '../src/vehicles/propulsion.js';
import { pumpDischarge, stepDroplet, sprayState } from '../src/systems/spray-model.js';
import { VehiclePhysics } from '../src/vehicles/physics.js';
import { FIXED_STEP, waveHeight } from '../src/config.js';
const input={throttle:1,steer:0,trim:0,freestyle:false};
function craft(type='ski'){const v=new VehiclePhysics(type,()=>null);v.x=0;v.z=0;v.heading=0;v.y=waveHeight(0,0,0)+.14;return v;}
function run(v,n,controls=input){for(let i=0;i<n;i++)v.update(FIXED_STEP,controls,i*FIXED_STEP);return v;}
test('waterjet conserves the specified hydraulic energy and momentum flux',()=>{
  for(const area of [.003,.0048,.008])for(const inlet of [0,12,25]){
    const p=55000,s=waterjetSolution(p,area,inlet);
    assert(Math.abs(.5*s.massFlow*(s.exitSpeed**2-inlet**2)-p)<p*.0001);
    assert.equal(s.massFlow,WATER_DENSITY*s.volumeFlow);
    assert.equal(s.thrust,s.massFlow*(s.exitSpeed-inlet));
  }
  assert(waterjetSolution(55000,.003,0).volumeFlow<waterjetSolution(55000,.008,0).volumeFlow);
});
test('propeller actuator disk respects its available power',()=>{
  const p=18000,a=.053,u=14,s=propellerSolution(p,a,u);
  assert(Math.abs(s.thrust*(u+s.inducedSpeed)-p)<p*.0001);
});
test('trim rotates exhaust relative to the pitching hull and force opposes discharge',()=>{
  const v=craft(),deg=Math.PI/180;
  assert(propulsionPose(v,15*deg).direction.y>0);
  v.pitch=30*deg;assert(propulsionPose(v,15*deg).direction.y<0);
  v.pitch=0;v.trimDegrees=10;v.throttle=1;
  const d=v.propulsion.update(.1,v,input,0);assert(d.force.y<0);assert(d.force.z>0);
});
test('pump runs while stationary under power, but exposed intake stops liquid thrust',()=>{
  const v=craft();v.throttle=1;
  for(let i=0;i<30;i++)v.drive=v.propulsion.update(FIXED_STEP,v,input,0);
  assert(v.drive.thrust>1000);assert(sprayState(v).jet>0);assert(pumpDischarge(v));
  v.airborne=true;v.drive=v.propulsion.update(FIXED_STEP,v,input,0);
  assert.equal(v.drive.flow,0);assert.equal(v.drive.thrust,0);assert.equal(pumpDischarge(v),null);
  v.airborne=false;v.drive=v.propulsion.update(FIXED_STEP,v,input,0);assert(v.drive.wetness<1);
});
test('submerged discharge remains wash and reverse bucket redirects flow',()=>{
  const v=craft();v.y=-.1;v.throttle=1;
  for(let i=0;i<50;i++)v.drive=v.propulsion.update(FIXED_STEP,v,input,0);
  assert.equal(pumpDischarge(v).aerial,false);
  v.throttle=-1;for(let i=0;i<50;i++)v.drive=v.propulsion.update(FIXED_STEP,v,input,0);
  assert(pumpDischarge(v).velocity.z>0);assert(v.drive.force.z<0);
});
test('Cruise is gentler, Sport and Freestyle share full power, trim latches and clamps',()=>{
  const speeds={};for(const mode of ['cruise','sport','freestyle']){const v=craft();v.setMode(mode);run(v,120);speeds[mode]=v.speed;}
  assert(speeds.cruise<speeds.sport);assert(Math.abs(speeds.sport-speeds.freestyle)<.01);
  const v=craft();v.setMode('freestyle');run(v,100,{...input,throttle:0,trim:1});const trim=v.trimDegrees;
  run(v,30,{...input,throttle:0});assert.equal(v.trimDegrees,trim);v.setTrim(100);assert.equal(v.trimDegrees,19);
  v.setMode('cruise');assert.equal(v.trimDegrees,8);v.recover();assert.equal(v.trimDegrees,8);
});
test('droplets inherit speed, lose energy to drag and fall; dry hull creates no chine spray',()=>{
  const p={x:0,y:5,z:0,vx:20,vy:0,vz:0,diameter:.003};for(let i=0;i<30;i++)stepDroplet(p,1/60);
  assert(p.vx<20&&p.vx>0);assert(p.vy<0);assert(p.y<5);
  const v=craft();v.y=3;v.speed=20;v.vz=20;assert.equal(sprayState(v).rate,0);
});
