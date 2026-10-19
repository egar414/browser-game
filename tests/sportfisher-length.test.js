import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';
import{makeSportfisher}from'../src/systems/offshore-view.js';import{VehiclePhysics}from'../src/vehicles/physics.js';import{DeckWalk}from'../src/vehicles/cruiser.js';import{SPORTFISHER_DECK,SPORTFISHER_BOW,SPORTFISHER_LENGTH}from'../src/vehicles/sportfisher-shape.js';import{VEHICLES,setSeaState}from'../src/config.js';
test('longer visible sportfisher retains beam and headroom, with single-batch crew',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({clearRect(){},fillText(){}})})};let model;try{model=makeSportfisher('Reef Runner','#254761',true);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
 const white=model.children.find(o=>o.isMesh&&o.material.color.getHexString()==='e5ece7');white.geometry.computeBoundingBox();const b=white.geometry.boundingBox;assert(Math.abs((b.max.z-b.min.z)-VEHICLES.cruiser.length)<.01);assert(Math.abs((b.max.x-b.min.x)-VEHICLES.cruiser.width)<.01);assert(b.max.y<9.6&&b.max.y>9.4);assert(SPORTFISHER_LENGTH>12&&SPORTFISHER_LENGTH<13);
 let count=0;model.traverse(o=>{if(o.isMesh){count++;assert.equal(o.parent,model,'no duplicate unbatched crew');}});assert(count<14);
});
test('longer bow stops at solid barriers and the enlarged cockpit remains bounded',()=>{
 setSeaState('calm',0,true);const v=new VehiclePhysics('cruiser',(x,z,r)=>z+r>=10?'Quay wall':null);v.respawnAt({x:0,z:0,heading:0},0);for(let i=0;i<600;i++)v.update(1/60,{throttle:1,steer:0},i/60);assert(v.z>1);assert(v.z+SPORTFISHER_BOW<10);assert.equal(v.speed,0);
 const deck=new DeckWalk();assert(deck.toggle(v));for(let i=0;i<600;i++)deck.update(1/60,{throttle:-1,steer:0},false);assert(deck.z< -4.8);assert(deck.z>=SPORTFISHER_DECK.minZ);assert(deck.z> -6.0);for(let i=0;i<600;i++)deck.update(1/60,{throttle:1,steer:0},false);assert.equal(deck.z,SPORTFISHER_DECK.maxZ);
});
