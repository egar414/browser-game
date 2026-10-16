import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { WAVES, WORLD, WAVE_FIELD, seaAmplitude } from '../config.js';
import { WAVE_GLSL } from '../ocean.js';
import { lands } from './environment.js';
import { SUN_DIRECTION } from './atmosphere.js';
export { Spray } from './spray.js';

function makeRippleTexture() {
  const size=128,data=new Uint8Array(size*size*4),heights=new Float32Array(size*size);
  let seed=1359;const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
  const layers=[4,8,16,32,64].map((n,i)=>({n,weight:Math.pow(.53,i),grid:Array.from({length:n*n},random)}));
  const smooth=t=>t*t*(3-2*t);
  // Periodic fractal noise avoids the regular cross-hatched sine pattern of
  // the first pass. Wind stretches the small ripples without making stripes.
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let h=0;
    for(const {n,weight,grid} of layers){
      const u=x/size*n,v=y/size*n,a=Math.floor(u),b=Math.floor(v),fx=smooth(u-a),fy=smooth(v-b);
      const at=(xx,yy)=>grid[(yy%n)*n+xx%n];
      h+=THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(a,b),at(a+1,b),fx),THREE.MathUtils.lerp(at(a,b+1),at(a+1,b+1),fx),fy)*weight;
    }
    heights[y*size+x]=h/2.05;
  }
  const at=(x,y)=>heights[((y+size)%size)*size+(x+size)%size];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=THREE.MathUtils.clamp((at(x+1,y)-at(x-1,y))*5,-1,1);
    const dz=THREE.MathUtils.clamp((at(x,y+1)-at(x,y-1))*5,-1,1);
    const i=(y*size+x)*4;data[i]=(dx*.5+.5)*255;data[i+1]=(dz*.5+.5)*255;data[i+2]=at(x,y)*255;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}

