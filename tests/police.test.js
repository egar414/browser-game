import test from 'node:test';
import assert from 'node:assert/strict';
import {PolicePatrol,POLICE} from '../src/systems/police-patrol.js';
import {VEHICLES} from '../src/config.js';
test('four police patrols spot nearby craft, chase for one minute, then cool down without refreshing',()=>{
 const events=[],p=new PolicePatrol(()=>null,e=>events.push(e));assert.equal(p.units.length,4);assert.deepEqual(p.units.map(u=>u.type),['cat','cat','ski','ski']);
 const u=p.units[0],player={...u.v,config:VEHICLES.ski,x:u.v.x+18,z:u.v.z};assert(p.sees(u,player));p.update(1/60,player,0);assert.equal(p.remaining,60);
 for(let i=0;i<601;i++)p.update(.1,player,i*.1);
 assert.equal(p.remaining,0);assert(p.cooldown>29);assert.equal(events.filter(e=>e.label.includes('spotted')).length,1);assert.equal(events.filter(e=>e.label.includes('finished')).length,1);
 const blocked=new PolicePatrol(()=>null);blocked.world=()=>true;assert.equal(blocked.sees(blocked.units[0],player),false);assert.equal(POLICE.pursuitSeconds,60);
});

test('patrols spawn close to the Wharf and can pursue a moving online or local boater instead of the observer',()=>{
 const p=new PolicePatrol(()=>null),u=p.units[0],observer={...u.v,x:u.v.x+18,z:u.v.z,speed:0},other={id:'online-peer',name:'Another Rat',x:u.v.x+8,z:u.v.z+30,vx:0,vz:5,speed:5};
 p.update(1/60,observer,0,[other]);assert.equal(p.targetId,'online-peer');assert.equal(p.targetName,'Another Rat');assert.equal(p.remaining,60);
 const before=Math.hypot(u.v.x-other.x,u.v.z-other.z);for(let i=1;i<120;i++)p.update(1/60,observer,i/60,[other]);assert(Math.hypot(u.v.x-other.x,u.v.z-other.z)<before,'police approach the other boater');assert(p.remaining<59);
 const watch=p.watchPosition([{...other,id:'local-Gaz',name:'Gaz'}]);assert(watch);assert.equal(p.targetName,'Gaz');assert.equal(p.targetId,'local-Gaz');
 const near=p.meetPosition(),direction=Math.atan2(u.v.x-near.x,u.v.z-near.z);assert(Math.abs(near.heading-direction)<.001,'discovery camera points at police');
});
