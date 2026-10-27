import{distantBoats}from'./boat-lod.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildTender} from '../vehicles/tender.js';
import {VEHICLES,waveHeight} from '../config.js';
import {MooringFlood,MOORING_FLOOD,floodCapacity} from './mooring-flood.js';

function tenderParts(colour){
  const root=buildTender(colour,'classic',{detail:'moored'});root.updateMatrixWorld(true);const groups=new Map();
  root.traverse(m=>{
    if(!m.isMesh)return;
    let g=m.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(m.matrixWorld);
    if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(g);
  });
  const parts=[];for(const [material,geometries]of groups){parts.push({geometry:mergeGeometries(geometries),material});geometries.forEach(g=>g.dispose());}
  root.traverse(m=>m.geometry?.dispose());return parts;
}
export function createMooredTinnies(root,sites,onEvent,drawDistance=400){
  const fleet=new MooringFlood(sites,onEvent),batches=[],matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),euler=new THREE.Euler(0,0,0,'YXZ'),position=new THREE.Vector3(),scale=new THREE.Vector3(1,1,1);
  for(let variant=0;variant<3;variant++){
    const group=fleet.boats.filter((s,i)=>i%3===variant&&s.visual!=='cabin');if(!group.length)continue;
    let maskMarked=false;
    for(const part of tenderParts(['#bdc9cc','#c7d8ca','#d8d0b9'][variant])){
      const mesh=new THREE.InstancedMesh(part.geometry,part.material,group.length);mesh.userData.dynamic=true;if(!maskMarked){mesh.userData.waterMaskType='tinny';maskMarked=true;}mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);batches.push({mesh,sites:group});
    }
  }
  const outline=new THREE.Shape([new THREE.Vector2(-.43,-.95),new THREE.Vector2(.43,-.95),new THREE.Vector2(.48,.15),new THREE.Vector2(.28,.72),new THREE.Vector2(0,.96),new THREE.Vector2(-.28,.72),new THREE.Vector2(-.48,.15)]);
  const waterGeometry=new THREE.ShapeGeometry(outline);waterGeometry.rotateX(Math.PI/2);
  const water=new THREE.InstancedMesh(waterGeometry,new THREE.MeshStandardMaterial({color:'#397d83',transparent:true,opacity:.8,roughness:.3,side:THREE.DoubleSide,depthWrite:false}),sites.length);
  water.userData.dynamic=true;water.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(water);
  const distant=distantBoats(root,sites.length);
  const render=(time,view)=>{
    const visible=fleet.boats.filter(p=>p.visual!=='cabin'&&(!view||Math.hypot(p.x-view.x,p.z-view.z)<drawDistance));
    for(const p of fleet.boats.filter(p=>p.visual==='cabin')){
      const y=waveHeight(p.x,p.z,time),fill=p.water/floodCapacity(p);p.deckY=y+.85;
      p.model.visible=p.sinking<.98&&(!view||Math.hypot(p.x-view.x,p.z-view.z)<Math.max(900,drawDistance));
      p.model.position.set(p.x,y-fill*.38-p.sinking*3.8,p.z);p.model.rotation.set(p.sinking*.23,p.heading,p.sinking*.35,'YXZ');
    }
    render.visibleCount=visible.length;const detailed=new Set(visible);distant.update(fleet.boats.filter(p=>p.visual!=='cabin'&&!detailed.has(p)&&p.sinking<.98&&(!view||Math.hypot(p.x-view.x,p.z-view.z)<1100)),time);
    const poses=new Map();for(const p of visible){
      const fx=Math.sin(p.heading),fz=Math.cos(p.heading),fill=p.water/MOORING_FLOOD.capacityLitres;
      const y=waveHeight(p.x,p.z,time),front=waveHeight(p.x+fx*.8,p.z+fz*.8,time),back=waveHeight(p.x-fx*.8,p.z-fz*.8,time),left=waveHeight(p.x-fz*.5,p.z+fx*.5,time),right=waveHeight(p.x+fz*.5,p.z-fx*.5,time);
      euler.set(-Math.atan2(front-back,1.6)*.6-VEHICLES.tinny.restPitch+p.sinking*.4,p.heading,Math.atan2(right-left,1)*.6+VEHICLES.tinny.restRoll+p.sinking*.65,'YXZ');q.setFromEuler(euler);
      position.set(p.x,y+.08-fill*.26-p.sinking*2.8,p.z);scale.setScalar(p.sinking>.95?.001:1);matrix.compose(position,q,scale);poses.set(p,matrix.clone());
    }
    for(const {mesh,sites}of batches){
      const active=sites.filter(p=>poses.has(p));mesh.count=active.length;
      active.forEach((p,i)=>mesh.setMatrixAt(i,poses.get(p)));mesh.instanceMatrix.needsUpdate=true;if(mesh.count)mesh.computeBoundingSphere();
    }
    const filled=visible.filter(p=>p.water>.1&&p.sinking<.7);water.count=filled.length;
    filled.forEach((p,i)=>{const pose=poses.get(p).clone().multiply(new THREE.Matrix4().makeTranslation(0,-.12+p.water/MOORING_FLOOD.capacityLitres*.44,0));water.setMatrixAt(i,pose);});
    water.instanceMatrix.needsUpdate=true;if(water.count)water.computeBoundingSphere();
  };
  render.fleet=fleet;return render;
}
