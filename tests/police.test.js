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
