import {VehiclePhysics} from '../vehicles/physics.js';
import {CruisePath} from './local-traffic.js';
import {RACE,SPAWN} from '../config.js';
export const POLICE={count:4,sight:105,pursuitSeconds:60,cooldownSeconds:30,lookAhead:24};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),angle=n=>Math.atan2(Math.sin(n),Math.cos(n));
export class PolicePatrol{
 constructor(collision,onEvent=()=>{}){
  this.world=collision;this.onEvent=onEvent;this.remaining=0;this.cooldown=0;this.player=null;this.targetId=null;this.targetName=null;
  this.path=new CruisePath(RACE);const start=this.path.nearest(SPAWN.x,SPAWN.z);
  this.units=Array.from({length:POLICE.count},(_,i)=>{
   const type=i<2?'cat':'ski',u={id:`police-${i}`,type,progress:start+90+i*155,stuck:0,collider:{name:'Police craft',x:0,z:0,r:i<2?2.8:1.2,height:i<2?3.5:2,disabled:false}};
   u.v=new VehiclePhysics(type,(x,z,r,y)=>this.world(x,z,r,y,u.collider));this.place(u);const h=SPAWN.heading,d=22+i*20,side=i%2?8:-8,p={x:SPAWN.x+Math.sin(h)*d+Math.cos(h)*side,z:SPAWN.z+Math.cos(h)*d-Math.sin(h)*side,heading:h};if(!this.world(p.x,p.z,3,0)){u.v.respawnAt(p);u.progress=this.path.nearest(p.x,p.z);u.collider.x=p.x;u.collider.z=p.z;}return u;
  });
 }
 place(u){for(let d=0;d<250;d+=10){const p=this.path.at(u.progress+d);if(!this.world(p.x,p.z,3,0,u.collider)){u.v.respawnAt(p);u.progress+=d;u.stuck=0;u.collider.x=p.x;u.collider.z=p.z;return true;}}return false;}
 get colliders(){return this.units.map(u=>u.collider);}
 get status(){return{targetOnScreen:!!this.targetOnScreen,targetId:this.targetId,targetName:this.targetName,nearest:this.player?Math.min(...this.units.map(u=>Math.hypot(u.v.x-this.player.x,u.v.z-this.player.z))):null,remaining:this.remaining,cooldown:this.cooldown,units:this.units.map(u=>({id:u.id,type:u.type,x:u.v.x,z:u.v.z,speed:u.v.speed,chasing:this.remaining>0,visible:!!u.model?.visible,onScreen:!!u.onScreen}))};}
 sees(u,p){const d=Math.hypot(p.x-u.v.x,p.z-u.v.z);if(d>POLICE.sight||p.wipeout)return false;
  for(let i=1;i<10;i++){const t=i/10;if(this.world(u.v.x+(p.x-u.v.x)*t,u.v.z+(p.z-u.v.z)*t,.25,1.7,u.collider))return false;}return true;}
 meetPosition(){for(const u of this.units)for(const side of [-1,1]){const h=u.v.heading,x=u.v.x+Math.cos(h)*side*12,z=u.v.z-Math.sin(h)*side*12;if(!this.world(x,z,3,0))return{x,z,heading:Math.atan2(u.v.x-x,u.v.z-z)};}return null;}
 beginChase(target){this.suspect=target;this.targetId=target.id;this.targetName=target.id==='me'?'you':target.name||'another boater';this.remaining=POLICE.pursuitSeconds;this.cooldown=0;this.onEvent({label:target.id==='me'?'Police spotted you · 60 seconds':`Police chasing ${this.targetName} · 60 seconds`,detail:target.id==='me'?'Keep moving or watch the blue patrol markers.':'Follow the blue markers to watch the pursuit.'});}
 watchPosition(boaters){const target=boaters.filter(p=>this.units.some(u=>this.sees(u,p))).sort((a,b)=>Math.min(...this.units.map(u=>Math.hypot(u.v.x-a.x,u.v.z-a.z)))-Math.min(...this.units.map(u=>Math.hypot(u.v.x-b.x,u.v.z-b.z))))[0];if(!target)return null;this.beginChase(target);const u=[...this.units].sort((a,b)=>Math.hypot(a.v.x-target.x,a.v.z-target.z)-Math.hypot(b.v.x-target.x,b.v.z-target.z))[0],h=Math.atan2(target.x-u.v.x,target.z-u.v.z);for(const back of [24,34,44])for(const side of [8,-8,0]){const x=u.v.x-Math.sin(h)*back+Math.cos(h)*side,z=u.v.z-Math.cos(h)*back-Math.sin(h)*side;if(!this.world(x,z,3,0))return{x,z,heading:Math.atan2(u.v.x+(target.x-u.v.x)*.35-x,u.v.z+(target.z-u.v.z)*.35-z)};}return this.meetPosition();}
 update(dt,player,time,others=[]){
  this.player=player;const candidates=[{...player,id:'me',name:'you'},...others];const was=this.remaining>0;this.remaining=Math.max(0,this.remaining-dt);this.cooldown=Math.max(0,this.cooldown-dt);
  if(was&&!this.remaining){this.cooldown=POLICE.cooldownSeconds;this.onEvent({label:'Pursuit finished',detail:'Police are returning to their patrol routes.'});}
  if(!was&&!this.cooldown){const seen=candidates.filter(p=>!p.wipeout&&this.units.some(u=>this.sees(u,p))).sort((a,b)=>(b.speed>2)-(a.speed>2)||Math.min(...this.units.map(u=>Math.hypot(u.v.x-a.x,u.v.z-a.z)))-Math.min(...this.units.map(u=>Math.hypot(u.v.x-b.x,u.v.z-b.z))));if(seen[0])this.beginChase(seen[0]);}
  const pursued=candidates.find(p=>p.id===this.targetId);if(this.remaining>0&&!pursued){this.remaining=0;this.cooldown=POLICE.cooldownSeconds;}const suspect=pursued||player;this.suspect=suspect;
  for(const u of this.units){const v=u.v;u.progress=this.path.follow(v.x,v.z,u.progress);let target=this.path.at(u.progress+POLICE.lookAhead+v.speed*.5);
   if(this.remaining>0){const lead=Math.min(1.1,Math.hypot(suspect.x-v.x,suspect.z-v.z)/50),direct={x:suspect.x+(suspect.vx||0)*lead,z:suspect.z+(suspect.vz||0)*lead};
    let clear=true;for(let i=1;i<=8;i++){const t=i/8;if(this.world(v.x+(direct.x-v.x)*t,v.z+(direct.z-v.z)*t,2,0,u.collider)){clear=false;break;}}if(clear)target=direct;
    else{const goal=this.path.nearest(suspect.x,suspect.z),ahead=(goal-u.progress+this.path.length)%this.path.length;if(ahead>this.path.length/2)target=this.path.at(u.progress-POLICE.lookAhead-v.speed*.5);}
   }
   const error=angle(Math.atan2(target.x-v.x,target.z-v.z)-v.heading),distance=Math.hypot(suspect.x-v.x,suspect.z-v.z),desired=this.remaining>0?Math.min(u.type==='ski'?29:23,Math.max(1,distance*.6)):6;
   let steer=clamp(error*1.8,-1,1),throttle=clamp((desired*(1-Math.min(.7,Math.abs(error)*.35))-v.speed)*.3+.15,-.5,.95);
   const probe=7+v.speed*.8;for(const t of [0,.65,-.65]){const h=v.heading+t;if(!this.world(v.x+Math.sin(h)*probe,v.z+Math.cos(h)*probe,2,0,u.collider)){if(t)steer=Math.sign(t);break;}throttle=-.4;}
   if(distance<7&&this.remaining>0)throttle=-.6;
   u.controls={throttle,steer,trim:0,freestyle:false};v.update(dt,u.controls,time);u.stuck=v.speed<.4?u.stuck+dt:0;if(v.wipeout||u.stuck>12){u.progress+=35;this.place(u);}
   Object.assign(u.collider,{x:v.x,z:v.z,height:v.y+(u.type==='cat'?3.4:2)});
  }
 }
}
