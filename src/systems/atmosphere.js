import * as THREE from 'three';
import{COASTAL_STYLE as ART,glslColour}from'./art-direction.js';

export const SUN_DIRECTION = new THREE.Vector3(-0.36, 0.48, -0.8).normalize();

export function createAtmosphere(scene, renderer) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: SUN_DIRECTION }, uTime: { value: 0 }, uHorizon:{value:new THREE.Color(ART.skyHorizon)},uZenith:{value:new THREE.Color(ART.skyZenith)},uDaylight:{value:1},uWarm:{value:0} },
    vertexShader: `varying vec3 vDirection;
      void main(){vDirection=position;vec4 clip=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=clip.xyww;}`,
    fragmentShader: `
      varying vec3 vDirection;uniform vec3 uSun;uniform float uTime;uniform vec3 uHorizon;uniform vec3 uZenith;uniform float uDaylight;uniform float uWarm;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 p){return noise(p)*.53+noise(p*2.03+7.1)*.27+noise(p*4.07+3.8)*.13+noise(p*8.13)*.07;}
      void main(){
        vec3 d=normalize(vDirection);float elevation=max(d.y,0.);
        vec3 colour=mix(uHorizon,uZenith,pow(elevation,.42));
        float towardSun=max(dot(d,uSun),0.);
        colour+=vec3(.9,.32,.1)*pow(towardSun,16.)*(.12+uWarm*.6)*uDaylight;
        colour+=vec3(7.,4.9,2.6)*pow(towardSun,9000.)*smoothstep(-.05,.05,uSun.y);
        vec2 p=d.xz/max(d.y+.12,.13)*1.9+vec2(uTime*.0015,0.);
        float cloud=fbm(p+fbm(p*.7)*.8);
        float density=smoothstep(.47,.65,cloud)*smoothstep(.035,.18,d.y);
        float sunlight=clamp(.55+(fbm(p+uSun.xz*.3)-cloud)*3.5,0.,1.);
        vec3 cloudColour=mix(vec3(.40,.49,.69),vec3(1.12,1.10,1.03),sunlight);
        cloudColour*=.16+uDaylight*.84;cloudColour+=vec3(.45,.12,.04)*uWarm;colour=mix(colour,cloudColour,density*.94);
        float highCloud=smoothstep(.60,.75,fbm(p*vec2(.55,3.)+22.))*smoothstep(.15,.5,d.y);
        colour=mix(colour,vec3(.84,.88,.86),highCloud*.17);
        colour=mix(colour,vec3(.37,.57,.63)*(.2+uDaylight*.8),1.-smoothstep(-.2,.01,d.y));
        float star=step(.9985,hash(floor(d.xz/max(d.y,.05)*450.)))*smoothstep(.1,.6,d.y)*(1.-uDaylight);colour+=vec3(star*.6);gl_FragColor=vec4(colour,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1800, 28, 16), material);
  dome.frustumCulled = false; dome.renderOrder = -100; scene.add(dome);
  // A small filtered capture lights paint, glass and metal without asset downloads.
  const environmentScene = new THREE.Scene();
  environmentScene.add(new THREE.Mesh(dome.geometry, material));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .06, .1, 2000, { size: 128 });
  scene.environment = environment.texture; scene.environmentIntensity = .8;
  pmrem.dispose();
  return { update(time,position,day) { material.uniforms.uTime.value = time;if(day){SUN_DIRECTION.set(day.direction.x,day.direction.y,day.direction.z).normalize();material.uniforms.uHorizon.value.set(day.horizon);material.uniforms.uZenith.value.set(day.zenith);material.uniforms.uDaylight.value=day.daylight;material.uniforms.uWarm.value=day.warm;scene.environmentIntensity=.2+day.daylight*.6;}if(position)dome.position.copy(position); }, dispose() { environment.dispose(); } };
}
