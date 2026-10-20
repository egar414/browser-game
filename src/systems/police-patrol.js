import {VehiclePhysics} from '../vehicles/physics.js';
import {SPAWN,VEHICLES,waveHeight} from '../config.js';
import {PoliceNavigation,policeSpeedLimit} from './police-navigation.js';
import {MooringFlood} from './mooring-flood.js';
import {packSpray} from './network-spray.js';
export const POLICE={count:4,sight:115,escapeSeconds:12,escapeDistance:95,catchDistance:7.5,catchSeconds:2.5,impoundSeconds:30,cooldownSeconds:18};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),angle=n=>Math.atan2(Math.sin(n),Math.cos(n));
const impoundKey='estuary-rats-impound-until';
export class PolicePatrol{
 constructor(collision,onEvent=()=>{},options={}){
  this.world=collision;this.onEvent=onEvent;this.remaining=0;this.cooldown=0;this.player=null;this.targetId=null;this.targetName=null;this.state='patrol';this.lostFor=0;this.catchLoad=0;this.clock=options.clock||Date.now;try{this.storage=options.storage??globalThis.localStorage;}catch{this.storage=null;}this.lastVision=0;
  try{this.impoundUntil=Math.min(this.clock()+30000,Number(this.storage?.getItem(impoundKey))||0);}catch{this.impoundUntil=0;}
  this.navigation=new PoliceNavigation(collision);
  const starts=[{x:SPAWN.x-24,z:SPAWN.z+50},{x:SPAWN.x+8,z:SPAWN.z+110},{x:580,z:-460},{x:115,z:2440}];
  const occupied=[];this.units=Array.from({length:POLICE.count},(_,i)=>{
   const type=i<2?'cat':'ski',u={id:`police-${i}`,index:i,type,route:[],routeAt:0,routeAge:10,stuck:0,collider:{name:'Police craft',x:0,z:0,r:i<2?2.6:1.2,height:i<2?3.5:2,disabled:false}};
   u.v=new VehiclePhysics(type,(x,z,r,y)=>this.world(x,z,r,y,u.collider));const n=[...this.navigation.nodes].filter(n=>n.links.length&&!occupied.some(v=>Math.hypot(v.x-n.x,v.z-n.z)<18)).sort((a,b)=>Math.hypot(a.x-starts[i].x,a.z-starts[i].z)-Math.hypot(b.x-starts[i].x,b.z-starts[i].z))[0];this.place(u,n||SPAWN);occupied.push(u.v);return u;
  });
  this.flood=new MooringFlood(this.units.map(u=>({id:u.id,x:u.v.x,z:u.v.z,heading:u.v.heading,width:VEHICLES[u.type].width,length:VEHICLES[u.type].length,capacityLitres:u.type==='cat'?90:55,resetSeconds:18,sinkLabel:'Police craft swamped',sinkDetail:'The crew relaunches shortly.'})),e=>this.onEvent({...e,points:0}));this.units.forEach((u,i)=>u.flood=this.flood.boats[i]);
 }
 get impounded(){return Math.max(0,(this.impoundUntil-this.clock())/1000);}
 tickImpound(){const left=this.impounded;if(this.hadImpound&&!left){this.hadImpound=false;this.cooldown=POLICE.cooldownSeconds;try{this.storage?.removeItem(impoundKey);}catch{}this.onEvent({type:'released',label:'Impound finished',detail:'Back to the Wharf. Keep it slow near pontoons.'});}else if(left)this.hadImpound=true;return left;}
 get colliders(){return this.units.map(u=>u.collider);}
 get status(){return{state:this.impounded?'impound':this.state,impound:this.impounded,offence:this.offence||'',speedLimit:this.player?policeSpeedLimit(this.player)*3.6:null,escapeIn:Math.max(0,POLICE.escapeSeconds-this.lostFor),catchProgress:clamp(this.catchLoad/POLICE.catchSeconds,0,1),targetOnScreen:!!this.targetOnScreen,targetId:this.targetId,targetName:this.targetName,nearest:this.player?Math.min(...this.units.filter(u=>!u.flood.resetIn).map(u=>Math.hypot(u.v.x-this.player.x,u.v.z-this.player.z))):null,remaining:this.remaining,cooldown:this.cooldown,units:this.units.map(u=>({id:u.id,type:u.type,x:u.v.x,z:u.v.z,speed:u.v.speed,role:u.role||'patrol',water:u.flood.water/u.flood.capacityLitres*100,sinking:u.flood.sinking,chasing:this.remaining>0,visible:!!u.model?.visible,onScreen:!!u.onScreen}))};}
 place(u,p){if(this.world(p.x,p.z,3,0,u.collider))return false;u.v.respawnAt({...p,heading:p.heading??SPAWN.heading});u.collider.x=p.x;u.collider.z=p.z;u.stuck=0;u.route=[];u.routeAge=10;return true;}
 sees(u,p){if(u.flood?.resetIn||Math.hypot(p.x-u.v.x,p.z-u.v.z)>POLICE.sight||p.wipeout)return false;for(let i=1;i<10;i++){const t=i/10;if(this.world(u.v.x+(p.x-u.v.x)*t,u.v.z+(p.z-u.v.z)*t,.25,1.7,u.collider))return false;}return true;}
 offenceFor(p){
  if(!p.active||p.ai||p.id?.startsWith('local-'))return null;
  if(p.speed>policeSpeedLimit(p)+1.7)return 'Speeding near the Wharf / canals';
  if(p.policeHit)return 'Spraying a police craft';
  if(p.speed>4&&p.spray?.some(s=>s.kind!=='rear'&&s.power>.5)&&this.units.some(u=>Math.hypot(u.v.x-p.x,u.v.z-p.z)<32))return 'Dangerous spray beside a patrol';
  return null;
 }
 beginChase(target,reason){if(!reason)return false;this.suspect=target;this.targetId=target.id;this.targetName=target.id==='me'?'you':target.name||'another player';this.offence=reason;this.remaining=1;this.state='pursuit';this.lostFor=0;this.catchLoad=0;this.lastKnown={...target};this.onEvent({label:`Police pursuit · ${reason}`,detail:'Break line of sight and stay clear for 12 seconds. Stopping within reach risks a 30-second impound.'});return true;}
 finish(label){this.remaining=0;this.state='patrol';this.cooldown=POLICE.cooldownSeconds;this.catchLoad=0;this.onEvent({label,detail:'Patrols return to their routes.'});this.targetId=null;this.targetName=null;}
 impound(){this.impoundUntil=this.clock()+POLICE.impoundSeconds*1000;try{this.storage?.setItem(impoundKey,String(this.impoundUntil));}catch{}this.hadImpound=true;this.finish('Caught by the patrol');this.onEvent({type:'impound',label:'Craft impounded · 30 seconds',detail:'Driving is paused until the countdown ends. Settings and account controls remain available.'});}
 meetPosition(){for(const u of this.units.filter(u=>!u.flood.resetIn))for(const side of [-1,1]){const h=u.v.heading,x=u.v.x+Math.cos(h)*side*14,z=u.v.z-Math.sin(h)*side*14;if(!this.world(x,z,3,0))return{x,z,heading:Math.atan2(u.v.x-x,u.v.z-z)};}return null;}
 watchPosition(){return this.meetPosition();} // Never invent an offence to stage a chase.
 update(dt,player,time,others=[]){
  this.player=player;this.cooldown=Math.max(0,this.cooldown-dt);const local={...player,id:'me',name:'you',active:!this.impounded,spray:packSpray(player,time,!this.impounded)};
  const candidates=[local,...others.filter(p=>!p.ai&&!p.id?.startsWith('local-'))];
  this.lastVision-=dt;
  if(this.lastVision<=0){this.lastVision=.2;
   if(!this.remaining&&!this.cooldown&&!this.impounded){for(const p of candidates){const reason=this.offenceFor(p);if(reason&&this.units.some(u=>this.sees(u,p))){this.beginChase(p,reason);break;}}}
   if(this.remaining){const suspect=candidates.find(p=>p.id===this.targetId);this.suspectPresent=!!suspect;this.visibleSuspect=!!suspect&&this.units.some(u=>this.sees(u,suspect));if(this.visibleSuspect)this.lastKnown={...suspect};this.suspect=suspect||this.lastKnown;}
  }
  if(this.remaining){const suspect=this.suspect,nearest=Math.min(...this.units.filter(u=>!u.flood.resetIn).map(u=>Math.hypot(u.v.x-suspect.x,u.v.z-suspect.z)));
   this.lostFor=this.visibleSuspect?0:this.lostFor+dt;this.state=this.visibleSuspect?'pursuit':'search';
   const catching=this.visibleSuspect&&nearest<POLICE.catchDistance&&(suspect.speed||0)<5;
   this.catchLoad=catching?this.catchLoad+dt:Math.max(0,this.catchLoad-dt*2);
   if(this.targetId==='me'&&this.catchLoad>=POLICE.catchSeconds)this.impound();
   else if(this.lostFor>=POLICE.escapeSeconds&&(!this.suspectPresent||nearest>POLICE.escapeDistance))this.finish('You escaped the patrol');
  }
  // All units pursue one shared last-seen point, with distinct interception roles.
  const ranked=[...this.units].sort((a,b)=>Math.hypot(a.v.x-(this.lastKnown?.x||0),a.v.z-(this.lastKnown?.z||0))-Math.hypot(b.v.x-(this.lastKnown?.x||0),b.v.z-(this.lastKnown?.z||0)));
  for(const u of this.units){const v=u.v,f=u.flood;if(f.resetIn){u.collider.disabled=f.sinking>.35;continue;}
   const rank=ranked.indexOf(u);u.role=this.remaining?['pursuer','interceptor','left flank','right flank'][rank]:'patrol';let goal;
   if(this.remaining){const s=this.lastKnown,lead=rank===0?.25:rank===1?1.9:1.1,side=rank<2?0:rank===2?-12:12,h=s.heading||Math.atan2(s.vx||0,s.vz||1);goal={x:s.x+(s.vx||0)*lead+Math.cos(h)*side,z:s.z+(s.vz||0)*lead-Math.sin(h)*side};if(this.world(goal.x,goal.z,3,0,u.collider))goal={x:s.x,z:s.z};}
   else{if(!u.patrolGoal||Math.hypot(v.x-u.patrolGoal.x,v.z-u.patrolGoal.z)<18){const component=this.navigation.nearest(v)?.component,nodes=this.navigation.nodes.filter(n=>n.component===component&&n.links.length&&Math.hypot(n.x-v.x,n.z-v.z)>120);u.patrolSerial=(u.patrolSerial||0)+1;u.patrolGoal=nodes[(u.index*149+u.patrolSerial*97)%nodes.length]||this.navigation.nearest(v);}goal=u.patrolGoal;}
   let target=goal;u.routeAge+=dt;u.probeAge=(u.probeAge||0)-dt;if(u.probeAge<=0){u.probeAge=.5;u.directClear=goal&&this.navigation.clear(v,goal,u.collider);}
   if(goal&&!u.directClear){
    if(u.routeAge>2){u.route=this.navigation.route(v,goal);u.routeAt=0;u.routeAge=0;}
    while(u.routeAt<u.route.length-1&&Math.hypot(v.x-u.route[u.routeAt].x,v.z-u.route[u.routeAt].z)<14)u.routeAt++;
    target=u.route[u.routeAt]||this.navigation.nearest(v);
   }
   if(!target)continue;
   const error=angle(Math.atan2(target.x-v.x,target.z-v.z)-v.heading),distance=Math.hypot(target.x-v.x,target.z-v.z),desired=this.remaining?Math.min(u.type==='ski'?30:24,Math.max(1,distance*.65)):5;
   let steer=clamp(error*1.8,-1,1),throttle=clamp((desired*(1-Math.min(.8,Math.abs(error)*.4))-v.speed)*.3+.15,-.6,.95);
   // Avoid allies and innocent boaters; do not ram through jetties to intercept.
   const probe=6+v.speed*.7;
   if(this.world(v.x+Math.sin(v.heading)*probe,v.z+Math.cos(v.heading)*probe,2,0,u.collider)){throttle=-.5;for(const turn of [.8,-.8]){const h=v.heading+turn;if(!this.world(v.x+Math.sin(h)*probe,v.z+Math.cos(h)*probe,2,0,u.collider)){steer=Math.sign(turn);throttle=v.speed>3?-.3:.25;break;}}}
   const nearPlayer=Math.hypot(v.x-player.x,v.z-player.z);if(nearPlayer<9)throttle=v.speed>2?-.7:0;
   u.controls={throttle,steer,trim:0,freestyle:false};v.update(dt,u.controls,time);u.stuck=v.speed<.35?u.stuck+dt:0;
   if(v.wipeout||u.stuck>14){const safe=this.navigation.nearest(v);if(safe&&Math.hypot(safe.x-player.x,safe.z-player.z)>20)this.place(u,safe);}
   Object.assign(u.collider,{x:v.x,z:v.z,height:v.y+(u.type==='cat'?3.4:2),disabled:false});
  }
  const before=this.units.map(u=>u.flood.water),resets=this.units.map(u=>u.flood.resetIn);
  for(const u of this.units)Object.assign(u.flood,{x:u.v.x,z:u.v.z,heading:u.v.heading,deckY:waveHeight(u.v.x,u.v.z,time)+.5});
  this.flood.reindex();this.flood.update(dt,player,time,!this.impounded&&!player.wipeout);
  if(this.units.some((u,i)=>u.flood.water>before[i]+.01)&&!this.remaining&&!this.cooldown&&this.units.some(u=>this.sees(u,local)))this.beginChase(local,'Spraying a police craft');
  this.units.forEach((u,i)=>{u.collider.disabled=u.flood.sinking>.35;if(resets[i]&&!u.flood.resetIn)this.place(u,this.navigation.nearest(u.v)||SPAWN);});
 }
}
