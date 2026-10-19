import {batchRigidAssembly} from '../vehicles/rigid-model.js';
import * as THREE from 'three';
import {PolicePatrol} from './police-patrol.js';
import {makeVehicle,box,tube} from '../vehicles/models.js';
function markings(root,x,y,z,rotation){const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.font='bold 50px sans-serif';ctx.textAlign='center';ctx.fillText('POLICE',128,51);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.48),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;root.add(m);}
export class PoliceView extends PolicePatrol{
 constructor(scene,collision,onEvent){super(collision,onEvent);for(const u of this.units){const m=makeVehicle(u.type,'#444e59');u.model=m;m.name=`Police ${u.id}`;scene.add(m);const white=new THREE.MeshStandardMaterial({color:'#e6ecec',roughness:.4}),dark=new THREE.MeshStandardMaterial({color:'#1d2d40',roughness:.6});
   if(u.type==='cat'){m.scale.set(1.23,1,1.35);box(m,1.55,.18,3.5,0,.35,0,white);box(m,.85,.9,.7,0,.85,.55,white);box(m,1.8,.12,2.3,0,2.6,.1,white);
    for(const x of [-.8,.8])for(const z of [-.9,1.1])tube(m,[[x,.5,z],[x,2.55,z]],.035,dark);
    tube(m,[[-.85,.38,1.45],[0,.55,2.02],[.85,.38,1.45]],.29,dark);
    const extra=m.userData.motor.clone();extra.position.x=.36;m.userData.motor.position.x=-.36;m.add(extra);m.userData.extraMotor=extra;
    markings(m,-1.07,.65,0,-Math.PI/2);markings(m,1.07,.65,0,Math.PI/2);
   }else{markings(m,-.59,.45,-.1,-Math.PI/2);markings(m,.59,.45,-.1,Math.PI/2);}
   for(const part of [m.userData.rider,m.userData.passenger,m.userData.motor,m.userData.nozzle,m.userData.handlebars,m.userData.extraMotor])if(part)part.userData.dynamic=true;
   m.traverse(o=>{if(o.geometry)o.geometry=o.geometry.clone();});batchRigidAssembly(m);
   const light=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color:'#087eff'}));light.position.set(0,u.type==='cat'?2.85:1.1,-.6);m.add(light);u.light=light;
  }}
 render(dt,time,player,playing){for(const u of this.units){const v=u.v,m=u.model;m.visible=Math.hypot(v.x-player.x,v.z-player.z)<480;if(!m.visible)continue;m.position.set(v.x,v.y,v.z);m.rotation.set(-v.pitch,v.heading,v.roll,'YXZ');u.light.visible=this.remaining>0&&Math.sin(time*18)>0;const p=m.userData;p.rider?.userData.update?.(v,playing?dt:0,p);p.passenger?.userData.update?.(v,playing?dt:0);for(const part of [p.motor,p.extraMotor])if(part)part.rotation.set(v.drive.trimAngle,-v.drive.steeringAngle,0,'YXZ');}}
}
