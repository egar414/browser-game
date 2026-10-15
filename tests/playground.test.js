import test from 'node:test';
import assert from 'node:assert/strict';
import {AirTricks} from '../src/vehicles/air-tricks.js';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {SprayTarget,CANAL_SITES} from '../src/systems/canal-targets.js';
import {ENTRANCE_SHOALS,shoalInfluence,waveHeight,setSeaState} from '../src/ocean.js';
import {plumeTrajectory,JetPlume} from '../src/systems/jet-plume.js';
import {SPAWN,VEHICLES} from '../src/config.js';
import {collision,solids} from '../src/systems/environment.js';
import {mapData} from '../src/systems/geography.js';
import * as THREE from 'three';

test('Wharf launch has turning room and entrance shoals remain navigable',()=>{
 const wharf=mapData.pois.find(p=>p.name==='The Wharf Mooloolaba');assert(Math.hypot(SPAWN.x-wharf.x,SPAWN.z-wharf.z)<80);assert.equal(collision(SPAWN.x,SPAWN.z,12),null);
 for(const b of ENTRANCE_SHOALS){assert(shoalInfluence(b.x,b.z)>.95);assert.equal(collision(b.x,b.z,3),null);}
 assert(shoalInfluence(SPAWN.x,SPAWN.z)<.00001);
});
test('entrance banks stand up the swell, without raising canal waves',()=>{
 setSeaState('swell',0,true);
 const range=(x,z)=>{let lo=Infinity,hi=-Infinity;for(let t=0;t<240;t+=.1){const h=waveHeight(x,z,t);lo=Math.min(lo,h);hi=Math.max(hi,h);}return hi-lo;};
 const bank=range(1270,-1745),off=range(1270,-1850),canal=range(-39,-87);
 assert(bank>off*1.35,`${bank} vs ${off}`);assert(canal<.5);setSeaState('calm',0,true);
});
test('aerial poses require airtime and a deliberate hold, bank once, and wipeouts discard them',()=>{
 const tricks=new AirTricks();for(let i=0;i<120;i++)tricks.update(1/60,'hangman',false,0);assert.equal(tricks.land(true).length,0);
 for(let i=0;i<15;i++)tricks.update(1/60,'hangman',true,2);assert.equal(tricks.land(true).length,0);
 for(let i=0;i<90;i++)tricks.update(1/60,'hangman',true,2);assert.equal(tricks.completed.size,1);assert.equal(tricks.land(true)[0].label,'Hangman · landed');assert.equal(tricks.land(true).length,0);
 for(let i=0;i<40;i++)tricks.update(1/60,'superman',true,2);assert.equal(tricks.land(false).length,0);
});
test('physics banks a Hangman on landing but never on a rough landing',()=>{
 for(const rough of [false,true]){
  const events=[],v=new VehiclePhysics('ski',()=>null,e=>events.push(e));v.x=1650;v.z=-1650;v.y=2;v.launch(5,0);
  for(let i=0;i<220&&v.airborne;i++){if(rough)v.pitch=1;v.update(1/60,{throttle:0,steer:0,trim:0,freestyle:false,pose:'hangman'},i/60);}
  assert.equal(events.some(e=>e.label==='Hangman · landed'),!rough);if(rough)assert(events.some(e=>e.type==='wipeout'));
 }
});
test('canal targets require actual spray, recover only after leaving, and cannot score from inactivity',()=>{
 const t=new SprayTarget({x:0,z:0}),v={type:'ski',config:VEHICLES.ski,x:0,y:.14,z:5,heading:0,speed:18,vx:0,vz:18,throttle:1,slip:0,yawRate:0,pitch:0,roll:0,drive:{flow:.15,reverse:0},airborne:false};
 let hits=0;for(let i=0;i<150;i++)hits+=t.update(1/60,v,i/60);assert.equal(hits,1);
 for(let i=0;i<2400;i++)hits+=t.update(1/60,v,3+i/60);assert.equal(hits,1);assert.equal(t.armed,false);
 t.update(.1,{...v,x:80},50);assert(t.armed);for(let i=0;i<600;i++)hits+=t.update(1/60,{...v,speed:0},51+i/60);assert.equal(hits,1);
 for(const site of CANAL_SITES.targets)assert.equal(collision(site.x,site.z,3),null,site.name);
});
test('rear packets fall through the full arc and deposit water instead of expiring at the crest',()=>{
 const p={x:0,y:.2,z:0,vx:2,vy:13,vz:0,drag:.32};assert(plumeTrajectory(p,1).y>5);assert(plumeTrajectory(p,2).vy<0);assert(plumeTrajectory(p,2).y>1);
 const scene=new THREE.Scene(),plume=new JetPlume(scene,new THREE.Texture(),800),source={origin:{x:0,y:.2,z:0},velocity:{x:2,y:13,z:0},power:1};
 let impacts=0,falling=false;for(let i=0;i<300;i++){plume.update(1/60,i<30?source:null,i/60);impacts+=plume.impacts.length;if(i>85&&plume.falling>0)falling=true;assert([...plume.geometry.attributes.aCenter.array].every(Number.isFinite));}
 assert(falling);assert(impacts>30);assert.equal(plume.mesh.visible,false);plume.dispose();assert.equal(scene.children.length,0);
});

test('floating target platforms leave every mapped channel centre navigable',()=>{
 const before=solids.length;try{
  for(const s of CANAL_SITES.targets)solids.push({x:s.x,z:s.z,w:1.7,d:1.7,height:1.6,name:'Floating spray target'});
  for(const c of mapData.channels)for(let i=1;i<c.points.length;i++){const a=c.points[i-1],b=c.points[i];for(let t=0;t<=1;t+=.05)assert.equal(collision(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,2),null,c.name);}
  const t=CANAL_SITES.targets[0];assert.equal(collision(t.x,t.z,.1),'Floating spray target');
 }finally{solids.length=before;}
});

test('a hard collision on the landing step cannot bank an aerial pose or air score',()=>{
 const events=[],v=new VehiclePhysics('ski',()=> 'Wall',e=>events.push(e));v.x=1650;v.z=-1650;v.y=waveHeight(v.x,v.z,0)+.14;v.vx=20;v.airborne=true;v.airTime=1;v.vy=-2;v.airTricks.completed.add('hangman');
 v.update(1/60,{throttle:0,steer:0,trim:0,freestyle:false},0);assert(events.some(e=>e.type==='wipeout'));assert(!events.some(e=>e.type==='score'));
});
