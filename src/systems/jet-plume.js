import * as THREE from 'three';
import { waveHeight } from '../config.js';
import { JET_PLUME, SPRAY_VISUAL_SCALE, clamp } from './spray-model.js';
// A packet remains in world space after leaving the nozzle. Its water follows
// a ballistic trajectory with drag, including the falling half of the plume.
export function plumeTrajectory(p,age){
  const drag=p.drag,decay=Math.exp(-drag*age),travel=(1-decay)/drag;
  return {x:p.x+p.vx*travel,y:p.y+(p.vy+9.81/drag)*travel-9.81*age/drag,z:p.z+p.vz*travel,vx:p.vx*decay,vy:(p.vy+9.81/drag)*decay-9.81/drag,vz:p.vz*decay};
}
export class JetPlume {
  constructor(scene,texture,capacity=2400,density=1){
    this.density=density;
    this.history=[];this.packets=Array.from({length:capacity},()=>({active:false}));this.next=0;this.accumulator=0;this.impacts=[];this.falling=0;
    const plane=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();g.index=plane.index;g.attributes.position=plane.attributes.position;g.attributes.uv=plane.attributes.uv;
    for(const [name,size]of [['aCenter',3],['aSize',2],['aAlpha',1],['aSeed',1],['aVelocity',3]])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount=0;this.geometry=g;
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uNoise:{value:texture}},
      vertexShader:`attribute vec3 aCenter;attribute vec2 aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 aVelocity;varying float vAlpha;varying float vSeed;varying float vDistance;varying vec2 vUv;
      void main(){vAlpha=aAlpha;vSeed=aSeed;vUv=uv;vec4 p=modelViewMatrix*vec4(aCenter,1.);vDistance=length(p.xyz);vec2 motion=(modelViewMatrix*vec4(aVelocity,0.)).xy;float a=aSeed<${JET_PLUME.fineFraction}?aSeed*31.4:atan(motion.y,motion.x)-1.570796;mat2 r=mat2(cos(a),-sin(a),sin(a),cos(a));p.xy+=r*(position.xy*aSize);gl_Position=projectionMatrix*p;}`,
      fragmentShader:`uniform sampler2D uNoise;varying float vAlpha;varying float vSeed;varying float vDistance;varying vec2 vUv;
      void main(){vec2 q=(vUv-.5)*2.;float radial=length(q);if(vAlpha<.004||vDistance<.9||radial>.94)discard;
      float n=texture2D(uNoise,vUv*1.7+vSeed*8.).r;float detail=texture2D(uNoise,vUv*4.3-vSeed*3.).r;
      float edge=1.-smoothstep(.43+n*.18,.94,radial);float density=vSeed<${JET_PLUME.fineFraction}?(.12+n*.58+detail*.3):(.66+n*.24+detail*.10);float alpha=min(.96,vAlpha*edge*density)*smoothstep(.9,3.2,vDistance);
      if(alpha<.004)discard;
      float grain=texture2D(uNoise,vUv*9.7+vSeed*19.).r;
      float light=smoothstep(.18,.8,n*.36+detail*.34+grain*.3);
      vec3 colour=mix(vec3(.50,.67,.69),vec3(1.08,1.08,1.02),light)*(.84+.16*(1.-radial));
      gl_FragColor=vec4(colour,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    this.mesh=new THREE.Mesh(g,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=3;scene.add(this.mesh);this.mesh.visible=false;
  }
  clear(){this.history.length=0;this.packets.forEach(p=>p.active=false);this.impacts.length=0;this.accumulator=0;this.falling=0;this.mesh.visible=false;this.geometry.instanceCount=0;}
  update(dt,source,time){
    this.impacts.length=0;this.falling=0;
    const previous=this.history[0];
    if(dt>0&&source){
      const rate=Math.min(JET_PLUME.baseRate+source.power*JET_PLUME.poweredRate,this.packets.length/(JET_PLUME.lifetime+.15)*.9)*this.density;
      this.accumulator+=dt*rate;const count=Math.min(Math.ceil(rate*.12),Math.floor(this.accumulator));this.accumulator-=count;
      for(let i=0;i<count;i++){
        const fraction=(i+.5)/count,age=dt*(1-fraction),a=previous?.source||source;
        const mix=(x,y)=>x+(y-x)*fraction,p=this.packets[this.next++%this.packets.length],seed=Math.random(),fine=seed<JET_PLUME.fineFraction,loaded=source.loaded||0;
        Object.assign(p,{active:true,birth:time-age,x:mix(a.origin.x,source.origin.x)+(Math.random()-.5)*.1,y:mix(a.origin.y,source.origin.y),z:mix(a.origin.z,source.origin.z)+(Math.random()-.5)*.1,
          vx:mix(a.velocity.x,source.velocity.x)+(Math.random()-.5)*(1.8+loaded*2),vy:mix(a.velocity.y,source.velocity.y)*(.9+Math.random()*.2),vz:mix(a.velocity.z,source.velocity.z)+(Math.random()-.5)*(1.8+loaded*2),
          drag:fine?.8:JET_PLUME.drag,seed,fine,power:source.power,size:.17+Math.random()*.12,loaded});
      }
    }
    if(dt>0){this.history.unshift({time,source});if(this.history.length>2)this.history.pop();}
    let n=0;const {aCenter,aSize,aAlpha,aSeed,aVelocity}=this.geometry.attributes;
    for(const p of this.packets){
      if(!p.active)continue;const age=time-p.birth,q=plumeTrajectory(p,age),water=waveHeight(q.x,q.z,time);
      if(age>JET_PLUME.lifetime||(q.vy<0&&q.y<=water+.025)){
        if(q.vy<0&&age>0.15&&!p.fine)this.impacts.push({x:q.x,z:q.z,time,strength:.1+p.power*.13});p.active=false;continue;
      }
      if(q.vy<0)this.falling++;
      const size=SPRAY_VISUAL_SCALE*Math.min(p.fine?JET_PLUME.mistRadius:JET_PLUME.coreRadius,p.size+age*(p.fine?1.2:JET_PLUME.coreGrowth)*(1+p.loaded*.3)),fade=clamp(age/.025)*clamp((JET_PLUME.lifetime-age)/.3);
      aCenter.setXYZ(n,q.x,q.y,q.z);aSize.setXY(n,p.seed>JET_PLUME.streakThreshold?.028+age*.02:size*(p.fine?2.8:2.05),p.seed>JET_PLUME.streakThreshold?.16+Math.abs(q.vy)*.03:size*(p.fine?2.3:2.65));
      aAlpha.setX(n,fade*p.power*(p.seed>JET_PLUME.streakThreshold?.9:p.fine?JET_PLUME.mistOpacity:JET_PLUME.coreOpacity)*clamp((q.y-water+.14)/.18));aSeed.setX(n,p.seed);aVelocity.setXYZ(n,q.vx,q.vy,q.vz);n++;
    }
    this.geometry.instanceCount=n;this.mesh.visible=n>0;
    for(const name of ['aCenter','aSize','aAlpha','aSeed','aVelocity'])this.geometry.attributes[name].needsUpdate=true;
  }
  dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
