import test from 'node:test';
import assert from 'node:assert/strict';
import {VEHICLES} from '../src/config.js';
import {HULL_WATER_PROFILES,hullWaterVertices,hullWaterIndices} from '../src/systems/hull-water-profiles.js';
import {SPRAY_VISUAL_SCALE} from '../src/systems/spray-model.js';

test('water exclusion covers the entire boat fleet with finite, closed, outward-wound volumes',()=>{
 const ix=hullWaterIndices();
 for(const type of Object.keys(VEHICLES).filter(t=>t!=='sled')){
  assert.ok(HULL_WATER_PROFILES[type],type);
  for(const profile of HULL_WATER_PROFILES[type]){
   const p=hullWaterVertices(profile),edges=new Map();assert.ok([...p].every(Number.isFinite),type);let volume=0;
   for(let i=0;i<ix.length;i+=3){const ids=ix.slice(i,i+3),[a,b,c]=ids.map(n=>p.slice(n*3,n*3+3));volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');const e=edges.get(key)||{count:0,winding:0};e.count++;e.winding+=a<b?1:-1;edges.set(key,e);}
   }
   assert.ok(volume>0,`${type} outward orientation`);for(const e of edges.values()){assert.equal(e.count,2,type);assert.equal(e.winding,0,type);}assert.ok(ix.length/3<600,'bounded stencil geometry');
  }
 }
});
test('catamarans retain an unmasked gap, and the shared spray visual scale grows',()=>{
 for(const type of ['cat','racer']){assert.equal(HULL_WATER_PROFILES[type].length,2);for(const profile of HULL_WATER_PROFILES[type]){const xs=profile(.5).map(v=>v[0]);assert.ok(Math.max(...xs)<0||Math.min(...xs)>0);}}
 assert.equal(SPRAY_VISUAL_SCALE,2.2);
});
