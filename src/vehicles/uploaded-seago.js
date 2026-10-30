import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import asset from '../assets/seago-mesh.json' with {type:'json'};
import {makeRider} from './rider.js';
import {batchRigidAssembly} from './rigid-model.js';

let cached;
function bytes(text){return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
function sourceGeometry(){
 if(cached)return cached;
 const packed=new Int16Array(bytes(asset.positions).buffer),positions=Float32Array.from(packed,v=>v*asset.positionScale),normals=Float32Array.from(new Int8Array(bytes(asset.normals).buffer),v=>v/127);
 cached=new THREE.BufferGeometry();cached.setAttribute('position',new THREE.BufferAttribute(positions,3));cached.setAttribute('normal',new THREE.BufferAttribute(normals,3));cached.setIndex(new THREE.BufferAttribute(new Uint16Array(bytes(asset.indices).buffer),1));cached.computeBoundingBox();cached.computeBoundingSphere();return cached;
}

export function makeUploadedSeago(colour='#b83836'){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const physical=c=>new THREE.MeshPhysicalMaterial({color:c,roughness:.58,metalness:.04,clearcoat:.25,clearcoatRoughness:.4});
 const materials={hull:physical('#141b20'),deck:physical('#252d32'),seat:new THREE.MeshStandardMaterial({color:'#41494e',roughness:.86}),accent:physical(colour),screen:physical('#162e3b')};
 const source=new THREE.Group();source.name='Uploaded Seago sculpt with pointed bow';body.add(source);
 const g=sourceGeometry().clone(),p=g.attributes.position,colours=new Float32Array(p.count*3),base=new THREE.Color('#232a2e'),seat=new THREE.Color('#353c41'),accent=new THREE.Color(colour),c=new THREE.Color();
 const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
 for(let i=0;i<p.count;i++){
  const x=Math.abs(p.getX(i)),y=p.getY(i),z=p.getZ(i),stripe=smooth(.08,.17,y)*(1-smooth(.23,.32,y))*smooth(.43,.56,x),shoulder=smooth(.45,.70,z)*(1-smooth(1.35,1.70,z))*smooth(.16,.29,x)*smooth(.39,.60,y),saddle=smooth(.46,.58,y)*(1-smooth(-.08,.12,z))*smooth(-1.5,-1.25,z)*(1-smooth(.29,.36,x));
  c.copy(base).lerp(seat,saddle).lerp(accent,Math.max(stripe,shoulder));c.toArray(colours,i*3);
 }
 g.setAttribute('color',new THREE.BufferAttribute(colours,3));const finish=physical('#ffffff');finish.vertexColors=true;const mesh=new THREE.Mesh(g,finish);mesh.name='Actual uploaded Seago mesh';mesh.castShadow=mesh.receiveShadow=true;source.add(mesh);
 const rubber=new THREE.MeshStandardMaterial({color:'#10161b',roughness:.85});
 function add(parent,g,m,p=[0,0,0]){const mesh=new THREE.Mesh(g,m);mesh.position.fromArray(p);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function tube(parent,points,r,m){return add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,r,8),m);}
 function block(parent,w,h,d,p,m){return add(parent,new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.18),m,p);}
 // Retain the shared camera/IK grip positions and move real hardware with them.
 tube(body,[[0,.78,.36],[0,.98,.39]],.045,materials.deck);
 const handlebars=new THREE.Group();handlebars.position.set(0,.98,.39);body.add(handlebars);
 tube(handlebars,[[-.4,0,-.12],[-.19,.02,-.01],[0,.02,.02],[.19,.02,-.01],[.4,0,-.12]],.032,materials.deck);
 for(const side of[-1,1]){block(handlebars,.19,.075,.085,[side*.34,0,-.12],rubber);tube(handlebars,[[side*.27,-.025,-.08],[side*.34,-.025,-.03],[side*.41,-.025,-.04]],.008,materials.accent);}
 block(handlebars,.17,.055,.14,[0,.04,.09],rubber);block(handlebars,.12,.008,.07,[0,.073,.09],materials.screen);
 const nozzle=new THREE.Group();nozzle.position.set(0,-.06,-1.8);body.add(nozzle);
 const outlet=add(nozzle,new THREE.CylinderGeometry(.14,.18,.24,18),rubber,[0,0,-.06]);outlet.rotation.x=Math.PI/2;
 const bucket=new THREE.Group();bucket.position.set(0,.1,-1.81);body.add(bucket);block(bucket,.4,.15,.18,[0,0,-.09],materials.deck);
 const rider=makeRider(body,'seago');for(const part of[handlebars,nozzle,bucket,rider])part.userData.dynamic=true;batchRigidAssembly(body);
 root.userData={body,handlebars,nozzle,bucket,rider,source:asset.source,sourceSha256:asset.sourceSha256,sourceTriangles:asset.sourceTriangles,meshTriangles:asset.triangles,sourceRevision:'uploaded-seago-1',modelRevision:'fleet-craft-2'};
 rider.userData.update({riderAft:0,steer:0,surgeAcceleration:0},1,root.userData);return root;
}
export function uploadedSeagoProfile(t){
 const f=Math.max(0,Math.min(1,t))*32,i=Math.min(31,Math.floor(f)),u=f-i;return asset.profile[i].map((p,j)=>p.map((v,k)=>v+(asset.profile[i+1][j][k]-v)*u));
}
