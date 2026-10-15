import * as THREE from 'three';
import { VehiclePhysics } from '../vehicles/physics.js';
import { makeVehicle } from '../vehicles/models.js';
import { sprayState } from './spray-model.js';
import { Spray } from './spray.js';
import { collision } from './environment.js';
import { RACE, QUALITY } from '../config.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
// Gameplay water volumes, independent of quality/visual particle count.
export function sprayExposure(attacker,target,time){
  if(attacker.airborne||attacker.wipeout||Math.abs(target.y-attacker.y)>2.8)return 0;
  const s=sprayState(attacker,false,time),dx=target.x-attacker.x,dz=target.z-attacker.z;
  const right=dx*Math.cos(attacker.heading)-dz*Math.sin(attacker.heading),aft=-(dx*Math.sin(attacker.heading)+dz*Math.cos(attacker.heading));
  let exposure=0;
  for(const side of [-1,1]){
    const power=side<0?s.left:s.right,range=2+power*3.2,d=right*side;
    if(power>.35&&d>.35&&d<range&&aft>-2&&aft<10)exposure+=power*clamp(1-d/range)*clamp(1-Math.abs(aft-3)/9);
  }
  if(attacker.type==='ski'&&attacker.drive?.flow>.03&&attacker.drive.reverse<.08&&aft>1.5&&aft<13&&Math.abs(right)<1.6)exposure+=clamp(attacker.drive.flow/.15)*.9;
  return clamp(exposure,0,2.5);
}
export function floodStep(water,incoming,dt){return clamp(water+dt*(incoming*24-(incoming>.05?0:2.3)),0,100);}
export class SprayBattle {
  constructor(scene,onEvent){this.scene=scene;this.onEvent=onEvent;this.opponents=[];this.active=false;this.water=0;this.sinking=0;this.remaining=0;this.sinks=0;}
  start(player){
    this.cancel();this.active=true;this.remaining=120;this.water=0;this.sinks=0;
    const sites=[];
    for(const radius of [27,42,60])for(let i=0;i<12&&sites.length<2;i++){
      const a=i*Math.PI/6,x=player.x+Math.sin(a)*radius,z=player.z+Math.cos(a)*radius;
      if(!collision(x,z,5)&&sites.every(p=>Math.hypot(x-p.x,z-p.z)>22))sites.push({x,z});
    }
    for(const [i,p]of sites.entries()){
      const type=i?'ski':'cat',v=new VehiclePhysics(type,collision);v.safe={...p,heading:player.heading};v.recover();
      const model=makeVehicle(type,i?'#ef9b39':'#ed7357'),spray=new Spray(this.scene,{...QUALITY.Low,particles:140,wakeSamples:45,fanSegments:6});this.scene.add(model);
      let gate=0,nearest=Infinity;RACE.forEach((g,j)=>{const d=Math.hypot(v.x-g[0],v.z-g[1]);if(d<nearest){nearest=d;gate=j;}});
      this.opponents.push({v,model,spray,water:0,sinking:0,gate,controls:{throttle:.75,steer:0,trim:0,freestyle:false}});
    }
    this.onEvent({type:'battle-start',label:'Spray battle',detail:'Two minutes. Cut alongside your rivals and soak them. R recovers a swamped craft.'});
  }
  cancel(){
    for(const o of this.opponents){o.spray.dispose();o.model.removeFromParent();o.model.traverse(m=>{if(m.geometry)m.geometry.dispose();if(m.material?.map)m.material.map.dispose();});}
    this.opponents=[];this.active=false;this.water=0;this.sinking=0;
  }
  recover(){this.water=0;this.sinking=0;}
  get status(){return {active:this.active,water:this.water,sinking:this.sinking,remaining:this.remaining,sinks:this.sinks,targets:this.opponents.map(o=>({x:o.v.x,z:o.v.z,water:o.water,sinking:o.sinking}))};}
  update(dt,player,time){
    if(!this.active)return;
    if(this.water>=100&&!this.sinking){this.sinking=4;this.onEvent({type:'battle-sink',label:'Swamped!',detail:'Too much water aboard. Recovering…'});}
    this.remaining-=dt;
    if(this.remaining<=0){const count=this.sinks;this.cancel();this.onEvent({type:'battle-end',label:`Spray battle · ${count} rivals swamped`,detail:'B starts another round. Free roam is back.'});return;}
    for(const [index,o]of this.opponents.entries()){
      if(o.sinking>0){o.sinking=Math.max(0,o.sinking-dt);if(o.sinking<=0){o.v.recover(true);o.water=0;}continue;}
      const v=o.v;let target=RACE[o.gate];
      if(Math.hypot(v.x-target[0],v.z-target[1])<24)o.gate=(o.gate+1)%RACE.length;
      // Seek a pass alongside the player when there is clear water; otherwise
      // follow the mapped island loop and let shoreline collision recover safely.
      const a=time*.17+index*Math.PI,tx=player.x+Math.sin(a)*18,tz=player.z+Math.cos(a)*18;
      if(Math.hypot(v.x-player.x,v.z-player.z)<85&&!collision(tx,tz,4))target=[tx,tz];
      const angle=Math.atan2(target[0]-v.x,target[1]-v.z),error=Math.atan2(Math.sin(angle-v.heading),Math.cos(angle-v.heading));
      const steer=clamp(error*2.3,-1,1),throttle=Math.abs(error)>1.3?.35:.76;
      o.controls={throttle,steer,trim:0,freestyle:Math.abs(error)>.28&&v.speed>7};v.update(dt,o.controls,time);
      const incoming=(this.sinking?0:sprayExposure(player,v,time))+this.opponents.reduce((sum,other)=>sum+(other!==o&&!other.sinking?sprayExposure(other.v,v,time)*.35:0),0);
      o.water=floodStep(o.water,incoming,dt);
      if(o.water>=100){o.sinking=4;this.sinks++;this.onEvent({type:'score',label:'Spray battle · swamped',points:250});}
    }
    if(this.sinking>0){this.sinking=Math.max(0,this.sinking-dt);if(this.sinking<=0){player.recover(true);this.water=0;this.onEvent({type:'battle-recover',label:'Back afloat',detail:'Bilge cleared. Back into the spray.'});}}
    else{
      const incoming=this.opponents.reduce((sum,o)=>sum+(!o.sinking?sprayExposure(o.v,player,time):0),0);this.water=floodStep(this.water,incoming,dt);
      if(this.water>=100){this.sinking=4;this.onEvent({type:'battle-sink',label:'Swamped!',detail:'Too much water aboard. Recovering…'});}
    }
  }
  render(dt,time,height,fov,pixelRatio,playing){
    for(const o of this.opponents){
      const v=o.v;o.model.position.set(v.x,v.y-(o.sinking?(4-o.sinking)*.6:0),v.z);o.model.rotation.set(-v.pitch,v.heading,v.roll+(o.sinking?.5:0),'YXZ');
      const parts=o.model.userData;if(parts.handlebars)parts.handlebars.rotation.y=-v.steer*.43;
      for(const p of [parts.motor,parts.nozzle])if(p)p.rotation.set(v.drive.trimAngle,-v.drive.steeringAngle,0,'YXZ');
      if(parts.bucket)parts.bucket.rotation.x=v.drive.reverse*1.3;parts.rider.userData.update(v,dt,parts);
      o.spray.update(playing?dt:0,{...v,wipeout:o.sinking||v.wipeout},time,playing&&!o.sinking,o.controls);o.spray.resize(height,fov,pixelRatio);
    }
  }
}
