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
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class SportfishingTraffic{
 constructor(collision){
  this.world=collision;this.enabled=true;
  this.boats=[['Reef Runner','river',90],['Blue Marlin','offshore',250],['Wide Line','offshore',940],['Saltwater','canal',150]].map(([name,route,progress])=>{
   const path=new CruisePath(SPORTFISHER_ROUTES[route],route!=='canal'),p=path.at(progress);
   return{name,route,path,progress,...p,y:waveHeight(p.x,p.z,0),pitch:0,roll:0,speed:0,bridgeHold:0,collider:{name:'Sportfishing cruiser',a:[p.x,p.z-4],b:[p.x,p.z+4],width:3.7,height:7,disabled:true}};
  });
 }
 get colliders(){return this.boats.map(b=>b.collider);}
 setEnabled(enabled){this.enabled=enabled;for(const b of this.boats)b.collider.disabled=!enabled;}
 get status(){return{enabled:this.enabled,boats:this.boats.map(({name,x,y,z,heading,speed})=>({name,x,y,z,heading,speed}))};}
 update(dt,player,time){
  if(!this.enabled)return;
  for(const b of this.boats){
   b.progress=b.path.follow(b.x,b.z,b.progress);const target=b.path.at(b.progress+22),error=angle(Math.atan2(target.x-b.x,target.z-b.z)-b.heading);
   b.heading+=Math.max(-.28*dt,Math.min(.28*dt,error));
   const sx=Math.sin(b.heading),cz=Math.cos(b.heading);
   const nearby=[player,...this.boats.filter(o=>o!==b)].some(p=>{const dx=p.x-b.x,dz=p.z-b.z;return dx*sx+dz*cz>-6&&dx*sx+dz*cz<32&&Math.abs(dx*cz-dz*sx)<8;});
   const top=Math.max(b.y,waveHeight(b.x+sx*20,b.z+cz*20,time))+6.5;
   const lowBridge=bridgeObstruction(b.x+sx*20,b.z+cz*20,top,6);
   b.bridgeHold=Math.max(0,b.bridgeHold-dt);
   if(lowBridge&&b.route==='canal'&&!b.bridgeHold){b.progress=b.path.length-b.progress;b.bridgeHold=15;}
   const blocked=lowBridge||this.world(b.x+sx*12,b.z+cz*12,3.5,0,b.collider);
   const desired=nearby||blocked?0:(b.route==='river'?3.5:b.route==='canal'?2.5:6)*(1-Math.min(.7,Math.abs(error)*.45));
   b.speed+=(desired-b.speed)*(1-Math.exp(-dt*(desired<b.speed?2:.4)));
   const nx=b.x+sx*b.speed*dt,nz=b.z+cz*b.speed*dt;
   if(!bridgeObstruction(nx,nz,Math.max(b.y,waveHeight(nx,nz,time))+6.5,7)&&!this.world(nx,nz,5,0,b.collider)){b.x=nx;b.z=nz;}else b.speed=0;
   const front=waveHeight(b.x+sx*4,b.z+cz*4,time),rear=waveHeight(b.x-sx*4,b.z-cz*4,time),left=waveHeight(b.x-cz*1.5,b.z+sx*1.5,time),right=waveHeight(b.x+cz*1.5,b.z-sx*1.5,time),k=1-Math.exp(-dt*3);
   b.y+=((front+rear+left+right)/4-b.y)*k;b.pitch+=(Math.atan2(front-rear,8)-b.pitch)*k;b.roll+=(Math.atan2(right-left,3)-b.roll)*k;
   b.collider.a[0]=b.x-sx*3.8;b.collider.a[1]=b.z-cz*3.8;b.collider.b[0]=b.x+sx*3.8;b.collider.b[1]=b.z+cz*3.8;b.collider.height=b.y+7;
  }
 }
}
