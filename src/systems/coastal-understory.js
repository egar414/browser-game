import * as THREE from'three';
// One opaque instanced draw: small wind-shaped grass clumps around shore parks.
export function addCoastalUnderstory(root,sites){
 if(!sites.length)return;const positions=[],colours=[],base=new THREE.Color('#397849'),tip=new THREE.Color('#a6b85d');
 for(let i=0;i<5;i++){const a=i*2.399,w=.05+(i%2)*.025,x=Math.cos(a)*.15,z=Math.sin(a)*.15,height=.35+(i%3)*.14;for(const p of[[x-w,0,z],[x+w,0,z],[x+Math.cos(a)*.2,height,z+Math.sin(a)*.2]]){positions.push(...p);const c=p[1]>.1?tip:base;colours.push(c.r,c.g,c.b);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));g.computeVertexNormals();const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}),mesh=new THREE.InstancedMesh(g,m,sites.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();for(const [i,s]of sites.entries()){q.setFromAxisAngle(new THREE.Vector3(0,1,0),i*2.399);matrix.compose(new THREE.Vector3(s.x,s.y,s.z),q,new THREE.Vector3(s.scale,1,s.scale));mesh.setMatrixAt(i,matrix);}mesh.name='Coastal shore grass clumps';mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);return mesh;
}
