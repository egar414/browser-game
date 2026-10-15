import test from 'node:test';
import assert from 'node:assert/strict';
import { mapData } from '../src/systems/geography.js';
import { collision, solids } from '../src/systems/environment.js';
import { WORLD, SPAWN, waveChop, WAVE_FIELD } from '../src/config.js';
test('geographic extent is in metres and uses the real estuary landmarks',()=>{
  assert(WORLD.maxX-WORLD.minX>3300);assert(WORLD.maxZ-WORLD.minZ>3700);
  assert(mapData.pois.some(p=>p.lighthouse&&p.name==='Point Cartwright Lighthouse'));
  assert(mapData.pois.some(p=>p.name==='The Wharf Mooloolaba'));
  assert.equal(mapData.source.license,'ODbL 1.0');assert.equal(collision(SPAWN.x,SPAWN.z,4),null);
});
test('every mapped bridge has a clear central passage and connected channel centrelines are navigable',()=>{
  for(const b of mapData.bridges){const a=b.points[0],c=b.points.at(-1);assert.equal(collision((a[0]+c[0])/2,(a[1]+c[1])/2,3),null,b.name);}
  for(const c of mapData.channels)for(let i=1;i<c.points.length;i++){
    const a=c.points[i-1],b=c.points[i];
    for(let t=0;t<=1;t+=.1)assert.equal(collision(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,2),null,c.name);
  }
  const support=solids.find(s=>s.name==='Bridge support');assert(collision(support.x,support.z,.2,0));
  const pier=solids.find(s=>s.a);const x=(pier.a[0]+pier.b[0])/2,z=(pier.a[1]+pier.b[1])/2;assert(collision(x,z,.2,0));
});
test('shared exposure field is bounded, interpolates grid samples and leaves canals calmer than sea',()=>{
  const n=WAVE_FIELD.size;
  for(const [i,j] of [[0,0],[30,40],[90,15],[127,127]]){
    const x=WORLD.minX+i/(n-1)*(WORLD.maxX-WORLD.minX),z=WORLD.minZ+j/(n-1)*(WORLD.maxZ-WORLD.minZ);
    assert(Math.abs(waveChop(x,z)-WAVE_FIELD.values[j*n+i]/255)<1e-8);
  }
  assert(waveChop(SPAWN.x,SPAWN.z)<waveChop(1650,-1050));
  assert(waveChop(-10000,-10000)>=.2);assert(waveChop(10000,10000)<=1);
});
