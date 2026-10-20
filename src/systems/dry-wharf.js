import * as THREE from 'three';
import {SPAWN} from '../config.js';
import {box,tube} from '../vehicles/models.js';
import {visitLabel} from './visit-label.js';
export const DRY_WHARF={heading:SPAWN.heading,x:SPAWN.x+Math.sin(SPAWN.heading)*34-Math.cos(SPAWN.heading)*24,z:SPAWN.z+Math.cos(SPAWN.heading)*34+Math.sin(SPAWN.heading)*24,lift:1.6};
export function wharfPoint(x,z){const h=DRY_WHARF.heading;return{x:DRY_WHARF.x+Math.cos(h)*x+Math.sin(h)*z,z:DRY_WHARF.z-Math.sin(h)*x+Math.cos(h)*z,heading:h};}
export function wharfLocal(p){const dx=p.x-DRY_WHARF.x,dz=p.z-DRY_WHARF.z,h=DRY_WHARF.heading;return{x:dx*Math.cos(h)-dz*Math.sin(h),z:dx*Math.sin(h)+dz*Math.cos(h)};}
export function canDock(v,blocked=false){const p=wharfLocal(v);return!blocked&&!v.airborne&&!v.wipeout&&v.speed<2.5&&Math.abs(p.x)<4.3&&Math.abs(p.z)<5;}
export class DryWharf{
 constructor(scene,solids){this.lift=0;this.target=0;this.cooldown=0;this.root=new THREE.Group();this.root.position.set(DRY_WHARF.x,0,DRY_WHARF.z);this.root.rotation.y=DRY_WHARF.heading;scene.add(this.root);
  const timber=new THREE.MeshStandardMaterial({color:'#8f694a',roughness:.85}),steel=new THREE.MeshStandardMaterial({color:'#30575b',metalness:.7,roughness:.35}),gold=new THREE.MeshStandardMaterial({color:'#efbc5b',roughness:.6});
  this.platform=new THREE.Group();this.root.add(this.platform);box(this.platform,11.8,.22,23,0,-.55,0,steel);for(const x of [-2,2])box(this.platform,.4,.3,20,x,-.3,0,timber);
  for(const side of [-1,1]){box(this.root,1.8,.5,30,side*7,.65,0,timber);for(const z of [-14,0,14]){box(this.root,.4,5,.4,side*7,2.1,z,steel);tube(this.root,[[side*7,4.5,z],[side*5.4,4.5,z]],.07,steel);}
   for(const z of [-13,-9,-5,-1,3,7,11])box(this.root,.18,.06,1.4,side*6.4,.94,z,gold);
   const a=wharfPoint(side*7,-15),b=wharfPoint(side*7,15);solids.push({name:'Dry wharf walkway',a:[a.x,a.z],b:[b.x,b.z],width:1.8,height:2.1});}
  box(this.root,15.8,.5,2,0,.65,15,timber);const a=wharfPoint(-7,15),b=wharfPoint(7,15);solids.push({name:'Dry wharf end',a:[a.x,a.z],b:[b.x,b.z],width:2,height:2});
  const sign=visitLabel('DRY WHARF · UPGRADES ↓');sign.position.set(0,5.5,13);sign.scale.set(14,2,1);this.root.add(sign);
  const entry=visitLabel('SLOW · DRIVE INTO BAY');entry.position.set(0,2.3,-15);entry.scale.set(10,1.4,1);this.root.add(entry);
 }
 update(dt){this.cooldown=Math.max(0,this.cooldown-dt);this.lift+=Math.sign(this.target-this.lift)*Math.min(Math.abs(this.target-this.lift),dt*.65);this.platform.position.y=this.lift*DRY_WHARF.lift;}
 get approach(){return wharfPoint(0,-27);}
}
