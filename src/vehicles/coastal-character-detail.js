import * as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
// Extra silhouette detail stays inside the existing head/cap draw calls.
export function coastalHeadGeometry(){
 const head=new THREE.SphereGeometry(1,24,18),positions=head.attributes.position;
 // A broad brow, flatter cheeks and a tapered jaw give the face an authored
 // silhouette. Keep the same eye/IK attachment coordinates as the old head.
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),jaw=THREE.MathUtils.smoothstep(-y,.18,.92);positions.setXYZ(i,x*(1-jaw*.20),y,z>0?z*(1-jaw*.16):z);}
 head.computeVertexNormals();
 const nose=new THREE.SphereGeometry(1,12,8);nose.scale(.14,.19,.25);nose.translate(0,-.09,.93);
 const ears=[-1,1].map(side=>{const g=new THREE.SphereGeometry(1,10,8);g.scale(.12,.22,.13);g.translate(side*.96,-.04,0);return g;}),parts=[head,nose,...ears],geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());
 const p=geometry.attributes.position,colours=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),front=THREE.MathUtils.smoothstep(z,.55,.84),eye=Math.exp(-Math.pow((Math.abs(x)-.34)/.12,4)-Math.pow((y-.13)/.065,4))*front,brow=Math.exp(-Math.pow((Math.abs(x)-.34)/.18,4)-Math.pow((y-.30)/.045,4))*front,mouth=Math.exp(-Math.pow(x/.24,4)-Math.pow((y+.42)/.035,4))*front;
  const c=new THREE.Color().setRGB(1,1,1).lerp(new THREE.Color('#332b2b'),Math.max(eye*.88,brow*.65,mouth*.38));colours.set([c.r,c.g,c.b],i*3);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));return geometry;
}
export function coastalCapGeometry(){
 const crown=new THREE.SphereGeometry(1,24,12),p=[],uv=[],indices=[],segments=20;
 // A curved, rounded visor replaces the rectangular box brim.
 for(const layer of[0,1])for(let i=0;i<=segments;i++){const a=-Math.PI/2+i/segments*Math.PI,x=Math.sin(a)*1.04,z=Math.cos(a);for(const edge of[0,1]){p.push(x,-.33-Math.abs(x)*.12-layer*.10,edge?.62+z*1.55:.32+z*.65);uv.push(i/segments,edge);}}
 const offset=(segments+1)*2;
 for(let i=0;i<segments;i++){const a=i*2,b=a+offset;indices.push(a,a+1,a+2,a+1,a+3,a+2,b,b+2,b+1,b+1,b+2,b+3);for(const edge of[0,1]){const c=a+edge,d=c+offset;indices.push(c,c+2,d,c+2,d+2,d);}}
 const brim=new THREE.BufferGeometry();brim.setAttribute('position',new THREE.Float32BufferAttribute(p,3));brim.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));brim.setIndex(indices);brim.computeVertexNormals();const flat=brim.toNonIndexed(),crownFlat=crown.toNonIndexed(),geometry=mergeGeometries([crownFlat,flat],false);crown.dispose();crownFlat.dispose();brim.dispose();flat.dispose();return geometry;
}
