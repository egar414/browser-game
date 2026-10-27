import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {marineAlloyMaterial} from './marine-finish.js';
let deckMaps;
function teakMaps(){
 if(deckMaps)return deckMaps;const n=128,p=new Uint8Array(n*n*4),r=new Uint8Array(n*n*4);let seed=4821;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const seam=x%32<2,v=.86+Math.sin(x*.75+Math.sin(y*.07))*.06+rand()*.07,i=(y*n+x)*4;p.set(seam?[38,43,42,255]:[186*v,132*v,80*v,255],i);r.set([190,190,190,255],i);}
 const texture=(data,srgb)=>{const t=new THREE.DataTexture(data,n,n);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.repeat.set(4,2);t.needsUpdate=true;return t;};
 deckMaps={map:texture(p,true),roughnessMap:texture(r,false)};return deckMaps;
}
export function brushedAlloy(colour='#bdc7cb'){
 const m=marineAlloyMaterial(colour);m.map=null;m.color.multiplyScalar(.70);m.metalness=.84;m.roughness=.54;m.normalScale.set(.45,.45);m.name='Brushed marine aluminium';return m;
}
export const gelcoat=colour=>new THREE.MeshPhysicalMaterial({color:colour,metalness:.05,roughness:.29,clearcoat:.8,clearcoatRoughness:.22});
export const deckTeak=()=>new THREE.MeshStandardMaterial({color:'#ede1ca',...teakMaps(),roughness:.72});
export const marineSteel=()=>new THREE.MeshStandardMaterial({color:'#bcc6cc',metalness:.88,roughness:.26});
export function roundedBlock(root,w,h,d,x,y,z,material,radius=Math.min(w,h,d)*.14){
 const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(radius,Math.min(w,h,d)*.4)),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
}
export function detailTube(root,points,radius,material,segments=24){
 const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:new THREE.Vector3(...p))),segments,radius,6,false),material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
}
export function deckFittings(root,{width=1,length=2,y=.4,z=0,material=marineSteel(),deckMaterial}={}){
 const size=Math.min(1,width/1.6);
 for(const side of[-1,1])for(const end of[-1,1]){
  const x=side*width*.43,pz=z+end*length*.35;roundedBlock(root,.13*size,.025*size,.055*size,x,y,pz,material,.008*size);roundedBlock(root,.028*size,.075*size,.025*size,x,y+.045*size,pz,material,.006*size);roundedBlock(root,.17*size,.025*size,.028*size,x,y+.08*size,pz,material,.009*size);
 }
 if(deckMaterial){for(const side of[-1,1])roundedBlock(root,width*.25,.015,length*.7,side*width*.31,y-.055,z,deckMaterial,.008);}
}
