import{MooringFlood,floodCapacity}from'./mooring-flood.js';
import{bodyPoint}from'../vehicles/propulsion.js';
import{sportfisherZ,SPORTFISHER_STERN,SPORTFISHER_BOW,SPORTFISHER_SHAPE,SPORTFISHER_DECK}from'../vehicles/sportfisher-shape.js';
import{SPORTFISHER_HEIGHT}from'../config.js';
import{CruisePath}from'./local-traffic.js';
import{mapData,edgeDistance}from'./geography.js';
import{waveHeight}from'../config.js';
export const SPORTFISHER_ROUTES={
 canal:[[362.5,-700],[334.2,-468],[332.1,-412.7],[342.2,-331.9],[416.9,-149.1],[485.1,-33.7],[512.3,39.4],[526.2,112],[527.8,181.8],[509.7,294.4],[434.1,469],[382.4,569.3]],
 river:[[-200,-1035],[-60,-990],[90,-925],[175,-880],[90,-920],[-60,-1020],[-200,-1070]],
 offshore:[[760,-1820],[1120,-1820],[1540,-1780],[1640,-1680],[1560,-1730],[1120,-1770],[800,-1780]],
};
// The map's vertical clearances are game estimates, shared with rendered bridges.
export function bridgeObstruction(x,z,top,radius=4){
 for(const bridge of mapData.bridges){
  const walking=['cycleway','footway'].includes(bridge.kind),clearance=bridge.gameDeckTop-(walking?.45:.8);
  if(top+.45<clearance)continue;
  for(let i=1;i<bridge.points.length;i++)if(edgeDistance(x,z,bridge.points[i-1],bridge.points[i])<radius+bridge.w*.5)return bridge.name;
 }
 return null;
}
export const BIG_BOAT_FLOOD={capacityLitres:240,fillDrop:.6,sinkSeconds:6,resetSeconds:24,sinkDepth:13,drainLitresPerSecond:.06};
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class SportfishingTraffic{
 constructor(collision,onEvent=()=>{}){
  this.world=collision;this.enabled=true;
  this.boats=[['Reef Runner','river',90],['Blue Marlin','offshore',250],['Wide Line','offshore',940],['Saltwater','canal',150]].map(([name,route,progress])=>{
   const path=new CruisePath(SPORTFISHER_ROUTES[route],route!=='canal'),p=path.at(progress);
   return{id:`sportfisher-${name.toLowerCase().replaceAll(' ','-')}`,name,route,path,progress,...p,y:waveHeight(p.x,p.z,0),pitch:0,roll:0,speed:0,bridgeHold:0,collider:{name:'Sportfishing cruiser',a:[p.x+Math.sin(p.heading)*(SPORTFISHER_STERN+SPORTFISHER_SHAPE.beam/2),p.z+Math.cos(p.heading)*(SPORTFISHER_STERN+SPORTFISHER_SHAPE.beam/2)],b:[p.x+Math.sin(p.heading)*(SPORTFISHER_BOW-SPORTFISHER_SHAPE.beam/2),p.z+Math.cos(p.heading)*(SPORTFISHER_BOW-SPORTFISHER_SHAPE.beam/2)],width:SPORTFISHER_SHAPE.beam,height:SPORTFISHER_HEIGHT,disabled:true}};
  });
  this.flood=new MooringFlood(this.boats.map(b=>({id:b.id,x:b.x,z:b.z,heading:b.heading,...BIG_BOAT_FLOOD,captureRect:{minX:-1.62,maxX:1.62,minZ:sportfisherZ(-4.8),maxZ:sportfisherZ(-1.95)},sinkLabel:`${b.name} swamped!`,sinkDetail:'Water filled the open rear cockpit. The big boat sinks, then relaunches in 24 seconds.'})),onEvent);
  this.boats.forEach((b,i)=>{b.flood=this.flood.boats[i];b.lastReset=0;});
 }
 meetPosition(player){
  const distance=player.type==='hyper'?40:player.type==='racer'?55:18;
  for(const b of [...this.boats].filter(b=>!b.flood.resetIn).sort((a,b)=>(a.route!=='offshore')-(b.route!=='offshore')))for(const extra of[0,8,16]){
    const ahead=player.type==='hyper'||player.type==='racer',direction=ahead?1:-1,x=b.x+Math.sin(b.heading)*(distance+extra)*direction,z=b.z+Math.cos(b.heading)*(distance+extra)*direction;
    if(!this.world(x,z,4,0,b.collider))return{x,z,heading:b.heading+(ahead?0:Math.PI)};
  }
  return null;
 }
 get colliders(){return this.boats.map(b=>b.collider);}
 setEnabled(enabled){this.enabled=enabled;for(const b of this.boats)b.collider.disabled=!enabled||b.flood.sinking>.2;}
 get status(){return{enabled:this.enabled,boats:this.boats.map(({id,name,x,y,z,heading,speed,flood:f})=>({id,name,x,y,z,heading,speed,water:f.water/floodCapacity(f)*100,rearWater:f.rearWater,sinking:f.sinking,resetIn:f.resetIn,sinks:f.sinks}))};}
 update(dt,player,time){
  if(!this.enabled)return;
  for(const b of this.boats){
   if(b.flood.resetIn>0){b.speed=0;continue;}
   b.progress=b.path.follow(b.x,b.z,b.progress);const target=b.path.at(b.progress+22),error=angle(Math.atan2(target.x-b.x,target.z-b.z)-b.heading);
   b.heading+=Math.max(-.28*dt,Math.min(.28*dt,error));
   const sx=Math.sin(b.heading),cz=Math.cos(b.heading);
   const nearby=[player,...this.boats.filter(o=>o!==b)].some(p=>{const dx=p.x-b.x,dz=p.z-b.z;return dx*sx+dz*cz>-6&&dx*sx+dz*cz<32&&Math.abs(dx*cz-dz*sx)<8;});
   const top=Math.max(b.y,waveHeight(b.x+sx*20,b.z+cz*20,time))+SPORTFISHER_HEIGHT;
   const lowBridge=bridgeObstruction(b.x+sx*20,b.z+cz*20,top,6);
   b.bridgeHold=Math.max(0,b.bridgeHold-dt);
   if(lowBridge&&b.route==='canal'&&!b.bridgeHold){b.progress=b.path.length-b.progress;b.bridgeHold=15;}
   const blocked=lowBridge||this.world(b.x+sx*12,b.z+cz*12,3.5,0,b.collider);
   const desired=nearby||blocked?0:(b.route==='river'?3.5:b.route==='canal'?2.5:6)*(1-Math.min(.7,Math.abs(error)*.45));
   b.speed+=(desired-b.speed)*(1-Math.exp(-dt*(desired<b.speed?2:.4)));
   const nx=b.x+sx*b.speed*dt,nz=b.z+cz*b.speed*dt;
   if(!bridgeObstruction(nx,nz,Math.max(b.y,waveHeight(nx,nz,time))+SPORTFISHER_HEIGHT,7)&&!this.world(nx,nz,5,0,b.collider)){b.x=nx;b.z=nz;}else b.speed=0;
   const bow=sportfisherZ(4),stern=sportfisherZ(-4),front=waveHeight(b.x+sx*bow,b.z+cz*bow,time),rear=waveHeight(b.x+sx*stern,b.z+cz*stern,time),left=waveHeight(b.x-cz*1.5,b.z+sx*1.5,time),right=waveHeight(b.x+cz*1.5,b.z-sx*1.5,time),k=1-Math.exp(-dt*3);
   b.y+=((front+rear+left+right)/4-b.y)*k;b.pitch+=(Math.atan2(front-rear,bow-stern)-b.pitch)*k;b.roll+=(Math.atan2(right-left,3)-b.roll)*k;
   const cockpitZ=(SPORTFISHER_DECK.minZ+SPORTFISHER_DECK.maxZ)/2;Object.assign(b.flood,{x:b.x,z:b.z,heading:b.heading,deckY:bodyPoint(b,[0,1.45,cockpitZ]).y});
   b.collider.a[0]=b.x+sx*(SPORTFISHER_STERN+SPORTFISHER_SHAPE.beam/2);b.collider.a[1]=b.z+cz*(SPORTFISHER_STERN+SPORTFISHER_SHAPE.beam/2);b.collider.b[0]=b.x+sx*(SPORTFISHER_BOW-SPORTFISHER_SHAPE.beam/2);b.collider.b[1]=b.z+cz*(SPORTFISHER_BOW-SPORTFISHER_SHAPE.beam/2);b.collider.height=b.y+SPORTFISHER_HEIGHT+.2;
  }
  this.flood.reindex();
  // Gameplay capture is independent of visible-particle quality and fleet LOD.
  if(player.config)this.flood.update(dt,player,time,!player.wipeout);
  else this.flood.update(dt,{...player,type:'ski',config:{length:3,width:1.2},y:0,heading:0,speed:0,throttle:0},time,false);
  for(const b of this.boats){
    const f=b.flood;
    if(b.lastReset>0&&!f.resetIn){
      for(const ahead of[35,55,85]){const point=b.path.at(b.progress+ahead);if(Math.hypot(point.x-player.x,point.z-player.z)>16&&!this.world(point.x,point.z,6,0,b.collider)){Object.assign(b,point);b.progress+=ahead;break;}}
    }
    b.lastReset=f.resetIn;b.collider.disabled=!this.enabled||f.sinking>.2;
  }
 }
}
