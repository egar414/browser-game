import * as THREE from 'three';
import { collision } from './environment.js';
export class ChaseCamera {
  constructor(camera) { this.camera=camera;this.look=new THREE.Vector3();this.initialized=false; }
  reset() { this.initialized=false; }
  update(dt,v,input,mode=0,menu=false,eye=null,aim=null) {
    if(!input.dragging)input.orbit*=Math.exp(-dt*.9);
    if(mode===2&&!menu){
      if(!input.dragging)input.lookPitch=(input.lookPitch||0)*Math.exp(-dt*.65);
      const heading=(aim?Math.atan2(aim.x-v.x,aim.z-v.z):v.heading)+input.orbit,pitch=input.lookPitch||-.03;
      const target=eye?eye.clone():new THREE.Vector3(v.x,v.y+1.5,v.z),look=aim?new THREE.Vector3(aim.x,aim.y,aim.z):target.clone().add(new THREE.Vector3(Math.sin(heading)*25,pitch*25,Math.cos(heading)*25));
      if(aim){look.x+=Math.sin(input.orbit)*8;look.y+=pitch*8;}
      if(!this.initialized){this.camera.position.copy(target);this.look.copy(look);this.initialized=true;}
      this.camera.position.lerp(target,1-Math.exp(-dt*14));this.look.lerp(look,1-Math.exp(-dt*10));this.camera.lookAt(this.look);this.camera.fov=76;this.camera.updateProjectionMatrix();return;
    }
    const deck=v.type==='character';
    // The cockpit camera stays aft of the cabin instead of following the
    // character's backward-facing heading into the superstructure.
    const orbit=deck?THREE.MathUtils.clamp(input.orbit,-1.2,1.2):input.orbit;
    const heading=(deck?(v.hullHeading??v.heading):v.heading)+orbit+(menu?Math.PI+.65:0);
    const big=v.type==='cruiser';
    const distance=big?(menu?21:mode?13:25):menu?8.5:mode?5.3:13.5+Math.min(2.5,v.speed*.10);
    const height=deck?3.6:big?(menu?9:mode?8:12):menu?4:mode?2.15:5.8+v.speed*.035;
    const ahead=menu?0:mode?v.speed*.14:3+v.speed*.20;
    const look=new THREE.Vector3(v.x+Math.sin(v.heading)*ahead,v.y+(big?2.2:menu||mode?.85:.25),v.z+Math.cos(v.heading)*ahead);
    const target=new THREE.Vector3(v.x-Math.sin(heading)*distance,v.y+height,v.z-Math.cos(heading)*distance);
    // Raise over shorelines and docks along the camera ray, avoiding terrain clipping.
    for(let t=.2;t<=1;t+=.2) if(collision(v.x+(target.x-v.x)*t,v.z+(target.z-v.z)*t,.5,target.y)) {target.y=Math.max(target.y,12);break;}
    if(!this.initialized){this.camera.position.copy(target);this.look.copy(look);this.initialized=true;}
    this.camera.position.lerp(target,1-Math.exp(-dt*4.5));this.look.lerp(look,1-Math.exp(-dt*6));this.camera.lookAt(this.look);
    this.camera.fov=menu?48:mode?58:61+Math.min(5,v.speed*.18);this.camera.updateProjectionMatrix();
  }
}
