import * as THREE from 'three';
import { waveHeight } from '../config.js';
import { JET_PLUME, clamp } from './spray-model.js';
export class JetPlume {
  constructor(scene,texture){
    this.history=[];this.rows=24;this.sides=10;
    const count=(this.rows+1)*(this.sides+1),p=new Float32Array(count*3),uv=new Float32Array(count*2),alpha=new Float32Array(count),indices=[];
    for(let i=0;i<=this.rows;i++)for(let j=0;j<=this.sides;j++){
      uv.set([j/this.sides,i/this.rows],(i*(this.sides+1)+j)*2);
      if(i<this.rows&&j<this.sides){const a=i*(this.sides+1)+j,b=a+this.sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
    }
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(p,3));this.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));this.geometry.setAttribute('aAlpha',new THREE.BufferAttribute(alpha,1));this.geometry.setIndex(indices);
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{uNoise:{value:texture},uTime:{value:0}},
      vertexShader:`attribute float aAlpha;varying float vAlpha;varying vec2 vUv;void main(){vAlpha=aAlpha;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform sampler2D uNoise;uniform float uTime;varying float vAlpha;varying vec2 vUv;
        void main(){float n=texture2D(uNoise,vUv*vec2(2.,3.)+vec2(uTime*.06,-uTime*.3)).r;
        float detail=texture2D(uNoise,vUv*vec2(5.,9.)-uTime*.1).r;
        float alpha=vAlpha*(.5+smoothstep(.2,.8,n*.7+detail*.3)*.45);
        if(alpha<.008)discard;gl_FragColor=vec4(mix(vec3(.66,.81,.83),vec3(.98,.99,.96),n*.6+detail*.4),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=3;scene.add(this.mesh);this.mesh.visible=false;
  }
  clear(){this.history.length=0;this.mesh.visible=false;}
  update(dt,source,time){
    if(dt>0)this.history.unshift({time,source});
    while(this.history.length&&(time-this.history.at(-1).time>JET_PLUME.lifetime+.15||this.history.length>100))this.history.pop();
    this.mesh.visible=this.history.some(f=>f.source&&time-f.time<JET_PLUME.lifetime);
    if(!this.mesh.visible)return;
    const p=this.geometry.attributes.position,alpha=this.geometry.attributes.aAlpha;
    for(let i=0;i<=this.rows;i++){
      const age=i/this.rows*JET_PLUME.lifetime,wanted=time-age,t=age/JET_PLUME.lifetime;
      let newer=this.history[0],older=this.history.at(-1);
      for(const frame of this.history){if(frame.time>=wanted)newer=frame;else{older=frame;break;}}
      const ratio=clamp((wanted-older.time)/Math.max(.00001,newer.time-older.time));
      const fallback=source||this.history.find(f=>f.source).source,a=older.source||fallback,b=newer.source||fallback;
      const mix=(a,b)=>a+(b-a)*ratio;
      const s={origin:{},velocity:{},power:mix(older.source?.power||0,newer.source?.power||0)};
      for(const axis of ['x','y','z']){s.origin[axis]=mix(a.origin[axis],b.origin[axis]);s.velocity[axis]=mix(a.velocity[axis],b.velocity[axis]);}
      const exists=wanted>=this.history.at(-1).time;
      const x=s.origin.x+s.velocity.x*age,z=s.origin.z+s.velocity.z*age,y=s.origin.y+s.velocity.y*age-4.905*age*age;
      const tangent=new THREE.Vector3(s.velocity.x,s.velocity.y-9.81*age,s.velocity.z).normalize();
      const side=new THREE.Vector3().crossVectors(tangent,new THREE.Vector3(0,1,0));if(side.lengthSq()<.001)side.set(1,0,0);side.normalize();
      const up=new THREE.Vector3().crossVectors(side,tangent).normalize();
      const radius=.07+(Math.sin(Math.min(1,t)*Math.PI*.7)*JET_PLUME.spread+.16*t)*s.power;
      for(let j=0;j<=this.sides;j++){
        const a=j/this.sides*Math.PI*2,r=radius*(1+.10*Math.sin(a*3+age*18-time*3)),c=Math.cos(a)*r,sn=Math.sin(a)*r,k=i*(this.sides+1)+j;
        p.setXYZ(k,x+side.x*c+up.x*sn,y+side.y*c+up.y*sn,z+side.z*c+up.z*sn);
        alpha.setX(k,(exists?s.power:0)*clamp((y-waveHeight(x,z,time))/.22)*clamp(1-t*t)*.66);
      }
    }
    p.needsUpdate=true;alpha.needsUpdate=true;this.material.uniforms.uTime.value=time;
  }
  dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
