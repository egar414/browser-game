import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import './style.css';
import { FIXED_STEP, VEHICLES, QUALITY } from './config.js';
import { VehiclePhysics } from './vehicles/physics.js';
import { makeVehicle } from './vehicles/models.js';
import { buildEnvironment, collision, ramps } from './systems/environment.js';
import { Water, Spray } from './systems/water.js';
import { Input } from './systems/input.js';
import { ChaseCamera } from './systems/camera.js';
import { GameAudio } from './systems/audio.js';
import { UI } from './systems/ui.js';
import { loadSettings, saveSettings } from './systems/storage.js';
import { Activities } from './systems/activities.js';

const settings=loadSettings();let state='home',controlsFrom='home',ready=false,renderer,model,water,spray,environment,qualityName='Medium';
let simulationTime=0,accumulator=0,last=performance.now(),fps=60,frameCount=0,fpsTime=0,uiTime=0,lowFrames=0;
const scene=new THREE.Scene();scene.background=new THREE.Color('#b8cdd0');scene.fog=new THREE.FogExp2('#bdcec6',.00105);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,2200);
const chase=new ChaseCamera(camera),audio=new GameAudio(settings);
const vehicle=new VehiclePhysics(settings.vehicle,collision,event=>{
  activities?.event(event);
  if(event.type==='splash'){spray?.splash(vehicle,event.impact);audio.splash(event.impact);}
  if(event.type==='wipeout')spray?.splash(vehicle,8);
  if(event.type==='bump'||event.type==='boundary')ui?.toast(event.label);
});
const input=new Input(code=>{
  if(code==='Blur'){if(state==='playing')pause();return;}
  if(code==='Escape'){if(state==='controls')closeControls();else if(state==='paused')resume();else pause();return;}
  if(code==='KeyH'){showControls();return;}
  if(code==='KeyM'){mute();return;}
  if(state!=='playing')return;
  if(code==='KeyR')recover();
  if(code==='KeyC'){settings.camera=1-settings.camera;saveSettings(settings);ui.toast(settings.camera?'Close riding view':'Wide chase view');}
  if(code==='KeyF')activities.startRace(vehicle);
  if(code==='KeyG')activities.startChallenge();
});
const ui=new UI(settings,{
  play,resume,pause,home,controls:showControls,closeControls,recover,mute,
  freeRoam(){activities.cancel();resume();ui.toast('Free roam','No clock. Find your own line.');},
  vehicle(type){settings.vehicle=type;saveSettings(settings);vehicle.setType(type);replaceModel();ui.selectVehicle();chase.reset();},
  colour(index){settings.colour=index;saveSettings(settings);replaceModel();ui.selectVehicle();},
  setting(key,value){settings[key]=value;saveSettings(settings);if(key==='quality')applyQuality();},
  race(){if(state==='playing')activities.startRace(vehicle);},challenge(){if(state==='playing')activities.startChallenge();},
});
const activities=new Activities(scene,settings,(title,subtitle)=>ui.toast(title,subtitle));
function replaceModel(){
  if(model){scene.remove(model);model.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material?.map)o.material.map.dispose();});}
  model=makeVehicle(settings.vehicle,VEHICLES[settings.vehicle].colours[settings.colour]);scene.add(model);
}
function selectedQuality(){return settings.quality==='Auto'?((navigator.hardwareConcurrency||4)>=8&&innerWidth<2200?'High':'Medium'):settings.quality;}
function applyQuality(force){
  qualityName=force||selectedQuality();const q=QUALITY[qualityName];
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.pixelRatio));renderer.shadowMap.enabled=q.shadows;
  water?.setQuality(q);
  if(spray){scene.remove(spray.points);spray.points.geometry.dispose();spray.material.dispose();spray=new Spray(scene,q.particles);}
  saveSettings(settings);
}
function pause(){if(state!=='playing')return;state='paused';input.clear();ui.show('pause',true);}
function resume(){if(!ready)return;state='playing';input.clear();audio.start();ui.show('pause',false);ui.show('controls',false);last=performance.now();}
function play(){if(!ready)return;home(false);state='playing';vehicle.recover();chase.reset();audio.start();input.clear();ui.show('home',false);ui.show('hud',true);ui.toast('Welcome to Pelican Estuary','WASD to drive · Shift to spray · H for special moves');}
function home(show=true){if(!show)return;state='home';activities.cancel();input.clear();vehicle.recover();chase.reset();ui.show('home',true);ui.show('hud',false);ui.show('pause',false);}
function recover(){vehicle.recover(true);input.clear();chase.reset();activities.combo=0;activities.comboTime=0;ui.toast('Back in safe water','Fresh start. Send it again.');if(state==='paused')resume();}
function showControls(){if(state==='controls')return;controlsFrom=state;state='controls';input.clear();ui.show('controls',true);}
function closeControls(){ui.show('controls',false);state=controlsFrom;input.clear();last=performance.now();}
function mute(){settings.muted=!settings.muted;saveSettings(settings);ui.toast(settings.muted?'Audio muted':'Audio on');}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);
try {
  renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#game'),antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const sky=new Sky();sky.scale.setScalar(2000);sky.material.uniforms.turbidity.value=3.8;sky.material.uniforms.rayleigh.value=1.4;sky.material.uniforms.mieCoefficient.value=.003;sky.material.uniforms.mieDirectionalG.value=.8;
  sky.material.uniforms.sunPosition.value.set(-500,500,-300);scene.add(sky);
  scene.add(new THREE.HemisphereLight('#d7ece8','#69745b',2.6));
  const sun=new THREE.DirectionalLight('#ffde9c',3.1);sun.position.set(-150,260,-120);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=45;sun.shadow.camera.bottom=-45;sun.shadow.camera.far=600;sun.shadow.bias=-.001;scene.add(sun);scene.add(sun.target);
  applyQuality();environment=buildEnvironment(scene,QUALITY[qualityName]);water=new Water(scene,QUALITY[qualityName]);spray=new Spray(scene,QUALITY[qualityName].particles);replaceModel();
  ready=true;ui.ready();
  const canvas=document.querySelector('#game');canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();ui.error('The graphics connection was lost. Reload to relaunch. Try Low quality if this repeats.');});
  function frame(now){
    requestAnimationFrame(frame);
    const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(.1,elapsed);last=now;fpsTime+=elapsed;frameCount++;
    if(fpsTime>=1){fps=frameCount/fpsTime;fpsTime=0;frameCount=0;if(state==='playing'&&settings.quality==='Auto'){lowFrames=fps<28?lowFrames+1:0;if(lowFrames>6&&qualityName!=='Low'){applyQuality(qualityName==='High'?'Medium':'Low');lowFrames=0;ui.toast('Keeping it smooth',`Auto quality adjusted to ${qualityName}.`);}}}
    if(state==='playing'){
      accumulator=Math.min(.12,accumulator+dt);
      while(accumulator>=FIXED_STEP){simulationTime+=FIXED_STEP;vehicle.update(FIXED_STEP,input.sample(),simulationTime,ramps);activities.update(FIXED_STEP,vehicle);accumulator-=FIXED_STEP;}
    }else if(state==='home'){simulationTime+=dt;vehicle.y=.14;vehicle.pitch=Math.sin(simulationTime*.7)*.015;vehicle.roll=Math.sin(simulationTime*.6)*.018;}
    const alpha=state==='playing'?accumulator/FIXED_STEP:1,p=vehicle.previous;
    const render={...vehicle,x:THREE.MathUtils.lerp(p.x,vehicle.x,alpha),y:THREE.MathUtils.lerp(p.y,vehicle.y,alpha),z:THREE.MathUtils.lerp(p.z,vehicle.z,alpha),heading:THREE.MathUtils.lerp(p.heading,vehicle.heading,alpha)};
    model.position.set(render.x,render.y,render.z);model.rotation.set(-vehicle.pitch,render.heading,vehicle.roll,'YXZ');
    const rider=model.userData.rider;rider.rotation.z=vehicle.steer*.08;rider.rotation.x=-Math.max(0,vehicle.throttle)*.045;
    if(model.userData.motor)model.userData.motor.rotation.y=-vehicle.steer*.48;
    water.update(simulationTime,render.x,render.z);spray.update(state==='playing'?dt:0,vehicle,simulationTime,state==='playing');
    chase.update(dt,render,input,settings.camera,state==='home');
    sun.position.set(vehicle.x-150,260,vehicle.z-120);sun.target.position.set(vehicle.x,0,vehicle.z);
    audio.update(vehicle,state==='playing');uiTime+=dt;if(uiTime>.09){ui.update(uiTime,vehicle,activities,fps,qualityName);uiTime=0;}
    renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  // Read-only diagnostics for browser acceptance tests. No scoring or teleport cheats in the shipped game.
  window.__ESTUARY__={get status(){return {ready,state,vehicle:vehicle.type,position:{x:vehicle.x,y:vehicle.y,z:vehicle.z},speed:vehicle.speed,forwardSpeed:vehicle.vx*Math.sin(vehicle.heading)+vehicle.vz*Math.cos(vehicle.heading),throttle:vehicle.throttle,heading:vehicle.heading,pitch:vehicle.pitch,airborne:vehicle.airborne,slip:vehicle.slip,wipeout:vehicle.wipeout,score:activities.score,liveParticles:spray.particles.filter(p=>p.life>0).length,race:activities.race?{...activities.race}:null,challenge:activities.challenge?{...activities.challenge}:null,quality:qualityName,fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,settings:{...settings}};}};
} catch(error){console.error(error);ui.error(`WebGL could not start: ${error.message}. Use a current Chrome, Edge, Firefox or Safari with hardware acceleration enabled.`);}
