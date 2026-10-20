import {decodeSurfPose} from '../surf/protocol.js';
import {makeSurfActor,animateSurfActor} from '../surf/actors.js';
import {onlineSinkDrop} from './online-sinking.js';
import {packSpray} from './network-spray.js';
import {isJet} from '../config.js';
import {Spray} from './spray.js';
import {QUALITY} from '../config.js';
import * as THREE from 'three';
import {VEHICLES} from '../config.js';
import {makeVehicle} from '../vehicles/models.js';

function nameplate(){
 const label=document.createElement('div');label.className='online-player-name';label.hidden=true;
 const title=document.createElement('span');title.className='player-title';title.textContent='★ CREATOR';title.hidden=true;
 const name=document.createElement('span');name.className='player-name';label.append(title,name);document.getElementById('app').append(label);
 return {label,title,name};
}
function placeNameplate(plate,name,creator,anchor,camera){
 const point=anchor.clone().project(camera);
 plate.label.hidden=point.z>1||point.z< -1||Math.abs(point.x)>1.15||Math.abs(point.y)>1.15;
 plate.name.textContent=String(name||'Estuary Rat').slice(0,20);plate.title.hidden=!creator;
 plate.label.classList.toggle('is-creator',creator);
 plate.label.style.transform=`translate(-50%,-100%) translate(${(point.x*.5+.5)*innerWidth}px,${(-point.y*.5+.5)*innerHeight}px)`;
}

