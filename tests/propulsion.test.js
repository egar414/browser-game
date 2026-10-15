import test from 'node:test';
import assert from 'node:assert/strict';
import { waterjetSolution, propellerSolution, propulsionPose, bodyPoint, WATER_DENSITY } from '../src/vehicles/propulsion.js';
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
test('Cruise is gentler, Freestyle responds faster, and nine-position trim persists across modes',()=>{
  const speeds={};for(const mode of ['cruise','sport','freestyle']){const v=craft();v.setMode(mode);run(v,120);speeds[mode]=v.speed;}
  assert(speeds.cruise<speeds.sport);assert(speeds.freestyle>speeds.sport);
  const v=craft();v.setMode('freestyle');run(v,100,{...input,throttle:0,trim:1});const trim=v.trimDegrees;
  run(v,30,{...input,throttle:0});assert.equal(v.trimDegrees,trim);v.setTrim(100);assert.equal(v.trimDegrees,19);
  v.setMode('cruise');assert.equal(v.trimDegrees,19);v.recover();assert.equal(v.trimDegrees,19);
});
test('droplets inherit speed, lose energy to drag and fall; dry hull creates no chine spray',()=>{
  const p={x:0,y:5,z:0,vx:20,vy:0,vz:0,diameter:.003};for(let i=0;i<30;i++)stepDroplet(p,1/60);
  assert(p.vx<20&&p.vx>0);assert(p.vy<0);assert(p.y<5);
  const v=craft();v.y=3;v.speed=20;v.vz=20;assert.equal(sprayState(v).rate,0);
});
test('VTS has nine latched selections and moves its actuator in forward thrust',()=>{
  const v=craft();assert.equal(v.trimIndex,4);
  v.update(1/60,{...input,throttle:0,trim:1},0);assert.equal(v.trimIndex,5);assert.equal(v.drive.trimAngle,0);
  v.update(1/60,{...input,throttle:0,trim:0},1/60);assert.equal(v.trimIndex,5);
  v.update(1/60,{...input,throttle:0,trim:-1},2/60);assert.equal(v.trimIndex,4);
  v.setTrim(19);run(v,60);assert(v.drive.trimAngle>.2);assert(v.drive.trimAngle<19*Math.PI/180+.0001);
});
test('angled jet reaction includes inlet momentum in every axis',()=>{
  const v=craft();v.throttle=1;v.vx=2;v.vz=12;v.steer=.8;v.setTrim(8);
  for(let i=0;i<60;i++)v.drive=v.propulsion.update(1/60,v,input,0);
  for(const [axis,speed] of [['x',v.vx],['y',v.vy],['z',v.vz]]){
    const expected=-v.drive.massFlow*(v.drive.dischargeDirection[axis]*v.drive.exitSpeed+speed);
    assert(Math.abs(v.drive.force[axis]-expected)<.0001);
  }
});
test('outboard shifts through neutral before reverse without oscillating at the threshold',()=>{
  const v=craft('cat');run(v,120);assert(v.speed>7);
  run(v,30,{...input,throttle:-1});assert(v.drive.shifting);assert.equal(v.drive.force.z,0);
  run(v,900,{...input,throttle:-1});assert(v.vz<-.5);assert(v.drive.reverse>.99);assert(!v.drive.shifting);
});
test('Freestyle has a quicker brake gate response than Sport',()=>{
  const response={};for(const mode of ['sport','freestyle']){const v=craft();v.setMode(mode);v.vz=14;v.throttle=-1;for(let i=0;i<6;i++)v.drive=v.propulsion.update(1/60,v,input,0);response[mode]=v.drive.reverse;assert(v.drive.braking);}
  assert(response.freestyle>response.sport);
});
test('Thundercat bow ride needs power and weight shift, scores and settles when released',()=>{
  const events=[],v=new VehiclePhysics('cat',()=>null,e=>events.push(e));v.x=-100;v.z=100;v.heading=0;v.setTrim(5);
  let highest=0;for(let i=0;i<360;i++){v.update(1/60,{...input,freestyle:true},i/60);highest=Math.max(highest,v.pitch);assert(!v.airborne);}
  assert(highest>.7);assert(events.some(e=>e.label==='Bow rider'));assert(!events.some(e=>e.type==='wipeout'));
  run(v,120,{...input,throttle:0});assert(v.pitch<.35);
});

test('a Thundercat bow ride keeps its transom deck above water around a stern support',()=>{
  const v=craft('cat');v.x=-100;v.z=100;v.setTrim(5);let riding=0;
  for(let i=0;i<360;i++){
    v.update(1/60,{...input,freestyle:true},i/60);
    if(v.pitch>.65){const deck=bodyPoint(v,[0,.5,-1.38]);assert(deck.y>waveHeight(deck.x,deck.z,i/60));riding++;}
  }
  assert(riding>60);
});

test('reverse bucket retains lateral jet deflection while a reversing propeller changes it',()=>{
  for(const type of ['ski','cat']){
    const v=craft(type);v.steer=.8;v.throttle=1;
    for(let i=0;i<60;i++)v.drive=v.propulsion.update(1/60,v,input,0);
    assert(v.drive.yawMoment>0);
    v.throttle=-1;for(let i=0;i<120;i++)v.drive=v.propulsion.update(1/60,v,input,0);
    assert(v.drive.force.z<0);
    assert(type==='ski'?v.drive.yawMoment>0:v.drive.yawMoment<0);
  }
});

test('Thundercat can sustain a stern-supported bow ride for over fifteen seconds',()=>{
  for(const trim of [0,5,8]){
    const v=craft('cat');v.x=-200;v.z=-1000;v.heading=Math.PI/2;v.setTrim(trim);
    let continuous=0,longest=0;
    for(let i=0;i<1200;i++){
      v.update(1/60,{...input,freestyle:true},i/60);
      continuous=v.pitch>.65?continuous+1:0;longest=Math.max(longest,continuous);
      assert(!v.airborne&&!v.wipeout);assert(v.pitch<v.config.wipeoutAngle);
    }
    assert(longest/60>15,`trim ${trim}: longest balanced hold ${longest/60}s`);
    run(v,180,{...input,freestyle:false});assert(v.pitch<.35);assert(v.speed>12);
  }
});

test('a setup carve retains loaded-side spray through countersteering, then throws the opposite fan',()=>{
  const v=craft('ski');v.x=-200;v.z=-1000;v.heading=Math.PI/2;let time=0;
  const drive=(n,steer,freestyle)=>{
    let peak=0;
    for(let i=0;i<n;i++){v.update(1/60,{...input,steer,freestyle},time);time+=1/60;const s=sprayState(v,false,time);peak=Math.max(peak,s.left,s.right);}
    return peak;
  };
  const cruise=drive(240,0,false),setup=drive(30,.7,true);
  drive(9,-1,true);const loaded=sprayState(v,false,time);
  assert(v.steer<0&&v.slip<0);assert(loaded.left>loaded.right,'water follows retained hull motion, not instantly the opposite bar input');
  const carve=drive(51,-1,true);assert(carve>cruise*2);assert(carve>setup);
  const finished=sprayState(v,false,time);assert(finished.right>finished.left,'fan changes sides when cross-flow reverses');
});
