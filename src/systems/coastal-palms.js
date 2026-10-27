import * as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
// Solid, curved fronds with separate leaflets, not flat alpha-cutout ribbons.
export function palmCrownGeometry(){const p=[],colors=[],shade=new THREE.Color(),dark=new THREE.Color('#245b32'),light=new THREE.Color('#87b54c');const tri=(a,b,c,t)=>{for(const v of[a,b,c]){p.push(...v);shade.copy(dark).lerp(light,t);colors.push(shade.r,shade.g,shade.b);}};
 for(let j=0;j<11;j++){const a=j*2.399,dx=Math.sin(a),dz=Math.cos(a),cx=Math.cos(a),cz=-Math.sin(a),length=3.4+(j%3)*.43;const center=t=>[1+dx*t*length,8.5+Math.sin(t*Math.PI)*1.0-t*t*2.0,dz*t*length];
  // A continuous folded blade gives distant palms a solid silhouette. The
  // tapered leaflets add a ragged edge without coincident reversed triangles.
  const edge=(t,side)=>{const p=center(t),w=Math.sin(Math.PI*t)*.37+.025;return[p[0]+cx*w*side,p[1]-.09-w*.3,p[2]+cz*w*side];};
  for(let k=0;k<6;k++){const t=k/6,u=(k+1)/6;for(const side of[-1,1]){const c=center(t),n=center(u),a=edge(t,side),b=edge(u,side);tri(c,a,n,.23+t*.55);tri(a,b,n,.23+t*.55);}}
  for(let k=0;k<5;k++){const t=.15+k*.15,at=center(t),next=center(t+.14),spread=(.22+Math.sin(t*Math.PI)*.48)*(1-t*.45);for(const side of[-1,1]){const outer=[at[0]+cx*spread*side+dx*.25,at[1]-.12-spread*.18,at[2]+cz*spread*side+dz*.25];tri(at,outer,next,.15+t*.65);}}
  for(let k=0;k<6;k++){const t=k/6,c=center(t),n=center((k+1)/6);tri([c[0]-cx*.035,c[1],c[2]-cz*.035],[c[0]+cx*.035,c[1],c[2]+cz*.035],n,.45);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;}
export function addCoastalPalms(root,sites){if(!sites.length)return;const trunk=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.18,3,0),new THREE.Vector3(.65,6,0),new THREE.Vector3(1,8.5,0)]),18,.18,8,false),crown=palmCrownGeometry(),bark=new THREE.MeshStandardMaterial({color:'#9b7d55',roughness:.9}),leaves=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,side:THREE.DoubleSide});
 const trunks=new THREE.InstancedMesh(trunk,bark,sites.length),crowns=new THREE.InstancedMesh(crown,leaves,sites.length),m=new THREE.Matrix4(),q=new THREE.Quaternion();sites.forEach((s,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),i*2.399);m.compose(new THREE.Vector3(s.x,s.y,s.z),q,new THREE.Vector3(s.size,s.size,s.size));trunks.setMatrixAt(i,m);crowns.setMatrixAt(i,m);});for(const mesh of[trunks,crowns]){mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);}trunks.name='Curved coastal palm trunks';crowns.name='Solid coastal palm leaflets';return sites.length;}
