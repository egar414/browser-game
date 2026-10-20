import {remoteSpray} from './network-spray.js';
import{isJet}from'../config.js';
import * as THREE from 'three';
import { JetPlume } from './jet-plume.js';
import { waveHeight } from '../config.js';
import { clamp, sprayState, launchSpray, pumpDischarge, stepDroplet, SPRAY_TUNING, SIDE_SPRAY, SPRAY_VISUAL_SCALE, jetPlumeSource } from './spray-model.js';

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
    const motor=state.contacts?.find(p=>p.motor),x=motor?motor.x:v.x-fX*v.config.length*.47,z=motor?motor.z:v.z-fZ*v.config.length*.47;
    if(this.last&&Math.hypot(x-this.last.x,z-this.last.z)>24)this.clear();
    if(dt>0&&state.speed>.7&&!v.airborne&&!v.wipeout&&(!this.last||Math.hypot(x-this.last.x,z-this.last.z)>SPRAY_TUNING.sampleSpacing)){
      if(this.last)this.distance+=Math.hypot(x-this.last.x,z-this.last.z);
      this.last={x,z};this.history.unshift({x,z,fx:fX,fz:fZ,time,distance:this.distance,width:v.config.width*(motor?.6:1),speed:v.speed,power:state.jet,energy:Math.max(state.left,state.right)});
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
      vertexShader:`attribute float aSize;attribute float aAlpha;attribute float aKind;varying float vAlpha;varying float vKind;varying float vSeed;uniform float uScale;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uScale/max(1.,-mv.z),1.,(aKind<.5||aKind>1.5)?52.:112.);vAlpha=aAlpha;vKind=aKind;vSeed=fract(position.x*.17+position.z*.137);}`,
      fragmentShader:`uniform sampler2D uNoise;varying float vAlpha;varying float vKind;varying float vSeed;void main(){vec2 q=gl_PointCoord-.5;float d=length(q*vec2((vKind<.5||vKind>1.5)?1.5:1.,1.));if(d>.5)discard;
        float noise=texture2D(uNoise,gl_PointCoord*1.7+vSeed*8.).r;float alpha=(vKind<.5||vKind>1.5)?(1.-smoothstep(.2,.5,d)):(1.-smoothstep(.25,.5,d))*(.45+noise*.4);
        vec3 colour=vKind>.5&&vKind<1.5?mix(vec3(.50,.67,.69),vec3(1.04,1.04,.99),smoothstep(.15,.8,noise)):mix(vec3(.69,.88,.91),vec3(.98,1.,.95),1.-d);gl_FragColor=vec4(colour,alpha*vAlpha*(vKind>1.5?(.25+noise*.75):1.));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.points=new THREE.Points(g,this.material);this.points.frustumCulled=false;this.points.renderOrder=4;scene.add(this.points);
    this.stream=new PumpStream(scene);this.plume=new JetPlume(scene,this.texture,quality.plumeCapacity??Math.min(3200,Math.round(1600+quality.particles*.8)),quality.plumeDensity??.65);
    this.wake=new FoamWake(scene,this.texture,quality.wakeSamples);
    this.fans=[]; // Removed flat spray sheets; retain falling droplets and rear plume.
    this.state={left:0,right:0,rate:0};this.time=0;this.waterImpacts=0;this.impactBudget=0;
  }
  clear(){for(const p of this.particles)p.life=0;this.alphas.fill(0);this.stream.mesh.visible=false;this.plume.clear();this.wake.clear();this.accumulator=0;this.jetAccumulator=0;this.brakeAccumulator=0;for(const fan of this.fans){fan.strength=0;fan.history.length=0;fan.current=null;fan.mesh.visible=false;}}
  emit(p,kind=0){const target=this.particles[this.next++%this.count],life=p.lifetime??(kind===2?1.5:kind===0?.55+Math.random()*.5:1.25);Object.assign(target,{birthStep:null,secondary:false,opacity:1,diameter:kind===0?.0015+Math.random()*.003:.0004},p,{life,max:life,size:SPRAY_VISUAL_SCALE*(kind===2?.035+Math.random()*.065:kind===0?.025+Math.random()*.045:.7+Math.random()*.65),kind});}
  impact(x,z,strength){
    if(this.impactBudget<=0)return;this.impactBudget--;this.waterImpacts++;
    this.wake.returns.push({x,z,time:this.time,strength:clamp(strength,.25,.8)});
    for(let j=0;j<3;j++){const a=j*Math.PI*2/3+Math.random(),s=.7+Math.random()*1.1;this.emit({x,y:waveHeight(x,z,this.time)+.035,z,vx:Math.sin(a)*s,vy:.7+Math.random()*.9,vz:Math.cos(a)*s,lifetime:.35+Math.random()*.15,secondary:true},2);}
  }
  splash(v,impact,contacts=null) {
    this.plume.burst(contacts?.length?contacts:[v],v,impact,this.time);
    const count=contacts?.length?Math.max(contacts.length,Math.min(this.count*.25,contacts.length*3)):Math.min(this.count*.4,40+impact*13);
    for(let i=0;i<count;i++){const point=contacts?.[i%contacts.length]||v,angle=Math.random()*Math.PI*2,s=2+Math.random()*impact*.65;this.emit({x:point.x,y:waveHeight(point.x,point.z,this.time)+.1,z:point.z,vx:Math.sin(angle)*s+(v.vx||0)*.2,vy:1.5+Math.random()*impact*.5,vz:Math.cos(angle)*s+(v.vz||0)*.2},!contacts&&i%8===0?1:0);}
    for(const point of contacts||[v])this.wake.splash(point,impact,this.time);
  }
  update(dt,v,time,active=true,controls={}) {
    this.time=time;this.impactBudget=dt>0?6:0;this.state=sprayState(v,false,time);
    const received=controls.remote?remoteSpray(v):null;
    if(received){const left=received.find(p=>p.kind==='left'),right=received.find(p=>p.kind==='right');this.state={...this.state,left:left?.power||0,right:right?.power||0,rate:((left?.power||0)+(right?.power||0))*100,contacts:[left||{x:v.x,y:v.y,z:v.z,wet:0},right||{x:v.x,y:v.y,z:v.z,wet:0}]};}
    if(!active)this.state={...this.state,rate:0,left:0,right:0,jet:0};
    // Reserve room for falling heavy drops and pump froth on smaller pools.
    this.accumulator+=dt*Math.min(this.state.rate,this.count*.75/(SIDE_SPRAY.dropletLife+.2));
    const count=Math.min(Math.floor(this.accumulator),80);this.accumulator-=count;
    for(let i=0;i<count;i++){
      const side=Math.random()*(this.state.left+this.state.right)<this.state.left?-1:1;
      if(received){const source=received.find(p=>p.kind===(side<0?'left':'right'));if(!source)continue;
        // A transmitted fan is a mean vector. Sample a continuous spread, not a
        // stack of identical opaque particles at the three network ticks/sec.
        const spread=.8+source.power*.55,fx=Math.sin(v.heading),fz=Math.cos(v.heading),lateral=(Math.random()-.5)*spread;
        this.emit({...source,x:source.x+(Math.random()-.5)*.12,z:source.z+(Math.random()-.5)*.12,vx:source.vx+fz*lateral,vy:source.vy*(.85+Math.random()*.3),vz:source.vz-fx*lateral,lifetime:3.4,diameter:.005},i%5===0?1:0);
        const packet=this.particles[(this.next-1+this.count)%this.count];if(packet.kind===1){packet.size*=.28;packet.opacity=.38;}
      }else this.emit(launchSpray(v,this.state,side),i%3===0&&Math.max(this.state.left,this.state.right)>.8?1:0);
    }
    const discharge=active&&!received?pumpDischarge(v,time):null;this.stream.update(v,discharge);
    const rear=received?.find(p=>p.kind==='rear'),plume=received?(active&&rear?{origin:rear,velocity:{x:rear.vx,y:rear.vy,z:rear.vz},power:rear.power,loaded:v.riderAft||0,packetScale:v.type==='hyper'?1.35:.85}:null):jetPlumeSource(v,discharge,time,this.state);this.plume.update(dt,plume,time);
    this.jetAccumulator+=dt*this.state.jet*(isJet(v.type)?200:90);
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
    if(active&&v.drive?.braking&&isJet(v.type)&&v.drive.wetness>.2){
      // The official guide describes a transient plume behind an applied brake gate.
      this.brakeAccumulator=(this.brakeAccumulator||0)+dt*clamp(v.speed/18)*65*v.drive.reverse;
      const n=Math.min(15,Math.floor(this.brakeAccumulator));this.brakeAccumulator-=n;
      const p=v.drive.origin,fx=Math.sin(v.heading),fz=Math.cos(v.heading);
      for(let i=0;i<n;i++)this.emit({x:p.x,y:waveHeight(p.x,p.z,time)+.08,z:p.z,vx:v.vx*.25-fx*2+(Math.random()-.5)*2,vy:1.5+Math.random()*clamp(v.speed*.22,0,4),vz:v.vz*.25-fz*2+(Math.random()-.5)*2});
    }
    for(let i=0;i<this.count;i++){
      const p=this.particles[i],particleDt=p.birthStep??dt;p.birthStep=null;p.life-=particleDt;
      if(p.life>0){stepDroplet(p,particleDt);
        if(p.y<waveHeight(p.x,p.z,time)-.02){if(!p.secondary&&p.vy<-.8)this.impact(p.x,p.z,Math.abs(p.vy)*.06);p.life=0;}
        this.positions.set([p.x,p.y,p.z],i*3);this.sizes[i]=p.size*(p.kind?1+(1-p.life/p.max)*1.9:1);this.alphas[i]=clamp(p.life/.2)*(p.opacity??1);this.kinds[i]=p.kind;
      }else{this.alphas[i]=0;this.sizes[i]=0;}
    }
    for(const attr of Object.values(this.points.geometry.attributes))attr.needsUpdate=true;
    for(const p of this.plume.impacts.filter((_,i)=>i%3===0))this.impact(p.x,p.z,p.strength);
    const visibleState=dt>0?this.state:{...this.state,rate:0};this.wake.update(dt,v,time,visibleState);

  }
  resize(height,fov,pixelRatio){this.material.uniforms.uScale.value=height*pixelRatio/(2*Math.tan(THREE.MathUtils.degToRad(fov)*.5));}
  dispose(){this.points.removeFromParent();this.points.geometry.dispose();this.material.dispose();this.stream.dispose();this.plume.dispose();this.wake.dispose();this.fans.forEach(f=>f.dispose());this.texture.dispose();}
}
