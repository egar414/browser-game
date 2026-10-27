import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {batchRigidAssembly} from './rigid-model.js';

export const ANGLER_OUTBOARD={mount:[0,.2764864865,-1.55],propeller:[0,-.65,-.18],tiller:[-.32,.27,.54],hp:25};
const add=(root,g,m,p=[0,0,0])=>{const o=new THREE.Mesh(g,m);o.position.fromArray(p);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
const box=(root,w,h,d,m,p,r=.008)=>add(root,new RoundedBoxGeometry(w,h,d,2,r),m,p);
const tube=(root,ps,r,m,n=16)=>add(root,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps.map(p=>new THREE.Vector3(...p))),n,r,6,false),m);
function cylinder(root,r,length,m,p,axis='x'){const o=add(root,new THREE.CylinderGeometry(r,r,length,12),m,p);if(axis==='x')o.rotation.z=Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;return o;}
function label(root,text,x,y,z,side){
 if(typeof document==='undefined')return;
 const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.clearRect(0,0,256,128);ctx.fillStyle='#eceeea';ctx.font='italic bold 76px Arial';ctx.textAlign='center';ctx.fillText(text,128,84);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 const m=add(root,new THREE.PlaneGeometry(.23,.11),new THREE.MeshStandardMaterial({map,transparent:true,roughness:.28,metalness:.2,polygonOffset:true,polygonOffsetFactor:-1}),[x,y,z]);m.rotation.y=side*Math.PI/2;
}
export function makeAnglerOutboard(){
 const motor=new THREE.Group();motor.name='25 hp outboard';motor.position.fromArray(ANGLER_OUTBOARD.mount);
 const black=new THREE.MeshPhysicalMaterial({color:'#111720',metalness:.26,roughness:.22,clearcoat:1,clearcoatRoughness:.12}),cast=new THREE.MeshStandardMaterial({color:'#252a30',metalness:.42,roughness:.38}),rubber=new THREE.MeshStandardMaterial({color:'#111417',roughness:.84}),silver=new THREE.MeshStandardMaterial({color:'#c4cbcf',metalness:.82,roughness:.29}),stripe=new THREE.MeshStandardMaterial({color:'#d46a35',metalness:.15,roughness:.32});
 const hood=box(motor,.38,.37,.46,black,[0,.24,-.06],.055);hood.name='Glossy cowling';
 const p=hood.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),z=p.getZ(i);p.setXYZ(i,p.getX(i)*(1-Math.max(0,-y)*.3),y+Math.max(0,z)*.12,z-Math.max(0,y)*.13);}hood.geometry.computeVertexNormals();
 box(motor,.37,.035,.43,cast,[0,.07,-.06],.012);
 for(const side of[-1,1]){
  tube(motor,[[side*.188,.18,-.22],[side*.193,.18,-.04],[side*.18,.20,.11]],.0035,stripe);
  for(let i=0;i<4;i++)box(motor,.007,.013,.065,rubber,[side*.190,.30-i*.023,.077],.003);
  label(motor,'25',side*.192,.24,-.07,side);
  const latch=box(motor,.035,.058,.025,cast,[side*.12,.075,-.285],.005);latch.rotation.z=side*.12;
 }
 tube(motor,[[-.055,.30,.165],[-.055,.34,.185],[.055,.34,.185],[.055,.30,.165]],.009,rubber,14);
 // The clamp brackets wrap the transom. Cross-bolts, screw pads and the tilt
 // hinge remain modelled even though the complete motor steers as one unit.
 for(const side of[-1,1]){
  const x=side*.105,shape=new THREE.Shape();shape.moveTo(-.035,-.20);for(const[y,z]of[[.045,-.20],[.045,.13],[-.12,.13],[-.12,.095],[.012,.095],[.012,-.16],[-.035,-.16]])shape.lineTo(y,z);shape.closePath();
  const bracket=new THREE.ExtrudeGeometry(shape,{depth:.028,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,steps:1});
  // Shape coordinates are Y/Z; extrusion becomes X.
  const m=new THREE.Matrix4().set(0,0,1,0,1,0,0,0,0,1,0,0,0,0,0,1);bracket.applyMatrix4(m);add(motor,bracket,cast,[x-.014,0,0]);
  cylinder(motor,.006,.13,silver,[x,-.065,.14],'z');cylinder(motor,.022,.009,silver,[x,-.065,.081],'z');
  cylinder(motor,.007,.075,silver,[x,-.065,.218],'x');
 }
 cylinder(motor,.025,.29,silver,[0,-.015,-.075]);
 box(motor,.15,.22,.08,cast,[0,-.10,-.12],.014);
 // Tapered shaft, gearcase, anti-ventilation plate and skeg.
 const shaft=box(motor,.105,.49,.135,black,[0,-.32,-.025],.027);shaft.rotation.x=-.055;
 add(motor,new THREE.SphereGeometry(1,20,12),black,[0,-.64,-.025]).scale.set(.066,.063,.16);
 const fin=new THREE.Shape([new THREE.Vector2(-.145,-.17),new THREE.Vector2(.145,-.17),new THREE.Vector2(.11,.13),new THREE.Vector2(0,.18),new THREE.Vector2(-.11,.13)]),plate=new THREE.ExtrudeGeometry(fin,{depth:.008,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2,steps:1});plate.rotateX(Math.PI/2);add(motor,plate,black,[0,-.52,-.03]);
 const skeg=new THREE.Shape([new THREE.Vector2(-.11,-.67),new THREE.Vector2(.09,-.66),new THREE.Vector2(-.005,-.79),new THREE.Vector2(-.08,-.78)]),sg=new THREE.ExtrudeGeometry(skeg,{depth:.016,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2,steps:1});sg.rotateY(Math.PI/2);add(motor,sg,black,[-.008,0,0]);
 tube(motor,[[0,.18,.14],[-.10,.24,.25],[-.27,.27,.45],ANGLER_OUTBOARD.tiller],.018,cast,20);
 const grip=tube(motor,[[-.27,.27,.46],ANGLER_OUTBOARD.tiller],.023,rubber,8);grip.name='Tiller hand grip';
 for(let i=0;i<5;i++){const ring=add(motor,new THREE.TorusGeometry(.024,.0018,4,12),rubber,[-.27-i*.010,.27,.46+i*.016]);ring.rotation.y=-.55;}
 tube(motor,[[.075,.10,.13],[.09,-.02,.19],[.055,-.11,.20],[.04,-.17,.11]],.006,rubber);
 const propeller=new THREE.Group();propeller.name='Propeller';propeller.userData.dynamic=true;propeller.position.fromArray(ANGLER_OUTBOARD.propeller);motor.add(propeller);
 cylinder(propeller,.030,.09,silver,[0,0,.01],'z');
 for(let blade=0;blade<3;blade++){
  const positions=[],uv=[],ix=[],steps=8;
  for(let i=0;i<=steps;i++){const r=.025+i/steps*.105,a=blade*Math.PI*2/3+i/steps*.65;for(const side of[-1,1]){const w=Math.sin((i/steps*.82+.09)*Math.PI)*.034,x=Math.sin(a)*r+Math.cos(a)*w*side,y=Math.cos(a)*r-Math.sin(a)*w*side,z=-.012-i/steps*.025+side*w*.65;positions.push(x,y,z);uv.push(i/steps,(side+1)/2);}}
  for(let i=0;i<steps;i++){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const propMaterial=silver.clone();propMaterial.side=THREE.DoubleSide;add(propeller,g,propMaterial);
 }
 batchRigidAssembly(propeller);batchRigidAssembly(motor);return{motor,propeller};
}
