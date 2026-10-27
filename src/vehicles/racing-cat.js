import * as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
// Original offshore-racing silhouette inspired by the supplied photograph.
// Twin inboard engine bays and surface propellers; no copied racing livery.
export function makeRacingCat(colour='#30a8c8'){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const white=new THREE.MeshPhysicalMaterial({color:'#edf1ed',roughness:.26,metalness:.08,clearcoat:.8}),accent=new THREE.MeshPhysicalMaterial({color:colour,roughness:.28,metalness:.16,clearcoat:.8}),navy=new THREE.MeshStandardMaterial({color:'#11354b',roughness:.36}),dark=new THREE.MeshStandardMaterial({color:'#17242e',roughness:.65}),metal=new THREE.MeshStandardMaterial({color:'#b4c6cb',metalness:.86,roughness:.22}),glass=new THREE.MeshPhysicalMaterial({color:'#19495f',roughness:.1,metalness:.2,transparent:true,opacity:.55,depthWrite:false});
 const add=(g,m,x=0,y=0,z=0,parent=body)=>{const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const box=(w,h,d,x,y,z,m=white,parent=body)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const oval=(sx,sy,sz,x,y,z,m,parent=body)=>{const mesh=add(new THREE.SphereGeometry(1,16,10),m,x,y,z,parent);mesh.scale.set(sx,sy,sz);return mesh;};
 for(const side of[-1,1]){
  const verts=[],indices=[],sections=[[-5.5,.62,.65,-.32],[-4.4,.73,.73,-.38],[-1.5,.75,.78,-.39],[1.9,.72,.91,-.28],[4.15,.48,.94,-.08],[5.8,.13,.79,.19],[6.2,.008,.58,.40]];
  for(const[z,w,top,bottom]of sections)for(const[x,y]of[[-w,top],[w,top],[w*.66,bottom],[0,bottom-.025],[-w*.66,bottom]])verts.push(side*1.45+x,y,z);
  for(let j=0;j<sections.length-1;j++)for(let k=0;k<5;k++){const a=j*5+k,b=j*5+(k+1)%5;indices.push(a,b+5,b,a,a+5,b+5);}
  for(let k=1;k<4;k++){indices.push(0,k,k+1);const n=(sections.length-1)*5;indices.push(n,n+k+1,n+k);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();add(g,white);
  // Deep turquoise quarters, stepped chines and long restrained deck stripes.
  for(const[z,length,width]of[[-3.4,4.1,.055],[.6,3.8,.045]]){const stripe=box(width,.24,length,side*2.16,.39,z,accent);stripe.rotation.y=side*.008;}
  box(.12,.025,6.6,side*1.43,.805,.0,navy);box(.055,.025,6.6,side*1.23,.81,.0,accent);
  const quarter=box(.035,.14,6.8,side*2.17,.17,-1.75,navy);quarter.rotation.y=side*.005;
  box(.66,.07,1.6,side*.89,.86,-3.7,accent);
  for(let j=0;j<8;j++)box(.58,.022,.095,side*.89,.907,-4.33+j*.17,dark);
  for(const z of[-4.85,2.4,3.6]){const cap=add(new THREE.CylinderGeometry(.055,.055,.025,10),metal,side*1.45,.83,z);cap.rotation.x=.05;}
  // Two visible shaft/surface-drive units, rather than jet nozzles/outboards.
  const shaft=add(new THREE.CylinderGeometry(.065,.065,.9,10),metal,side*1.27,-.13,-5.84);shaft.rotation.x=Math.PI/2;
  box(.22,.32,.25,side*1.27,-.03,-5.45,dark);
 }
 box(2.82,.30,7.9,0,.53,-1.43);box(2.6,.06,7.7,0,.715,-1.4);
 oval(1.08,.20,2.0,0,.91,-.13,white);oval(1.02,.52,1.85,0,1.13,-.02,glass);
 oval(.73,.055,1.02,0,1.62,-.55,white);box(.05,.035,1.5,0,1.675,-.55,accent);
 for(const side of[-1,1])box(.055,.09,1.4,side*.93,1.18,-.24,white);
 box(1.6,.12,.25,0,1.02,1.12,navy);for(const side of[-1,1])oval(.10,.07,.025,side*.38,1.10,1.00,metal);
 const rider=new THREE.Group();rider.userData.dynamic=true;body.add(rider);const heads=[],bodies=[];
 for(const side of[-1,1]){
  oval(.28,.12,.38,side*.38,.89,-.6,dark,rider);bodies.push(oval(.22,.28,.15,side*.38,1.10,-.61,navy,rider));
  heads.push(oval(.195,.205,.19,side*.38,1.42,-.50,white,rider));heads.push(box(.29,.085,.035,side*.38,1.43,-.315,dark,rider));
  const wheel=add(new THREE.TorusGeometry(.145,.022,6,16),dark,side*.38,1.10,.15,rider);wheel.rotation.x=.22;
  for(const hand of[-1,1])oval(.05,.05,.06,side*.38+hand*.13,1.12,.12,white,rider);
 }
 const eye=new THREE.Object3D();eye.position.set(-.38,1.45,-.35);rider.add(eye);rider.userData.eye=eye;rider.userData.faceParts=heads;rider.userData.bodyParts=bodies;rider.userData.update=()=>{};
 const propellers=[];for(const side of[-1,1]){const prop=new THREE.Group();prop.userData.dynamic=true;prop.position.set(side*1.27,-.19,-6.28);body.add(prop);oval(.09,.09,.19,0,0,0,metal,prop);for(let i=0;i<3;i++){const a=i*Math.PI*2/3,blade=oval(.11,.27,.038,Math.sin(a)*.15,Math.cos(a)*.15,0,metal,prop);blade.rotation.z=-a+.32;}propellers.push(prop);}
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#153b50';ctx.fillRect(0,0,512,128);ctx.fillStyle='#f2f3e8';ctx.font='bold 74px sans-serif';ctx.textAlign='center';ctx.fillText('MARITIMO 12',256,90);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide});for(const side of[-1,1]){const label=add(new THREE.PlaneGeometry(2.9,.62),m,side*2.205,.53,-2.0);label.rotation.y=side*Math.PI/2;}
 }
 // Batch rigid surfaces while keeping helmets and spinning props independent.
 body.updateMatrixWorld(true);const groups=new Map(),remove=[];body.traverse(o=>{if(!o.isMesh)return;for(let p=o.parent;p&&p!==body;p=p.parent)if(p.userData.dynamic)return;let g=o.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(o.matrixWorld);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);remove.push(o);});for(const[m,gs]of groups){const g=mergeGeometries(gs);const mesh=new THREE.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;body.add(mesh);gs.forEach(g=>g.dispose());}remove.forEach(o=>{o.removeFromParent();o.geometry.dispose();});
 root.userData={body,rider,propellers,racingCat:true};return root;
}
