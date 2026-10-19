import {VehiclePhysics} from '../vehicles/physics.js';
import {CruisePath} from './local-traffic.js';
import {RACE,SPAWN} from '../config.js';
export const POLICE={count:4,sight:105,pursuitSeconds:60,cooldownSeconds:30,lookAhead:24};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),angle=n=>Math.atan2(Math.sin(n),Math.cos(n));
export class PolicePatrol{
 constructor(collision,onEvent=()=>{}){
  this.world=collision;this.onEvent=onEvent;this.remaining=0;this.cooldown=0;this.player=null;
  this.path=new CruisePath(RACE);const start=this.path.nearest(SPAWN.x,SPAWN.z);
  this.units=Array.from({length:POLICE.count},(_,i)=>{
   const type=i<2?'cat':'ski',u={id:`police-${i}`,type,progress:start+90+i*155,stuck:0,collider:{name:'Police craft',x:0,z:0,r:i<2?2.8:1.2,height:i<2?3.5:2,disabled:false}};
   u.v=new VehiclePhysics(type,(x,z,r,y)=>this.world(x,z,r,y,u.collider));this.place(u);return u;
  });
 }
 place(u){for(let d=0;d<250;d+=10){const p=this.path.at(u.progress+d);if(!this.world(p.x,p.z,3,0,u.collider)){u.v.respawnAt(p);u.progress+=d;u.stuck=0;u.collider.x=p.x;u.collider.z=p.z;return true;}}return false;}
 get colliders(){return this.units.map(u=>u.collider);}
 get status(){return{remaining:this.remaining,cooldown:this.cooldown,units:this.units.map(u=>({id:u.id,type:u.type,x:u.v.x,z:u.v.z,speed:u.v.speed,chasing:this.remaining>0}))};}
 sees(u,p){const d=Math.hypot(p.x-u.v.x,p.z-u.v.z);if(d>POLICE.sight||p.wipeout)return false;
  for(let i=1;i<10;i++){const t=i/10;if(this.world(u.v.x+(p.x-u.v.x)*t,u.v.z+(p.z-u.v.z)*t,.25,1.7,u.collider))return false;}return true;}
 meetPosition(){for(const u of this.units)for(const side of [-1,1]){const h=u.v.heading,x=u.v.x+Math.cos(h)*side*12,z=u.v.z-Math.sin(h)*side*12;if(!this.world(x,z,3,0))return{x,z,heading:h};}return null;}
 update(dt,player,time){
  this.player=player;const was=this.remaining>0;this.remaining=Math.max(0,this.remaining-dt);this.cooldown=Math.max(0,this.cooldown-dt);
  if(was&&!this.remaining){this.cooldown=POLICE.cooldownSeconds;this.onEvent({label:'Pursuit finished',detail:'Police are returning to their patrol routes.'});}
  if(!was&&!this.cooldown&&this.units.some(u=>this.sees(u,player))){this.remaining=POLICE.pursuitSeconds;this.onEvent({label:'Police spotted you · 60 seconds',detail:'Free-roam chase! Keep moving, find a canal or outrun them.'});}
  for(const u of this.units){const v=u.v;u.progress=this.path.follow(v.x,v.z,u.progress);let target=this.path.at(u.progress+POLICE.lookAhead+v.speed*.5);
   if(this.remaining>0){const lead=Math.min(1.1,Math.hypot(player.x-v.x,player.z-v.z)/50),direct={x:player.x+(player.vx||0)*lead,z:player.z+(player.vz||0)*lead};
    let clear=true;for(let i=1;i<=8;i++){const t=i/8;if(this.world(v.x+(direct.x-v.x)*t,v.z+(direct.z-v.z)*t,2,0,u.collider)){clear=false;break;}}if(clear)target=direct;
    else{const goal=this.path.nearest(player.x,player.z),ahead=(goal-u.progress+this.path.length)%this.path.length;if(ahead>this.path.length/2)target=this.path.at(u.progress-POLICE.lookAhead-v.speed*.5);}
   }
   const error=angle(Math.atan2(target.x-v.x,target.z-v.z)-v.heading),distance=Math.hypot(player.x-v.x,player.z-v.z),desired=this.remaining>0?Math.min(u.type==='ski'?29:23,Math.max(1,distance*.6)):6;
   let steer=clamp(error*1.8,-1,1),throttle=clamp((desired*(1-Math.min(.7,Math.abs(error)*.35))-v.speed)*.3+.15,-.5,.95);
   const probe=7+v.speed*.8;for(const t of [0,.65,-.65]){const h=v.heading+t;if(!this.world(v.x+Math.sin(h)*probe,v.z+Math.cos(h)*probe,2,0,u.collider)){if(t)steer=Math.sign(t);break;}throttle=-.4;}
   if(distance<7&&this.remaining>0)throttle=-.6;
   u.controls={throttle,steer,trim:0,freestyle:false};v.update(dt,u.controls,time);u.stuck=v.speed<.4?u.stuck+dt:0;if(v.wipeout||u.stuck>12){u.progress+=35;this.place(u);}
   Object.assign(u.collider,{x:v.x,z:v.z,height:v.y+(u.type==='cat'?3.4:2)});
  }
 }
}
