import{makeDeckCharacter}from'../vehicles/wardrobe.js';
import * as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{waveHeight}from'../config.js';
import{FISHING_SPOTS}from'./fishing.js';
const mat=(colour,roughness=.5)=>new THREE.MeshStandardMaterial({color:colour,roughness});
function rod(group,a,b,material,r=.025){const d=new THREE.Vector3().subVectors(b,a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),6),material);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());group.add(m);return m;}
function label(text){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#e5ece7';x.fillRect(0,0,512,128);x.fillStyle='#173e54';x.font='bold 48px sans-serif';x.textAlign='center';x.fillText(text.toUpperCase(),256,84);const t=new THREE.CanvasTexture(c);return new THREE.MeshBasicMaterial({map:t});}
export function makeSportfisher(name,colour,crew=true){
 const g=new THREE.Group(),white=mat('#e5ece7'),navy=mat(colour),glass=mat('#183f51',.15),chrome=mat('#bacbd0',.22),wood=mat('#b99567'),dark=mat('#1e303a'),skin=mat('#c99872'),shirt=mat('#edb05b');
 const box=(w,h,d,x,y,z,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;};
 // Cross-sections taper into a pointed flared bow and a deep V keel.
 const sections=[[-5,1.72,.55],[-3.7,1.98,.72],[0,1.95,.95],[2.9,1.65,1.30],[4.7,.75,1.6],[5.65,.02,1.72]],positions=[],indices=[];
 sections.forEach(([z,w,h])=>positions.push(-w,h,z,-w*.82,-.22,z,0,-.75,z,w*.82,-.22,z,w,h,z));
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<4;j++){const a=i*5+j,b=a+5;indices.push(a,b,a+1,a+1,b,b+1);}
 indices.push(0,1,2,0,2,4,2,3,4);
 // The section ring winds inward along +Z; reverse triangles for outward faces.
 for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 const hull=new THREE.BufferGeometry();hull.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));hull.setIndex(indices);hull.computeVertexNormals();g.add(new THREE.Mesh(hull,navy));
 const deck=new THREE.Shape();deck.moveTo(-1.65,2);deck.lineTo(-1.65,2.9);deck.lineTo(-.75,4.7);deck.lineTo(0,5.65);deck.lineTo(.75,4.7);deck.lineTo(1.65,2.9);deck.lineTo(1.65,2);deck.closePath();const bow=new THREE.Mesh(new THREE.ShapeGeometry(deck),white);bow.rotation.x=Math.PI/2;bow.position.y=1.5;bow.material=white.clone();bow.material.side=THREE.DoubleSide;g.add(bow);
 box(3.35,.16,6.8,0,.83,-1.5,white);box(3.35,.09,3.0,0,.94,-3.2,wood);
 box(3.35,.7,.15,0,1.15,-4.95,white);box(.15,.5,4.6,-1.75,1.1,-2.65,white);box(.15,.5,4.6,1.75,1.1,-2.65,white);
 box(2.9,1.75,3.8,0,1.78,.15,white);box(3.25,.18,4.25,0,2.75,.15,white);
 box(2.6,.82,.07,0,2.2,2.08,glass);for(const side of [-1,1])box(.07,.83,2.8,side*1.47,2.2,.4,glass);
 box(2.5,.8,2.6,0,3.22,.2,white);box(2.7,.12,2.9,0,3.68,.2,white);box(1.6,.6,.5,0,3.95,.8,white);
 // Shaded flybridge, tower, fighting chair, visible crew and outriggers.
 for(const x of [-1.2,1.2])for(const z of [-.9,1.3])rod(g,new THREE.Vector3(x,3.65,z),new THREE.Vector3(x,5.25,z),chrome);
 box(3,.13,3,0,5.3,.2,white);rod(g,new THREE.Vector3(0,5.3,.2),new THREE.Vector3(0,6.5,.2),chrome,.035);
 box(1.4,.12,.15,0,5.8,.2,white);
 for(const side of [-1,1]){
  rod(g,new THREE.Vector3(side*1.3,3.4,-.6),new THREE.Vector3(side*3.7,6.0,-4.7),chrome,.035);
  rod(g,new THREE.Vector3(side*1.55,1.2,-3.3),new THREE.Vector3(side*2.0,3.0,-5.3),dark,.018);
  for(let z=2.5;z<=4.5;z+=1)rod(g,new THREE.Vector3(side*(z>4?.7:1.4),1.2,z),new THREE.Vector3(side*(z>4?.7:1.4),1.85,z),chrome,.02);
  rod(g,new THREE.Vector3(side*1.4,1.85,2.5),new THREE.Vector3(side*.7,1.85,4.5),chrome,.02);
 }
 box(.65,.15,.65,0,1.55,-3.1,white);rod(g,new THREE.Vector3(0,.95,-3.1),new THREE.Vector3(0,1.5,-3.1),chrome,.06);
 const person=(x,y,z,seated=false)=>{const person=makeDeckCharacter();person.userData.animate(0,0,false,seated);person.scale.setScalar(.85);person.position.set(x,y,z);g.add(person);};if(crew){person(0,3.25,-.15,true);person(.8,1,-3.4);}
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.5,.62),label(name));sign.position.set(0,1.2,-5.035);sign.rotation.y=Math.PI;g.add(sign);
 // One draw per material keeps detailed fittings affordable for school laptops.
 g.updateMatrixWorld(true);const buckets=new Map(),old=[];
 g.traverse(o=>{if(!o.isMesh)return;let geo=o.geometry.clone();if(geo.index)geo=geo.toNonIndexed();geo.applyMatrix4(o.matrixWorld);if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(geo);old.push(o);});
 old.forEach(o=>{g.remove(o);o.geometry.dispose();});for(const [m,geos]of buckets){const mesh=new THREE.Mesh(mergeGeometries(geos),m);mesh.receiveShadow=true;g.add(mesh);geos.forEach(v=>v.dispose());}g.name=`Sportfisher ${name}`;return g;
}
function fishGeometry(){
 const body=new THREE.SphereGeometry(1,10,6);body.scale(.18,.3,.78);
 const tail=new THREE.BufferGeometry();tail.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.6,0,.38,-1.1,0,-.38,-1.1],3));tail.computeVertexNormals();tail.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(6),2));return mergeGeometries([body.toNonIndexed(),tail]);
}
export class OffshoreView{
 constructor(scene,traffic,fishing){
  this.traffic=traffic;this.fishing=fishing;this.boats=traffic.boats.map((b,i)=>{const m=makeSportfisher(b.name,['#254761','#2c7e85','#b0bbbe','#677b9c'][i]);scene.add(m);return m;});
  const fishMat=new THREE.MeshStandardMaterial({color:'#81b5bd',metalness:.35,roughness:.35,side:THREE.DoubleSide});
  this.fish=new THREE.InstancedMesh(fishGeometry(),fishMat,96);this.fish.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.fish.frustumCulled=false;scene.add(this.fish);this.dummy=new THREE.Object3D();
  this.markers=FISHING_SPOTS.map(s=>{const g=new THREE.Group();g.position.set(s.x,0,s.z);const buoy=new THREE.Mesh(new THREE.SphereGeometry(.5,10,8),mat('#f5cb64'));buoy.scale.y=1.3;g.add(buoy);rod(g,new THREE.Vector3(0,.3,0),new THREE.Vector3(0,2.5,0),mat('#e1e4cf'),.04);const flag=new THREE.Mesh(new THREE.PlaneGeometry(.8,.5),new THREE.MeshBasicMaterial({color:'#66d7cb',side:THREE.DoubleSide}));flag.position.set(.4,2.2,0);g.add(flag);scene.add(g);return g;});
  this.tackle=new THREE.Group();scene.add(this.tackle);this.rod=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:9},()=>new THREE.Vector3())),new THREE.LineBasicMaterial({color:'#242d37'}));this.tackle.add(this.rod);
  this.line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:20},()=>new THREE.Vector3())),new THREE.LineBasicMaterial({color:'#e9ead1',transparent:true,opacity:.8}));this.tackle.add(this.line);
  this.float=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),mat('#ff7754'));this.tackle.add(this.float);this.hooked=new THREE.Mesh(fishGeometry(),fishMat.clone());this.tackle.add(this.hooked);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,2,32,32,32);gradient.addColorStop(0,'#ffffffcc');gradient.addColorStop(.45,'#ffffff88');gradient.addColorStop(1,'#ffffff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const foamTexture=new THREE.CanvasTexture(canvas);
  const n=120;this.foam=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:foamTexture,color:'#d5f3e8',transparent:true,opacity:.25,depthWrite:false}),n);this.foam.frustumCulled=false;scene.add(this.foam);this.wakes=[];this.wakeClock=0;
 }
 render(dt,time,player,quality,playing){
  const limit=quality==='Low'?36:quality==='High'?96:64;let count=0;
  for(let i=0;i<limit;i++){
   const spot=FISHING_SPOTS[i%3];if(Math.hypot(player.x-spot.x,player.z-spot.z)>260)continue;
   const a=time*(.16+(i%7)*.012)+i*2.4,r=8+(i%11)*2.3,x=spot.x+Math.sin(a)*r,z=spot.z+Math.cos(a)*r;
   const jump=Math.max(0,Math.sin(time*1.5+i*1.77)-.84)/.16;
   this.dummy.position.set(x,waveHeight(x,z,time)-.35+jump*1.7,z);this.dummy.rotation.set(-Math.cos(time*1.5+i*1.77)*jump*.9,a+Math.PI/2,0);this.dummy.scale.setScalar(.65+(i%5)*.15);this.dummy.updateMatrix();this.fish.setMatrixAt(count++,this.dummy.matrix);
  }
  this.fish.count=count;this.fish.instanceMatrix.needsUpdate=true;
  this.markers.forEach((g,i)=>g.position.y=waveHeight(FISHING_SPOTS[i].x,FISHING_SPOTS[i].z,time));
  const visible=new Set(this.traffic.boats.filter(b=>Math.hypot(player.x-b.x,player.z-b.z)<950).sort((a,b)=>Math.hypot(player.x-a.x,player.z-a.z)-Math.hypot(player.x-b.x,player.z-b.z)).slice(0,quality==='Low'?2:4));
  this.traffic.boats.forEach((b,i)=>{const m=this.boats[i];m.visible=this.traffic.enabled&&visible.has(b);m.position.set(b.x,b.y,b.z);m.rotation.set(-b.pitch,b.heading,b.roll,'YXZ');});
  this.wakeClock+=playing?dt:0;if(this.wakeClock>.16){this.wakeClock=0;for(const b of this.traffic.boats)if(this.traffic.enabled&&b.speed>.5&&Math.hypot(player.x-b.x,player.z-b.z)<500)this.wakes.push({x:b.x-Math.sin(b.heading)*5,z:b.z-Math.cos(b.heading)*5,h:b.heading,t:time});}
  this.wakes=this.wakes.filter(w=>time-w.t<5).slice(-120);this.wakes.forEach((w,i)=>{const age=time-w.t;this.dummy.position.set(w.x,waveHeight(w.x,w.z,time)+.035,w.z);this.dummy.rotation.set(-Math.PI/2,0,-w.h);this.dummy.scale.set(3.5+age*2.2,.45+age*.8,1);this.dummy.updateMatrix();this.foam.setMatrixAt(i,this.dummy.matrix);});this.foam.count=this.wakes.length;this.foam.instanceMatrix.needsUpdate=true;
  const f=this.fishing;this.tackle.visible=f.active;if(!f.active)return;
  const h=player.heading,sx=Math.sin(h),cz=Math.cos(h),origin=new THREE.Vector3(player.x+cz*.45,player.y+.6,player.z-sx*.45),tip=origin.clone().add(new THREE.Vector3(cz*1.7,2.3,-sx*1.7));
  const rodPoints=this.rod.geometry.attributes.position;
  for(let i=0;i<9;i++){const t=i/8,p=origin.clone().lerp(tip,t);p.y+=Math.sin(t*Math.PI)*.25;rodPoints.setXYZ(i,p.x,p.y,p.z);}rodPoints.needsUpdate=true;this.rod.geometry.computeBoundingSphere();
  const cast=f.phase==='casting'?Math.min(1,f.time/.8):1,distance=(4+14*(1-f.progress))*cast;
  const lx=f.origin.x+(Math.cos(f.origin.heading)*.4+Math.sin(f.origin.heading)*.8)*distance,lz=f.origin.z+(-Math.sin(f.origin.heading)*.4+Math.cos(f.origin.heading)*.8)*distance;
  const ly=waveHeight(lx,lz,time)+.14+(f.phase==='bite'?Math.sin(time*18)*.15:0);this.float.position.set(lx,ly,lz);
  const line=this.line.geometry.attributes.position;for(let i=0;i<20;i++){const t=i/19,p=tip.clone().lerp(this.float.position,t);p.y-=Math.sin(t*Math.PI)*.35*(1-f.tension);line.setXYZ(i,p.x,p.y,p.z);}line.needsUpdate=true;this.line.geometry.computeBoundingSphere();
  this.hooked.visible=f.phase==='hooked';this.hooked.position.set(lx,ly-.2+Math.max(0,Math.sin(f.time*2.6)-.8)*5,lz);this.hooked.rotation.set(Math.sin(time*7)*.25,h+Math.sin(time*5)*.4,0);this.hooked.material.color.set(f.fish.colour);
 }
}
