import test from 'node:test';
import assert from 'node:assert/strict';
import { mapData } from '../src/systems/geography.js';
import { collision, solids } from '../src/systems/environment.js';
import { WORLD, SPAWN, waveChop, WAVE_FIELD } from '../src/config.js';
import {bridgeLayout} from '../src/systems/bridge-layout.js';
import {landAt} from '../src/systems/geography.js';
test('geographic extent is in metres and uses the real estuary landmarks',()=>{
  assert(WORLD.maxX-WORLD.minX>3300);assert(WORLD.maxZ-WORLD.minZ>3700);
  assert(mapData.pois.some(p=>p.lighthouse&&p.name==='Point Cartwright Lighthouse'));
  assert(mapData.pois.some(p=>p.name==='The Wharf Mooloolaba'));
  assert.equal(mapData.source.license,'ODbL 1.0');assert.equal(collision(SPAWN.x,SPAWN.z,4),null);
});
test('every mapped bridge has a clear central passage and connected channel centrelines are navigable',()=>{
  for(const b of mapData.bridges){const plan=bridgeLayout(b,landAt);assert(plan.passages.length,b.name);for(const [x,z]of plan.passages)assert.equal(collision(x,z,3),null,b.name);}
  for(const c of mapData.channels)for(let i=1;i<c.points.length;i++){
    const a=c.points[i-1],b=c.points[i];
    for(let t=0;t<=1;t+=.1)assert.equal(collision(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,2),null,c.name);
  }
  const support=solids.find(s=>s.name==='Bridge support');assert(collision(support.x,support.z,.2,0));
  const pier=solids.find(s=>s.a);const x=(pier.a[0]+pier.b[0])/2,z=(pier.a[1]+pier.b[1])/2;assert(collision(x,z,.2,0));
});
test('shared exposure field is bounded, interpolates grid samples and leaves canals calmer than sea',()=>{
  const n=WAVE_FIELD.size,bounds=WAVE_FIELD.bounds;
  for(const [i,j] of [[0,0],[30,40],[90,15],[n-1,n-1]]){
    const x=bounds.minX+i/(n-1)*(bounds.maxX-bounds.minX),z=bounds.minZ+j/(n-1)*(bounds.maxZ-bounds.minZ);
    assert(Math.abs(waveChop(x,z)-WAVE_FIELD.values[j*n+i]/255)<1e-8);
  }
  assert(waveChop(SPAWN.x,SPAWN.z)<waveChop(1650,-1050));
  assert(waveChop(-10000,-10000)>=.2);assert(waveChop(10000,10000)<=1);
});
test('the mapped entrance rock wall collides while a continuous river-to-ocean passage stays open',()=>{
  const wall=solids.find(s=>s.name==='Entrance rock wall');assert(wall);assert(collision((wall.a[0]+wall.b[0])/2,(wall.a[1]+wall.b[1])/2,.2));
  const route=[[SPAWN.x,SPAWN.z],[-225.4,-1003.5],[-32.3,-992.8],[181.4,-891.2],[330.9,-755.6],[583.5,-744.2],[804.3,-782.6],[926.8,-844.7],[1011.4,-915.8],[1096.6,-1034.7],[1117.6,-1319.6],[1040,-1420],[990,-1500],[910,-1580],[840,-1660],[840,-1710],[1480,-1710],[1640,-1740]];
  for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i];for(let t=0;t<=1;t+=.01)assert.equal(collision(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,3),null,`river mouth segment ${i}`);}
});
