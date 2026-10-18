import * as THREE from'three';
import{makeDeckCharacter}from'../vehicles/wardrobe.js';
import{Pedestrians}from'./pedestrians.js';
export class WaterfrontPeople extends Pedestrians{
 constructor(scene,onEvent){
  super(onEvent);this.models=this.people.map((p,i)=>{const m=makeDeckCharacter();m.scale.setScalar(.85+(i%3)*.04);return m;});this.visibleCount=0;this.batches=new Map();
  // All character parts use the same smooth sphere. Four material batches
  // retain walking/fall animation without hundreds of individual draw calls.
  this.models[0]?.traverse(o=>{if(o.isMesh&&!this.batches.has(o.material)){const mesh=new THREE.InstancedMesh(o.geometry,o.material,this.people.length*32);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;scene.add(mesh);this.batches.set(o.material,{mesh,count:0});}});
 }
 render(dt,time,player,quality){
  const limit=quality==='Low'?6:quality==='Medium'?10:16,visible=new Set([...this.people].sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z)).filter(p=>Math.hypot(p.x-player.x,p.z-player.z)<230).slice(0,limit));this.visibleCount=0;for(const b of this.batches.values())b.count=0;
  this.people.forEach((p,i)=>{const m=this.models[i];if(!visible.has(p))return;this.visibleCount++;m.position.set(p.x,p.y,p.z);m.rotation.y=p.heading;const target=p.fall>1?1.4:0;m.rotation.x+=(target-m.rotation.x)*(1-Math.exp(-dt*7));m.userData.animate(time,p.fall?0:1,false);m.updateMatrixWorld(true);m.traverse(o=>{if(o.isMesh){const b=this.batches.get(o.material);b.mesh.setMatrixAt(b.count++,o.matrixWorld);}});});
  for(const b of this.batches.values()){b.mesh.count=b.count;b.mesh.instanceMatrix.needsUpdate=true;}
 }
}
