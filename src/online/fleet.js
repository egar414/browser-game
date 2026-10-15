import * as THREE from 'three';
import {VEHICLES,QUALITY} from '../config.js';
import {makeVehicle} from '../vehicles/models.js';
import {Spray} from '../systems/spray.js';
import {ONLINE_TUNING,blendPose} from './protocol.js';
function nameTag(){
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=72;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));sprite.position.y=2.15;sprite.scale.set(3.4,.64,1);return {sprite,texture,canvas,text:''};
}
function paintTag(tag,text){if(tag.text===text)return;tag.text=text;const c=tag.canvas.getContext('2d');c.clearRect(0,0,384,72);c.fillStyle='#133e43dd';c.beginPath();c.roundRect(0,0,384,72,24);c.fill();c.fillStyle='#f5efda';c.font='bold 30px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,192,37,355);tag.texture.needsUpdate=true;}
export class RemoteFleet {
 constructor(scene){this.scene=scene;this.riders=new Map();this.clock=0;}
 receive(id,pose,nickname){
  let peer=this.riders.get(id);if(!peer){peer={id,poses:[],last:this.clock,nickname,model:null,spray:null};this.riders.set(id,peer);}
  if(peer.epoch!==pose.epoch||peer.poses.length&&Math.hypot(pose.x-peer.poses.at(-1).pose.x,pose.z-peer.poses.at(-1).pose.z)>35)peer.poses=[];
  peer.epoch=pose.epoch;peer.last=this.clock;peer.nickname=nickname;peer.poses.push({time:this.clock,pose});while(peer.poses.length>20)peer.poses.shift();
 }
 remove(id){const p=this.riders.get(id);if(!p)return;this.destroyModel(p);this.riders.delete(id);}
 destroyModel(p){if(p.model){p.model.removeFromParent();p.model.traverse(o=>{if(!o.isSprite)o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map?.isCanvasTexture)m.map.dispose();m.dispose();}}});p.model=null;p.tag=null;}p.spray?.dispose();p.spray=null;}
 clear(){for(const id of this.riders.keys())this.remove(id);}
 update(dt,time,player,quality,camera,renderer){
  this.clock+=dt;const max=ONLINE_TUNING[`visible${quality}`]||4;
  const ordered=[...this.riders.values()].filter(p=>p.poses.length&&this.clock-p.last<ONLINE_TUNING.staleAfter).sort((a,b)=>Math.hypot(a.poses.at(-1).pose.x-player.x,a.poses.at(-1).pose.z-player.z)-Math.hypot(b.poses.at(-1).pose.x-player.x,b.poses.at(-1).pose.z-player.z));
  const visible=new Set(ordered.filter(p=>Math.hypot(p.poses.at(-1).pose.x-player.x,p.poses.at(-1).pose.z-player.z)<500).slice(0,max).map(p=>p.id));
  for(const p of this.riders.values()){
   if(!visible.has(p.id)){if(p.model)p.model.visible=false;if(p.spray){p.spray.clear();p.spray.points.visible=false;}continue;}
   const wanted=this.clock-ONLINE_TUNING.interpolation;let a=p.poses[0],b=p.poses.at(-1);for(const sample of p.poses){if(sample.time<=wanted)a=sample;else{b=sample;break;}}
   const f=THREE.MathUtils.clamp((wanted-a.time)/Math.max(.001,b.time-a.time),0,1),pose=blendPose(a.pose,b.pose,f),key=`${pose.type}-${pose.colour}-${pose.design}`;
   if(!p.model||p.key!==key){this.destroyModel(p);p.key=key;p.model=makeVehicle(pose.type,VEHICLES[pose.type].colours[pose.colour],pose.design);
    // Own the remote geometry/material copies so departure cannot dispose the
    // local rider's shared resources. Texture assets remain shared and read-only.
    p.model.traverse(o=>{if(o.geometry)o.geometry=o.geometry.clone();if(o.material)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});this.scene.add(p.model);p.tag=nameTag();p.model.add(p.tag.sprite);
    p.spray=new Spray(this.scene,{...QUALITY.Low,particles:160,wakeSamples:45,fanSegments:5});
   }
   const v={...pose,config:VEHICLES[pose.type],wipeout:0,surgeAcceleration:0,airTricks:{pose:pose.pose,blend:pose.pose?1:0},drive:{trimAngle:pose.trim,steeringAngle:pose.nozzle,rpm:pose.rpm,flow:pose.flow,exitSpeed:pose.exitSpeed,reverse:pose.reverse,wetness:pose.airborne?0:1,neutral:false}};
   paintTag(p.tag,p.nickname+(pose.away?' · AWAY':''));p.model.visible=true;p.spray.points.visible=true;p.model.position.set(pose.x,pose.y,pose.z);p.model.rotation.set(-pose.pitch,pose.heading,pose.roll,'YXZ');
   if(p.model.userData.handlebars)p.model.userData.handlebars.rotation.y=-pose.steer*.43;
   for(const part of [p.model.userData.motor,p.model.userData.nozzle])if(part)part.rotation.set(pose.trim,-pose.nozzle,0,'YXZ');
   p.model.userData.rider.userData.update(v,dt,p.model.userData);p.spray.update(dt,v,time,!pose.away);p.spray.resize(innerHeight,camera.fov,renderer.getPixelRatio());
  }
 }
 get mapPositions(){return [...this.riders.values()].filter(p=>p.poses.length&&this.clock-p.last<ONLINE_TUNING.staleAfter).map(p=>({x:p.poses.at(-1).pose.x,z:p.poses.at(-1).pose.z}));}
 get status(){return {known:this.riders.size,visible:[...this.riders.values()].filter(p=>p.model?.visible).length};}
}
