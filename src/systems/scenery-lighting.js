import * as THREE from 'three';

// Shared photographic surface maps plus lightweight large-scale variation.
export function finishGroundMaterial(material){
 if(!material.userData.ground)return;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vGroundWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vGroundWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
  shader.fragmentShader=`varying vec3 vGroundWorld;
   float groundHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float groundNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(groundHash(i),groundHash(i+vec2(1.,0.)),f.x),mix(groundHash(i+vec2(0.,1.)),groundHash(i+1.),f.x),f.y);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   vec4 sampledDiffuseColor=texture2D(map,vGroundWorld.xz*${material.userData.surfaceKind==='grass'?'.55':'.7'});
   diffuseColor*=sampledDiffuseColor;
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 groundP=vGroundWorld.xz;
   float groundMacro=groundNoise(groundP*.034)*.7+groundNoise(groundP*.13+51.)*.3;
   float groundNear=1.-smoothstep(18.,95.,length(cameraPosition-vGroundWorld));
   float groundGrain=groundNoise(groundP*6.7);
   diffuseColor.rgb*=mix(.90,1.12,groundMacro)*(1.+(groundGrain-.5)*.055*groundNear);
  `);
 };
 material.customProgramCacheKey=()=> `photographic-coastal-ground-v3-${material.userData.surfaceKind}`;
}

// One instanced, feathered contact-shadow draw anchors houses and trees even
// on Low. This is authored ambient shading, not simulated solar occlusion.
export function addGroundContacts(root,sites){
 if(!sites.length)return 0;
 const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
 geometry.setAttribute('contactExtent',new THREE.InstancedBufferAttribute(new Float32Array(sites.flatMap(p=>[p.w/2,p.d/2])),2));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  uniforms:{uTint:{value:new THREE.Color('#203329')}},
  vertexShader:`attribute vec2 contactExtent;varying vec2 vContact;varying vec2 vExtent;varying float vContactDistance;
   void main(){vContactDistance=length(cameraPosition-(modelMatrix*instanceMatrix*vec4(position,1.)).xyz);vExtent=contactExtent;vContact=(uv-.5)*(contactExtent*2.+8.);gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 uTint;varying vec2 vContact;varying vec2 vExtent;varying float vContactDistance;
   void main(){vec2 edge=max(abs(vContact)-vExtent,0.);float shade=exp(-dot(edge,edge)*.34)*.27*(1.-smoothstep(250.,1600.,vContactDistance));
    if(shade<.006)discard;gl_FragColor=vec4(uTint,shade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`,
 });
 const mesh=new THREE.InstancedMesh(geometry,material,sites.length),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0);
 sites.forEach((p,i)=>{rotation.setFromAxisAngle(axis,p.heading||0);matrix.compose(new THREE.Vector3(p.x,p.y+.018,p.z),rotation,new THREE.Vector3(p.w+8,1,p.d+8));mesh.setMatrixAt(i,matrix);});
 mesh.name='Soft building and tree contact shade';mesh.computeBoundingSphere();root.add(mesh);return sites.length;
}

export function configureSunShadow(sun,quality){
 if(!sun)return;
 const size=quality.shadowSize||1024,extent=quality.shadowExtent||64;
 if(sun.shadow.mapSize.x!==size){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(size,size);}
 const camera=sun.shadow.camera;camera.left=camera.bottom=-extent;camera.right=camera.top=extent;camera.near=1;camera.far=700;camera.updateProjectionMatrix();
 sun.shadow.bias=-.00018;sun.shadow.normalBias=.045;sun.shadow.needsUpdate=true;
}
