import{crewTorsoGeometry,crewLimbGeometry}from'./sculpted-crew.js';
import{coastalHeadGeometry,coastalCapGeometry}from'./coastal-character-detail.js';
import * as THREE from'three';
function fabric(a,b,shorts=false){
 const ca=new THREE.Color(a).convertLinearToSRGB(),cb=new THREE.Color(b).convertLinearToSRGB(),data=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const stripe=shorts?(y>6&&y<10||y>51&&y<55||x<2):y>28&&y<32;const c=stripe?cb:ca,i=(y*64+x)*4,grain=.97+((x*13+y*7)%7)/210;data[i]=c.r*255*grain;data[i+1]=c.g*255*grain;data[i+2]=c.b*255*grain;data[i+3]=255;}
 const texture=new THREE.DataTexture(data,64,64);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
let weave;
function clothWeave(){if(weave)return weave;const size=128,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const h=126+Math.sin(x*Math.PI*.5)*9+Math.cos(y*Math.PI*.5)*9;data.set([h,h,h,255],(y*size+x)*4);}weave=new THREE.DataTexture(data,size,size);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.magFilter=THREE.LinearFilter;weave.minFilter=THREE.LinearMipmapLinearFilter;weave.generateMipmaps=true;weave.needsUpdate=true;return weave;}
const clothing=(a,b,shorts=false)=>new THREE.MeshPhysicalMaterial({map:fabric(a,b,shorts),bumpMap:clothWeave(),bumpScale:.008,roughness:.82,sheen:.35,sheenRoughness:.8,sheenColor:'#7a9aab'});
export const beachWear={
 skin:new THREE.MeshStandardMaterial({color:'#c79373',roughness:.7,vertexColors:true}),
 vest:clothing('#243642','#458a8e',true),
 shirt:clothing('#38a6a2','#f3dcaa'),
 shorts:clothing('#183747','#c6aa74',true),
 dark:new THREE.MeshStandardMaterial({color:'#1c2934',roughness:.65}),
};
export function makeDeckCharacter(){
 const root=new THREE.Group(),parts={};
 function shape(name,scale,position,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),material);m.name=name;m.scale.fromArray(scale);m.position.fromArray(position);m.castShadow=true;root.add(m);parts[name]=m;return m;}
 shape('shirt',[.27,.37,.18],[0,1.12,0],beachWear.shirt);shape('head',[.17,.22,.17],[0,1.72,0],beachWear.skin);shape('hair',[.175,.09,.175],[0,1.86,-.01],beachWear.dark);
 for(const side of [-1,1]){
  shape('eye'+side,[.022,.025,.018],[side*.065,1.74,.158],beachWear.dark);
  shape('shorts'+side,[.14,.23,.14],[side*.14,.69,0],beachWear.shorts);
  shape('leg'+side,[.085,.25,.085],[side*.14,.29,0],beachWear.skin);
  shape('foot'+side,[.10,.055,.18],[side*.14,.055,.07],beachWear.dark);
  shape('sleeve'+side,[.13,.15,.15],[side*.29,1.32,0],beachWear.shirt);
  shape('arm'+side,[.075,.25,.075],[side*.32,.99,.01],beachWear.skin);
  shape('hand'+side,[.08,.09,.075],[side*.32,.75,.01],beachWear.skin);
 }
 parts.shirt.geometry.dispose();parts.shirt.geometry=crewTorsoGeometry();for(const side of[-1,1])for(const name of['arm','leg']){const part=parts[name+side];part.geometry.dispose();part.geometry=crewLimbGeometry();part.geometry.scale(1,2,1);}
 parts.head.geometry.dispose();parts.head.geometry=coastalHeadGeometry();parts.hair.geometry.dispose();parts.hair.geometry=coastalCapGeometry();
 // Skin surfaces share a material and are batched for passengers/NPCs. Give
 // unpainted limbs a neutral colour attribute alongside the coloured face.
 root.traverse(o=>{if(o.isMesh&&o.material.vertexColors&&!o.geometry.attributes.color)o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count*3).fill(1),3));});
 const eye=new THREE.Object3D();eye.position.set(0,1.74,.15);root.add(eye);root.userData.eye=eye;root.userData.faceParts=[parts.head,parts.hair,parts['eye1'],parts['eye-1']];
 root.userData.bodyParts=[parts.shirt,...[-1,1].flatMap(s=>[parts['shorts'+s],parts['leg'+s],parts['foot'+s]])];
 root.userData.animate=(time,moving,fishing,seated=false)=>{for(const side of [-1,1]){const swing=Math.sin(time*9+side*Math.PI/2)*.22*moving;parts['shorts'+side].position.y=seated?.93:.69;parts['shorts'+side].rotation.x=seated?-1:0;parts['leg'+side].position.set(side*.14,seated?.7:.29,seated?.27:0);parts['leg'+side].scale.y=seated?.17:.25;parts['foot'+side].position.y=seated?.55:.055;parts['foot'+side].position.z=seated?.35:.07+swing;parts['leg'+side].rotation.x=swing;parts['arm'+side].rotation.x=fishing?-.75:-swing;parts['hand'+side].position.set(side*.32,fishing?1.07:.75,fishing?.38:.01-swing*.2);}parts.shirt.position.y=1.12+Math.sin(time*3)*.012;};
 return root;
}
