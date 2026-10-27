import * as THREE from 'three';
import {HULL_WATER_PROFILES,MASK_RING,MASK_SPANS,hullWaterVertices,hullWaterIndices} from './hull-water-profiles.js';
import {WATER_PATCH_DISCARD} from './water.js';

// Depth-fail stencil counts closed hull intersections behind the ocean depth.
// Only the ocean tests this stencil; boat geometry, spray and deliberate flood
// meshes render normally. No colour render target, per-water-pixel fleet loop,
// extra particle emission or underwater black rectangle is involved.
export class HullWaterMask {
 constructor(capacity=512){
  this.capacity=capacity;this.count=0;this.rows={};const profiles=[];
  for(const[type,parts]of Object.entries(HULL_WATER_PROFILES))this.rows[type]=parts.map(p=>{profiles.push(hullWaterVertices(p));return profiles.length-1;});
  const width=(MASK_SPANS+1)*MASK_RING,data=new Float32Array(width*profiles.length*4);
  profiles.forEach((p,row)=>{for(let i=0;i<width;i++)data.set([p[i*3],p[i*3+1],p[i*3+2],1],(row*width+i)*4);});
  this.texture=new THREE.DataTexture(data,width,profiles.length,THREE.RGBAFormat,THREE.FloatType);this.texture.needsUpdate=true;
  this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(width*3),3));
  this.geometry.setAttribute('vertexId',new THREE.Float32BufferAttribute(Array.from({length:width},(_,i)=>i),1));this.geometry.setIndex(hullWaterIndices());
  this.profileRows=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage);this.geometry.setAttribute('profileRow',this.profileRows);
  const material=(side,op)=>new THREE.ShaderMaterial({side,colorWrite:false,depthWrite:false,depthTest:true,stencilWrite:true,stencilFunc:THREE.AlwaysStencilFunc,stencilZFail:op,stencilZPass:THREE.KeepStencilOp,stencilFail:THREE.KeepStencilOp,
   uniforms:{profiles:{value:this.texture},profileSize:{value:new THREE.Vector2(width,profiles.length)}},
   vertexShader:`uniform sampler2D profiles;uniform vec2 profileSize;attribute float vertexId;attribute float profileRow;void main(){vec3 p=texture2D(profiles,(vec2(vertexId,profileRow)+.5)/profileSize).xyz;gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(p,1.);}`,
   fragmentShader:'void main(){gl_FragColor=vec4(0.);}',});
  this.back=new THREE.InstancedMesh(this.geometry,material(THREE.BackSide,THREE.IncrementWrapStencilOp),capacity);
  this.front=new THREE.InstancedMesh(this.geometry,material(THREE.FrontSide,THREE.DecrementWrapStencilOp),capacity);
  this.front.instanceMatrix=this.back.instanceMatrix;this.back.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  this.volumeScene=new THREE.Scene();for(const mesh of[this.back,this.front]){mesh.frustumCulled=false;mesh.renderOrder=mesh===this.back?0:1;this.volumeScene.add(mesh);}
  this.depthScene=new THREE.Scene();this.depthMeshes=[];this.matrix=new THREE.Matrix4();this.instance=new THREE.Matrix4();this.point=new THREE.Vector3();
 }
 collect(scene,camera){
  this.count=0;const add=(type,matrix)=>{const rows=this.rows[type];if(!rows)return;this.point.setFromMatrixPosition(matrix);if(this.point.distanceToSquared(camera.position)>240**2)return;
   for(const row of rows){if(this.count>=this.capacity)break;this.back.setMatrixAt(this.count,matrix);this.profileRows.setX(this.count,row);this.count++;}};
  scene.traverseVisible(o=>{const type=o.userData.waterMaskType;if(!type)return;o.updateWorldMatrix(true,false);
   if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,this.instance);this.matrix.multiplyMatrices(o.matrixWorld,this.instance);add(type,this.matrix);}}else add(type,o.matrixWorld);
  });
  this.back.count=this.front.count=this.count;if(this.count){this.back.instanceMatrix.needsUpdate=true;this.profileRows.needsUpdate=true;}
 }
 configureWater(material){
  material.stencilWrite=true;material.stencilFunc=THREE.EqualStencilFunc;material.stencilRef=0;material.stencilWriteMask=0;
  material.stencilFail=material.stencilZFail=material.stencilZPass=THREE.KeepStencilOp;
 }
 prepareDepth(water){
  const sources=[water.mesh,water.surfPatch];sources.forEach((source,i)=>{
   if(!source){if(this.depthMeshes[i])this.depthMeshes[i].visible=false;return;}
   this.configureWater(source.material);
   let mesh=this.depthMeshes[i];if(!mesh){const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,colorWrite:false,vertexShader:source.material.vertexShader,fragmentShader:`uniform float uSurfPatch;varying vec3 vWorld;void main(){${WATER_PATCH_DISCARD}gl_FragColor=vec4(0.);}`,uniforms:source.material.uniforms});mesh=new THREE.Mesh(source.geometry,m);mesh.frustumCulled=false;this.depthMeshes[i]=mesh;this.depthScene.add(mesh);}
   mesh.visible=source.visible;mesh.geometry=source.geometry;mesh.material.uniforms=source.material.uniforms;
  });
 }
 render(renderer,scene,camera,water,enabled=true){
  // In the game the camera belongs to the main scene. Rendering a separate
  // prepass scene does not update that parented camera automatically; stale
  // view matrices would leave the mask one frame behind a moving chase view.
  camera.updateWorldMatrix(true,false);
  this.collect(scene,camera);this.prepareDepth(water);
  const saved={autoClear:renderer.autoClear,color:renderer.autoClearColor,depth:renderer.autoClearDepth,stencil:renderer.autoClearStencil};
  // A colour scene.background forces a clear in Three.js even if autoClear is
  // false. Clear it once here, then protect the stencil during the final pass.
  if(!enabled||!this.count){renderer.render(scene,camera);return;}
  try{
   if(scene.background?.isColor)renderer.setClearColor(scene.background);
   renderer.autoClear=false;renderer.clear(true,true,true);
   renderer.render(this.depthScene,camera);renderer.render(this.volumeScene,camera);renderer.clearDepth();
   renderer.autoClearColor=renderer.autoClearDepth=renderer.autoClearStencil=false;
   renderer.render(scene,camera);
  }finally{renderer.autoClear=saved.autoClear;renderer.autoClearColor=saved.color;renderer.autoClearDepth=saved.depth;renderer.autoClearStencil=saved.stencil;}
 }
 dispose(){this.geometry.dispose();this.texture.dispose();this.back.material.dispose();this.front.material.dispose();for(const mesh of this.depthMeshes)mesh?.material.dispose();}
}