export class OnlineWorld{
 constructor(scene,client){this.scene=scene;this.client=client;this.models=new Map();this.localPlate=nameplate();this.localPlate.label.id='local-player-name';}
 remove(id){const entry=this.models.get(id);if(!entry)return;entry.spray?.dispose();entry.effects?.removeFromParent();this.scene.remove(entry.model);entry.label.remove();
  // Several craft share source geometry/materials. Removing an online craft must
  // never dispose resources still used by the local player or AI boats.
  for(const resource of entry.resources)resource.dispose();this.models.delete(id);
 }
 update(dt,now,viewer,camera,localView={}){
  this.effectTime=Math.max((this.effectTime??localView.time??now/1000)+dt,localView.time||0);this.localPlate.label.hidden=true;
  if(localView.playing&&!localView.firstPerson&&this.client.session){
   const me=this.client.room?.players?.find(p=>p.id===this.client.session.user.id);
   const name=me?.name||this.client.status.playerName||document.getElementById('online-name')?.value||'Estuary Rat';
   const anchor=localView.eye?localView.eye.clone().add(new THREE.Vector3(0,.38,0)):new THREE.Vector3(viewer.x,viewer.y+2,viewer.z);
   placeNameplate(this.localPlate,name,this.client.creator,anchor,camera);
  }
  const states=this.client.remote;
  for(const id of this.models.keys())if(!states.players.has(id))this.remove(id);
  for(const [id,r]of states.players){
   const p=states.sample(r,now);if(!p)continue;
   let entry=this.models.get(id);const surf=decodeSurfPose(p),key=`${surf?surf.mode+':'+surf.board:'normal'}:${p.type}:${p.colour}:${p.design}:${r.creator===true}`;
   if(entry?.key!==key){this.remove(id);entry=null;}
   if(!entry){
    // At most seven remote models, made only when a player/paint changes.
    const model=surf?makeSurfActor(surf):makeVehicle(p.type,VEHICLES[p.type].colours[p.colour],p.design,{creator:r.creator===true}),clones=new Map();
    const own=resource=>{if(!clones.has(resource))clones.set(resource,resource.clone());return clones.get(resource);};
    model.traverse(o=>{o.castShadow=false;if(o.geometry)o.geometry=own(o.geometry);if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];const copies=materials.map(m=>{const copy=own(m);for(const k of Object.keys(copy))if(m[k]?.isTexture)copy[k]=own(m[k]);return copy;});o.material=Array.isArray(o.material)?copies:copies[0];}});
    const plate=nameplate();this.scene.add(model);const effects=new THREE.Group();this.scene.add(effects);entry={key,model,effects,spray:null,...plate,resources:new Set(clones.values())};this.models.set(id,entry);
   }
   const {model,label}=entry;const distance=Math.hypot(p.x-viewer.x,p.z-viewer.z);model.visible=!!p.active&&distance<1000;
   label.hidden=!model.visible||distance>220;if(!model.visible){if(entry.spray){entry.spray.dispose();entry.spray=null;}continue;}
   if(entry.previousPosition&&Math.hypot(p.x-entry.previousPosition.x,p.z-entry.previousPosition.z)>90)entry.spray?.clear();entry.previousPosition={x:p.x,z:p.z};
   const sink=Math.max(0,(r.combat?.sinking||0)-Math.max(0,(now-(r.combatAt??now))/1000));model.position.set(p.x,p.y-(sink?onlineSinkDrop(p.type,sink):0),p.z);model.rotation.set(-p.pitch,p.heading,p.roll,'YXZ');
   if(surf){if(surf.mode==='ski'&&distance<240){if(!entry.spray)entry.spray=new Spray(entry.effects,{...QUALITY.Low,particles:160,wakeSamples:45,plumeCapacity:400});entry.spray.update(dt,{...p,config:VEHICLES.ski,drive:{rpm:p.rpm,wetness:1,neutral:false,flow:1,trimAngle:p.trimAngle,steeringAngle:p.steeringAngle}},this.effectTime,p.active&&!sink,{remote:true});entry.spray.resize(innerHeight,camera.fov,1);}animateSurfActor(model,surf,localView.time||now/1000);if(!label.hidden)placeNameplate(entry,r.name,r.creator,new THREE.Vector3(p.x,p.y+2.1,p.z),camera);continue;}
   if(model.userData.handlebars)model.userData.handlebars.rotation.y=-p.steer*.43;
   for(const part of [model.userData.motor,model.userData.nozzle])if(part)part.rotation.set(p.trimAngle,-p.steeringAngle,0,'YXZ');
   const v={...p,config:VEHICLES[p.type],slip:p.vx*Math.cos(p.heading)-p.vz*Math.sin(p.heading),yawRate:p.steer*.8,trimDegrees:p.trim,animationTime:now/1000,drive:{rpm:p.rpm,neutral:p.throttle<.08,flow:(isJet(p.type)?.16:1.2)*Math.max(0,p.throttle),exitSpeed:isJet(p.type)?24:8,wetness:1,reverse:p.throttle<0?1:0,trimAngle:p.trimAngle,steeringAngle:p.steeringAngle},airTricks:{pose:p.pose,blend:p.pose?1:0}};
   // Legacy backends strip source arrays. Reconstruct a visual-only fallback
   // until the owner installs the exact-source/shared-hit SQL update.
   if(!Array.isArray(v.spray))v.spray=packSpray(v,localView.time??now/1000,p.active&&!sink);
   if(distance<240){if(!entry.spray)entry.spray=new Spray(entry.effects,{...QUALITY.Low,particles:240,wakeSamples:48,plumeDensity:.95,plumeCapacity:900});entry.spray.update(dt,v,this.effectTime,p.active&&!sink,{remote:true});entry.spray.resize(innerHeight,camera.fov,Math.min(devicePixelRatio,1));}else if(entry.spray){entry.spray.dispose();entry.spray=null;}
   const rider=model.userData.rider;
   if(p.type==='cruiser'){rider.position.set(p.deck?p.deckX:0,p.deck?1.02:3.25,p.deck?p.deckZ:-.25);rider.rotation.y=p.deck?p.deckHeading:0;rider.userData.animate(now/1000,0,false,!p.deck);}
   else rider?.userData.update?.(v,dt,model.userData);
   model.userData.passenger?.userData.update(v,dt);
   for(const prop of [model.userData.propeller,...(model.userData.propellers||[])])if(prop)prop.rotation.z+=p.rpm/60*Math.PI*2*dt;
   if(!label.hidden)placeNameplate(entry,r.name,r.creator,new THREE.Vector3(p.x,p.y+(p.type==='cruiser'?6:3),p.z),camera);
  }
 }
}
