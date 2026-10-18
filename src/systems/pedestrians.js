import{hitsPerson}from'./spray-capture.js';
import{mapData,edgeDistance}from'./geography.js';
import{MooringFlood}from'./mooring-flood.js';
import{SPAWN}from'../config.js';
// Walk only on existing solid jetties; no invented paths through buildings/water.
export function waterfrontRoutes(){
 return mapData.piers.filter(p=>!p.area).flatMap(p=>p.points.slice(1).map((b,i)=>({a:p.points[i],b}))).filter(({a,b})=>Math.hypot(b[0]-a[0],b[1]-a[1])>12).sort((a,b)=>Math.hypot(a.a[0]-SPAWN.x,a.a[1]-SPAWN.z)-Math.hypot(b.a[0]-SPAWN.x,b.a[1]-SPAWN.z)).slice(0,16);
}
export class Pedestrians{
 constructor(onEvent=()=>{}){
  this.onEvent=onEvent;this.people=waterfrontRoutes().map((path,i)=>{const len=Math.hypot(path.b[0]-path.a[0],path.b[1]-path.a[1]),t=.25+(i%3)*.18;return{id:`walker-${i}`,path,len,progress:len*t,direction:1,x:path.a[0],z:path.a[1],y:1.21,heading:Math.atan2(path.b[0]-path.a[0],path.b[1]-path.a[1]),fall:0,cooldown:0,soak:0,moving:true};});
  this.flood=new MooringFlood(this.people.map(p=>({id:p.id,x:p.x,z:p.z,width:1.6,length:1.6,deckY:-100,heading:p.heading})));this.flood.onPacket=(before,packet)=>{for(const [i,p]of this.people.entries()){if(p.cooldown||!hitsPerson(before,packet,p))continue;this.flood.boats[i].water+=packet.litres;return true;}return false;};this.update(0,null,0);
 }
 get status(){return this.people.map(({id,x,y,z,heading,fall,soak})=>({id,x,y,z,heading,fall,soak}));}
 update(dt,player,time){
  for(const [i,p]of this.people.entries()){
   p.fall=Math.max(0,p.fall-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.moving=!p.fall;
   if(p.moving){p.progress+=p.direction*dt*.65;if(p.progress>p.len-2.5){p.progress=p.len-2.5;p.direction=-1;}if(p.progress<2.5){p.progress=2.5;p.direction=1;}}
   const t=p.progress/p.len;p.x=p.path.a[0]+(p.path.b[0]-p.path.a[0])*t;p.z=p.path.a[1]+(p.path.b[1]-p.path.a[1])*t;p.heading=Math.atan2((p.path.b[0]-p.path.a[0])*p.direction,(p.path.b[1]-p.path.a[1])*p.direction);
   const b=this.flood.boats[i];Object.assign(b,{x:p.x,z:p.z,heading:p.heading,deckY:-100,resetIn:0,sinking:0});b.water=Math.max(0,b.water-dt*6);
  }
  this.flood.reindex();if(player)this.flood.update(dt,player,time,!player.wipeout);
  for(const [i,p]of this.people.entries()){
   const b=this.flood.boats[i];p.soak=b.water;
   if(b.water>5&&!p.cooldown){p.fall=5;p.cooldown=14;b.water=0;this.onEvent({label:'Splash! Lost their footing',detail:'They’ll get back up in a moment. No points — just a soggy afternoon.'});}
   if(p.cooldown)b.water=0;b.resetIn=0;b.sinking=0;
  }
 }
 approach(collision){
  for(const p of [...this.people].sort((a,b)=>(b.len>35)-(a.len>35))){const h=p.heading;for(const side of [-1,1])for(const offset of [5,7,9]){const x=p.x+Math.cos(h)*offset*side-Math.sin(h)*26,z=p.z-Math.sin(h)*offset*side-Math.cos(h)*26;if(!collision(x,z,3,0)&&!collision(x+Math.sin(h)*10,z+Math.cos(h)*10,3,0))return{x,z,heading:h,targetId:p.id};}}
  return null;
 }
}
