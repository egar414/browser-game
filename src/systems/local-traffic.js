import{VehiclePhysics}from'../vehicles/physics.js';
import{bodyPoint}from'../vehicles/propulsion.js';
import{RACE,SPAWN,VEHICLES,LOCAL_TRAFFIC as T}from'../config.js';
import{mapData}from'./geography.js';
import{MooringFlood}from'./mooring-flood.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));

export class CruisePath{
 constructor(points,closed=true){
  this.points=closed?points:[...points,...points.slice(1,-1).reverse()];this.edges=[];this.length=0;
  for(let i=0;i<this.points.length;i++){
   const a=this.points[i],b=this.points[(i+1)%this.points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
   if(length>.1){this.edges.push({a,b,length,start:this.length});this.length+=length;}
  }
 }
 at(distance){
  const d=((distance%this.length)+this.length)%this.length,e=this.edges.find(e=>d<e.start+e.length)||this.edges.at(-1),t=(d-e.start)/e.length;
  return{x:e.a[0]+(e.b[0]-e.a[0])*t,z:e.a[1]+(e.b[1]-e.a[1])*t,heading:Math.atan2(e.b[0]-e.a[0],e.b[1]-e.a[1])};
 }
 nearest(x,z){
  let best={distance:Infinity,progress:0};
  for(const e of this.edges){const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],t=clamp(((x-e.a[0])*dx+(z-e.a[1])*dz)/(e.length**2),0,1),d=Math.hypot(x-e.a[0]-dx*t,z-e.a[1]-dz*t);if(d<best.distance)best={distance:d,progress:e.start+e.length*t};}
  return best.progress;
 }
 follow(x,z,progress){
  let best=Infinity,result=progress;
  // A local search retains travel direction on a two-way canal patrol.
  for(let d=-6;d<=30;d+=2){const p=this.at(progress+d),error=Math.hypot(x-p.x,z-p.z)+Math.max(0,d)*.003;if(error<best){best=error;result=progress+d;}}
  return result;
 }
}
function canalPath(name,collision){
 const line=mapData.channels.filter(c=>c.name===name).sort((a,b)=>b.points.length-a.points.length)[0];
 let p=line.points.slice();while(p.length>3&&collision(...p[0],10,0))p.shift();while(p.length>3&&collision(...p.at(-1),10,0))p.pop();
 return new CruisePath(p,false);
}
export class LocalTraffic{
 constructor(collision,onEvent=()=>{}){
  this.world=collision;this.onEvent=onEvent;this.enabled=true;this.player=null;this.toastCooldown=0;this.boats=[];
  const wharf=new CruisePath(RACE),canal=canalPath('Kawana Waters Canal',collision),upstream=canalPath('Wyuna Canal',collision),start=wharf.nearest(SPAWN.x,SPAWN.z);
  wharf.cruisingSpeed=T.riverSpeed;canal.cruisingSpeed=upstream.cruisingSpeed=T.canalSpeed;
  const fleet=[['Gaz','tinny',wharf,start+60],['Nina','cat',wharf,start+150],['Macca','tinny',wharf,start+260],['Sunny','tinny',canal,canal.length*.24],['Jules','cat',canal,canal.length*.63],['Taz','tinny',upstream,upstream.nearest(112.9,2502.7)+60],['Ash','cat',canal,canal.length*.08],['Robbo','tinny',canal,canal.length*.85],['Liv','tinny',upstream,upstream.length*.38],['Bill','cat',upstream,upstream.length*.77]];
  for(const [name,type,path,progress]of fleet){
   const b={id:`local-${name}`,name,type,path,progress,stuck:0,reaction:0,lastReset:0,recoveries:0,controls:{throttle:0,steer:0,freestyle:false,trim:0},collider:{name:'Cruising boat',x:0,z:0,r:VEHICLES[type].length*.34,height:2.5,disabled:true}};
   b.v=new VehiclePhysics(type,(x,z,r,y)=>this.obstacle(x,z,r,y,b));this.boats.push(b);this.place(b,progress);
  }
  this.flood=new MooringFlood(this.boats.map(b=>({id:b.id,x:b.v.x,z:b.v.z,heading:b.v.heading,width:b.type==='cat'?1.05:1.22,length:b.type==='cat'?2.8:2.25})),e=>{
   const b=this.boats.find(b=>b.id===e.boatId);this.onEvent({type:'local-swamped',label:`${b.name} got swamped!`,detail:'They’ll bail out and relaunch shortly.'});
  });
  this.boats.forEach((b,i)=>{b.flood=this.flood.boats[i];});
 }
 get colliders(){return this.boats.map(b=>b.collider);}
 get status(){return{enabled:this.enabled,boats:this.boats.map(b=>({id:b.id,name:b.name,type:b.type,x:b.v.x,z:b.v.z,heading:b.v.heading,speed:b.v.speed,water:b.flood.water/55*100,rearWater:b.flood.rearWater,sinking:b.flood.sinking,reaction:b.reaction,recoveries:b.recoveries}))};}
 setEnabled(enabled){
  if(this.enabled!==enabled)this.flood.clearSpray();this.enabled=enabled;
  for(const b of this.boats)b.collider.disabled=!enabled||b.flood.sinking>.35;
 }
 obstacle(x,z,r,y,b){
  const hit=this.world(x,z,r,y,b.collider);if(hit)return hit;
  const p=this.player;if(p&&Math.hypot(x-p.x,z-p.z)<r+p.config.width*.5+.5&&y<p.y+1.8)return'Another boater';
  return null;
 }
 place(b,progress){
  for(let offset=0;offset<160;offset+=12){
   const p=b.path.at(progress+offset);
   if(this.world(p.x,p.z,3,0,b.collider)||this.player&&Math.hypot(p.x-this.player.x,p.z-this.player.z)<18)continue;
   if(b.started)b.recoveries++;b.started=true;b.progress=progress+offset;b.v.respawnAt(p);b.stuck=0;b.collider.x=b.v.x;b.collider.z=b.v.z;return true;
  }
  return false;
 }
 meetPosition(player){
  const boats=[...this.boats].filter(b=>!b.flood.resetIn).sort((a,b)=>Math.hypot(a.v.x-player.x,a.v.z-player.z)-Math.hypot(b.v.x-player.x,b.v.z-player.z));
  for(const b of boats)for(const side of [-1,1])for(const aft of [16,24,32]){
   const h=b.v.heading,lateral=player.type==='cat'?10:8,x=b.v.x-Math.sin(h)*aft+Math.cos(h)*side*lateral,z=b.v.z-Math.cos(h)*aft-Math.sin(h)*side*lateral;
   if(!this.world(x,z,3,0)&&Array.from({length:5},(_,i)=>i*2).every(d=>!this.world(x+Math.sin(h)*d,z+Math.cos(h)*d,2,0)))return{x,z,heading:h};
  }
  return null;
 }
 update(dt,player,time){
  if(!this.enabled)return;this.player=player;this.toastCooldown=Math.max(0,this.toastCooldown-dt);
  for(const b of this.boats){
   const v=b.v;b.reaction*=Math.exp(-dt*2.2);v.sprayReaction=b.reaction;
   if(!b.flood.resetIn){
    b.progress=b.path.follow(v.x,v.z,b.progress);const target=b.path.at(b.progress+T.lookAhead+v.speed*.5),lane=b.path.cruisingSpeed===T.canalSpeed?3:1;
    const lx=target.x+Math.cos(target.heading)*lane,lz=target.z-Math.sin(target.heading)*lane;
    if(!this.world(lx,lz,3,v.y,b.collider)){target.x=lx;target.z=lz;}
    const error=angle(Math.atan2(target.x-v.x,target.z-v.z)-v.heading);
    const desired=(b.path.cruisingSpeed||T.canalSpeed)*(b.type==='cat'?1.07:1)*(1-Math.min(.65,Math.abs(error)*.4));
    let throttle=clamp((desired-v.speed)*.35+.12,0,.75),steer=clamp(error*2,-1,1);
    const others=[player,...this.boats.filter(o=>o!==b&&!o.flood.resetIn).map(o=>o.v)];
    const crowded=others.some(o=>{const dx=o.x-v.x,dz=o.z-v.z,ahead=dx*Math.sin(v.heading)+dz*Math.cos(v.heading),side=Math.abs(dx*Math.cos(v.heading)-dz*Math.sin(v.heading));return ahead>0&&ahead<T.avoidDistance&&side<4;});
    if(crowded)throttle=v.speed>.7?-.5:0;
    const probe=6+v.speed*.8;
    if(!crowded&&this.obstacle(v.x+Math.sin(v.heading)*probe,v.z+Math.cos(v.heading)*probe,2,v.y,b)){
     throttle=v.speed>2?-.25:.22;
     for(const turn of [Math.sign(error)||1,-(Math.sign(error)||1)])if(!this.obstacle(v.x+Math.sin(v.heading+turn*.65)*probe,v.z+Math.cos(v.heading+turn*.65)*probe,2,v.y,b)){steer=turn;break;}
    }
    throttle*=1-b.reaction*.35;b.controls={throttle,steer,trim:0,freestyle:false};v.update(dt,b.controls,time);
    b.stuck=v.speed<.45&&!crowded?b.stuck+dt:0;
    if(v.wipeout||b.stuck>T.stuckSeconds)this.place(b,b.progress+28);
   }
   const f=b.flood;f.x=v.x;f.z=v.z;f.heading=v.heading;f.deckY=bodyPoint(v,[0,b.type==='cat'?.48:.40,0]).y;
   b.collider.x=v.x;b.collider.z=v.z;b.collider.height=v.y+2.2;b.collider.disabled=f.sinking>.35;
  }
  this.flood.reindex();const before=this.boats.map(b=>b.flood.water);this.flood.update(dt,player,time);
  this.boats.forEach((b,i)=>{
   if(b.flood.water>before[i]+.01){b.reaction=1;b.v.sprayReaction=1;
    if(!this.toastCooldown){this.onEvent({type:'local-soaked',label:`${b.name} copped a spray!`,detail:'Cruise alongside and carve to throw another fan.'});this.toastCooldown=9;}
   }
   if(b.lastReset>0&&!b.flood.resetIn)this.place(b,b.progress+40);
   b.lastReset=b.flood.resetIn;b.collider.disabled=b.flood.sinking>.35;
  });
 }
}
