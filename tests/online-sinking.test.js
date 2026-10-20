import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {onlineSinkDrop} from '../src/systems/online-sinking.js';import {makeVehicle} from '../src/vehicles/models.js';import {VEHICLES} from '../src/config.js';
test('all full-size online models submerge, including a tall fishing-boat tower, and reset immediately on relaunch',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({clearRect(){},fillRect(){},fillText(){}})})};try{
 for(const type of Object.keys(VEHICLES)){const model=makeVehicle(type,VEHICLES[type].colours[0],undefined,{creator:true}),bounds=new THREE.Box3().setFromObject(model);assert.equal(onlineSinkDrop(type,6),0);assert(onlineSinkDrop(type,1.5)>bounds.max.y,`${type} must fully submerge`);assert.equal(onlineSinkDrop(type,0),0);assert(onlineSinkDrop(type,4)>0);}
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
