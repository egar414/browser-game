import test from 'node:test';import assert from 'node:assert/strict';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {VEHICLES,OFFSHORE_RUN,jetTrimPositions,setSeaState} from '../src/config.js';
import {maxTrimSpray,MAX_TRIM_SPRAY,trimSprayFan} from '../src/vehicles/trim-spray.js';
import {jetPlumeSource,JET_PLUME} from '../src/systems/spray-model.js';
import {JetPlume,plumeTrajectory} from '../src/systems/jet-plume.js';
import * as THREE from 'three';
import {packSpray} from '../src/systems/network-spray.js';
const input={throttle:1,steer:0,trim:0};
test('raised trim opens a filled bilateral fan without adding packets or losing falling trajectories',()=>{
 const random=Math.random;
 const sample=fan=>{
  let seed=71;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const plume=new JetPlume(new THREE.Scene(),null,1200,.75),source={origin:{x:0,y:2,z:0},velocity:{x:0,y:10,z:-18},power:1,trimFan:fan,fanHeading:0};
  for(let i=1;i<=30;i++)plume.update(1/60,source,i/60);
  const packets=plume.packets.filter(p=>p.active),spread=packets.map(p=>plumeTrajectory(p,.6).x),width=Math.max(...spread)-Math.min(...spread),size=plume.geometry.attributes.aSize.array.slice();
  assert(packets.some(p=>plumeTrajectory(p,2).vy<0));plume.dispose();return{packets,spread,width,size};
 };
 try{
  const narrow=sample(0),wide=sample(1);assert.equal(wide.packets.length,narrow.packets.length);assert(wide.width>narrow.width*3);
  assert(wide.spread.some(x=>x<-2)&&wide.spread.some(x=>x>2));assert(wide.spread.some(x=>Math.abs(x)<.3),'continuous water through centre');
  assert(wide.size.some((x,i)=>i%2===0&&x>narrow.size[i]*1.3));
  for(const type of['ski','seago','hyper']){assert.equal(trimSprayFan({type,drive:{trimAngle:.33}}),1);assert.equal(trimSprayFan({type,drive:{trimAngle:0}}),0);assert.equal(trimSprayFan({type,drive:{trimAngle:.33},airborne:true}),0);}
  assert.equal(trimSprayFan({type:'racer',drive:{trimAngle:.33}}),0);
 }finally{Math.random=random;}
});
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
