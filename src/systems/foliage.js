import * as THREE from 'three';
import {mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
// Original leaf clusters with a porous silhouette. Crossed cards replace the
// solid polygon balls while reducing geometry on low-powered devices.
export function coastalCanopy(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');let seed=441;
 const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 const clusters=[];for(let i=0;i<115;i++){const a=random()*Math.PI*2,r=Math.sqrt(random()),x=128+Math.cos(a)*r*103,y=128+Math.sin(a)*r*99;clusters.push({x,y,r:11+random()*17});}
 clusters.sort((a,b)=>b.y-a.y);
 for(const p of clusters){const sun=1-p.y/256,green=62+Math.round(sun*35+random()*18);c.fillStyle=`rgb(${green-13},${green+15},${green-27})`;c.beginPath();c.ellipse(p.x,p.y,p.r,p.r*.75,random()*3,0,Math.PI*2);c.fill();
  for(let j=0;j<10;j++){const x=p.x+(random()-.5)*p.r*1.65,y=p.y+(random()-.5)*p.r*1.1,g=green+random()*30;c.fillStyle=`rgb(${g-10},${g+16},${g-29})`;c.beginPath();c.ellipse(x,y,2+random()*3,1+random()*2,random()*3,0,Math.PI*2);c.fill();}
 }
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',map,alphaTest:.48,side:THREE.DoubleSide,roughness:.95});
 const planes=[];for(let i=0;i<3;i++){const p=new THREE.PlaneGeometry(2.2,2);p.rotateY(i*Math.PI/3);planes.push(p);}
 const top=new THREE.PlaneGeometry(2.0,2.0);top.rotateX(-Math.PI/2);top.translate(0,.25,0);planes.push(top);
 const geometry=mergeGeometries(planes);planes.forEach(g=>g.dispose());return{geometry,material};
}