export class Water {
  constructor(scene, quality) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,1024,1024);
    ctx.fillStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=6;
    const width=WORLD.maxX-WORLD.minX,depth=WORLD.maxZ-WORLD.minZ;
    for(const land of lands){ctx.beginPath();for(const ring of [land.points,...(land.holes||[])]){ring.forEach((p,i)=>ctx[i?'lineTo':'moveTo']((p[0]-WORLD.minX)/width*1024,(p[1]-WORLD.minZ)/depth*1024));ctx.closePath();}ctx.fill('evenodd');}
    const field=new THREE.DataTexture(new Uint8Array(WAVE_FIELD.values),WAVE_FIELD.size,WAVE_FIELD.size,THREE.RedFormat);
    field.minFilter=field.magFilter=THREE.LinearFilter;field.needsUpdate=true;
    this.material=new THREE.ShaderMaterial({
      uniforms:{
        uSea:{value:1},uTime:{value:0},uMapBounds:{value:new THREE.Vector4(WORLD.minX,WORLD.minZ,width,depth)},uWaveField:{value:field},uCenter:{value:new THREE.Vector2()},uSun:{value:SUN_DIRECTION},
        uShore:{value:new THREE.CanvasTexture(canvas)},uRipples:{value:makeRippleTexture()},
        uReflection:{value:null},uReflectionMatrix:{value:new THREE.Matrix4()},uReflect:{value:0},
        uHull:{value:new THREE.Vector4(0,0,1,2)},uHeading:{value:0},uContact:{value:1},
      },
      vertexShader:`
        uniform float uSea;uniform float uTime;uniform vec4 uMapBounds;uniform sampler2D uWaveField;uniform vec2 uCenter;uniform mat4 uReflectionMatrix;
        varying vec3 vWorld;varying vec3 vNormal;varying vec4 vReflection;varying float vOcean;varying float vBank;
        ${WAVE_GLSL}
        void main(){
          vec3 p=position;p.xz+=uCenter;
          vec2 uv=(clamp((p.xz-uMapBounds.xy)/uMapBounds.zw,0.,1.)*${WAVE_FIELD.size-1}.+.5)/${WAVE_FIELD.size}.;
          float chop=texture2D(uWaveField,uv).r;vOcean=smoothstep(.48,.94,chop);
          vec3 w=oceanWave(p.xz,uTime,uSea,chop);vBank=entranceShoal(p.xz);p.y=w.x;
          vWorld=p;vNormal=normalize(vec3(-w.y,1.,-w.z));
          vReflection=uReflectionMatrix*vec4(p.x,-p.z,0.,1.);
          gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
        }`,
      fragmentShader:`
        uniform float uTime;uniform vec4 uMapBounds;uniform vec3 uSun;uniform sampler2D uShore;uniform sampler2D uRipples;
        uniform sampler2D uReflection;uniform float uReflect;uniform vec4 uHull;uniform float uHeading;uniform float uContact;
        varying vec3 vWorld;varying vec3 vNormal;varying vec4 vReflection;varying float vOcean;varying float vBank;
        void main(){
          vec2 p=vWorld.xz;float distanceToEye=length(cameraPosition-vWorld);
          vec3 view=normalize(cameraPosition-vWorld);
          vec3 r1=texture2D(uRipples,p*.055+vec2(uTime*.013,-uTime*.009)).rgb;
          vec3 r2=texture2D(uRipples,p*.16+vec2(-uTime*.019,uTime*.011)).rgb;
          float micro=1.-smoothstep(25.,210.,distanceToEye);
          vec2 ripples=(r1.rg*2.-1.)*.095+(r2.rg*2.-1.)*.045*micro;
          vec3 n=normalize(vNormal+vec3(ripples.x,0.,ripples.y));
          float ndv=max(dot(n,view),0.);float fresnel=.025+.975*pow(1.-ndv,5.);
          float shore=texture2D(uShore,vec2((p.x-uMapBounds.x)/uMapBounds.z,1.-(p.y-uMapBounds.y)/uMapBounds.w)).r;
          float bed=.82+.18*sin(p.x*.13+sin(p.y*.16))*sin(p.y*.18);
          vec3 deep=mix(vec3(.008,.105,.125),vec3(.045,.35,.265)*bed,smoothstep(.01,.78,shore));
          float bank=vBank;deep=mix(deep,vec3(.13,.37,.27)*bed,bank*.63);
          vec3 reflected=reflect(-view,n);
          vec3 sky=mix(vec3(.50,.70,.75),vec3(.055,.245,.44),pow(max(reflected.y,0.),.42));
          vec3 reflection=sky;
          if(uReflect>.5){
            vec2 uv=vReflection.xy/vReflection.w+ripples*.065+vNormal.xz*.028;
            vec3 planar=texture2D(uReflection,clamp(uv,vec2(.002),vec2(.998))).rgb;
            reflection=mix(sky,planar,.78);
          }
          vec3 colour=mix(deep,reflection,.12+fresnel*.77);
          float crest=smoothstep(.15,.9,vWorld.y)*.07;
          colour+=vec3(.08,.31,.26)*crest;
          vec3 halfVector=normalize(view+uSun);
          float spec=pow(max(dot(n,halfVector),0.),350.);
          float sheen=pow(max(dot(n,halfVector),0.),45.);
          colour+=vec3(1.55,1.25,.76)*(spec*.72+sheen*.035);
          float caustic=pow(max(0.,sin(p.x*1.7+r1.b*3.)*sin(p.y*1.3-r2.b*2.)),7.);
          colour+=vec3(.12,.22,.13)*caustic*shore*micro*.35;
          float foam=smoothstep(.23,.43,shore)*(1.-smoothstep(.53,.82,shore));
          foam*=smoothstep(.55,.87,r1.b*.55+r2.b*.3+sin(shore*40.-uTime*1.7)*.15);
          colour=mix(colour,vec3(.66,.83,.77),foam*.32);
          // Broken whitecaps cluster on the steep upper faces of exposed swell.
          float face=smoothstep(.0025,.022,1.-vNormal.y);
          float breaking=vOcean*smoothstep(.35-bank*.2,1.05-bank*.3,vWorld.y)*(.2+face*.8)*(1.+bank*.65);
          float bubbles=smoothstep(.44,.7,r1.b*.72+r2.b*.28);
          colour=mix(colour,vec3(.86,.93,.89),breaking*bubbles*.75);
          float trough=1.-smoothstep(-.7,.05,vWorld.y)*vOcean;
          colour*=1.-trough*.09;
          vec2 local=p-uHull.xy;float s=sin(uHeading),c=cos(uHeading);
          vec2 hullSpace=vec2(local.x*c-local.y*s,local.x*s+local.y*c);
          float shadow=exp(-dot(hullSpace/uHull.zw,hullSpace/uHull.zw)*2.4)*uContact;
          colour*=1.-shadow*.42;
          float fog=1.-exp(-distanceToEye*.00095);
          colour=mix(colour,vec3(.47,.64,.68),fog);
          gl_FragColor=vec4(colour,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.scene=scene;this.mesh=null;this.reflector=null;this.setQuality(quality);
  }
  setQuality(quality) {
    this.reflectionHz=quality.reflectionHz||0;this.lastReflection=-Infinity;this.reflectionCaptures=0;
    if(this.mesh){this.scene.remove(this.mesh);this.mesh.geometry.dispose();}
    const g=new THREE.PlaneGeometry(2,2,quality.waterSegments,quality.waterSegments);g.rotateX(-Math.PI/2);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setX(i,Math.sign(x)*Math.pow(Math.abs(x),2.4)*1050);p.setZ(i,Math.sign(z)*Math.pow(Math.abs(z),2.4)*1050);}
    this.mesh=new THREE.Mesh(g,this.material);this.mesh.frustumCulled=false;this.scene.add(this.mesh);
    this.reflector?.dispose();this.reflector?.geometry.dispose();this.reflector=null;
    if(quality.reflectionSize){
      this.reflector=new Reflector(new THREE.PlaneGeometry(2100,2100),{textureWidth:quality.reflectionSize,textureHeight:quality.reflectionSize,clipBias:.003,multisample:0});
      this.reflector.rotation.x=-Math.PI/2;this.reflector.updateMatrixWorld();
      this.material.uniforms.uReflection.value=this.reflector.getRenderTarget().texture;
      this.material.uniforms.uReflectionMatrix.value=this.reflector.material.uniforms.textureMatrix.value;
    }
    this.material.uniforms.uReflect.value=0;
  }
  update(t,x,z,v) {
    const u=this.material.uniforms;u.uTime.value=t;u.uSea.value=seaAmplitude(t);u.uCenter.value.set(x,z);
    if(v){u.uHull.value.set(x,z,v.config.width*.72,v.config.length*.62);u.uHeading.value=v.heading;u.uContact.value=v.airborne?Math.max(0,1-v.y/4):1;}
  }
  reflect(renderer,camera) {
    if(!this.reflector)return;
    const now=performance.now()/1000;if(now-this.lastReflection<1/Math.max(1,this.reflectionHz))return;this.lastReflection=now;
    camera.updateMatrixWorld();this.mesh.visible=false;
    try{this.reflector.onBeforeRender(renderer,this.scene,camera);this.material.uniforms.uReflect.value=1;this.reflectionCaptures++;}
    finally{this.mesh.visible=true;}
  }
}
