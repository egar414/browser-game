import * as THREE from 'three';
import { JetPlume } from './jet-plume.js';
import { waveHeight } from '../config.js';
import { clamp, sprayState, launchSpray, pumpDischarge, stepDroplet, SPRAY_TUNING, jetPlumeSource } from './spray-model.js';

function foamTexture() {
  const size=128,data=new Uint8Array(size*size*4);
  let seed=713;const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
  const grid=Array.from({length:32*32},random);
  const smooth=t=>t*t*(3-2*t);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/4,v=y/4,i=Math.floor(u),j=Math.floor(v),a=smooth(u-i),b=smooth(v-j);
    const at=(xx,yy)=>grid[(yy%32)*32+xx%32];
    const n=THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(i,j),at(i+1,j),a),THREE.MathUtils.lerp(at(i,j+1),at(i+1,j+1),a),b);
    const value=clamp(n*.78+random()*.22)*255,index=(y*size+x)*4;
    data.set([value,value,value,255],index);
  }
  const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

class FoamWake {
  constructor(scene,texture,samples=140) {
    this.scene=scene;this.history=[];this.splashes=[];this.returns=[];this.samples=samples;this.distance=0;this.last=null;
    const count=(samples*3+3*49+24*17)*2;
    this.positions=new Float32Array(count*3);this.uvs=new Float32Array(count*2);this.alphas=new Float32Array(count);
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.geometry.setAttribute('uv',new THREE.BufferAttribute(this.uvs,2));this.geometry.setAttribute('aAlpha',new THREE.BufferAttribute(this.alphas,1));
    this.geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(count*3),1));
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{uNoise:{value:texture},uTime:{value:0}},
      vertexShader:`attribute float aAlpha;varying vec2 vUv;varying float vAlpha;varying float vDistance;void main(){vUv=uv;vAlpha=aAlpha;vec4 p=modelViewMatrix*vec4(position,1.);vDistance=-p.z;gl_Position=projectionMatrix*p;}`,
      fragmentShader:`uniform sampler2D uNoise;uniform float uTime;varying vec2 vUv;varying float vAlpha;varying float vDistance;
        void main(){float noise=texture2D(uNoise,vUv*vec2(.43,.37)+vec2(uTime*.012,-uTime*.015)).r;
        float detail=texture2D(uNoise,vUv*vec2(2.7,1.1)-uTime*.012).r;
        float edge=pow(max(sin(vUv.x*3.14159),0.),.72);
        float aeration=smoothstep(.18,.72,noise*.72+detail*.28);
        float alpha=edge*vAlpha*(.15+aeration*.85)*exp(-vDistance*.0013);
        if(alpha<.008)discard;gl_FragColor=vec4(mix(vec3(.58,.82,.77),vec3(.94,.98,.92),aeration),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=2;scene.add(this.mesh);
  }
  clear(){this.history.length=0;this.splashes.length=0;this.returns.length=0;this.last=null;this.geometry.setDrawRange(0,0);}
  splash(v,impact,time){this.splashes.push({x:v.x,z:v.z,time,strength:clamp(impact/10,.2,1.5)});if(this.splashes.length>3)this.splashes.shift();}
  update(dt,v,time,state) {
    const fX=Math.sin(v.heading),fZ=Math.cos(v.heading);
    const x=v.x-fX*v.config.length*.47,z=v.z-fZ*v.config.length*.47;
    if(this.last&&Math.hypot(x-this.last.x,z-this.last.z)>24)this.clear();
    if(dt>0&&state.rate>0&&(!this.last||Math.hypot(x-this.last.x,z-this.last.z)>SPRAY_TUNING.sampleSpacing)){
      if(this.last)this.distance+=Math.hypot(x-this.last.x,z-this.last.z);
      this.last={x,z};this.history.unshift({x,z,fx:fX,fz:fZ,time,distance:this.distance,width:v.config.width,speed:v.speed,power:state.jet,energy:Math.max(state.left,state.right)});
      if(this.history.length>this.samples)this.history.pop();
    }
    while(this.history.length&&time-this.history.at(-1).time>SPRAY_TUNING.wakeLifetime)this.history.pop();
    this.splashes=this.splashes.filter(s=>time-s.time<2.4);
    let vertex=0,index=0;const indices=this.geometry.index.array;
    const add=(x,z,y,edge,u,alpha)=>{this.positions.set([x,y,z],vertex*3);this.uvs.set([edge,u],vertex*2);this.alphas[vertex++]=alpha;};
    const connect=(base,n)=>{for(let i=0;i<n-1;i++){const a=base+i*2;indices.set([a,a+1,a+2,a+1,a+3,a+2],index);index+=6;}};
    for(const side of [-1,0,1]){
      const base=vertex;
      for(const p of this.history){
        const age=time-p.time,fade=Math.pow(clamp(1-age/SPRAY_TUNING.wakeLifetime),1.7);
        const spread=p.width*.43+age*p.speed*SPRAY_TUNING.wakeSpread;
        const cx=p.x+p.fz*side*spread,cz=p.z-p.fx*side*spread;
        const width=side===0?(p.width*.54+age*.47):(.18+age*.24+p.energy*.12);
        const alpha=fade*(side===0?.58+p.power*.18:.38+p.energy*.05)*clamp(age/.12+.2);
        for(const edge of [-1,1]){const px=cx+p.fz*width*edge,pz=cz-p.fx*width*edge;add(px,pz,waveHeight(px,pz,time)+.035,edge===-1?0:1,p.distance/3,alpha);}
      }
      connect(base,this.history.length);
    }
    this.returns=this.returns.filter(p=>time-p.time<1.2).slice(-24);
    for(const p of this.returns){
      const base=vertex,age=time-p.time,radius=.12+age*.65,width=.04+age*.08;
      for(let i=0;i<=16;i++)for(const edge of [-1,1]){const a=i/16*Math.PI*2,r=radius+edge*width,x=p.x+Math.sin(a)*r,z=p.z+Math.cos(a)*r;add(x,z,waveHeight(x,z,time)+.045,edge===-1?0:1,i/4,(1-age/1.2)*p.strength);}
      connect(base,17);
    }
    for(const p of this.splashes){
      const base=vertex,age=time-p.time,radius=.8+age*(3+p.strength*3.2),width=.12+age*.35;
      for(let i=0;i<=48;i++)for(const edge of [-1,1]){
        const a=i/48*Math.PI*2,r=radius+edge*width,x=p.x+Math.sin(a)*r,z=p.z+Math.cos(a)*r;
        add(x,z,waveHeight(x,z,time)+.045,edge===-1?0:1,i/8,clamp(1-age/2.4)*.7);
      }
      connect(base,49);
    }
    this.geometry.setDrawRange(0,index);this.geometry.index.needsUpdate=true;
    for(const attr of Object.values(this.geometry.attributes))attr.needsUpdate=true;
    this.material.uniforms.uTime.value=time;
  }
  dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}

class SprayFan {
  constructor(scene,texture,side,segments) {
    this.side=side;this.strength=0;this.history=[];this.rows=segments;this.columns=6;
    const count=(segments+1)*7,positions=new Float32Array(count*3),uvs=new Float32Array(count*2),indices=[];
    for(let i=0;i<=segments;i++)for(let j=0;j<=6;j++)uvs.set([j/6,i/segments],(i*7+j)*2);
    for(let i=0;i<segments;i++)for(let j=0;j<6;j++){const a=i*7+j;indices.push(a,a+1,a+7,a+1,a+8,a+7);}
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));this.geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));this.geometry.setAttribute('aWet',new THREE.BufferAttribute(new Float32Array(count),1));this.geometry.setIndex(indices);
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{uNoise:{value:texture},uTime:{value:0},uStrength:{value:0}},
      vertexShader:`attribute float aWet;varying float vWet;varying vec2 vUv;void main(){vWet=aWet;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying float vWet;varying vec2 vUv;uniform sampler2D uNoise;uniform float uTime;uniform float uStrength;
        void main(){float noise=texture2D(uNoise,vUv*vec2(.9,1.4)+vec2(0.,-uTime*.5)).r;
        float detail=texture2D(uNoise,vUv*vec2(4.,3.)-uTime*.25).r;
        float edges=pow(max(sin(vUv.x*3.14159),0.),.45)*(1.-smoothstep(.55,1.,vUv.y));
        float broken=smoothstep(.13,.73,noise*.7+detail*.3);
        float alpha=edges*(.25+broken*.7)*min(uStrength,1.3)*vWet;
        if(alpha<.006)discard;
        gl_FragColor=vec4(mix(vec3(.68,.82,.8),vec3(.98,.99,.95),broken),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=3;scene.add(this.mesh);
  }
  update(dt,v,time,strength,state) {
    this.strength=THREE.MathUtils.lerp(this.strength,strength,1-Math.exp(-dt*9));
    if(dt>0){
      const drops=Array.from({length:this.columns+1},(_,j)=>launchSpray(v,state,this.side,()=>j/this.columns));
      this.history.unshift({time,strength,drops});
    }
    while(this.history.length&&(time-this.history.at(-1).time>SPRAY_TUNING.fanLife+.15||this.history.length>64))this.history.pop();
    const peak=this.history.reduce((max,f)=>Math.max(max,f.strength*clamp(1-(time-f.time)/SPRAY_TUNING.fanLife)),0);
    this.mesh.visible=peak>.06;
    if(!this.mesh.visible)return;
    const p=this.geometry.attributes.position,wet=this.geometry.attributes.aWet;
    for(let i=0;i<=this.rows;i++){
      const wanted=time-i/this.rows*SPRAY_TUNING.fanLife;
      let frame=this.history[0];
      for(const f of this.history){if(f.time>=wanted)frame=f;else break;}
      const age=time-frame.time;
      for(let j=0;j<=this.columns;j++){
        const drop=frame.drops[j];
        // Retain the actual past contact position and motion through the turn.
        // Broad sheets curve behind the craft instead of swivelling as one jet.
        const px=drop.x+drop.vx*age,pz=drop.z+drop.vz*age;
        const py=drop.y+drop.vy*age-4.905*age*age,water=waveHeight(px,pz,time);
        p.setXYZ(i*7+j,px,Math.max(water+.025,py),pz);
        wet.setX(i*7+j,clamp((py-water)*7)*clamp(frame.strength/.8));
      }
    }
    p.needsUpdate=true;wet.needsUpdate=true;this.material.uniforms.uTime.value=time;this.material.uniforms.uStrength.value=clamp(peak/1.3,.1,1.2);
  }

  dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}

class PumpStream {
  constructor(scene){
    this.rows=14;this.sides=8;const positions=new Float32Array((this.rows+1)*this.sides*3),indices=[];
    for(let i=0;i<this.rows;i++)for(let j=0;j<this.sides;j++){const a=i*this.sides+j,b=i*this.sides+(j+1)%this.sides;indices.push(a,b,a+this.sides,b,b+this.sides,a+this.sides);}
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));this.geometry.setIndex(indices);
    this.material=new THREE.MeshBasicMaterial({color:0xc1e8e3,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;scene.add(this.mesh);this.mesh.visible=false;
  }
  update(v,discharge){
    this.mesh.visible=!!discharge?.aerial&&discharge.reverse<.1;
    if(!this.mesh.visible)return;
    const {origin,velocity,flow}=discharge;
    const relative=new THREE.Vector3(velocity.x-v.vx,velocity.y-(v.vy||0),velocity.z-v.vz),speed=relative.length();
    const axis=relative.clone().normalize(),side=new THREE.Vector3().crossVectors(axis,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(side,axis);
    const radius=Math.min(.045,Math.sqrt(flow/(Math.PI*Math.max(1,speed)))),duration=Math.min(.07,1.5/Math.max(1,speed));
    const p=this.geometry.attributes.position;
    for(let i=0;i<=this.rows;i++)for(let j=0;j<this.sides;j++){
      const t=i/this.rows*duration,a=j/this.sides*Math.PI*2,r=radius*(1+i/this.rows*.3),c=Math.cos(a)*r,s=Math.sin(a)*r;
      p.setXYZ(i*this.sides+j,origin.x+relative.x*t+side.x*c+up.x*s,origin.y+relative.y*t-4.905*t*t+up.y*s,origin.z+relative.z*t+side.z*c+up.z*s);
    }
    p.needsUpdate=true;
  }
  dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}

export class Spray {
  constructor(scene,quality) {
    this.count=quality.particles;this.next=0;this.accumulator=0;this.jetAccumulator=0;
    this.particles=Array.from({length:this.count},()=>({life:0}));this.texture=foamTexture();
    this.positions=new Float32Array(this.count*3);this.sizes=new Float32Array(this.count);this.alphas=new Float32Array(this.count);this.kinds=new Float32Array(this.count);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.positions,3));g.setAttribute('aSize',new THREE.BufferAttribute(this.sizes,1));g.setAttribute('aAlpha',new THREE.BufferAttribute(this.alphas,1));g.setAttribute('aKind',new THREE.BufferAttribute(this.kinds,1));
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:600},uNoise:{value:this.texture}},
      vertexShader:`attribute float aSize;attribute float aAlpha;attribute float aKind;varying float vAlpha;varying float vKind;uniform float uScale;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uScale/max(1.,-mv.z),1.,(aKind<.5||aKind>1.5)?52.:112.);vAlpha=aAlpha;vKind=aKind;}`,
      fragmentShader:`uniform sampler2D uNoise;varying float vAlpha;varying float vKind;void main(){vec2 q=gl_PointCoord-.5;float d=length(q*vec2((vKind<.5||vKind>1.5)?1.5:1.,1.));if(d>.5)discard;
        float noise=texture2D(uNoise,gl_PointCoord*1.7).r;float alpha=(vKind<.5||vKind>1.5)?(1.-smoothstep(.2,.5,d)):(1.-smoothstep(.08,.5,d))*(.1+noise*.18);
        gl_FragColor=vec4(mix(vec3(.69,.88,.91),vec3(.98,1.,.95),1.-d),alpha*vAlpha*(vKind>1.5?(.25+noise*.75):1.));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.points=new THREE.Points(g,this.material);this.points.frustumCulled=false;this.points.renderOrder=4;scene.add(this.points);
    this.stream=new PumpStream(scene);this.plume=new JetPlume(scene,this.texture,Math.min(1400,quality.particles+200));
    this.wake=new FoamWake(scene,this.texture,quality.wakeSamples);
    this.fans=[new SprayFan(scene,this.texture,-1,quality.fanSegments),new SprayFan(scene,this.texture,1,quality.fanSegments)];
    this.state={left:0,right:0,rate:0};this.time=0;
  }
  clear(){for(const p of this.particles)p.life=0;this.alphas.fill(0);this.stream.mesh.visible=false;this.plume.clear();this.wake.clear();this.accumulator=0;this.jetAccumulator=0;this.brakeAccumulator=0;for(const fan of this.fans){fan.strength=0;fan.history.length=0;fan.mesh.visible=false;}}
  emit(p,kind=0){const target=this.particles[this.next++%this.count],life=kind===2?1.5:kind===0?.55+Math.random()*.5:1.25;Object.assign(target,{birthStep:null,diameter:kind===0?.0015+Math.random()*.003:.0004},p,{life,max:life,size:kind===2?.035+Math.random()*.065:kind===0?.025+Math.random()*.045:.7+Math.random()*.65,kind});}
  splash(v,impact) {
    const count=Math.min(this.count*.4,40+impact*13);
    for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,s=2+Math.random()*impact*.65;this.emit({x:v.x,y:waveHeight(v.x,v.z,this.time)+.1,z:v.z,vx:Math.sin(angle)*s+(v.vx||0)*.2,vy:1.5+Math.random()*impact*.5,vz:Math.cos(angle)*s+(v.vz||0)*.2},i%8===0?1:0);}
    this.wake.splash(v,impact,this.time);
  }
  update(dt,v,time,active=true,controls={}) {
    this.time=time;this.state=sprayState(v,false,time);
    if(!active)this.state={...this.state,rate:0,left:0,right:0,jet:0};
    this.accumulator+=dt*this.state.rate;
    const count=Math.min(Math.floor(this.accumulator),80);this.accumulator-=count;
    for(let i=0;i<count;i++){
      const side=Math.random()*(this.state.left+this.state.right)<this.state.left?-1:1;
      this.emit(launchSpray(v,this.state,side),i%5===0&&Math.max(this.state.left,this.state.right)>.8?1:0);
    }
    const discharge=active?pumpDischarge(v,time):null;this.stream.update(v,discharge);
    const plume=jetPlumeSource(v,discharge,time,this.state);this.plume.update(dt,plume,time);
    this.jetAccumulator+=dt*this.state.jet*(v.type==='ski'?200:90);
    const jetCount=Math.min(30,Math.floor(this.jetAccumulator));this.jetAccumulator-=jetCount;
    for(let i=0;i<jetCount&&discharge;i++){
      const {origin,velocity,aerial}=discharge;
      if(plume){
        // Dedicated packets retain their own pool through the full fall.
        continue;
      }else if(aerial){
        const spread=.28+discharge.reverse*.6;
        this.emit({x:origin.x,y:origin.y,z:origin.z,vx:velocity.x+(Math.random()-.5)*spread,vy:velocity.y+(Math.random()-.5)*spread,vz:velocity.z+(Math.random()-.5)*spread,diameter:.003+Math.random()*.002});
      }else{
        // Turbulence reaches the surface as low froth, never an above-water rocket plume.
        const t=Math.random()*.11,x=origin.x+velocity.x*t,z=origin.z+velocity.z*t;
        this.emit({x:x+(Math.random()-.5)*.35,y:waveHeight(x,z,time)+.025,z,vx:velocity.x*.12,vy:.25+Math.random()*.7,vz:velocity.z*.12,diameter:.004});
      }
    }
    if(active&&v.drive?.braking&&v.type==='ski'&&v.drive.wetness>.2){
      // The official guide describes a transient plume behind an applied brake gate.
      this.brakeAccumulator=(this.brakeAccumulator||0)+dt*clamp(v.speed/18)*65*v.drive.reverse;
      const n=Math.min(15,Math.floor(this.brakeAccumulator));this.brakeAccumulator-=n;
      const p=v.drive.origin,fx=Math.sin(v.heading),fz=Math.cos(v.heading);
      for(let i=0;i<n;i++)this.emit({x:p.x,y:waveHeight(p.x,p.z,time)+.08,z:p.z,vx:v.vx*.25-fx*2+(Math.random()-.5)*2,vy:1.5+Math.random()*clamp(v.speed*.22,0,4),vz:v.vz*.25-fz*2+(Math.random()-.5)*2});
    }
    for(let i=0;i<this.count;i++){
      const p=this.particles[i],particleDt=p.birthStep??dt;p.birthStep=null;p.life-=particleDt;
      if(p.life>0){stepDroplet(p,particleDt);
        if(p.y<waveHeight(p.x,p.z,time)-.02)p.life=0;
        this.positions.set([p.x,p.y,p.z],i*3);this.sizes[i]=p.size*(p.kind?1+(1-p.life/p.max)*1.9:1);this.alphas[i]=clamp(p.life/.2);this.kinds[i]=p.kind;
      }else{this.alphas[i]=0;this.sizes[i]=0;}
    }
    for(const attr of Object.values(this.points.geometry.attributes))attr.needsUpdate=true;
    if(this.plume.impacts.length)this.wake.returns.push(...this.plume.impacts.filter((_,i)=>i%3===0));
    const visibleState=dt>0?this.state:{...this.state,rate:0};this.wake.update(dt,v,time,visibleState);
    this.fans[0].update(dt,v,time,this.state.left,this.state);this.fans[1].update(dt,v,time,this.state.right,this.state);
  }
  resize(height,fov,pixelRatio){this.material.uniforms.uScale.value=height*pixelRatio/(2*Math.tan(THREE.MathUtils.degToRad(fov)*.5));}
  dispose(){this.points.removeFromParent();this.points.geometry.dispose();this.material.dispose();this.stream.dispose();this.plume.dispose();this.wake.dispose();this.fans.forEach(f=>f.dispose());this.texture.dispose();}
}
