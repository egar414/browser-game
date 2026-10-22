import {isTinny} from '../config.js';
import * as THREE from 'three';
import { collision } from './environment.js';
import {bodyPoint} from '../vehicles/propulsion.js';
import {isJet} from '../config.js';
export const JET_RIDING_VIEW={eye:[0,1.48,-.48],lookDown:-.12,fov:80,verticalResponse:16,lookResponse:18};
// A fixed riding eye avoids animated torso lean pushing the camera past the bars.
export function jetRidingEye(v){const p=bodyPoint(v,JET_RIDING_VIEW.eye);return new THREE.Vector3(p.x,p.y,p.z);}
export class ChaseCamera {
  constructor(camera) { this.camera=camera;this.look=new THREE.Vector3();this.initialized=false; }
  reset() { this.initialized=false; }
  update(dt,v,input,mode=0,menu=false,eye=null,aim=null) {
    const extraWide=mode===3&&!menu;
    const fast=v.type==='racer'||v.type==='hyper',apex=v.type==='hyper';
    const rearView=!menu&&!!input.held?.('KeyU');
    if(rearView!==!!this.rearView){this.initialized=false;this.rearView=rearView;}
    if(!input.dragging)input.orbit*=Math.exp(-dt*.9);
    if(mode===2&&!menu){
      if(isJet(v.type)&&!aim){
        if(!input.dragging)input.lookPitch=(input.lookPitch||0)*Math.exp(-dt*.65);
        const heading=v.heading+input.orbit+(rearView?Math.PI:0),pitch=(input.lookPitch||0)+(rearView?-.04:JET_RIDING_VIEW.lookDown);
        const target=eye?eye.clone():jetRidingEye(v),direction=new THREE.Vector3(Math.sin(heading),pitch,Math.cos(heading)).normalize();
        if(!this.initialized){this.camera.position.copy(target);this.ridingDirection=direction.clone();this.initialized=true;}
        // Lock horizontal position to the interpolated craft so acceleration
        // cannot drag the eye back through the rider; smooth vertical chop.
        this.camera.position.x=target.x;this.camera.position.z=target.z;
        this.camera.position.y=THREE.MathUtils.lerp(this.camera.position.y,target.y,1-Math.exp(-dt*JET_RIDING_VIEW.verticalResponse));
        this.ridingDirection??=direction.clone();this.ridingDirection.lerp(direction,1-Math.exp(-dt*JET_RIDING_VIEW.lookResponse)).normalize();
        this.look.copy(this.camera.position).addScaledVector(this.ridingDirection,25);this.camera.lookAt(this.look);this.camera.fov=JET_RIDING_VIEW.fov;this.camera.updateProjectionMatrix();return;
      }
      if(rearView)aim=null;
      if(!input.dragging)input.lookPitch=(input.lookPitch||0)*Math.exp(-dt*.65);
      const heading=(aim?Math.atan2(aim.x-v.x,aim.z-v.z):v.heading)+input.orbit+(rearView?Math.PI:0),pitch=input.lookPitch||-.03;
      const target=eye?eye.clone():new THREE.Vector3(v.x,v.y+1.5,v.z),look=aim?new THREE.Vector3(aim.x,aim.y,aim.z):target.clone().add(new THREE.Vector3(Math.sin(heading)*25,pitch*25,Math.cos(heading)*25));
      if(aim){look.x+=Math.sin(input.orbit)*8;look.y+=pitch*8;}
      if(fast&&this.initialized){target.x+=(v.vx||0)*Math.max(0,1/14-dt*.5);target.z+=(v.vz||0)*Math.max(0,1/14-dt*.5);if(!aim){look.x+=(v.vx||0)*Math.max(0,1/10-dt*.5);look.z+=(v.vz||0)*Math.max(0,1/10-dt*.5);}}
      if(!this.initialized){this.camera.position.copy(target);this.look.copy(look);this.initialized=true;}
      this.camera.position.lerp(target,1-Math.exp(-dt*14));this.look.lerp(look,1-Math.exp(-dt*10));this.camera.lookAt(this.look);this.camera.fov=76;this.camera.updateProjectionMatrix();return;
    }
    const deck=v.type==='character',shaft=isTinny(v.type)&&!menu&&(v.shaftLoad||0)>.55&&v.pitch>.7;
    // The cockpit camera stays aft of the cabin instead of following the
    // character's backward-facing heading into the superstructure.
    const orbit=deck?THREE.MathUtils.clamp(input.orbit,-1.2,1.2):input.orbit;
    const heading=(deck?(v.hullHeading??v.heading):v.heading)+orbit+(shaft?.35:0)+(menu?Math.PI+.65:0)+(rearView?Math.PI:0);
    const dive=!!v.config?.diveBoat,racer=v.type==='racer',big=v.type==='cruiser'||v.config?.diveBoat||racer;
    const distance=extraWide?(big?34:24):rearView?(big?14:apex?8:6):shaft?(mode?6.5:8.5):dive?(menu?15:mode?9:15):big?(menu?21:mode?13:25):menu?8.5:mode?5.3:13.5+Math.min(2.5,v.speed*.10);
    const height=extraWide?(big?15:11):rearView?(big?10:apex?5:3):shaft?(mode?2.8:3.8):deck?3.6:dive?(menu?6:mode?3.5:6.5):big?(racer?(menu?6:mode?4:8):(menu?9:mode?8:12)):menu?4:apex?(mode?4:8):mode?2.15:5.8+v.speed*.035;
    const ahead=rearView?-8:fast?Math.min(apex?8:12,v.speed*.12):shaft?.6:menu?0:mode?v.speed*.14:3+v.speed*.20;
    const look=new THREE.Vector3(v.x+Math.sin(v.heading)*ahead,v.y+(big?(racer?.65:dive?1.0:2.2):menu||mode?.85:.25),v.z+Math.cos(v.heading)*ahead);
    const target=new THREE.Vector3(v.x-Math.sin(heading)*distance,v.y+height,v.z-Math.cos(heading)*distance);
    // Extra wide sits beside the rear plume, with room to read turns and wakes.
    if(extraWide&&!rearView){target.x+=Math.cos(heading)*9;target.z-=Math.sin(heading)*9;}
    // A three-quarter chase stays beside the two racing prop rooster tails.
    if(fast&&!menu&&!rearView&&!extraWide){const offset=apex?(mode?6:9):(mode?6:10);target.x+=Math.cos(heading)*offset;target.z-=Math.sin(heading)*offset;}
    // Feed forward racing velocity to cancel the smoothing lag at 500 km/h.
    // Without this the chase drops tens of metres into the trailing spray,
    // and a held rear view can drift behind the craft it should lead.
    if(fast&&!menu&&this.initialized){
      const positionLead=Math.max(0,1/4.5-dt*.5),lookLead=Math.max(0,1/6-dt*.5);
      target.x+=(v.vx||0)*positionLead;target.z+=(v.vz||0)*positionLead;
      look.x+=(v.vx||0)*lookLead;look.z+=(v.vz||0)*lookLead;
    }
    // Raise over shorelines and docks along the camera ray, avoiding terrain clipping.
    for(let t=.2;t<=1;t+=.2) if(collision(v.x+(target.x-v.x)*t,v.z+(target.z-v.z)*t,.5,target.y)) {target.y=Math.max(target.y,12);break;}
    if(!this.initialized){this.camera.position.copy(target);this.look.copy(look);this.initialized=true;}
    this.camera.position.lerp(target,1-Math.exp(-dt*4.5));this.look.lerp(look,1-Math.exp(-dt*6));this.camera.lookAt(this.look);
    this.camera.fov=menu?48:extraWide?84:mode?58:72+Math.min(6,v.speed*.18);this.camera.updateProjectionMatrix();
  }
}
