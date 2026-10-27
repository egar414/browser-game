import * as THREE from 'three';
import { waveHeight } from '../config.js';
import { JET_PLUME, SPRAY_VISUAL_SCALE, clamp } from './spray-model.js';
// A packet remains in world space after leaving the nozzle. Its water follows
// a ballistic trajectory with drag, including the falling half of the plume.
export function plumeTrajectory(p,age,out={}){
  const drag=p.drag,decay=Math.exp(-drag*age),travel=(1-decay)/drag;
  out.x=p.x+p.vx*travel;out.y=p.y+(p.vy+9.81/drag)*travel-9.81*age/drag;out.z=p.z+p.vz*travel;out.vx=p.vx*decay;out.vy=(p.vy+9.81/drag)*decay-9.81/drag;out.vz=p.vz*decay;return out;
}
export class JetPlume {
  constructor(scene,texture,capacity=2400,density=1){
    this.density=density;this.trajectory={};
    this.history=[];this.packets=Array.from({length:capacity},()=>({active:false}));this.next=0;this.accumulator=0;this.impacts=[];this.falling=0;
    const plane=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();g.index=plane.index;g.attributes.position=plane.attributes.position;g.attributes.uv=plane.attributes.uv;
    for(const [name,size]of [['aCenter',3],['aSize',2],['aAlpha',1],['aSeed',1],['aVelocity',3]])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount=0;this.geometry=g;
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uNoise:{value:texture}},
      vertexShader:`attribute vec3 aCenter;attribute vec2 aSize;attribute float aAlpha;attribute float aSeed;attribute vec3 aVelocity;varying float vAlpha;varying float vSeed;varying float vDistance;varying vec2 vUv;
      void main(){vAlpha=aAlpha;vSeed=aSeed;vUv=uv;vec4 p=modelViewMatrix*vec4(aCenter,1.);vDistance=length(p.xyz);vec2 motion=(modelViewMatrix*vec4(aVelocity,0.)).xy;float a=aSeed<${JET_PLUME.fineFraction}?aSeed*31.4:atan(motion.y,motion.x)-1.570796;mat2 r=mat2(cos(a),-sin(a),sin(a),cos(a));
      // Cap individual projected packets, especially when looking back through
      // the plume. Hundreds of metre-wide quads must not each cover the canvas.
      float nearFade=smoothstep(.9,3.2,vDistance);
      float coverage=min(1.,max(.0,-p.z)*.20/max(aSize.x,aSize.y));
      p.xy+=r*(position.xy*aSize*coverage*nearFade);gl_Position=projectionMatrix*p;}`,
      fragmentShader:`uniform sampler2D uNoise;varying float vAlpha;varying float vSeed;varying float vDistance;varying vec2 vUv;
      void main(){vec2 q=(vUv-.5)*2.;float radial=length(q);if(vAlpha<.004||vDistance<.9||radial>.94)discard;
      float n=texture2D(uNoise,vUv*1.7+vSeed*8.).r;float detail=texture2D(uNoise,vUv*4.3-vSeed*3.).r;
      float edge=1.-smoothstep(.26+n*.25,.94,radial);
      // Filaments and separated droplets, rather than a stack of opaque round
      // cloud sprites. Far-away subpixel holes blend back into light mist.
      vec2 cells=vUv*vec2(19.,23.)+vSeed*31.;vec2 cell=floor(cells);
      vec3 hash=fract(vec3(cell.x,cell.y,cell.x)*vec3(.1031,.1030,.0973)+vSeed);
      hash+=dot(hash,hash.yzx+33.33);vec2 jitter=fract((hash.xx+hash.yz)*hash.zy);
      float drop=length((fract(cells)-.2-jitter*.6)*vec2(1.,.65));
      float aa=max(fwidth(drop),.025);float beads=1.-smoothstep(.095,.095+aa,drop);
      float filament=smoothstep(.44,.66,detail*.6+n*.4);
      float resolved=1.-smoothstep(.55,1.2,max(length(dFdx(cells)),length(dFdy(cells))));
      float core=mix(.25+n*.24,.10+filament*.34+beads*.72,resolved);
      float density=vSeed<${JET_PLUME.fineFraction}?(.08+n*.22+detail*.14):core;
      float alpha=min(.94,vAlpha*edge*density)*smoothstep(.9,3.2,vDistance);
      if(alpha<.004)discard;
      float grain=texture2D(uNoise,vUv*9.7+vSeed*19.).r;
      float light=smoothstep(.18,.8,n*.36+detail*.34+grain*.3);
      vec3 colour=mix(vec3(.48,.68,.83),vec3(1.40,1.39,1.28),max(light,beads*.86))*(.84+.16*(1.-radial));
      float droplets=mix(.72,1.,smoothstep(.12,.45,grain));
      gl_FragColor=vec4(colour,alpha*droplets);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    this.mesh=new THREE.Mesh(g,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=3;scene.add(this.mesh);this.mesh.visible=false;
  }
  clear(){this.history.length=0;this.packets.forEach(p=>p.active=false);this.impacts.length=0;this.accumulator=0;this.falling=0;this.mesh.visible=false;this.geometry.instanceCount=0;}
  burst(points,v,impact,time){
    if(!points?.length||!this.packets.length)return;
    const compact=!!v.config?.wompRequired,count=Math.min(Math.floor(this.packets.length*.12),points.length*24),fx=Math.sin(v.heading||0),fz=Math.cos(v.heading||0),energy=Math.sqrt(clamp(impact,.25,10));
    for(let i=0;i<count;i++){
      const point=points[i%points.length],sideOffset=(point.x-v.x)*fz-(point.z-v.z)*fx,side=Math.abs(sideOffset)>.04?Math.sign(sideOffset):(Math.random()<.5?-1:1);
      const outward=(3+energy*2.4)*1.12*(.7+Math.random()*.6),aft=1.5+energy*.8,seed=Math.random(),fine=seed<JET_PLUME.fineFraction;
      const p=this.packets[this.next++%this.packets.length];
      Object.assign(p,{active:true,birth:time,lifetime:2.6,x:point.x,y:waveHeight(point.x,point.z,time)+.055,z:point.z,
        vx:(v.vx||0)*.45+fz*side*outward-fx*aft,vy:(2.5+energy*1.7)*1.12*(.8+Math.random()*.35),vz:(v.vz||0)*.45-fx*side*outward-fz*aft,
        drag:fine?.8:.46,seed,fine,power:.85+clamp(impact/8)*.4,size:compact?.09+Math.random()*.09:.24+Math.random()*.13,loaded:compact?.15:.5,packetScale:compact?.55:1,contact:compact});
    }
  }
  update(dt,source,time){
    this.impacts.length=0;this.falling=0;
    const previous=this.history[0];
    if(dt>0&&source){
      const rate=Math.min(JET_PLUME.baseRate+source.power*JET_PLUME.poweredRate,this.packets.length/(JET_PLUME.lifetime+.15)*.9)*this.density;
      this.accumulator+=dt*rate;const count=Math.min(Math.ceil(rate*.12),Math.floor(this.accumulator));this.accumulator-=count;
      for(let i=0;i<count;i++){
        const fraction=(i+.5)/count,age=dt*(1-fraction),a=previous?.source||source,originIndex=this.next%(source.origins?.length||1),origin=source.origins?.[originIndex]||source.origin,oldOrigin=a.origins?.[originIndex]||a.origin;
        const mix=(x,y)=>x+(y-x)*fraction,p=this.packets[this.next++%this.packets.length],seed=Math.random(),fine=seed<JET_PLUME.fineFraction,loaded=source.loaded||0;
        Object.assign(p,{active:true,birth:time-age,x:mix(oldOrigin.x,origin.x)+(Math.random()-.5)*.1,y:mix(oldOrigin.y,origin.y),z:mix(oldOrigin.z,origin.z)+(Math.random()-.5)*.1,
          vx:mix(a.velocity.x,source.velocity.x)+(Math.random()-.5)*(1.8+loaded*2),vy:mix(a.velocity.y,source.velocity.y)*(.9+Math.random()*.2),vz:mix(a.velocity.z,source.velocity.z)+(Math.random()-.5)*(1.8+loaded*2),
          lifetime:JET_PLUME.lifetime,drag:fine?.8:JET_PLUME.drag,seed,fine,power:source.power,size:.17+Math.random()*.12,loaded,packetScale:source.packetScale||1});
      }
    }
    if(dt>0){this.history.unshift({time,source});if(this.history.length>2)this.history.pop();}
    let n=0;const {aCenter,aSize,aAlpha,aSeed,aVelocity}=this.geometry.attributes;
    for(const p of this.packets){
      if(!p.active)continue;const lifetime=p.lifetime||JET_PLUME.lifetime,age=time-p.birth,q=plumeTrajectory(p,age,this.trajectory),water=waveHeight(q.x,q.z,time);
      if(age>lifetime||(q.vy<0&&q.y<=water+.025)){
        if(q.vy<0&&age>0.15&&!p.fine)this.impacts.push({x:q.x,z:q.z,time,strength:.1+p.power*.13});p.active=false;continue;
      }
      if(q.vy<0)this.falling++;
      const size=SPRAY_VISUAL_SCALE*(p.packetScale||1)*Math.min(p.fine?JET_PLUME.mistRadius:JET_PLUME.coreRadius,p.size+age*(p.contact?.20:p.fine?1.2:JET_PLUME.coreGrowth)*(1+p.loaded*.3)),fade=clamp(age/.025)*clamp((lifetime-age)/.3);
      aCenter.setXYZ(n,q.x,q.y,q.z);aSize.setXY(n,p.seed>JET_PLUME.streakThreshold?.028+age*.02:size*(p.fine?2.8:2.05),p.seed>JET_PLUME.streakThreshold?.16+Math.abs(q.vy)*.03:size*(p.fine?2.3:2.65));
      aAlpha.setX(n,fade*p.power*(p.contact?.5:1)*(p.seed>JET_PLUME.streakThreshold?.9:p.fine?JET_PLUME.mistOpacity:JET_PLUME.coreOpacity)*clamp((q.y-water+.14)/.18));aSeed.setX(n,p.seed);aVelocity.setXYZ(n,q.vx,q.vy,q.vz);n++;
    }
    this.geometry.instanceCount=n;this.mesh.visible=n>0;
    for(const name of ['aCenter','aSize','aAlpha','aSeed','aVelocity']){const attribute=this.geometry.attributes[name];attribute.clearUpdateRanges();if(n)attribute.addUpdateRange(0,n*attribute.itemSize);attribute.needsUpdate=n>0;}
  }
  dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
