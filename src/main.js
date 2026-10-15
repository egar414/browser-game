import * as THREE from 'three';
import { createAtmosphere, SUN_DIRECTION } from './systems/atmosphere.js';
import './style.css';
import { FIXED_STEP, VEHICLES, QUALITY, RIDE_MODES } from './config.js';
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
const scene=new THREE.Scene();scene.background=new THREE.Color('#9bbdc7');scene.fog=new THREE.FogExp2('#91aeb5',.00105);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,2200);
const chase=new ChaseCamera(camera),audio=new GameAudio(settings);
const vehicle=new VehiclePhysics(settings.vehicle,collision,event=>{
  activities?.event(event);
  if(event.type==='splash'){spray?.splash(vehicle,event.impact);audio.splash(event.impact);}
  if(event.type==='wipeout')spray?.splash(vehicle,8);
  if(event.type==='bump'||event.type==='boundary')ui?.toast(event.label);
});
vehicle.setMode(settings.rideMode);vehicle.setTrim(settings[settings.vehicle==='ski'?'trimSki':'trimCat']);
function setRideMode(mode){vehicle.setMode(mode);settings.rideMode=vehicle.rideMode;persistTrim();saveSettings(settings);document.getElementById('ride-mode').value=mode;ui.toast(`${RIDE_MODES[mode].name} mode`,RIDE_MODES[mode].description);}
function persistTrim(){const key=vehicle.type==='ski'?'trimSki':'trimCat';if(settings[key]!==vehicle.trimDegrees){settings[key]=vehicle.trimDegrees;saveSettings(settings);}}
const input=new Input(code=>{
  if(code==='Blur'){if(state==='playing')pause();return;}
  if(code==='Escape'){if(state==='controls')closeControls();else if(state==='paused')resume();else pause();return;}
  if(code==='KeyH'){showControls();return;}
  if(code==='KeyM'){mute();return;}
  if(state!=='playing')return;
  if(code==='KeyT'){const modes=Object.keys(RIDE_MODES);setRideMode(modes[(modes.indexOf(vehicle.rideMode)+1)%modes.length]);}
  if(code==='KeyR')recover();
  if(code==='KeyC'){settings.camera=1-settings.camera;saveSettings(settings);ui.toast(settings.camera?'Close riding view':'Wide chase view');}
  if(code==='KeyF')activities.startRace(vehicle);
  if(code==='KeyG')activities.startChallenge();
});
const ui=new UI(settings,{
  play,resume,pause,home,controls:showControls,closeControls,recover,mute,
  freeRoam(){activities.cancel();resume();ui.toast('Free roam','No clock. Find your own line.');},
  vehicle(type){settings.vehicle=type;saveSettings(settings);vehicle.setType(type);vehicle.setTrim(settings[type==='ski'?'trimSki':'trimCat']);replaceModel();ui.selectVehicle();chase.reset();},
  colour(index){settings.colour=index;saveSettings(settings);replaceModel();ui.selectVehicle();},
  setting(key,value){if(key==='rideMode'){setRideMode(value);return;}settings[key]=value;saveSettings(settings);if(key==='quality')applyQuality();},
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
  if(spray){spray.dispose();spray=new Spray(scene,q);}
  saveSettings(settings);
}
function pause(){if(state!=='playing')return;persistTrim();state='paused';input.clear();ui.show('pause',true);}
function resume(){if(!ready)return;state='playing';input.clear();audio.start();ui.show('pause',false);ui.show('controls',false);last=performance.now();}
function play(){if(!ready)return;home(false);state='playing';vehicle.recover();spray?.clear();chase.reset();audio.start();input.clear();ui.show('home',false);ui.show('hud',true);ui.toast('Welcome to Mooloolaba','WASD to drive · T riding mode · Q/E trim · H for moves');}
function home(show=true){if(!show)return;state='home';activities.cancel();input.clear();vehicle.recover();spray?.clear();chase.reset();ui.show('home',true);ui.show('hud',false);ui.show('pause',false);}
function recover(){vehicle.recover(true);spray?.clear();input.clear();chase.reset();activities.combo=0;activities.comboTime=0;ui.toast('Back in safe water','Fresh start. Send it again.');if(state==='paused')resume();}
function showControls(){if(state==='controls')return;controlsFrom=state;state='controls';input.clear();ui.show('controls',true);}
function closeControls(){ui.show('controls',false);state=controlsFrom;input.clear();last=performance.now();}
function mute(){settings.muted=!settings.muted;saveSettings(settings);ui.toast(settings.muted?'Audio muted':'Audio on');}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);
window.addEventListener('pagehide',persistTrim);
try {
  renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#game'),antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const atmosphere=createAtmosphere(scene,renderer);
  scene.add(new THREE.HemisphereLight('#bddde8','#526254',.8));
  const sun=new THREE.DirectionalLight('#ffe4bb',2.5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-48;sun.shadow.camera.right=48;sun.shadow.camera.top=48;sun.shadow.camera.bottom=-48;sun.shadow.camera.far=700;sun.shadow.bias=-.0006;sun.shadow.normalBias=.035;scene.add(sun);scene.add(sun.target);
  applyQuality();environment=buildEnvironment(scene,QUALITY[qualityName]);water=new Water(scene,QUALITY[qualityName]);spray=new Spray(scene,QUALITY[qualityName]);replaceModel();
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
    const render={...vehicle,x:THREE.MathUtils.lerp(p.x,vehicle.x,alpha),y:THREE.MathUtils.lerp(p.y,vehicle.y,alpha),z:THREE.MathUtils.lerp(p.z,vehicle.z,alpha),heading:THREE.MathUtils.lerp(p.heading,vehicle.heading,alpha),pitch:THREE.MathUtils.lerp(p.pitch,vehicle.pitch,alpha),roll:THREE.MathUtils.lerp(p.roll,vehicle.roll,alpha)};
    model.position.set(render.x,render.y,render.z);model.rotation.set(-render.pitch,render.heading,render.roll,'YXZ');
    if(model.userData.handlebars)model.userData.handlebars.rotation.y=-vehicle.steer*.43;
    for(const part of [model.userData.motor,model.userData.nozzle])if(part)part.rotation.set(vehicle.drive.trimAngle,-vehicle.drive.steeringAngle,0,'YXZ');
    if(model.userData.bucket)model.userData.bucket.rotation.x=vehicle.drive.reverse*1.3;
    if(model.userData.propeller)model.userData.propeller.rotation.z+=vehicle.drive.rpm/60*Math.PI*2*dt;
    model.userData.rider.userData.update(vehicle,dt,model.userData);
    if(state==='playing'&&input.sample().trim===0)persistTrim();
    water.update(simulationTime,render.x,render.z,vehicle);spray.update(state==='playing'?dt:0,render,simulationTime,state==='playing',input.sample());
    chase.update(dt,render,input,settings.camera,state==='home');atmosphere.update(simulationTime,camera.position);
    spray.resize(innerHeight,camera.fov,renderer.getPixelRatio());
    sun.position.set(vehicle.x+SUN_DIRECTION.x*400,SUN_DIRECTION.y*400,vehicle.z+SUN_DIRECTION.z*400);sun.target.position.set(vehicle.x,0,vehicle.z);
    audio.update(vehicle,state==='playing');uiTime+=dt;if(uiTime>.09){ui.update(uiTime,vehicle,activities,fps,qualityName);uiTime=0;}
    water.reflect(renderer,camera);renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  // Read-only diagnostics for browser acceptance tests. No scoring or teleport cheats in the shipped game.
  window.__ESTUARY__={get status(){return {ready,state,vehicle:vehicle.type,position:{x:vehicle.x,y:vehicle.y,z:vehicle.z},speed:vehicle.speed,forwardSpeed:vehicle.vx*Math.sin(vehicle.heading)+vehicle.vz*Math.cos(vehicle.heading),throttle:vehicle.throttle,heading:vehicle.heading,pitch:vehicle.pitch,rideMode:vehicle.rideMode,trim:vehicle.trimDegrees,trimIndex:vehicle.trimIndex,planing:vehicle.planing,wettedFraction:vehicle.wettedFraction,drive:{...vehicle.drive},airborne:vehicle.airborne,slip:vehicle.slip,wipeout:vehicle.wipeout,score:activities.score,liveParticles:spray.particles.filter(p=>p.life>0).length,spray:{left:spray.state.left,right:spray.state.right,wakeSamples:spray.wake.history.length,reflections:!!water.reflector},race:activities.race?{...activities.race}:null,challenge:activities.challenge?{...activities.challenge}:null,quality:qualityName,fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,settings:{...settings}};}};
} catch(error){console.error(error);ui.error(`WebGL could not start: ${error.message}. Use a current Chrome, Edge, Firefox or Safari with hardware acceleration enabled.`);}
