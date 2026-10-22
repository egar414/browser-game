import test from'node:test';import assert from'node:assert/strict';import{VehiclePhysics}from'../src/vehicles/physics.js';import{OFFSHORE_RUN,setSeaState}from'../src/config.js';import{assistedYaw}from'../src/vehicles/steering-assist.js';
const input={throttle:1,steer:0,trim:0,freestyle:false};
function turn(type,hz=60){const v=new VehiclePhysics(type,()=>null,()=>{});v.respawnAt(OFFSHORE_RUN.start);let t=0;for(let i=0;i<hz*12;i++)v.update(1/hz,input,t+=1/hz);const start=v.heading;for(let i=0;i<hz*2;i++)v.update(1/hz,{...input,steer:.6},t+=1/hz);const end=v.heading;for(let i=0;i<hz/2;i++)v.update(1/hz,input,t+=1/hz);assert(!v.wipeout);return{turn:end-start,carry:v.heading-end};}
test('previously sluggish hulls approach the Super Skua turn and settle promptly after release',()=>{
 setSeaState('calm',0,true);const reference=turn('skua').turn;
 for(const hz of[30,60,120])for(const type of['cat','cruiser','dive','rib']){const r=turn(type,hz);assert(r.turn>reference*.7&&r.turn<reference*1.3,type+' comparable powered turn');assert(Math.abs(r.carry)<.04,type+' released steering');}
 const racer=turn('racer');assert(racer.turn>.2&&racer.turn<reference*.6,'500 km/h hull retains a wider high-speed arc');assert(Math.abs(racer.carry)<.02);
});
test('assist cannot pivot a stopped craft and preserves reversed steering and reduced max-trim yaw',()=>{
 const v={type:'cat',steer:1,throttle:1,speed:0,drive:{wetness:1}},keys={steer:1};assert.equal(assistedYaw(v,keys,1/60,0,0,{forward:0}),0);
 const forward=assistedYaw(v,keys,1/60,0,0,{forward:12}),reverse=assistedYaw(v,keys,1/60,0,0,{forward:-3}),trim=assistedYaw(v,keys,1/60,0,0,{forward:12,trimScale:.38});assert(forward>0&&reverse<0);assert(trim<forward*.5);assert.equal(assistedYaw(v,keys,1/60,0,1.3,{forward:12}),1.3);
});
