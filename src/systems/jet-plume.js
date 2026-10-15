import * as THREE from 'three';
import { waveHeight } from '../config.js';
import { JET_PLUME, clamp } from './spray-model.js';
// A packet remains in world space after leaving the nozzle. Its water follows
// a ballistic trajectory with drag, including the falling half of the plume.
export function plumeTrajectory(p,age){
  const drag=p.drag,decay=Math.exp(-drag*age),travel=(1-decay)/drag;
  return {x:p.x+p.vx*travel,y:p.y+(p.vy+9.81/drag)*travel-9.81*age/drag,z:p.z+p.vz*travel,vy:(p.vy+9.81/drag)*decay-9.81/drag};
}
export class JetPlume {
  constructor(scene,texture,capacity=900){
    this.history=[];this.packets=Array.from({length:capacity},()=>({active:false}));this.next=0;this.accumulator=0;this.impacts=[];this.falling=0;
    const plane=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();g.index=plane.index;g.attributes.position=plane.attributes.position;g.attributes.uv=plane.attributes.uv;
    for(const [name,size]of [['aCenter',3],['aSize',2],['aAlpha',1],['aSeed',1]])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount=0;this.geometry=g;
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uNoise:{value:texture}},
      vertexShader:`attribute vec3 aCenter;attribute vec2 aSize;attribute float aAlpha;attribute float aSeed;varying float vAlpha;varying float vSeed;varying vec2 vUv;
      void main(){vAlpha=aAlpha;vSeed=aSeed;vUv=uv;vec4 p=modelViewMatrix*vec4(aCenter,1.);float a=aSeed>.68?0.:aSeed*6.28318;mat2 r=mat2(cos(a),-sin(a),sin(a),cos(a));p.xy+=r*(position.xy*aSize);gl_Position=projectionMatrix*p;}`,
      fragmentShader:`uniform sampler2D uNoise;varying float vAlpha;varying float vSeed;varying vec2 vUv;
      void main(){vec2 q=(vUv-.5)*2.;float n=texture2D(uNoise,vUv*1.7+vSeed*8.).r;float detail=texture2D(uNoise,vUv*4.3-vSeed*3.).r;
      float radial=length(q);float edge=1.-smoothstep(.32+n*.22,.88,radial);float alpha=vAlpha*edge*(.26+n*.5+detail*.24);
      if(alpha<.004)discard;gl_FragColor=vec4(mix(vec3(.67,.82,.83),vec3(.98,.99,.96),n*.6+detail*.4),alpha);
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
      this.accumulator+=dt*(100+source.power*100);const count=Math.min(30,Math.floor(this.accumulator));this.accumulator-=count;
      for(let i=0;i<count;i++){
        const fraction=(i+.5)/count,age=dt*(1-fraction),a=previous?.source||source;
        const mix=(x,y)=>x+(y-x)*fraction,p=this.packets[this.next++%this.packets.length],seed=Math.random(),fine=seed<.2;
        Object.assign(p,{active:true,birth:time-age,x:mix(a.origin.x,source.origin.x)+(Math.random()-.5)*.1,y:mix(a.origin.y,source.origin.y),z:mix(a.origin.z,source.origin.z)+(Math.random()-.5)*.1,
          vx:mix(a.velocity.x,source.velocity.x)+(Math.random()-.5)*1.6,vy:mix(a.velocity.y,source.velocity.y)*(.82+Math.random()*.34),vz:mix(a.velocity.z,source.velocity.z)+(Math.random()-.5)*1.6,
          drag:fine?.8:JET_PLUME.drag,seed,fine,power:source.power,size:.09+Math.random()*.1});
      }
    }
    if(dt>0){this.history.unshift({time,source});if(this.history.length>2)this.history.pop();}
    let n=0;const {aCenter,aSize,aAlpha,aSeed}=this.geometry.attributes;
    for(const p of this.packets){
      if(!p.active)continue;const age=time-p.birth,q=plumeTrajectory(p,age),water=waveHeight(q.x,q.z,time);
      if(age>JET_PLUME.lifetime||(q.vy<0&&q.y<=water+.025)){
        if(q.vy<0&&age>0.15&&!p.fine)this.impacts.push({x:q.x,z:q.z,time,strength:.1+p.power*.13});p.active=false;continue;
      }
      if(q.vy<0)this.falling++;
      const size=p.size+age*(p.fine?.8:.37),fade=clamp(age/.055)*clamp((JET_PLUME.lifetime-age)/.3);
      aCenter.setXYZ(n,q.x,q.y,q.z);aSize.setXY(n,p.seed>.68?.025+age*.018:size*(p.fine?2.4:1.65),p.seed>.68?.12+Math.abs(q.vy)*.025:size*2);
      aAlpha.setX(n,fade*p.power*(p.seed>.68?.75:p.fine?.12:.48)*clamp((q.y-water+.09)/.2));aSeed.setX(n,p.seed);n++;
    }
    this.geometry.instanceCount=n;this.mesh.visible=n>0;
    for(const name of ['aCenter','aSize','aAlpha','aSeed'])this.geometry.attributes[name].needsUpdate=true;
  }
  dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
