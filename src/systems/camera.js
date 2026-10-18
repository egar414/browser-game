import * as THREE from 'three';
import { collision } from './environment.js';
export class ChaseCamera {
  constructor(camera) { this.camera=camera;this.look=new THREE.Vector3();this.initialized=false; }
  reset() { this.initialized=false; }
  update(dt,v,input,mode=0,menu=false) {
    if(!input.dragging)input.orbit*=Math.exp(-dt*.9);
    const heading=v.heading+input.orbit+(menu?Math.PI+.65:0);
    const big=v.type==='cruiser';
    const distance=big?(menu?19:mode?12:23):menu?8.5:mode?5.3:13.5+Math.min(2.5,v.speed*.10);
    const height=big?(menu?9:mode?8:12):menu?4:mode?2.15:5.8+v.speed*.035;
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
