import test from 'node:test';import assert from 'node:assert/strict';
import {VehiclePhysics} from '../src/vehicles/physics.js';import {OFFSHORE_RUN,setSeaState,VEHICLES} from '../src/config.js';
const drive={throttle:1,steer:0,trim:0,freestyle:false};
function run(hz,steer){const v=new VehiclePhysics('hyper',()=>null,()=>{});v.respawnAt(OFFSHORE_RUN.start);for(let i=0;i<12*hz;i++)v.update(1/hz,drive,i/hz);assert(v.speed*3.6>295);const start=v.heading;let slip=0;for(let i=0;i<2*hz;i++){v.update(1/hz,{...drive,steer},12+i/hz);slip=Math.max(slip,Math.abs(v.slip));assert(v.speed<=VEHICLES.hyper.maxSpeed+.001);assert(!v.wipeout&&!v.airborne);}return{v,turned:v.heading-start,slip};}
test('300 km/h steering stays progressive and retains speed without the old broad sideways skid',()=>{
 setSeaState('calm',0,true);for(const hz of[30,60,120]){const gentle=run(hz,.25),hard=run(hz,1);assert(gentle.turned>.3&&gentle.turned<.65);assert(hard.turned>gentle.turned*1.8&&hard.turned<1.6);assert(gentle.slip<5);assert(hard.slip<13);assert(hard.v.speed*3.6>245);for(let i=0;i<hz/2;i++)hard.v.update(1/hz,drive,14+i/hz);assert(Math.abs(hard.v.yawRate)<.025,'release settles without a sustained opposite fishtail');}
});

test('Apex medium steering at its arcade top speed matches Seago turning response',()=>{
 setSeaState('calm',0,true);const apex=run(60,.6);const seago=new VehiclePhysics('seago',()=>null);seago.respawnAt(OFFSHORE_RUN.start);
 for(let i=0;i<720;i++)seago.update(1/60,drive,i/60);const start=seago.heading;
 for(let i=0;i<120;i++)seago.update(1/60,{...drive,steer:.6},12+i/60);
 const reference=seago.heading-start;assert(apex.turned/reference>.85&&apex.turned/reference<1.15,'same steering input makes a similarly easy turn');assert(apex.v.speed*3.6>285);assert(apex.slip<8);
});
