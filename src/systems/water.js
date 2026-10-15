import * as THREE from 'three';
import { WAVES, waveHeight } from '../config.js';
import { lands } from './environment.js';
export class Water {
  constructor(scene, quality) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0,0,512,512);
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
    for (const land of lands) { ctx.beginPath(); land.points.forEach((p,i) => ctx[i?'lineTo':'moveTo']((p[0]+800)/1600*512,(p[1]+800)/1600*512)); ctx.closePath(); ctx.fill(); }
    const shore = new THREE.CanvasTexture(canvas);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector2() }, uSun: { value: new THREE.Vector3(-0.5,0.65,-0.3).normalize() }, uShore: { value: shore } },
      vertexShader: `
        uniform float uTime;uniform vec2 uCenter;
        varying vec3 vWorld; varying vec3 vNormal;
        float wave(vec2 p) {
          float chop=.3+.7*clamp((p.y-40.)/230.,0.,1.);
          return (${WAVES.map(w=>`${w.amplitude}*sin(p.x*${w.kx}+p.y*${w.kz}+uTime*${w.speed})`).join('+')})*chop;
        }
        void main() {
          vec3 p=position;p.xz+=uCenter;p.y=wave(p.xz);
          float dx=(wave(p.xz+vec2(.15,0.))-wave(p.xz-vec2(.15,0.)))/.3;
          float dz=(wave(p.xz+vec2(0.,.15))-wave(p.xz-vec2(0.,.15)))/.3;
          vNormal=normalize(vec3(-dx,1.,-dz));vWorld=p;
          gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
        }`,
      fragmentShader: `
        uniform vec3 uSun;uniform float uTime;uniform sampler2D uShore;
        varying vec3 vWorld;varying vec3 vNormal;
        void main() {
          vec3 view=normalize(cameraPosition-vWorld);
          vec3 n=normalize(vNormal);
          float ripple=sin(vWorld.x*2.1+vWorld.z*1.7+uTime*2.3)*sin(vWorld.z*3.2-uTime*2.);
          n=normalize(n+vec3(ripple*.019,0.,ripple*.023));
          float fresnel=pow(1.-max(dot(view,n),0.),3.);
          float shallows=texture2D(uShore,vec2((vWorld.x+800.)/1600.,1.-(vWorld.z+800.)/1600.)).r;
          vec3 deep=mix(vec3(.035,.30,.32),vec3(.18,.57,.48),shallows*.85);
          vec3 sky=vec3(.54,.74,.75);
          vec3 colour=mix(deep,sky,fresnel*.72);
          float sun=pow(max(dot(reflect(-uSun,n),view),0.),150.);
          colour+=vec3(1.,.86,.57)*sun*.95;
          colour+=pow(max(dot(n,uSun),0.),12.)*.05;
          float fog=1.-exp(-length(cameraPosition-vWorld)*.00095);
          colour=mix(colour,vec3(.73,.81,.76),fog);
          gl_FragColor=vec4(colour,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.scene = scene; this.mesh = null; this.setQuality(quality);
  }
  setQuality(quality) {
    if(this.mesh){this.scene.remove(this.mesh);this.mesh.geometry.dispose();}
    // Concentrate surface samples around the boat; distant water needs fewer
    // triangles, while the visible hull contact must match buoyancy samples.
    const g=new THREE.PlaneGeometry(2,2,quality.waterSegments,quality.waterSegments);g.rotateX(-Math.PI/2);
    const positions=g.attributes.position;
    for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i);positions.setX(i,Math.sign(x)*Math.pow(Math.abs(x),2.4)*1050);positions.setZ(i,Math.sign(z)*Math.pow(Math.abs(z),2.4)*1050);}
    this.mesh=new THREE.Mesh(g,this.material);this.mesh.frustumCulled=false;this.scene.add(this.mesh);
  }
  update(t,x,z) { this.material.uniforms.uTime.value=t;this.material.uniforms.uCenter.value.set(x,z); }
}
export class Spray {
  constructor(scene, count) {
    this.count=count;this.next=0;this.accumulator=0;this.particles=Array.from({length:count},()=>({life:0}));
    this.positions=new Float32Array(count*3);this.sizes=new Float32Array(count);this.alphas=new Float32Array(count);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.positions,3));g.setAttribute('aSize',new THREE.BufferAttribute(this.sizes,1));g.setAttribute('aAlpha',new THREE.BufferAttribute(this.alphas,1));
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:600}},
      vertexShader:`attribute float aSize;attribute float aAlpha;varying float vAlpha;uniform float uScale;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uScale/max(1.,-mv.z),1.,90.);vAlpha=aAlpha;}`,
      fragmentShader:`varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.87,.97,.94,(1.-smoothstep(.12,.5,d))*vAlpha);}`});
    this.points=new THREE.Points(g,this.material);this.points.frustumCulled=false;scene.add(this.points);
  }
  emit(x,y,z,vx,vy,vz,foam=false) {
    const p=this.particles[this.next++%this.count];Object.assign(p,{x,y,z,vx,vy,vz,foam,life:foam?4.5:0.8+Math.random()*.6,max:foam?4.5:1.4,size:foam?.35:.09+Math.random()*.18});
  }
  splash(v, impact) {
    for(let i=0;i<Math.min(90,impact*7);i++){const a=Math.random()*Math.PI*2, s=2+Math.random()*impact*.5;this.emit(v.x,0.25,v.z,Math.sin(a)*s,2+Math.random()*impact*.45,Math.cos(a)*s);}
  }
  update(dt,v,time,active=true) {
    const fX=Math.sin(v.heading),fZ=Math.cos(v.heading), sideX=fZ,sideZ=-fX;
    const ground=!v.airborne&&!v.wipeout;
    const intensity=Math.min(2.8,v.speed/18+Math.abs(v.steer)*v.speed/20+Math.abs(v.slip)/9);
    this.accumulator+=active&&ground&&v.speed>1?dt*(25+intensity*90):0;
    const count=Math.min(30,Math.floor(this.accumulator));this.accumulator-=count;
    for(let i=0;i<count;i++){
      const side=i%2?1:-1, width=v.config.width*.45;
      const outside=side*-v.steer>0?1.8:0.6;
      const spread=(1+Math.abs(v.slip)*.6+v.speed*.14)*outside;
      const x=v.x-fX*v.config.length*.35+sideX*side*width,z=v.z-fZ*v.config.length*.35+sideZ*side*width;
      this.emit(x,v.y+.04,z,sideX*side*spread-fX*v.speed*.16,0.6+intensity*outside+Math.random(),sideZ*side*spread-fZ*v.speed*.16);
      if(i%3===0)this.emit(x,.05,z,sideX*side*.7,0,sideZ*side*.7,true);
    }
    this.particles.forEach((p,i)=>{
      p.life-=dt;
      if(p.life>0){
        p.x+=p.vx*dt;p.z+=p.vz*dt;
        if(p.foam){p.y=waveHeight(p.x,p.z,time)+.035;p.size+=dt*.48;}
        else{p.vy-=8*dt;p.y+=p.vy*dt;if(p.y<waveHeight(p.x,p.z,time)){p.foam=true;p.life=1.8;p.max=2;p.vy=0;p.vx*=.15;p.vz*=.15;}}
        this.positions.set([p.x,p.y,p.z],i*3);this.sizes[i]=p.size;this.alphas[i]=Math.min(1,p.life/p.max)*(p.foam?.48:.75);
      }else{this.alphas[i]=0;this.sizes[i]=0;}
    });
    for(const a of Object.values(this.points.geometry.attributes))a.needsUpdate=true;
  }
}
