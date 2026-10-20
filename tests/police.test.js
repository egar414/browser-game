import test from 'node:test';import assert from 'node:assert/strict';
import {PolicePatrol,POLICE} from '../src/systems/police-patrol.js';
import {PoliceNavigation} from '../src/systems/police-navigation.js';
import {collision} from '../src/systems/environment.js';
import {VehiclePhysics} from '../src/vehicles/physics.js';
import {SPAWN} from '../src/config.js';
const stationaryUnits=p=>{for(const u of p.units)u.v.update=()=>{};};
const playerAt=p=>{const v=new VehiclePhysics('ski',()=>null);Object.assign(v,{x:p.units[0].v.x+18,z:p.units[0].v.z,speed:0});return v;};
test('four patrols leave innocent players and AI alone, and only visible offences start a coordinated pursuit',()=>{
 const p=new PolicePatrol(()=>null),v=playerAt(p);stationaryUnits(p);assert.equal(p.units.length,4);
 for(let i=0;i<100;i++)p.update(.1,v,i*.1,[{id:'local-Gaz',ai:true,active:true,x:v.x,z:v.z,speed:50}]);assert.equal(p.remaining,0);
 v.speed=12;p.update(.21,v,11);assert.equal(p.targetId,'me');assert.match(p.offence,/Speeding/);assert.equal(new Set(p.status.units.map(u=>u.role)).size,4);
 const blocked=new PolicePatrol(()=>null);stationaryUnits(blocked);blocked.world=()=>true;assert.equal(blocked.sees(blocked.units[0],v),false);blocked.update(.2,v,0);assert.equal(blocked.remaining,0);
});
test('escape requires a full loss-of-sight countdown; interception uses the last observed location',()=>{
 const p=new PolicePatrol(()=>null),v=playerAt(p);stationaryUnits(p);v.speed=12;p.update(.21,v,0);assert(p.remaining);
 const seen={x:p.lastKnown.x,z:p.lastKnown.z};v.x=2400;v.z=-2600;v.speed=30;
 for(let i=0;i<110;i++)p.update(.1,v,i*.1);assert(p.remaining);assert.deepEqual({x:p.lastKnown.x,z:p.lastKnown.z},seen);
 for(let i=0;i<20;i++)p.update(.1,v,11+i*.1);assert.equal(p.remaining,0);assert.equal(p.state,'patrol');assert(p.cooldown>0);
});
test('a sustained close low-speed interception imposes 30 seconds, survives reload and expires while paused',()=>{
 let now=100000;const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},events=[];
 const p=new PolicePatrol(()=>null,e=>events.push(e),{clock:()=>now,storage}),v=playerAt(p);stationaryUnits(p);v.speed=12;p.update(.21,v,0);
 v.x=p.units[0].v.x+4;v.z=p.units[0].v.z;v.speed=0;
 for(let i=0;i<30;i++)p.update(.1,v,i*.1);assert.equal(p.impounded,30);assert.equal(p.remaining,0);assert(events.some(e=>e.type==='impound'));
 const reloaded=new PolicePatrol(()=>null,()=>{},{clock:()=>now,storage});assert.equal(reloaded.impounded,30);now+=29999;assert(reloaded.tickImpound()>0);now++;p.tickImpound();assert.equal(p.impounded,0);assert(events.some(e=>e.type==='released'));assert.equal(saved.size,0);
});
test('navigation spans mapped canals, river mouth and offshore water without crossing solid edges',()=>{
 const nav=new PoliceNavigation(collision);assert(nav.nodes.length>500);for(const z of [-2600,-900,500,2400])assert(nav.nodes.some(n=>n.links.length&&Math.abs(n.z-z)<200));
 assert(nav.route(SPAWN,{x:2300,z:-2600}).length>30,'river mouth connects to coastal patrol graph');
 const route=nav.route(SPAWN,{x:500,z:-500});assert(route.length>3);for(let i=1;i<route.length;i++)assert(nav.clear(route[i-1],route[i]));
 const p=new PolicePatrol(collision);assert.equal(new Set(p.units.map(u=>`${u.v.x}:${u.v.z}`)).size,4);for(const u of p.units)assert(!collision(u.v.x,u.v.z,2,0));
});
test('patrol boats and skis can take falling trim spray, sink and relaunch',()=>{
 const p=new PolicePatrol(()=>null),v=playerAt(p);stationaryUnits(p);const u=p.units[0],f=u.flood;
 f.water=f.capacityLitres-1;f.deckY=.5;p.flood.emit({x:f.x,y:.55,z:f.z,vx:0,vy:-3,vz:0,source:'trim'},10);p.flood.reindex();p.flood.update(.1,v,0,false);assert(f.resetIn>0);assert.equal(f.sinks,1);
 for(let i=0;i<190;i++)p.update(.1,v,i*.1);assert.equal(f.resetIn,0);assert.equal(f.water,0);assert(!u.collider.disabled);
});
test('actual patrol vehicle handling can approach and catch a stopped offender on mapped water',()=>{
 const p=new PolicePatrol(collision),v=new VehiclePhysics('ski',collision),u=p.units[0];Object.assign(v,{x:u.v.x+14,z:u.v.z,speed:12,vx:0,vz:0});
 p.update(1/60,v,0);assert(p.remaining);v.speed=0;
 for(let i=1;i<3600&&!p.impounded;i++)p.update(1/60,v,i/60);
 assert(p.impounded>0,'physics-controlled patrol must reach a stationary offender');
});
test('a departing online suspect does not leave patrols searching forever at their last position',()=>{
 const p=new PolicePatrol(()=>null),v=playerAt(p);stationaryUnits(p);const peer={...v,id:'online-rat',name:'Other Rat',active:true,speed:12};p.update(.21,v,0,[peer]);assert.equal(p.targetId,'online-rat');
 for(let i=0;i<130;i++)p.update(.1,v,i*.1,[]);assert.equal(p.remaining,0);
});
