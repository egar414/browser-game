import test from 'node:test';import assert from 'node:assert/strict';
import {VehiclePhysics} from '../src/vehicles/physics.js';import {VEHICLES,OFFSHORE_RUN,setSeaState} from '../src/config.js';
test('Thundercat reaches its 110 km/h arcade ceiling without overspeed across fixed steps',()=>{
 setSeaState('calm',0,true);assert.equal(VEHICLES.cat.maxSpeed*3.6,110);
 for(const hz of [30,60,120]){const v=new VehiclePhysics('cat');v.respawnAt(OFFSHORE_RUN.start);let peak=0;for(let i=0;i<30*hz;i++){v.update(1/hz,{throttle:1,steer:0,trim:0,freestyle:false},i/hz);peak=Math.max(peak,v.speed);assert(v.speed<=110/3.6+1e-8);assert(!v.wipeout);}assert(peak*3.6>109);assert(v.speed*3.6>108);}
});
