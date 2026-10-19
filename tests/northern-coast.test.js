import test from'node:test';import assert from'node:assert/strict';
import{mapData,landAt,areaName}from'../src/systems/geography.js';import{collision}from'../src/systems/environment.js';import{WORLD,SPAWN,waveHeight,waveChop}from'../src/config.js';import{coastalTerrainHeight}from'../src/systems/coastal-terrain.js';
test('mapped northern coast joins the mouth and all three destinations through clear water',()=>{
 const c=mapData.coastalExtension;assert(c);assert(WORLD.minZ<-4500);assert(c.added.buildings>=400);assert(mapData.buildings.some(b=>b.name==='Alexandra Headland Surf Club'&&b.coastalExtension));assert(mapData.roads.some(r=>r.name==='Alexandra Parade'));assert(mapData.pois.some(p=>p.name==='Alexandra Headland'&&p.coastal));
 const route=[[840,-1770],...c.route];for(let i=1;i<route.length;i++)for(let t=0;t<=1;t+=.01){const a=route[i-1],b=route[i];assert.equal(collision(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,9),null,`coastal segment ${i}`);}
 for(const p of c.destinations){assert.equal(collision(p.x,p.z,9),null);assert(areaName(p.x,p.z).includes(p.name.toUpperCase()));assert(Number.isFinite(waveHeight(p.x,p.z,100)));assert(waveChop(p.x,p.z)>.7);}
 assert.equal(collision(SPAWN.x,SPAWN.z,4),null);
});
test('new shoreline is solid on the mapped land side and open on the sea side',()=>{
 for(const z of [-2200,-2500,-2800,-3200,-4000]){let x;for(const ring of mapData.coastalExtension.shoreline)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];if(z>=Math.min(a[1],b[1])&&z<=Math.max(a[1],b[1])&&a[1]!==b[1])x=a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]);}
 assert(Number.isFinite(x));assert(landAt(x-20,z));assert(!landAt(x+20,z));assert(collision(x-20,z,2));assert.equal(collision(x+20,z,2),null);
 }
});
test('headland relief tapers to water and does not invent northern hills outside its region',()=>{
 assert(coastalTerrainHeight(-1260,-2320,200)>15);assert.equal(coastalTerrainHeight(-1260,-2320,0),.62);assert.equal(coastalTerrainHeight(-1700,-3500,200),.62);assert.equal(coastalTerrainHeight(-200,-1000,200),.62);
});
