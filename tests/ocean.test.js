import test from 'node:test';
import assert from 'node:assert/strict';
import {hourlyForecast,OCEAN_SWELL,SPAWN,waveHeight,setSeaState,setWeatherClock,oceanExposure,oceanReport}from'../src/config.js';
import {mapData}from'../src/systems/geography.js';
import {loadSettings}from'../src/systems/storage.js';
import {buildingFrame}from'../src/systems/architecture.js';
test('hourly forecast is deterministic, bounded and continuous through multiple hourly boundaries',()=>{
 for(let h=0;h<72;h++){const a=hourlyForecast(h*3600+.001),b=hourlyForecast(h*3600-.001);assert(Math.abs(a.height-b.height)<1e-7);assert(a.height>=.85&&a.height<=1.9);assert(a.wind>=3&&a.wind<=8);assert.deepEqual(a,hourlyForecast(h*3600+.001));}
 assert.notEqual(hourlyForecast(0).height,hourlyForecast(3600).height);
});
test('long period swell obeys deep water dispersion and stays out of sheltered canals',()=>{
 for(const w of OCEAN_SWELL){assert(w.period>=7&&w.period<=11);assert(Math.abs(w.speed*w.speed-9.81*Math.hypot(w.kx,w.kz))<1e-9);}
 assert(oceanExposure(SPAWN.x,SPAWN.z)<.05);assert(oceanExposure(1650,-1650)>.8);
 try{setSeaState('swell',0,true);for(let i=0;i<1000;i++)assert(Number.isFinite(waveHeight(1650,-1650,i*3)));setWeatherClock(3599.999);setSeaState('changing',0,true);const before=waveHeight(1650,-1650,50);setWeatherClock(3600.001);assert(Math.abs(waveHeight(1650,-1650,50)-before)<1e-6);assert(oceanReport(50).simulated);}finally{setSeaState('calm',0,true);}
});
test('mapped house frames retain rotation and footprint dimensions, with documented height provenance',()=>{
 const a=.37,c=Math.cos(a),s=Math.sin(a),points=[[-6,-4],[6,-4],[6,4],[-6,4],[-6,-4]].map(([x,z])=>[120+x*c-z*s,-800+x*s+z*c]),f=buildingFrame(points);
 assert(f.rectangular);assert(Math.abs(f.area-96)<1e-6);assert(Math.abs(f.w-12)<1e-6);assert(Math.abs(f.d-8)<1e-6);
 for(const b of mapData.buildings){assert(['mapped height','mapped levels','estimate'].includes(b.heightSource));assert(buildingFrame(b.points).area>0);}
 assert(mapData.buildings.length>700);assert(mapData.residential.length>50);assert(mapData.breakwaters.some(b=>b.name==='Rock Wall Mooloolaba'));
});

test('existing saves adopt hourly seas once without losing records; later manual choices persist',()=>{
 const upgraded=loadSettings({getItem:()=>JSON.stringify({seaState:'calm',bestTricks:900,careerPoints:480})});assert.equal(upgraded.seaState,'changing');assert.equal(upgraded.bestTricks,900);assert.equal(upgraded.careerPoints,480);
 upgraded.seaState='calm';assert.equal(loadSettings({getItem:()=>JSON.stringify(upgraded)}).seaState,'calm');
});
