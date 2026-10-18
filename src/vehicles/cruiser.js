import{waveHeight,WORLD,RIDE_MODES}from'../config.js';
import{bridgeObstruction}from'../systems/sportfishing-traffic.js';
export const CRUISER_HANDLING={forwardSpeed:15.5,reverseSpeed:2.6,powerResponse:.27,brakeResponse:.65,coastResponse:.14,turnRate:.37,waterResponse:3,deckWalkSpeed:1.6};
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export function updateCruiser(v,dt,input,time){
 v.previous=v.snapshot();v.throttle=damp(v.throttle,input.throttle,3,dt);v.steer=damp(v.steer,input.steer,3,dt);
 const T=CRUISER_HANDLING,oldSpeed=v.vx*Math.sin(v.heading)+v.vz*Math.cos(v.heading),braking=input.throttle<0&&oldSpeed>1;
 const target=v.deckMode||braking?0:v.throttle*(v.throttle>=0?T.forwardSpeed*(RIDE_MODES[v.rideMode]?.power||1):T.reverseSpeed),k=v.deckMode?1.8:braking?T.brakeResponse:Math.abs(input.throttle)>.05?T.powerResponse:T.coastResponse;
 let forward=damp(oldSpeed,target,k,dt);v.yawRate=damp(v.yawRate,v.steer*T.turnRate*Math.min(1,Math.abs(forward)/4)*Math.sign(forward||1),2.5,dt);v.heading+=v.yawRate*dt;
 const sx=Math.sin(v.heading),cz=Math.cos(v.heading),nx=v.x+sx*forward*dt,nz=v.z+cz*forward*dt;
 let hit=null;const top=Math.max(v.y,waveHeight(nx,nz,time))+6.5;
 for(const d of [-4,0,4])hit ||= bridgeObstruction(nx+sx*d,nz+cz*d,top,2.1)||v.collision(nx+sx*d,nz+cz*d,2.05,0);
 v.bumpCooldown=Math.max(0,(v.bumpCooldown||0)-dt);
 if(hit){forward=0;v.yawRate*=.8;if(!v.bumpCooldown&&Math.abs(oldSpeed)>.6){v.onEvent({type:'bump',label:String(hit).includes('Bridge')?'Bridge too low for this boat':`Blocked · ${hit}`});v.bumpCooldown=3;}}
 else{v.x=nx;v.z=nz;}
 v.vx=sx*forward;v.vz=cz*forward;v.speed=Math.abs(forward);v.slip=0;v.surgeAcceleration=(forward-oldSpeed)/dt;v.lateralAcceleration=v.yawRate*forward;
 const front=waveHeight(v.x+sx*4,v.z+cz*4,time),rear=waveHeight(v.x-sx*4,v.z-cz*4,time),left=waveHeight(v.x-cz*1.5,v.z+sx*1.5,time),right=waveHeight(v.x+cz*1.5,v.z-sx*1.5,time);
 v.y=damp(v.y,(front+rear+left+right)/4+.1,T.waterResponse,dt);v.pitch=damp(v.pitch,Math.atan2(front-rear,8)+Math.min(.06,v.speed*.003),3,dt);v.roll=damp(v.roll,Math.atan2(right-left,3)-v.yawRate*v.speed*.012,3,dt);
 v.airborne=false;v.planing=Math.min(1,v.speed/12);v.wettedFraction=1-v.planing*.2;v.riderAft=0;
 v.drive={...v.propulsion.empty(),rpm:700+Math.abs(v.throttle)*3300,rpmFraction:.15+Math.abs(v.throttle)*.75,wetness:1,flow:Math.abs(v.throttle)*2.5,neutral:Math.abs(v.throttle)<.05,braking,reverse:forward<0?1:0,exitSpeed:8,trimAngle:0,steeringAngle:v.steer*.3};
 v.boundary=v.x<WORLD.minX+35||v.x>WORLD.maxX-35||v.z<WORLD.minZ+35||v.z>WORLD.maxZ-35;
 if(v.x<WORLD.minX||v.x>WORLD.maxX||v.z<WORLD.minZ||v.z>WORLD.maxZ){v.recover(true);v.onEvent({type:'boundary',label:'Back inside the charts'});}
 if(!hit&&!v.boundary&&v.speed<4&&!v.collision(v.x,v.z,7,0))v.safe={x:v.x,z:v.z,heading:v.heading};
}
export class DeckWalk{
 constructor(){this.reset();}
 reset(){this.active=false;this.x=.8;this.z=-3.25;this.heading=Math.PI;this.moving=0;}
 toggle(v){if(this.active){this.reset();return true;}if(v.speed>1.5)return false;this.active=true;return true;}
 update(dt,input,fishing){const dx=fishing?0:-input.steer,dz=fishing?0:input.throttle;this.moving=Math.min(1,Math.hypot(dx,dz));if(this.moving){this.heading=Math.atan2(dx,dz);const speed=CRUISER_HANDLING.deckWalkSpeed/Math.max(1,Math.hypot(dx,dz));this.x=Math.max(-1.38,Math.min(1.38,this.x+dx*speed*dt));this.z=Math.max(-4.35,Math.min(-2.05,this.z+dz*speed*dt));}}
}
