import test from'node:test';
import assert from'node:assert/strict';
import{VehiclePhysics}from'../src/vehicles/physics.js';
import{bodyPoint,hullImmersion}from'../src/vehicles/propulsion.js';
import{waveHeight,setSeaState,setWeatherClock}from'../src/config.js';
import{BAR_LAUNCH}from'../src/systems/bar-guide.js';
const idle={throttle:0,steer:0,freestyle:false,trim:0};

test('Thundercat follows rising bar crests without burying both tube crowns',()=>{
 setWeatherClock(1792180800);
 for(const sea of['calm','chop','swell','changing'])for(const action of['cruise','spray','bow']){
  setSeaState(sea,0,true);const v=new VehiclePhysics('cat');v.respawnAt(BAR_LAUNCH,0);let grounded=0,wet=0;
  for(let i=0;i<1800;i++){
   const t=i/60;v.update(1/60,{...idle,throttle:1,steer:i>300&&action==='spray'?Math.sin(t*.6)*.9:0,freestyle:i>300&&action!=='cruise'},t);
   assert(Number.isFinite(v.y)&&Math.abs(v.vy)<15,`${sea} ${action}: unstable heave`);
   if(v.airborne||v.wipeout)continue;grounded++;wet+=hullImmersion(v,t);
   const clearances=[-.73,.73].flatMap(x=>[-1.1,.55,1.25].map(z=>{const p=bodyPoint(v,[x,.49,z]);return p.y-waveHeight(p.x,p.z,t);}));
   assert(Math.max(...clearances)>.05,`${sea} ${action} at ${t}: both tube crowns buried`);
  }
  assert(grounded>600);assert(wet/grounded>.25,`${sea} ${action}: hull must retain water contact`);
 }
});

test('recovery clears water-follow history so a distant respawn cannot launch the cat',()=>{
 setSeaState('swell',0,true);const v=new VehiclePhysics('cat');v.respawnAt(BAR_LAUNCH,0);
 for(let i=0;i<300;i++)v.update(1/60,{...idle,throttle:1},i/60);
 assert(Number.isFinite(v.supportWater));v.respawnAt({...BAR_LAUNCH,x:BAR_LAUNCH.x+30},20);assert.equal(v.supportWater,null);assert.equal(v.vy,0);
 v.update(1/60,idle,20);assert(Math.abs(v.vy)<1);assert(!v.airborne);assert.equal(v.wipeout,0);
});
