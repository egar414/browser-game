import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box,tube } from '../vehicles/models.js';
import { waveHeight } from '../config.js';
const mat=(color,metalness=0,roughness=.6)=>new THREE.MeshStandardMaterial({color,metalness,roughness,side:THREE.DoubleSide});
function makeTinny(variant){
 const root=new THREE.Group(),alloy=mat('#a6b4b6',.78,.42),inside=mat('#697d7e',.6,.63),dark=mat('#243e48',.2,.42),rubber=mat('#1b2729',0,.9),seat=mat(['#d9ded7','#bdd0c5','#d7b68b'][variant],.15,.7);
 // Open riveted V-hull: separate bottom and sides, with no fake sealed deck.
 const sections=[[-2,.63,.48,-.22],[-1.55,.78,.56,-.31],[.7,.77,.6,-.24],[1.6,.47,.67,-.05],[2.05,.035,.76,.17]],verts=[],indices=[];
 for(const [z,w,top,bottom]of sections)verts.push(-w,top,z,-w*.72,bottom+.04,z,0,bottom,z,w*.72,bottom+.04,z,w,top,z);
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<4;j++){const a=i*5+j,b=a+5;indices.push(a,b,a+1,a+1,b,b+1);}
 indices.push(0,1,2,0,2,3,0,3,4);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();root.add(new THREE.Mesh(g,alloy));
 for(const side of [-1,1]){
  tube(root,sections.map(([z,w,y])=>[side*w,y+.025,z]),.035,rubber,16);
  tube(root,sections.map(([z,w,y,b])=>[side*w*.96,y-.14,z]),.014,alloy,16);
  for(let z=-1.65;z<1.3;z+=.52)tube(root,[[side*.67,.46,z],[side*.54,-.1,z],[0,-.18,z]],.018,inside,5);
 }
 box(root,1.12,.07,2.7,0,-.04,-.15,inside);
 for(const z of [-1.35,-.05,1.05]){box(root,z>1?1.05:1.38,.13,.34,0,.36,z,seat);box(root,.065,.32,.3,-.46,.18,z,alloy);box(root,.065,.32,.3,.46,.18,z,alloy);}
 box(root,1.26,.58,.07,0,.18,-1.97,alloy);
 box(root,.33,.4,.4,0,.64,-2.15,dark,true);box(root,.1,.7,.13,0,.05,-2.14,dark);box(root,.25,.035,.3,0,-.18,-2.2,dark);
 tube(root,[[0,.58,-2],[-.3,.53,-1.5]],.025,rubber,5);
 box(root,.4,.3,.34,.24,.14,.42,seat,true);
 if(variant===1){
  for(const side of [-1,1])tube(root,[[side*.64,.55,-.75],[side*.68,1.62,-.65],[side*.6,1.65,.65],[side*.61,.58,.8]],.022,alloy,7);
  box(root,1.5,.055,1.7,0,1.66,0,dark);
 }
 if(variant===2)tube(root,[[.5,.5,-1],[.68,1.8,-1.9],[.72,2.4,-2.6]],.012,dark,7);
 root.updateMatrixWorld(true);const groups=new Map();root.traverse(m=>{if(!m.isMesh)return;let geometry=m.geometry.clone();if(geometry.index)geometry=geometry.toNonIndexed();geometry.applyMatrix4(m.matrixWorld);if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(geometry);});
 const parts=[];for(const [material,geometries]of groups){parts.push({geometry:mergeGeometries(geometries),material});geometries.forEach(g=>g.dispose());}
 root.traverse(m=>m.geometry?.dispose());return parts;
}
export function createMooredTinnies(root,sites){
 const batches=[],matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),euler=new THREE.Euler(0,0,0,'YXZ');
 for(let variant=0;variant<3;variant++){
  const group=sites.filter((s,i)=>i%3===variant);if(!group.length)continue;
  for(const part of makeTinny(variant)){const mesh=new THREE.InstancedMesh(part.geometry,part.material,group.length);mesh.userData.dynamic=true;mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);batches.push({mesh,sites:group});}
 }
 return time=>{
  const poses=new Map();for(const p of sites){const fx=Math.sin(p.heading),fz=Math.cos(p.heading),y=waveHeight(p.x,p.z,time),front=waveHeight(p.x+fx*1.5,p.z+fz*1.5,time),back=waveHeight(p.x-fx*1.5,p.z-fz*1.5,time),left=waveHeight(p.x-fz*.65,p.z+fx*.65,time),right=waveHeight(p.x+fz*.65,p.z-fx*.65,time);euler.set(-Math.atan2(front-back,3)*.6,p.heading,Math.atan2(right-left,1.3)*.6,'YXZ');q.setFromEuler(euler);matrix.compose(new THREE.Vector3(p.x,y+.08,p.z),q,new THREE.Vector3(1,1,1));poses.set(p,matrix.clone());}
  for(const {mesh,sites}of batches){sites.forEach((p,i)=>mesh.setMatrixAt(i,poses.get(p)));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
 };
}
