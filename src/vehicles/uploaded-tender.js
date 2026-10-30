import * as THREE from 'three';
import asset from '../assets/tender225-mesh.json' with {type:'json'};
import {brushedAlloy} from './marine-details.js';
import {makeAnglerOutboard} from './angler-outboard.js';

const cache=new Map();
function bytes(encoded){return Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));}
function geometry(detail){
 if(cache.has(detail))return cache.get(detail);
 const data=asset[detail],p=new Int16Array(bytes(data.positions).buffer),n=new Int8Array(bytes(data.normals).buffer),positions=Float32Array.from(p,v=>v*asset.positionScale),normals=Float32Array.from(n,v=>v/127),uv=new Float32Array(p.length/3*2);
 for(let i=0;i<p.length/3;i++){uv[i*2]=positions[i*3]*3;uv[i*2+1]=positions[i*3+2]*3;}
 const index=new Uint16Array(bytes(data.indices).buffer),parts={hull:[],structure:[],aft:[],forward:[],bow:[]};
 for(let i=0;i<index.length;i+=3){let y=0,z=0,ny=0;for(let j=0;j<3;j++){const v=index[i+j];y+=positions[v*3+1]/3;z+=positions[v*3+2]/3;ny+=normals[v*3+1]/3;}
  const key=y>.285&&y<.33&&z>-.76&&z<-.44?'aft':y>.285&&y<.33&&z>.10&&z<.39?'forward':z>.85&&y>.32?'bow':ny>.35&&y<.29?'structure':'hull';parts[key].push(index[i],index[i+1],index[i+2]);
 }
 const result={};for(const[key,indices]of Object.entries(parts)){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('normal',new THREE.BufferAttribute(normals,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();result[key]=g;}
 cache.set(detail,result);return result;
}

// This is the user's actual STL, decimated offline, rather than a replacement
// loft. The source has no motor; retain the game's animated 25 hp assembly.
export function buildUploadedTender(colour,options={}){
 const root=new THREE.Group();root.name='Tender 225';root.userData.dynamic=true;
 const material=brushedAlloy(colour),parts=geometry(options.detail==='moored'?'moored':'player'),groups={};material.normalScale.set(.12,.12);
 for(const[key,label]of Object.entries({hull:'Uploaded alloy hull and gunwales',structure:'Uploaded floor and ribs',aft:'Aft bench',forward:'Forward bench',bow:'Uploaded bow deck'})){
  const group=new THREE.Group();group.name=label;group.userData.dynamic=true;root.add(group);const mesh=new THREE.Mesh(parts[key].clone(),material);mesh.name=label;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);groups[key]=group;
 }
 for(const key of['aft','forward'])groups[key].userData.fullWidth=true;
 const {motor,propeller}=makeAnglerOutboard({hp:25});motor.position.set(.12,.27,-1.12);motor.userData.dynamic=true;root.add(motor);
 root.scale.set((options.width||1.22)/1.22,1,(options.length||2.25)/2.25);
 root.userData={dynamic:true,motor,propeller,hull:groups.hull,structure:groups.structure,fittings:groups.hull,benches:[groups.aft,groups.forward],bow:groups.bow,modelRevision:'uploaded-tender-1',source:asset.source,sourceSha256:asset.sourceSha256,sourceTriangles:asset.sourceTriangles,meshTriangles:options.detail==='moored'?asset.moored.triangles:asset.player.triangles};return root;
}

export function uploadedTenderProfile(t){
 const f=Math.max(0,Math.min(1,t))*32,i=Math.min(31,Math.floor(f)),u=f-i;
 return asset.profile[i].map((p,j)=>p.map((v,k)=>v+(asset.profile[i+1][j][k]-v)*u));
}
