import{constrainHullWater}from'../vehicles/shafting.js';
import{distantBoats}from'./boat-lod.js';
import * as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{makeVehicle}from'../vehicles/models.js';
import{Spray}from'./spray.js';
import{LocalTraffic}from'./local-traffic.js';
import{LOCAL_TRAFFIC as T,QUALITY}from'../config.js';

// Batch hull and motor solids separately. Rider limbs, tiller and propeller
// keep their original animated transforms; no shared rider buffers are disposed.
function batch(group,excluded){
 group.updateWorldMatrix(true,true);const inverse=new THREE.Matrix4().copy(group.matrixWorld).invert(),buckets=new Map(),remove=[];
 group.traverse(o=>{
  if(!o.isMesh||Array.isArray(o.material))return;for(let p=o;p&&p!==group;p=p.parent)if(excluded.has(p))return;
  let g=o.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
  if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  const id=o.material.uuid;if(!buckets.has(id))buckets.set(id,{material:o.material,geometries:[]});buckets.get(id).geometries.push(g);remove.push(o);
 });
 for(const {material,geometries}of buckets.values()){
  const g=mergeGeometries(geometries,false);if(!g)throw Error('Local boat batching failed');const m=new THREE.Mesh(g,material);m.castShadow=false;m.receiveShadow=true;group.add(m);geometries.forEach(g=>g.dispose());
 }
 remove.forEach(o=>{o.removeFromParent();o.geometry.dispose();});
}
export class LocalBoaters extends LocalTraffic{
 constructor(scene,collision,onEvent){
  super(collision,onEvent);this.visibleCount=0;this.distant=distantBoats(scene,this.boats.length);
  this.boats.forEach((b,i)=>{
   const colours=['#bdc9cc','#e8a45f','#bfd4ca','#d7cbc1','#79bab7','#c4ced0'];
   b.model=makeVehicle(b.type,colours[i%colours.length]);b.model.name=`Local boater ${b.name}`;scene.add(b.model);
   const parts=b.model.userData;batch(b.model,new Set([parts.rider,parts.motor,parts.passenger]));batch(parts.motor,new Set([parts.propeller]));
   b.effects=new THREE.Group();scene.add(b.effects);b.spray=new Spray(b.effects,{...QUALITY.Low,particles:80,wakeSamples:40,fanSegments:5,plumeDensity:.3,plumeCapacity:0});
   b.water=new THREE.Mesh(new THREE.PlaneGeometry(b.type==='cat'?.85:.72,b.type==='cat'?2.2:1.45),new THREE.MeshStandardMaterial({color:'#579c9d',transparent:true,opacity:.78,roughness:.2,metalness:.15,side:THREE.DoubleSide}));
   b.water.rotation.x=-Math.PI/2;b.water.position.z=-.08;parts.body.add(b.water);b.visible=false;
  });
 }
 render(dt,time,player,quality,height,fov,pixelRatio,playing,alpha=1){
  const nearby=this.boats.filter(b=>Math.hypot(b.v.x-player.x,b.v.z-player.z)<T.viewDistance).sort((a,b)=>Math.hypot(a.v.x-player.x,a.v.z-player.z)-Math.hypot(b.v.x-player.x,b.v.z-player.z)).slice(0,T.visible[quality]||3);
  const visible=new Set(nearby);this.distant.update(this.enabled?this.boats.filter(b=>!visible.has(b)&&b.flood.sinking<.98&&Math.hypot(b.v.x-player.x,b.v.z-player.z)<1100).map(b=>({...b.v,y:b.v.y-b.flood.sinking*2.8})):[],time);this.visibleCount=0;
  for(const b of this.boats){
   const show=this.enabled&&visible.has(b)&&b.flood.sinking<.98;b.model.visible=b.effects.visible=show;
   if(!show){if(b.visible)b.spray.clear();b.visible=false;continue;}b.visible=true;this.visibleCount++;
   const v=b.v,p=v.previous,a=playing?alpha:1,render={...v,x:THREE.MathUtils.lerp(p.x,v.x,a),y:THREE.MathUtils.lerp(p.y,v.y,a),z:THREE.MathUtils.lerp(p.z,v.z,a),heading:THREE.MathUtils.lerp(p.heading,v.heading,a),pitch:THREE.MathUtils.lerp(p.pitch,v.pitch,a),roll:THREE.MathUtils.lerp(p.roll,v.roll,a)};
   if(!b.flood.sinking)constrainHullWater(render,time);
   b.model.position.set(render.x,render.y-b.flood.sinking*2.8,render.z);b.model.rotation.set(-render.pitch,render.heading,render.roll+b.flood.sinking*.35,'YXZ');
   const parts=b.model.userData;parts.motor.rotation.set(v.drive.trimAngle,-v.drive.steeringAngle,0,'YXZ');if(parts.propeller)parts.propeller.rotation.z+=v.drive.rpm/60*Math.PI*2*dt;
   parts.rider.userData.update(v,dt,parts);parts.passenger?.userData.update(v,dt);const fill=b.flood.water/55;b.water.visible=fill>.015;b.water.position.y=b.type==='cat'?.30+fill*.12:-.14+fill*.48;
   b.spray.update(playing?dt:0,render,time,playing&&!b.flood.resetIn,{...b.controls,contactEffects:true});b.spray.resize(height,fov,pixelRatio);
  }
 }
}
