import * as THREE from 'three';
import { createAtmosphere, SUN_DIRECTION } from './systems/atmosphere.js';
import './style.css';
import { FIXED_STEP, VEHICLES, QUALITY, RIDE_MODES, setSeaState, SEA_STATES, setWeatherClock, oceanReport, waveHeight, SPAWN } from './config.js';
import { VehiclePhysics } from './vehicles/physics.js';
import { makeVehicle, loadCraftAssets } from './vehicles/models.js';
import { buildEnvironment, collision, ramps, solids } from './systems/environment.js';
import { Water, Spray } from './systems/water.js';
import { Input } from './systems/input.js';
import { TouchControls, isTouchDevice } from './systems/touch-controls.js';
import { ChaseCamera } from './systems/camera.js';
import { GameAudio } from './systems/audio.js';
import { UI } from './systems/ui.js';
import { loadSettings, saveSettings } from './systems/storage.js';
import { SprayBattle } from './systems/spray-battle.js';
import { DESIGNS,TUNING,validLoadout,hasUnlock } from './systems/progression.js';
import { CanalPlayground } from './systems/canal-targets.js';
import { Activities } from './systems/activities.js';
import { BarGuide, BAR_LAUNCH } from './systems/bar-guide.js';

const settings=loadSettings();validLoadout(settings);setSeaState(settings.seaState,0,true);let state='home',controlsFrom='home',ready=false,renderer,model,water,spray,environment,qualityName='Medium';
let playground,barGuide;
let simulationTime=0,accumulator=0,last=performance.now(),fps=60,frameCount=0,fpsTime=0,uiTime=0,lowFrames=0;
const scene=new THREE.Scene();scene.background=new THREE.Color('#9bbdc7');scene.fog=new THREE.FogExp2('#a2b9bd',.00082);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,2200);
const chase=new ChaseCamera(camera),audio=new GameAudio(settings);
const vehicle=new VehiclePhysics(settings.vehicle,collision,event=>{
  activities?.event(event);
  if(event.type==='splash'){spray?.splash(vehicle,event.impact);audio.splash(event.impact);}
  if(event.type==='wipeout')spray?.splash(vehicle,8);
  if(event.type==='bump'||event.type==='boundary')ui?.toast(event.label);
});
vehicle.tuning=settings.tuning;vehicle.setMode(settings.rideMode);vehicle.setTrim(settings[settings.vehicle==='ski'?'trimSki':'trimCat']);
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
  if(code==='KeyB')startBattle();
  if(code==='KeyN')toggleBar();
  if(code==='KeyF'){battle.cancel();activities.startRace(vehicle);}
  if(code==='KeyG'){battle.cancel();activities.startChallenge();}
});
const ui=new UI(settings,{
  play,resume,pause,home,controls:showControls,closeControls,recover,mute,
  freeRoam(){battle.cancel();activities.cancel();resume();ui.toast('Free roam','No clock. Find your own line.');},
  vehicle(type){settings.vehicle=type;saveSettings(settings);vehicle.setType(type);vehicle.setTrim(settings[type==='ski'?'trimSki':'trimCat']);replaceModel();ui.selectVehicle();chase.reset();},
  colour(index){settings.colour=index;saveSettings(settings);replaceModel();ui.selectVehicle();},
  loadout(key,value){const options=key==='design'?DESIGNS:TUNING;if(!options[value]||!hasUnlock(settings,options[value]))return;settings[key]=value;vehicle.tuning=settings.tuning;saveSettings(settings);replaceModel();ui.selectVehicle();},
  setting(key,value){if(key==='seaState'){settings.seaState=value;setSeaState(value,simulationTime);saveSettings(settings);ui.toast(SEA_STATES[value].name,'Water conditions change smoothly. Faster crests can launch wave hops.');return;}if(key==='rideMode'){setRideMode(value);return;}settings[key]=value;saveSettings(settings);if(key==='quality')applyQuality();},
  race(){if(state==='playing'){battle.cancel();activities.startRace(vehicle);}},challenge(){if(state==='playing'){battle.cancel();activities.startChallenge();}},battle:startBattle,bar:toggleBar,visitBar,
});
new TouchControls(input);
const activities=new Activities(scene,settings,(title,subtitle)=>ui.toast(title,subtitle));
const battle=new SprayBattle(scene,event=>{
  if(event.type==='score')activities.event(event);
  else{if(event.type==='battle-sink'){activities.combo=0;activities.comboTime=0;input.clear();}if(event.type==='battle-recover'){input.clear();spray?.clear();}ui.toast(event.label,event.detail);}
});
function startBattle(){if(state!=='playing')return;activities.cancel();battle.start(vehicle);}
function toggleBar(){
  if(state!=='playing'||!barGuide)return;
  barGuide.toggle(vehicle);
  if(barGuide.active){battle.cancel();activities.cancel();if(settings.seaState==='calm'){settings.seaState='swell';setSeaState('swell',simulationTime);saveSettings(settings);document.getElementById('sea-state').value='swell';}
    ui.toast('Route to the bar marked','Follow the orange route out between the rock walls, then right around the headland. Calm seas switch to Rolling swell.');
  }else ui.toast('Bar guide off');
}
function visitBar(){
  if(!ready||!barGuide)return;
  battle.cancel();activities.cancel();activities.combo=0;activities.comboTime=0;vehicle.safe={...BAR_LAUNCH};vehicle.recover();vehicle.y=waveHeight(vehicle.x,vehicle.z,simulationTime)+vehicle.config.rideHeight;vehicle.previous=vehicle.snapshot();
  spray.clear();chase.reset();input.clear();barGuide.active=false;resume();toggleBar();ui.toast('At the bar wave zone','Orange buoys mark the bank. Carry speed across the crests. Pause → Rolling swell for larger sets.');
}
function replaceModel(){
  if(model){scene.remove(model);model.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material?.map)o.material.map.dispose();});}
  model=makeVehicle(settings.vehicle,VEHICLES[settings.vehicle].colours[settings.colour],settings.design);scene.add(model);
}
function selectedQuality(){return settings.quality==='Auto'?(isTouchDevice()?'Low':(navigator.hardwareConcurrency||4)>=8&&innerWidth<2200?'High':'Medium'):settings.quality;}
function applyQuality(force){
  qualityName=force||selectedQuality();const q=QUALITY[qualityName];
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.pixelRatio));renderer.shadowMap.enabled=q.shadows;
  water?.setQuality(q);
  if(spray){spray.dispose();spray=new Spray(scene,q);}
  saveSettings(settings);
}
function pause(){if(state!=='playing')return;persistTrim();state='paused';input.clear();ui.show('pause',true);}
function resume(){if(!ready)return;state='playing';input.clear();audio.start();ui.show('pause',false);ui.show('controls',false);last=performance.now();}
function play(){if(!ready)return;home(false);state='playing';vehicle.safe={...SPAWN};vehicle.recover();spray?.clear();chase.reset();audio.start();input.clear();ui.show('home',false);ui.show('hud',true);ui.toast('Launched beside The Wharf',isTouchDevice()?'Hold GO to drive · arrows steer · tap LIFT for bow rides':'WASD to drive · T riding mode · Q/E trim · H for moves');}
function home(show=true){if(!show)return;ui.updateGarage();state='home';if(barGuide)barGuide.active=false;battle.cancel();activities.cancel();input.clear();vehicle.recover();spray?.clear();chase.reset();ui.show('home',true);ui.show('hud',false);ui.show('pause',false);}
function recover(){battle.recover();vehicle.recover(true);spray?.clear();input.clear();chase.reset();activities.combo=0;activities.comboTime=0;ui.toast('Back in safe water','Fresh start. Send it again.');if(state==='paused')resume();}
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
  const sun=new THREE.DirectionalLight('#ffe4bb',2.5);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-140;sun.shadow.camera.right=140;sun.shadow.camera.top=140;sun.shadow.camera.bottom=-140;sun.shadow.camera.far=700;sun.shadow.bias=-.0006;sun.shadow.normalBias=.035;scene.add(sun);scene.add(sun.target);
  applyQuality();environment=buildEnvironment(scene,QUALITY[qualityName]);playground=new CanalPlayground(scene,solids,e=>activities.event(e));barGuide=new BarGuide(scene,solids);water=new Water(scene,QUALITY[qualityName]);spray=new Spray(scene,QUALITY[qualityName]);replaceModel();
  document.getElementById('loading').textContent='Preparing watercraft…';
  loadCraftAssets().then(()=>{replaceModel();ready=true;ui.ready();}).catch(error=>{console.warn('Detailed craft load failed',error);ready=true;ui.ready();ui.toast('Lightweight craft loaded','The detailed model could not load. Reload to try again.');});
  const canvas=document.querySelector('#game');canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();ui.error('The graphics connection was lost. Reload to relaunch. Try Low quality if this repeats.');});
  function frame(now){
    requestAnimationFrame(frame);if(document.hidden){last=now;return;}setWeatherClock(Date.now()/1000);
    const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(.1,elapsed);last=now;fpsTime+=elapsed;frameCount++;
    if(fpsTime>=1){fps=frameCount/fpsTime;fpsTime=0;frameCount=0;if(state==='playing'&&settings.quality==='Auto'){lowFrames=fps<28?lowFrames+1:0;if(lowFrames>6&&qualityName!=='Low'){applyQuality(qualityName==='High'?'Medium':'Low');lowFrames=0;ui.toast('Keeping it smooth',`Auto quality adjusted to ${qualityName}.`);}}}
    if(state==='playing'){
      accumulator=Math.min(.12,accumulator+dt);
      while(accumulator>=FIXED_STEP){simulationTime+=FIXED_STEP;if(!battle.sinking)vehicle.update(FIXED_STEP,input.sample(true),simulationTime,ramps);battle.update(FIXED_STEP,vehicle,simulationTime);activities.update(FIXED_STEP,vehicle);playground.update(FIXED_STEP,vehicle,simulationTime,!activities.race&&!battle.active);accumulator-=FIXED_STEP;}
    }else if(state==='home'){simulationTime+=dt;vehicle.y=.14;vehicle.pitch=Math.sin(simulationTime*.7)*.015;vehicle.roll=Math.sin(simulationTime*.6)*.018;}
    const alpha=state==='playing'?accumulator/FIXED_STEP:1,p=vehicle.previous;
    const render={...vehicle,x:THREE.MathUtils.lerp(p.x,vehicle.x,alpha),y:THREE.MathUtils.lerp(p.y,vehicle.y,alpha),z:THREE.MathUtils.lerp(p.z,vehicle.z,alpha),heading:THREE.MathUtils.lerp(p.heading,vehicle.heading,alpha),pitch:THREE.MathUtils.lerp(p.pitch,vehicle.pitch,alpha),roll:THREE.MathUtils.lerp(p.roll,vehicle.roll,alpha)};
    model.position.set(render.x,render.y-(battle.sinking?(4-battle.sinking)*.6:0),render.z);model.rotation.set(-render.pitch,render.heading,render.roll+(battle.sinking?.5:0),'YXZ');
    if(model.userData.handlebars)model.userData.handlebars.rotation.y=-vehicle.steer*.43;
    for(const part of [model.userData.motor,model.userData.nozzle])if(part)part.rotation.set(vehicle.drive.trimAngle,-vehicle.drive.steeringAngle,0,'YXZ');
    if(model.userData.bucket)model.userData.bucket.rotation.x=vehicle.drive.reverse*1.3;
    if(model.userData.propeller)model.userData.propeller.rotation.z+=vehicle.drive.rpm/60*Math.PI*2*dt;
    model.userData.rider.userData.update(vehicle,dt,model.userData);
    if(state==='playing'&&input.sample().trim===0)persistTrim();
    environment.userData.update?.(simulationTime);playground.render(simulationTime);barGuide.update(vehicle);barGuide.render(simulationTime);water.update(simulationTime,render.x,render.z,vehicle);spray.update(state==='playing'?dt:0,render,simulationTime,state==='playing'&&!battle.sinking,input.sample());battle.render(dt,simulationTime,innerHeight,camera.fov,renderer.getPixelRatio(),state==='playing');
    chase.update(dt,render,input,settings.camera,state==='home');atmosphere.update(simulationTime,camera.position);
    spray.resize(innerHeight,camera.fov,renderer.getPixelRatio());
    sun.position.set(vehicle.x+SUN_DIRECTION.x*400,SUN_DIRECTION.y*400,vehicle.z+SUN_DIRECTION.z*400);sun.target.position.set(vehicle.x,0,vehicle.z);
    audio.update(vehicle,state==='playing');uiTime+=dt;if(uiTime>.09){ui.update(uiTime,vehicle,activities,fps,qualityName,battle.status,oceanReport(simulationTime),playground.status,barGuide.status(vehicle));uiTime=0;}
    water.reflect(renderer,camera);renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  // Read-only diagnostics for browser acceptance tests. No scoring or teleport cheats in the shipped game.
  window.__ESTUARY__={get status(){return {ready,state,features:'wharf-shoal-spray-tricks',bar:barGuide.status(vehicle),targets:playground.status,airTrick:{pose:vehicle.airTricks.pose,completed:[...vehicle.airTricks.completed]},battle:battle.status,seaState:settings.seaState,sea:oceanReport(simulationTime),scenery:environment.userData.stats,detailedCraft:!!model?.userData.blenderShell,vehicle:vehicle.type,position:{x:vehicle.x,y:vehicle.y,z:vehicle.z},speed:vehicle.speed,forwardSpeed:vehicle.vx*Math.sin(vehicle.heading)+vehicle.vz*Math.cos(vehicle.heading),throttle:vehicle.throttle,heading:vehicle.heading,pitch:vehicle.pitch,rideMode:vehicle.rideMode,trim:vehicle.trimDegrees,trimIndex:vehicle.trimIndex,planing:vehicle.planing,wettedFraction:vehicle.wettedFraction,drive:{...vehicle.drive},airborne:vehicle.airborne,slip:vehicle.slip,wipeout:vehicle.wipeout,score:activities.score,liveParticles:spray.particles.filter(p=>p.life>0).length,spray:{rearPlume:spray.plume.mesh.visible,fallingPackets:spray.plume.falling,plumePackets:spray.plume.geometry.instanceCount,left:spray.state.left,right:spray.state.right,wakeSamples:spray.wake.history.length,reflections:!!water.reflector},race:activities.race?{...activities.race}:null,challenge:activities.challenge?{...activities.challenge}:null,quality:qualityName,fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,settings:{...settings}};}};
} catch(error){console.error(error);ui.error(`WebGL could not start: ${error.message}. Use a current Chrome, Edge, Firefox or Safari with hardware acceleration enabled.`);}
