import * as THREE from'three';import{SLED,sledGround}from'../vehicles/sled-physics.js';import{surfaceTexture}from'./surface-textures.js';import{visitLabel}from'./visit-label.js';
export function buildSledLaunch(scene){
 const root=new THREE.Group(),geometry=new THREE.PlaneGeometry(SLED.length,SLED.halfWidth*2,36,2);geometry.rotateX(-Math.PI/2);const a=geometry.attributes.position;
 for(let i=0;i<a.count;i++){const x=SLED.shoreX-SLED.length/2+a.getX(i),z=SLED.z+a.getZ(i);a.setXYZ(i,x,sledGround(x)+.015,z);}geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({map:surfaceTexture('sand'),color:'#d3bd8b',roughness:.98,side:THREE.DoubleSide});root.add(new THREE.Mesh(geometry,material));
 const coneMaterial=new THREE.MeshStandardMaterial({color:'#ef8639',roughness:.7});for(let i=0;i<8;i++)for(const side of[-1,1]){const x=SLED.shoreX-4-i*9,cone=new THREE.Mesh(new THREE.ConeGeometry(.18,.52,6),coneMaterial);cone.position.set(x,sledGround(x)+.26,SLED.z+side*5.3);root.add(cone);}
 const label=visitLabel('TRACK SKIP · LAND RUN-UP · 54+ KM/H');label.position.set(SLED.startX-3,3,SLED.z);label.scale.set(16,2,1);root.add(label);scene.add(root);return root;
}
