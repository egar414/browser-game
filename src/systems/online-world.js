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
 remove(id){const entry=this.models.get(id);if(!entry)return;this.scene.remove(entry.model);entry.label.remove();
  // Several craft share source geometry/materials. Removing an online craft must
  // never dispose resources still used by the local player or AI boats.
  for(const resource of entry.resources)resource.dispose();this.models.delete(id);
 }
 update(dt,now,viewer,camera,localView={}){
  this.localPlate.label.hidden=true;
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
   let entry=this.models.get(id);const key=`${p.type}:${p.colour}:${p.design}`;
   if(entry?.key!==key){this.remove(id);entry=null;}
   if(!entry){
    // At most seven remote models, made only when a player/paint changes.
    const model=makeVehicle(p.type,VEHICLES[p.type].colours[p.colour],p.design),clones=new Map();
    const own=resource=>{if(!clones.has(resource))clones.set(resource,resource.clone());return clones.get(resource);};
    model.traverse(o=>{o.castShadow=false;if(o.geometry)o.geometry=own(o.geometry);if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];const copies=materials.map(m=>{const copy=own(m);for(const k of Object.keys(copy))if(m[k]?.isTexture)copy[k]=own(m[k]);return copy;});o.material=Array.isArray(o.material)?copies:copies[0];}});
    const plate=nameplate();this.scene.add(model);entry={key,model,...plate,resources:new Set(clones.values())};this.models.set(id,entry);
   }
   const {model,label}=entry;const distance=Math.hypot(p.x-viewer.x,p.z-viewer.z);model.visible=!!p.active&&distance<1000;
   label.hidden=!model.visible||distance>220;if(!model.visible)continue;
   model.position.set(p.x,p.y,p.z);model.rotation.set(-p.pitch,p.heading,p.roll,'YXZ');
   if(model.userData.handlebars)model.userData.handlebars.rotation.y=-p.steer*.43;
   for(const part of [model.userData.motor,model.userData.nozzle])if(part)part.rotation.set(p.trimAngle,-p.steeringAngle,0,'YXZ');
   const v={...p,trimDegrees:p.trim,animationTime:now/1000,drive:{rpm:p.rpm},airTricks:{pose:p.pose,blend:p.pose?1:0}};
   const rider=model.userData.rider;
   if(p.type==='cruiser'){rider.position.set(p.deck?p.deckX:0,p.deck?1.02:3.25,p.deck?p.deckZ:-.25);rider.rotation.y=p.deck?p.deckHeading:0;rider.userData.animate(now/1000,0,false,!p.deck);}
   else rider?.userData.update?.(v,dt,model.userData);
   model.userData.passenger?.userData.update(v,dt);
   for(const prop of [model.userData.propeller,...(model.userData.propellers||[])])if(prop)prop.rotation.z+=p.rpm/60*Math.PI*2*dt;
   if(!label.hidden)placeNameplate(entry,r.name,r.creator,new THREE.Vector3(p.x,p.y+(p.type==='cruiser'?6:3),p.z),camera);
  }
 }
}
