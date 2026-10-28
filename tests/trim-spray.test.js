import test from 'node:test';import assert from 'node:assert/strict';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {VEHICLES,OFFSHORE_RUN,jetTrimPositions,setSeaState} from '../src/config.js';
import {maxTrimSpray,MAX_TRIM_SPRAY} from '../src/vehicles/trim-spray.js';
import {jetPlumeSource,JET_PLUME} from '../src/systems/spray-model.js';
import {plumeTrajectory} from '../src/systems/jet-plume.js';
import {packSpray} from '../src/systems/network-spray.js';
const input={throttle:1,steer:0,trim:0};
test('sweep assistance requires the final selected trim and the physically raised nozzle',()=>{
 for(const type of ['ski','seago','hyper']){const top=jetTrimPositions(type).at(-1),v={type,trimDegrees:top,drive:{trimAngle:top*Math.PI/180}};assert.equal(maxTrimSpray(v),1);assert.equal(maxTrimSpray({...v,trimDegrees:jetTrimPositions(type).at(-2)}),0);assert.equal(maxTrimSpray({...v,drive:{trimAngle:0}}),0);assert.equal(maxTrimSpray({...v,airborne:true}),0);assert.equal(maxTrimSpray({...v,wipeout:1}),0);}assert.equal(maxTrimSpray({type:'cat',trimDegrees:8}),0);
});
for(const type of ['ski','seago','hyper'])test(`${type}: full trim sweeps turn the hull less while ordinary powered steering remains useful`,()=>{
 setSeaState('calm',0,true);const turn=trim=>{const v=new VehiclePhysics(type);v.respawnAt(OFFSHORE_RUN.start);v.setTrim(trim);for(let i=0;i<360;i++)v.update(1/60,input,i/60);const before=v.heading;for(let i=0;i<60;i++)v.update(1/60,{...input,steer:.8},6+i/60);assert.equal(v.wipeout,0);assert(!v.airborne);return Math.abs(v.heading-before);};
 const normal=turn(0),max=turn(jetTrimPositions(type).at(-1));assert(normal>.25);assert(max<normal*.8);assert(max>.08);
});
test('maximum trim makes a taller thicker fan with bounded, mirrored lateral sweep and falling water',()=>{
 setSeaState('calm',0,true);const v={type:'ski',config:VEHICLES.ski,x:0,y:.14,z:0,heading:0,pitch:0,roll:0,vx:0,vz:0,speed:12,throttle:1,trimDegrees:19,drive:{trimAngle:19*Math.PI/180}},d={origin:{x:0,y:.15,z:-1.5},velocity:{x:8,y:5,z:-18},flow:.16,reverse:0,aerial:true};
 const base=jetPlumeSource({...v,trimDegrees:13,steer:1},d),right=jetPlumeSource({...v,steer:1},d),left=jetPlumeSource({...v,steer:-1},{...d,velocity:{...d.velocity,x:-8}});assert(right.velocity.y>base.velocity.y+5);assert(right.packetScale>base.packetScale);assert(right.velocity.x>base.velocity.x);assert(Math.abs(right.velocity.x+left.velocity.x)<1e-8);assert(Math.atan2(Math.abs(right.velocity.x),-right.velocity.z)<=MAX_TRIM_SPRAY.maximumSweep+.001);
 let peak=0,descending=false;for(let age=0;age<JET_PLUME.lifetime;age+=.02){const p=plumeTrajectory({x:0,y:right.origin.y,z:0,vx:right.velocity.x,vy:right.velocity.y,vz:right.velocity.z,drag:JET_PLUME.drag},age);peak=Math.max(peak,p.y);descending ||=p.vy<0;}assert(peak>7.2);assert(descending);assert.equal(jetPlumeSource({...v,airborne:true},d),null);
});
test('online rear source carries the same raised sideways jet without a SQL change',()=>{
 const v=new VehiclePhysics('ski');v.respawnAt(OFFSHORE_RUN.start);v.setTrim(19);for(let i=0;i<240;i++)v.update(1/60,input,i/60);v.steer=.8;const source=packSpray(v,4).find(s=>s.kind==='rear');assert(source);assert(source.vy>12);assert(Number.isFinite(source.vx)&&Number.isFinite(source.vz));assert(source.power<=2);
});
