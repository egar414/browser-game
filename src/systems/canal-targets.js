import * as THREE from 'three';
import sites from '../data/canal-playground.json' with {type:'json'};
import { waveHeight } from '../config.js';
import { sprayExposure } from './spray-battle.js';
export { sites as CANAL_SITES };
export const TARGET_TUNING={soakRate:6,dryRate:.035,cooldown:25,leaveDistance:40,minimumSpeed:4};
export class SprayTarget {
  constructor(site){Object.assign(this,site);this.soak=0;this.cooldown=0;this.armed=true;this.departed=false;this.hits=0;}
  update(dt,v,time,active=true){
    const distance=Math.hypot(v.x-this.x,v.z-this.z);this.cooldown=Math.max(0,this.cooldown-dt);
    if(!this.armed){if(distance>TARGET_TUNING.leaveDistance)this.departed=true;if(this.departed&&!this.cooldown){this.armed=true;this.soak=0;}return false;}
    const incoming=active&&v.speed>TARGET_TUNING.minimumSpeed&&distance<22?Math.max(...[-.65,0,.65].map(offset=>sprayExposure(v,{x:this.x+Math.cos(this.heading||0)*offset,y:waveHeight(this.x,this.z,time)+.6,z:this.z-Math.sin(this.heading||0)*offset},time))):0;
    this.soak=Math.max(0,Math.min(1,this.soak+dt*(incoming>.08?incoming*TARGET_TUNING.soakRate:-TARGET_TUNING.dryRate)));
    if(this.soak>=1){this.armed=false;this.departed=false;this.cooldown=TARGET_TUNING.cooldown;this.hits++;return true;}return false;
  }
}
function signTexture(target=false){
 const c=document.createElement('canvas');c.width=256;c.height=target?256:320;const ctx=c.getContext('2d');
 ctx.fillStyle=target?'#e96635':'#f3eee1';ctx.fillRect(0,0,c.width,c.height);
 if(target){for(const [r,colour]of [[113,'#f6e9c9'],[84,'#dd643a'],[53,'#f6e9c9'],[23,'#dd643a']]){ctx.fillStyle=colour;ctx.beginPath();ctx.arc(128,128,r,0,7);ctx.fill();}}
 else{ctx.strokeStyle='#223f43';ctx.lineWidth=9;ctx.strokeRect(9,9,238,302);ctx.fillStyle='#223f43';ctx.textAlign='center';ctx.font='bold 126px sans-serif';ctx.fillText('6',128,130);ctx.font='bold 33px sans-serif';ctx.fillText('KNOTS',128,176);ctx.font='bold 28px sans-serif';ctx.fillText('NO WASH',128,235);ctx.font='18px sans-serif';ctx.fillText('CANAL PLAY ZONE',128,282);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export class CanalPlayground {
 constructor(scene,solids,onEvent){
  this.targets=sites.targets.map(s=>new SprayTarget(s));this.onEvent=onEvent;this.meshes=[];
  const face=new THREE.MeshStandardMaterial({map:signTexture(true),roughness:.75,side:THREE.DoubleSide});
  const rubber=new THREE.MeshStandardMaterial({color:'#233e40',roughness:.85});
  const post=new THREE.MeshStandardMaterial({color:'#b9c3bb',metalness:.45,roughness:.55});
  const targetGeometry=new THREE.CircleGeometry(.78,32),baseGeometry=new THREE.CylinderGeometry(.85,1,.26,16),poleGeometry=new THREE.CylinderGeometry(.045,.045,1.8,6);
  for(const t of this.targets){const group=new THREE.Group(),bullseye=new THREE.Mesh(targetGeometry,face.clone()),base=new THREE.Mesh(baseGeometry,rubber),pole=new THREE.Mesh(poleGeometry,post);
   bullseye.position.y=1.2;pole.position.y=.55;group.add(base,pole,bullseye);group.position.set(t.x,0,t.z);group.rotation.y=t.heading;scene.add(group);this.meshes.push({group,bullseye});
   solids.push({x:t.x,z:t.z,w:1.7,d:1.7,height:1.6,name:'Floating spray target'});
  }
  const boardMaterial=new THREE.MeshStandardMaterial({map:signTexture(),roughness:.8,side:THREE.DoubleSide}),boardGeometry=new THREE.PlaneGeometry(1.65,2.06);
  for(const s of sites.signs){const group=new THREE.Group(),board=new THREE.Mesh(boardGeometry,boardMaterial),pole=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,3.5,6),post);board.position.y=3.4;pole.position.y=1.6;group.add(board,pole);group.position.set(s.x,.7,s.z);group.rotation.y=s.heading;scene.add(group);solids.push({x:s.x,z:s.z,w:.2,d:.2,height:4.5,name:'Canal speed sign'});}
 }
 update(dt,v,time,active){for(const t of this.targets)if(t.update(dt,v,time,active))this.onEvent({type:'score',label:`${t.name} · soaked`,points:150});}
 render(time){this.targets.forEach((t,i)=>{const {group,bullseye}=this.meshes[i];group.position.y=waveHeight(t.x,t.z,time)+.12;group.rotation.z=Math.sin(time*1.2+i)*.045;bullseye.material.color.set(t.armed?'#ffffff':'#78ccad');bullseye.scale.setScalar(t.armed?1+Math.sin(time*4)*t.soak*.04:.92);});}
 get status(){return this.targets.map(t=>({x:t.x,z:t.z,name:t.name,soak:t.soak,armed:t.armed,hits:t.hits}));}
}
