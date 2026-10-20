import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createMooredTinnies} from '../src/systems/moored-boats.js';
import {waveHeight} from '../src/config.js';
test('moored cabin boats share falling-water capture, sinking, collision disabling and reset without replacing their model',()=>{
 const root=new THREE.Group(),model=new THREE.Group(),collider={disabled:false};model.add(new THREE.Mesh(new THREE.BoxGeometry(3,2,7),new THREE.MeshBasicMaterial()));root.add(model);
 const render=createMooredTinnies(root,[{id:'cabin',visual:'cabin',model,collider,x:0,z:0,heading:0,width:3,length:7,capacityLitres:90,captureRect:{minX:-1,maxX:1,minZ:-3.3,maxZ:-2}}]);
 render(0,{x:0,z:10});const fleet=render.fleet,b=fleet.boats[0],v={x:1000,z:0,type:'ski',throttle:0};assert(model.visible);assert.equal(render.visibleCount,0,'a cabin never turns into a tender instance');
 b.water=89;fleet.emit({x:0,y:b.deckY+.1,z:-2.5,vx:0,vy:-3,vz:0,source:'trim'},10);fleet.update(.1,v,0,false);fleet.update(.1,v,.1,false);assert.equal(b.sinks,1);
 for(let i=0;i<45;i++)fleet.update(.1,v,i*.1,false);render(4.5,{x:0,z:0});assert(collider.disabled);assert(model.position.y<waveHeight(0,0,4.5)-3);assert(!model.visible);
 for(let i=0;i<170;i++)fleet.update(.1,v,5+i*.1,false);render(22,{x:0,z:0});assert.equal(b.water,0);assert(!collider.disabled);assert(model.visible);assert.equal(model.parent,root);
});
