import * as THREE from 'three';
import {makeDeckCharacter,beachWear} from '../vehicles/wardrobe.js';
import {capsizedPose} from '../vehicles/capsize.js';
import {waveHeight} from '../config.js';
export class CapsizeView{
 constructor(scene){this.scene=scene;this.group=new THREE.Group();this.group.visible=false;scene.add(this.group);this.age=0;this.wasActive=false;}
 update(model,v,dt,time){
  const active=capsizedPose(v);this.group.visible=active&&model.visible;
  if(model.userData.rider)model.userData.rider.visible=!active;
  if(!active){this.wasActive=false;return;}
  if(!this.actor){this.actor=makeDeckCharacter();this.actor.name='Ejected driver';this.group.add(this.actor);this.passenger=makeDeckCharacter();this.passenger.name='Ejected tinny passenger';this.passenger.scale.setScalar(.72);this.group.add(this.passenger);
   for(const name of['shirt','sleeve-1','sleeve1'])this.actor.getObjectByName(name).material=beachWear.vest;
   // Wardrobe materials/textures are shared by the fleet. Own material clones
   // so removing an online overboard actor cannot dispose a seated rider's kit.
   const materials=new Map();this.group.traverse(o=>{if(!o.material)return;if(!materials.has(o.material))materials.set(o.material,o.material.clone());o.material=materials.get(o.material);});
  }
  if(!this.wasActive){this.age=0;const side=-Math.sign(v.steer||v.roll||1);this.fallback={x:v.x+Math.cos(v.heading)*side*2,z:v.z-Math.sin(v.heading)*side*2};}
  this.wasActive=true;this.age+=dt;
  const e=v.ejection||{...this.fallback,y:waveHeight(this.fallback.x,this.fallback.z,time)+.08,age:this.age,floating:true};
  this.actor.position.set(e.x,e.y,e.z);this.actor.rotation.set(e.floating?-Math.PI/2:e.age*7,v.heading,e.floating?Math.sin(time*1.4)*.08:e.age*4);this.actor.userData.animate(time,e.floating?.45:1,false,false);
  this.passenger.visible=!!model.userData.passenger?.visible;
  if(model.userData.passenger)model.userData.passenger.visible=false;
  this.passenger.position.set(e.x+Math.cos(v.heading)*1.3,waveHeight(e.x+Math.cos(v.heading)*1.3,e.z,time)+.07,e.z-Math.sin(v.heading)*1.3);this.passenger.rotation.set(-Math.PI/2,v.heading+.5,0);this.passenger.userData.animate(time,.45,false,false);
 }
 dispose(){const resources=new Set();this.group.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});for(const r of resources)r.dispose();this.group.removeFromParent();}
}
