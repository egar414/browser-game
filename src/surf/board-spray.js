import * as THREE from 'three';
import {waveHeight} from '../config.js';
import {clamp} from './break.js';
export function boardSpraySources(s){
 if(!s.active||s.mode!=='ride'||s.airborne||s.sprayPower<.05)return [];
 const side=(s.steer||s.roll||.1)>0?-1:1,dx=Math.cos(s.heading)*side,dz=-Math.sin(s.heading)*side;
 return [{kind:side<0?'left':'right',ox:dx*.24,oy:.04,oz:dz*.24,vx:s.vx*.4+dx*(1.5+s.sprayPower*3),vy:1+s.sprayPower*1.4,vz:s.vz*.4+dz*(1.5+s.sprayPower*3),power:Math.min(1.4,s.sprayPower)}];
}
export class BoardSpray{
 constructor(scene,count=280){
  this.count=count;this.cursor=0;this.particles=Array.from({length:count},()=>({life:0}));this.positions=new Float32Array(count*3);this.alpha=new Float32Array(count);this.size=new Float32Array(count);this.geometry=new THREE.BufferGeometry();
  this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.geometry.setAttribute('opacity',new THREE.BufferAttribute(this.alpha,1));this.geometry.setAttribute('diameter',new THREE.BufferAttribute(this.size,1));
  this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:450}},vertexShader:'attribute float opacity;attribute float diameter;uniform float uScale;varying float a;void main(){a=opacity;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(diameter*uScale/max(1.,-p.z),1.,16.);}',fragmentShader:`varying float a;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.87,.98,.97,a*(1.-smoothstep(.1,.5,d)));
#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  this.points=new THREE.Points(this.geometry,this.material);this.points.frustumCulled=false;scene.add(this.points);this.accumulator=0;this.lastLanding=0;this.wasAir=false;
 }
 emit(x,y,z,vx,vy,vz,life=.9){Object.assign(this.particles[this.cursor++%this.count],{x,y,z,vx,vy,vz,life,max:life});}
 update(dt,s,time,camera){
  const active=!!s.active;this.points.visible=active;if(!active){this.clear();return;}if(dt<=0)return;
  const sources=Array.isArray(s.spray)?s.spray:boardSpraySources(s),source=sources[0];this.accumulator+=dt*(source?source.power*95:0);
  if(!source)this.accumulator=0;for(let i=0,n=Math.min(32,Math.floor(this.accumulator));i<n;i++){this.accumulator--;const spread=()=>Math.random()-.5;this.emit(s.x+source.ox,s.y+source.oy,s.z+source.oz,source.vx+spread()*1.6,source.vy+spread(),source.vz+spread()*1.6,.6+Math.random()*.6);}
  if((s.landingId&&s.landingId!==this.lastLanding)||(this.wasAir&&!s.airborne&&s.mode==='ride')){this.lastLanding=s.landingId;for(let i=0;i<24;i++){const a=i/24*Math.PI*2,power=Math.min(3,1+(s.landingImpact||2)*.3);this.emit(s.x,s.y+.05,s.z,Math.sin(a)*power+(s.vx||0)*.2,1+Math.random()*1.5,Math.cos(a)*power+(s.vz||0)*.2,.65);}}
  this.wasAir=!!s.airborne;
  for(let i=0;i<this.count;i++){const p=this.particles[i];if(p.life>0){p.life-=dt;p.vy-=9.81*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const floor=waveHeight(p.x,p.z,time);if(p.y<floor){p.y=floor+.015;p.vy=0;p.vx*=.75;p.vz*=.75;p.life=Math.min(p.life,.18);}this.positions.set([p.x,p.y,p.z],i*3);}this.alpha[i]=p.life>0?clamp(p.life/p.max)*.75:0;this.size[i]=.025+(i%7)*.008;}
  for(const a of Object.values(this.geometry.attributes))a.needsUpdate=true;this.material.uniforms.uScale.value=innerHeight/(2*Math.tan((camera?.fov||74)*Math.PI/360));
 }
 clear(){for(const p of this.particles)p.life=0;this.alpha.fill(0);this.geometry.attributes.opacity.needsUpdate=true;this.accumulator=0;this.wasAir=false;}
 dispose(){this.points.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
