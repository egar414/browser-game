import * as THREE from 'three';
import {mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import {COASTAL_STYLE as ART}from'./art-direction.js';

// Sculpted, overlapping crowns retain volume from every camera direction.
// Keep Low at 100 triangles; rounded Medium/High crowns use 400, instanced.
// The same solid geometry supplies a believable silhouette to shadow maps.
export function coastalCanopy(simple=false){
 const lobes=[
  [0,.20,0,1.05,.92,.95,1],[-.62,.02,-.20,.73,.69,.72,0],
  [.60,.05,.12,.72,.73,.75,0],[-.10,.18,.60,.78,.72,.67,0],
  [.10,.12,-.62,.74,.75,.68,0],
 ],parts=[];
 const bottom=new THREE.Color(ART.canopyBottom),middle=new THREE.Color(ART.canopyMiddle),top=new THREE.Color(ART.canopyTop),colour=new THREE.Color();
 for(const [x,y,z,sx,sy,sz,detail]of lobes){
  const g=new THREE.IcosahedronGeometry(1,simple?0:1);g.scale(sx,sy,sz);g.translate(x,y,z);
  const p=g.attributes.position,colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const h=THREE.MathUtils.clamp((p.getY(i)+.8)/1.9,0,1),v=THREE.MathUtils.clamp((p.getX(i)+p.getZ(i))*.04,-.05,.05);
   colour.copy(h<.55?bottom:middle).lerp(h<.55?middle:top,h<.55?h/.55:(h-.55)/.45).multiplyScalar(1+v);
   colors.set([colour.r,colour.g,colour.b],i*3);
  }
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(g);
 }
 const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());geometry.computeBoundingSphere();
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.92,metalness:0});
 const wind={value:0};material.userData.wind=wind;material.onBeforeCompile=shader=>{shader.uniforms.uCoastalWind=wind;shader.vertexShader='uniform float uCoastalWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float phase=0.;
 #ifdef USE_INSTANCING
 phase=instanceMatrix[3].x*.037+instanceMatrix[3].z*.021;
 #endif
 transformed.x+=sin(uCoastalWind*1.3+phase)*.035*smoothstep(-.7,.8,position.y);
 transformed.z+=cos(uCoastalWind*.9+phase)*.02*smoothstep(-.7,.8,position.y);`);};material.customProgramCacheKey=()=> 'coastal-rounded-crown-wind-v2';
 return{geometry,material};
}
