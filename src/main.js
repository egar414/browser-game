import{visitLabel}from'./systems/visit-label.js';
import{DayCycle}from'./systems/day-cycle.js';
import{Dolphins}from'./systems/dolphins.js';
import{WaterfrontPeople}from'./systems/pedestrian-view.js';
import{SpeedRun}from'./systems/speed-run.js';
import{DeckWalk}from'./vehicles/cruiser.js';
import{bodyPoint}from'./vehicles/propulsion.js';
import * as THREE from 'three';
import { createAtmosphere, SUN_DIRECTION } from './systems/atmosphere.js';
import './style.css';
import{COASTAL_STYLE as ART}from'./systems/art-direction.js';
import{configureSunShadow}from'./systems/scenery-lighting.js';
import { FIXED_STEP, VEHICLES, QUALITY, RIDE_MODES, setSeaState, SEA_STATES, setWeatherClock, oceanReport, waveHeight, SPAWN, UPSTREAM_LAUNCH } from './config.js';
import { VehiclePhysics } from './vehicles/physics.js';
import { makeVehicle, loadCraftAssets } from './vehicles/models.js';
import { buildEnvironment, collision, ramps, solids } from './systems/environment.js';
import{OFFSHORE_RUN}from'./config.js';
import {mapData} from './systems/geography.js';
import { Water, Spray } from './systems/water.js';
import {loadSurfaceTextures,surfaceTextureStatus} from './systems/surface-textures.js';
import { Input } from './systems/input.js';
import { TouchControls, isTouchDevice } from './systems/touch-controls.js';
import { ChaseCamera } from './systems/camera.js';
import { GameAudio } from './systems/audio.js';
import { UI } from './systems/ui.js';
import { loadSettings, saveSettings } from './systems/storage.js';
import { SprayBattle } from './systems/spray-battle.js';
import {LocalBoaters} from './systems/local-boaters.js';
import { DESIGNS,TUNING,validLoadout,hasUnlock } from './systems/progression.js';
import { CanalPlayground } from './systems/canal-targets.js';
import { Activities } from './systems/activities.js';
import {pontoonApproach} from './systems/residential-moorings.js';
import{Fishing,FISHING_LAUNCH}from'./systems/fishing.js';
import{SportfishingTraffic}from'./systems/sportfishing-traffic.js';
import{OffshoreView}from'./systems/offshore-view.js';
import { BarGuide, BAR_LAUNCH } from './systems/bar-guide.js';
import {OnlineClient} from './systems/online-client.js';
import {OnlineUI} from './systems/online-ui.js';
import {OnlineWorld} from './systems/online-world.js';
import {packPose} from './systems/network-state.js';

const settings=loadSettings();const dayClock=new DayCycle(settings.dayMode);validLoadout(settings);setSeaState(settings.seaState,0,true);let state='home',controlsFrom='home',ready=false,renderer,model,water,spray,environment,hemi,dolphins,people,qualityName='Medium',sun;
let playground,barGuide,locals,cruisers,offshore,speedRun,garageReturn=null;
const deck=new DeckWalk();
const fishing=new Fishing(catchInfo=>{settings.fishCaught++;if(catchInfo.kg>settings.bestFishKg){settings.bestFishKg=catchInfo.kg;settings.bestFishSpecies=catchInfo.name;}saveSettings(settings);ui.toast(`${catchInfo.name} · ${catchInfo.kg} kg`,"Catch and release · record saved on this browser");});
let simulationTime=0,accumulator=0,last=performance.now(),fps=60,frameCount=0,fpsTime=0,uiTime=0,lowFrames=0;
const scene=new THREE.Scene();scene.background=new THREE.Color(ART.haze);scene.fog=new THREE.FogExp2(ART.haze,ART.hazeDensity);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,6500);
const chase=new ChaseCamera(camera),audio=new GameAudio(settings);
const vehicle=new VehiclePhysics(settings.vehicle,collision,event=>{
  activities?.event(event);
  if(event.type==='splash'){spray?.splash(event.contact?{...vehicle,x:event.x,z:event.z}:vehicle,event.impact,event.contacts);audio.splash(event.impact);}
  if(event.type==='wipeout')spray?.splash(vehicle,8);
  if(event.type==='bump'||event.type==='boundary')ui?.toast(event.label);
});
vehicle.tuning=settings.tuning;vehicle.setMode(settings.rideMode);vehicle.setTrim(settings[trimKey(settings.vehicle)]);
function trimKey(type){return {ski:'trimSki',cat:'trimCat',tinny:'trimTinny',cruiser:'trimCruiser',seago:'trimSeago',racer:'trimRacer',hyper:'trimApex'}[type];}
function setRideMode(mode){vehicle.setMode(mode);settings.rideMode=vehicle.rideMode;persistTrim();saveSettings(settings);document.getElementById('ride-mode').value=mode;ui.toast(`${RIDE_MODES[mode].name} mode`,RIDE_MODES[mode].description);}
function persistTrim(){const key=trimKey(vehicle.type);if(settings[key]!==vehicle.trimDegrees){settings[key]=vehicle.trimDegrees;saveSettings(settings);}}
const input=new Input(code=>{
  if(typeof onlineUI!=='undefined'&&!onlineUI.root.classList.contains('hidden')){if(code==='Escape')onlineUI.hide();return;}
  if(code==='Blur'){if(state==='playing')pause();return;}
  if(code==='Escape'){if(state==='controls')closeControls();else if(state==='paused')resume();else pause();return;}
  if(code==='KeyH'){showControls();return;}
  if(code==='KeyM'){mute();return;}
  if(state!=='playing')return;
  if(code==='KeyT'){const modes=Object.keys(RIDE_MODES);setRideMode(modes[(modes.indexOf(vehicle.rideMode)+1)%modes.length]);}
  if(code==='KeyR')recover();
  if(code==='KeyL')visitWaterfront();
  if(code==='KeyO')visitDolphins();
  if(code==='KeyC'||code==='KeyP'){settings.camera=code==='KeyP'?(settings.camera===2?0:2):(settings.camera+1)%3;chase.reset();saveSettings(settings);ui.toast(['Wide chase view','Close riding view','First person · ahead of rider · drag to look'][settings.camera]);}
  if(code==='KeyJ')toggleHelm();
  if(code==='KeyK'){if(vehicle.type==='cruiser'&&!deck.active){ui.toast('Leave the helm first','Slow down and press J / DECK to fish from the cockpit.');return;}if(!battle.active&&!activities.race&&!activities.challenge){fishing.hour=dayClock.hour;fishing.action(vehicle,deck.active?{...bodyPoint(vehicle,[deck.x,1.02,deck.z]),heading:vehicle.heading+deck.heading}:null);if(!fishing.active)ui.toast(fishing.message);}}
  if(code==='KeyB')startBattle();
  if(code==='KeyN')toggleBar();
  if(code==='KeyF'&&['cruiser','racer'].includes(vehicle.type)){ui.toast('Big boat · free roam and fishing','Choose a smaller craft for the race.');return;}
  if(code==='KeyG'&&['cruiser','racer'].includes(vehicle.type)){ui.toast('Big boat · free roam and fishing','Choose a smaller craft for the trick session.');return;}
  if(code==='KeyF'){fishing.cancel();battle.cancel();activities.startRace(vehicle);}
  if(code==='KeyG'){fishing.cancel();battle.cancel();activities.startChallenge();}
});
const ui=new UI(settings,{
  play,resume,pause,home,toggleHelm,controls:showControls,closeControls,recover,mute,
  freeRoam(){fishing.cancel();battle.cancel();activities.cancel();resume();ui.toast('Free roam','No clock. Find your own line.');},
  vehicle(type){deck.reset();fishing.cancel();settings.vehicle=type;saveSettings(settings);vehicle.setType(type);vehicle.setTrim(settings[trimKey(type)]);if(garageReturn)vehicle.respawnAt(garageReturn,simulationTime);replaceModel();ui.selectVehicle();chase.reset();},
  colour(index){settings.colour=index;saveSettings(settings);replaceModel();ui.selectVehicle();},
  loadout(key,value){const options=key==='design'?DESIGNS:TUNING;if(!options[value]||!hasUnlock(settings,options[value]))return;settings[key]=value;vehicle.tuning=settings.tuning;saveSettings(settings);replaceModel();ui.selectVehicle();},
  setting(key,value){if(key==='dayMode'){settings.dayMode=value;dayClock.setMode(value);fishing.hour=dayClock.hour;saveSettings(settings);ui.toast(dayClock.status.label,dayClock.status.fishing.label);return;}if(key==='seaState'){settings.seaState=value;setSeaState(value,simulationTime);saveSettings(settings);ui.toast(SEA_STATES[value].name,'Water conditions change smoothly. Faster crests can launch wave hops.');return;}if(key==='rideMode'){setRideMode(value);return;}settings[key]=value;saveSettings(settings);if(key==='quality')applyQuality();},
  race(){if(['cruiser','racer'].includes(vehicle.type)){ui.toast('Choose a smaller craft for canal racing');return;}if(state==='playing'){fishing.cancel();battle.cancel();activities.startRace(vehicle);}},challenge(){if(['cruiser','racer'].includes(vehicle.type)){ui.toast('Choose a smaller craft for tricks');return;}if(state==='playing'){fishing.cancel();battle.cancel();activities.startChallenge();}},battle:startBattle,bar:toggleBar,visitBar,visitPontoons,visitUpstream,meetLocals,visitFishing,visitWaterfront,visitDolphins,visitCoast,visitSpeedRun,meetBigBoats,
});
new TouchControls(input);
let lastCreator=false;
const online=new OnlineClient({getPose:()=>packPose(vehicle,settings,deck,state!=='home'),onChange(s){
 if(s.creator===lastCreator)return;lastCreator=s.creator;
 if(!s.creator)validLoadout(settings);vehicle.tuning=settings.tuning;replaceModel();ui.updateGarage();saveSettings(settings);
 if(s.creator)ui.toast('★ Creator garage unlocked','All designs and tuning · 2× garage XP · verified gold name tag');
}});
// Derived from the authenticated account, never restored from local settings.
Object.defineProperty(settings,'creatorAccess',{get:()=>online.creator,enumerable:false});
const onlineWorld=new OnlineWorld(scene,online);
let onlineFrom='home';
const onlineUI=new OnlineUI(online,{
 open(){onlineFrom=state;if(state==='playing')pause();input.clear();},
 close(){input.clear();if(onlineFrom==='playing')resume();},
 launch(){if(state==='home')play();else resume();},
});
const activities=new Activities(scene,settings,(title,subtitle)=>ui.toast(title,subtitle));
const battle=new SprayBattle(scene,event=>{
  if(event.type==='score')activities.event(event);
  else{if(event.type==='battle-sink'){activities.combo=0;activities.comboTime=0;input.clear();}if(event.type==='battle-recover'){input.clear();spray?.clear();environment?.userData.moorings?.clearSpray();locals?.flood.clearSpray();people?.flood.clearSpray();}ui.toast(event.label,event.detail);}
});
function updateHud(dt){updateFishingHud();document.getElementById('day-clock').textContent=`${dayClock.status.clock} · ${dayClock.status.label} · ${dayClock.status.fishing.label}`;ui.update(dt,vehicle,activities,fps,qualityName,battle.status,oceanReport(simulationTime),playground.status,barGuide.status(vehicle),environment.userData.moorings.status,locals?.status,cruisers?.status);}
function startBattle(){
  if(['cruiser','racer'].includes(vehicle.type)){ui.toast('Offshore craft · free roam','Choose a smaller craft for spray battles.');return;}
  if(state!=='playing')return;fishing.cancel();activities.cancel();battle.start(vehicle);
  // The first rival frame can compile shaders on slower devices. Show the
  // new mode and water meter immediately instead of waiting for that frame.
  updateHud(0);
}
function toggleBar(){
  if(state!=='playing'||!barGuide)return;
  barGuide.toggle(vehicle);
  if(barGuide.active){battle.cancel();activities.cancel();if(settings.seaState==='calm'){settings.seaState='swell';setSeaState('swell',simulationTime);saveSettings(settings);document.getElementById('sea-state').value='swell';}
    ui.toast('Route to the bar marked','Follow the orange route out between the rock walls, then left outside the entrance. Calm seas switch to Rolling swell.');
  }else ui.toast('Bar guide off');
}
function visitBar(){
  fishing.cancel();
  if(!ready||!barGuide)return;
  battle.cancel();activities.cancel();activities.combo=0;activities.comboTime=0;vehicle.respawnAt(BAR_LAUNCH,simulationTime);
  spray.clear();environment?.userData.moorings?.clearSpray();locals?.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();barGuide.active=false;resume();toggleBar();ui.toast('At the bar wave zone','Orange buoys mark the bank. Carry speed across the crests. Pause → Rolling swell for larger sets.');
}
function visitPontoons(){
  fishing.cancel();
  if(!ready)return;
  const boats=environment.userData.moorings.boats;
  const spawn=pontoonApproach(boats,vehicle.type,collision);
  if(!spawn){ui.toast('Find a waterfront pontoon','Moored alloy tenders are dotted along the residential canals.');return;}
  battle.cancel();activities.cancel();vehicle.respawnAt(spawn,simulationTime);spray.clear();environment.userData.moorings.clearSpray();locals.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();resume();
  ui.toast('House pontoon run','Carve alongside and land spray inside the tender. Watch its water meter.');
}
function visitUpstream(){
  fishing.cancel();
  if(!ready)return;
  battle.cancel();activities.cancel();activities.combo=0;activities.comboTime=0;
  vehicle.respawnAt(UPSTREAM_LAUNCH,simulationTime);spray.clear();environment.userData.moorings.clearSpray();locals.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();barGuide.active=false;resume();
  ui.toast('Upstream · Wyuna Canal','Explore the added canal reach and river bends. You can cruise back toward the Wharf.');
}
function meetLocals(){
  fishing.cancel();
  if(!ready)return;settings.locals=true;saveSettings(settings);document.getElementById('locals').value='on';
  battle.cancel();activities.cancel();locals.setEnabled(true);const spawn=locals.meetPosition(vehicle);
  if(!spawn){ui.toast('Locals are cruising','Look for tinnies and Thundercats near the Wharf and in the canals.');return;}
  vehicle.respawnAt(spawn,simulationTime);spray.clear();environment.userData.moorings.clearSpray();locals.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();barGuide.active=false;resume();
  ui.toast('Cruise with the locals','Catch up, pull alongside and carve a spray. No clock — just free roam.');
}
function toggleHelm(){
 if(state!=='playing'||vehicle.type!=='cruiser')return;
 if(!deck.toggle(vehicle)){ui.toast('Slow below 5 km/h to leave the helm');return;}
 fishing.cancel();input.clear();chase.reset();ui.toast(deck.active?'Walking the cockpit':'Back at the helm',deck.active?'WASD / arrows & GO walk · K / FISH casts · J returns to helm':'WASD drives · J leaves the helm when stopped');
}
function visitFishing(){
  if(!ready)return;fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;
  deck.reset();vehicle.respawnAt(FISHING_LAUNCH,simulationTime);spray.clear();locals.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();resume();
  ui.toast('Fishing grounds · beyond the bar','Slow down · K / FISH casts and hooks · hold SPACE / REEL, release to ease tension');
}
function updateFishingHud(){
  const cruiser=vehicle.type==='cruiser';document.getElementById('helm-toggle').classList.toggle('hidden',!cruiser);document.body.classList.toggle('on-cruiser',cruiser);document.body.classList.toggle('walking-deck',deck.active&&cruiser);document.getElementById('helm-toggle').textContent=deck.active?'J · HELM · WASD WALK · K FISH':'J · LEAVE HELM / WALK';
  const f=fishing.status(vehicle),panel=document.getElementById('fishing-panel');
  const show=state==='playing'&&!battle.active&&!activities.race&&!activities.challenge&&(f.near||f.active);
  panel.classList.toggle('hidden',!show);document.body.classList.toggle('fishing-active',show&&f.active);
  document.getElementById('fishing-place').textContent=f.near||'Offshore fishing';
  document.getElementById('fishing-message').textContent=f.active||f.phase==='landed'||f.phase==='escaped'?f.message:(cruiser&&!deck.active?'J / DECK · leave helm to fish':'K / FISH · cast · then hook on BITE');
  document.getElementById('fish-tension').value=f.tension;document.getElementById('fish-progress').value=f.progress;
  document.getElementById('fish-record').textContent=`${settings.fishCaught} released · best ${settings.bestFishKg?settings.bestFishKg+' kg '+settings.bestFishSpecies:'—'} · ${dayClock.status.fishing.label}`;
  document.getElementById('fishing-meters').classList.toggle('hidden',f.phase!=='hooked');
}
function meetBigBoats(){
 if(!ready)return;settings.locals=true;saveSettings(settings);document.getElementById('locals').value='on';cruisers.setEnabled(true);const spawn=cruisers.meetPosition(vehicle);if(!spawn){ui.toast('No clear big-boat approach','Try from the open estuary.');return;}
 deck.reset();fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;vehicle.respawnAt(spawn,simulationTime);spray.clear();cruisers.flood.clearSpray();chase.reset();input.clear();resume();ui.toast('Big boat spray pass','Hold U / REAR to look back. Land the falling rear plume inside the open cockpit; sharp side fans also count.');
}
function visitSpeedRun(){
 if(!ready)return;deck.reset();fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;vehicle.respawnAt(OFFSHORE_RUN.start,simulationTime);spray.clear();people.flood.clearSpray();locals.flood.clearSpray();chase.reset();input.clear();resume();ui.toast('Offshore speed run','Long clear water ahead. W / GO accelerates; S / BRAKE slows down. R recovers.');
}
function visitCoast(id){
 if(!ready)return;const place=mapData.coastalExtension.destinations.find(p=>p.id===id);if(!place||collision(place.x,place.z,9,0))return;
 deck.reset();fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;vehicle.respawnAt(place,simulationTime);spray.clear();people.flood.clearSpray();locals.flood.clearSpray();chase.reset();input.clear();resume();ui.toast(place.name,'Cruise north along the beach, or head south towards Mooloolaba and the river mouth.');
}
function visitDolphins(){
 if(!ready)return;const spawn=dolphins.approach(simulationTime,collision);if(!spawn){ui.toast('Dolphins are beyond the bar','Visit the offshore fishing grounds.');return;}
 settings.camera=1;deck.reset();fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;vehicle.respawnAt(spawn,simulationTime);spray.clear();people.flood.clearSpray();locals.flood.clearSpray();chase.reset();input.clear();resume();ui.toast('Dolphin watch · look ahead','A pod surfaces and breaches here. Slow down and watch; O returns here, L visits waterfront walkers.');
}
function visitWaterfront(){
 if(!ready)return;const spawn=people.approach(collision);if(!spawn){ui.toast('Explore the Wharf jetties');return;}
 people.focusId=spawn.targetId;people.focusUntil=simulationTime+40;deck.reset();fishing.cancel();battle.cancel();activities.cancel();vehicle.respawnAt(spawn,simulationTime);spray.clear();people.flood.clearSpray();locals.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();resume();ui.toast('Waterfront walkers','Carve alongside the jetty to send falling spray onto the deck. People get back up after a tumble.');
}
function replaceModel(){
  if(model){scene.remove(model);model.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material?.map)o.material.map.dispose();});}
  model=makeVehicle(settings.vehicle,VEHICLES[settings.vehicle].colours[settings.colour],settings.design);scene.add(model);
}
// Start Auto conservatively on laptops; higher detail remains selectable.
// Lower resolution and fewer scene submissions preserve responsive driving.
function selectedQuality(){return settings.quality==='Auto'?'Low':settings.quality;}
function applyQuality(force){
  qualityName=force||selectedQuality();const q=QUALITY[qualityName];
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.pixelRatio));renderer.shadowMap.enabled=q.shadows;configureSunShadow(sun,q);
  water?.setQuality(q);
  if(spray){spray.dispose();spray=new Spray(scene,q);}
  saveSettings(settings);
}
function pause(){if(state!=='playing')return;persistTrim();state='paused';input.clear();ui.show('pause',true);}
function resume(){if(!ready)return;state='playing';input.clear();audio.start();ui.show('pause',false);ui.show('controls',false);last=performance.now();}
function play(){
  if(!ready)return;
  const returning=!!garageReturn,spawn=garageReturn||(vehicle.type==='racer'?OFFSHORE_RUN.start:SPAWN);garageReturn=null;
  state='playing';vehicle.respawnAt(spawn,simulationTime);spray?.clear();environment?.userData.moorings?.clearSpray();locals?.flood.clearSpray();people?.flood.clearSpray();chase.reset();audio.start();input.clear();ui.show('home',false);ui.show('hud',true);
  ui.toast(returning?'Back in your spot':vehicle.type==='racer'?'Offshore speed run · 500 km/h arcade':'Launched beside The Wharf',vehicle.type==='cruiser'?(isTouchDevice()?'GO drives · DECK switches to walking when stopped · FISH casts':'WASD drives · J switches helm / deck · K casts · SPACE reels'):isTouchDevice()?'Hold GO to drive · arrows steer · tap LIFT for bow rides':'WASD to drive · T riding mode · Q/E trim · H for moves');
}
function home(show=true){
  fishing.cancel();
  if(!show)return;deck.reset();if(state!=='home')garageReturn=vehicle.snapshot();ui.updateGarage();state='home';if(barGuide)barGuide.active=false;battle.cancel();activities.cancel();input.clear();spray?.clear();environment?.userData.moorings?.clearSpray();locals?.flood.clearSpray();people?.flood.clearSpray();chase.reset();ui.show('home',true);ui.show('hud',false);ui.show('pause',false);
}
function recover(){deck.reset();fishing.cancel();battle.recover();vehicle.recover(true);spray?.clear();environment?.userData.moorings?.clearSpray();locals?.flood.clearSpray();people?.flood.clearSpray();input.clear();chase.reset();activities.combo=0;activities.comboTime=0;ui.toast('Back in safe water','Fresh start. Send it again.');if(state==='paused')resume();}
function showControls(){if(state==='controls')return;controlsFrom=state;state='controls';input.clear();ui.show('controls',true);}
function closeControls(){ui.show('controls',false);state=controlsFrom;input.clear();last=performance.now();}
function mute(){settings.muted=!settings.muted;saveSettings(settings);ui.toast(settings.muted?'Audio muted':'Audio on');}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);
window.addEventListener('pagehide',persistTrim);
try {
  renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#game'),antialias:false,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const atmosphere=createAtmosphere(scene,renderer);
  hemi=new THREE.HemisphereLight('#c1dcff','#4c6950',.62);scene.add(hemi);
  sun=new THREE.DirectionalLight('#ffe4bc',3.05);sun.castShadow=true;scene.add(sun);scene.add(sun.target);
  applyQuality();environment=buildEnvironment(scene,QUALITY[qualityName]);environment.userData.moorings.onEvent=e=>{if(e.points)activities.event({type:'score',label:e.label,points:e.points});ui.toast(e.label,e.detail);};playground=new CanalPlayground(scene,solids,e=>activities.event(e));barGuide=new BarGuide(scene,solids);water=new Water(scene,QUALITY[qualityName]);spray=new Spray(scene,QUALITY[qualityName]);locals=new LocalBoaters(scene,collision,e=>ui.toast(e.label,e.detail));solids.push(...locals.colliders);cruisers=new SportfishingTraffic(collision,e=>ui.toast(e.label,e.detail));solids.push(...cruisers.colliders);offshore=new OffshoreView(scene,cruisers,fishing);speedRun=new SpeedRun(scene);dolphins=new Dolphins(scene,visitLabel('DOLPHIN POD ↓'));people=new WaterfrontPeople(scene,e=>ui.toast(e.label,e.detail));replaceModel();
  document.getElementById('loading').textContent='Loading coastal textures and watercraft…';
  Promise.all([loadCraftAssets(),loadSurfaceTextures().then(report=>{atmosphere.refreshEnvironment();if(report.failed.length)console.warn('Surface texture fallback:',report.failed.join(', '));})]).then(()=>{replaceModel();ready=true;ui.ready();}).catch(error=>{console.warn('Detailed craft load failed',error);ready=true;ui.ready();ui.toast('Lightweight craft loaded','The detailed model could not load. Reload to try again.');});
  const canvas=document.querySelector('#game');canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();ui.error('The graphics connection was lost. Reload to relaunch. Try Low quality if this repeats.');});
  function frame(now){
    requestAnimationFrame(frame);if(document.hidden){last=now;return;}setWeatherClock(Date.now()/1000);
    const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(.1,elapsed);last=now;fpsTime+=elapsed;frameCount++;
    if(fpsTime>=1){fps=frameCount/fpsTime;fpsTime=0;frameCount=0;if(state==='playing'&&settings.quality==='Auto'){lowFrames=fps<28?lowFrames+1:0;if(lowFrames>2){if(qualityName!=='Low'){applyQuality(qualityName==='High'?'Medium':'Low');ui.toast('Keeping it smooth',`Auto quality adjusted to ${qualityName}.`);}else if(renderer.getPixelRatio()>.46){renderer.setPixelRatio(Math.max(.45,renderer.getPixelRatio()*.85));ui.toast('Keeping controls responsive','Auto reduced render resolution; your spray and world stay in place.');}lowFrames=0;}}}
    locals.setEnabled(settings.locals&&!battle.active&&!activities.race);cruisers.setEnabled(settings.locals&&!battle.active&&!activities.race);
    if(state==='playing'){
      accumulator=Math.min(.12,accumulator+dt);
      while(accumulator>=FIXED_STEP){simulationTime+=FIXED_STEP;dayClock.update(FIXED_STEP);fishing.hour=dayClock.hour;const controls=input.sample(true);vehicle.deckMode=vehicle.type==='cruiser'&&deck.active;if(!battle.sinking)vehicle.update(FIXED_STEP,vehicle.deckMode?{throttle:0,steer:0,trim:0}:controls,simulationTime,ramps);if(vehicle.deckMode)deck.update(FIXED_STEP,controls,fishing.active);battle.update(FIXED_STEP,vehicle,simulationTime);locals.update(FIXED_STEP,vehicle,simulationTime);cruisers.update(FIXED_STEP,vehicle,simulationTime);fishing.update(FIXED_STEP,vehicle,input.held('Space'));people.update(FIXED_STEP,vehicle,simulationTime);environment.userData.moorings.update(FIXED_STEP,vehicle,simulationTime,!battle.sinking&&!vehicle.wipeout);activities.update(FIXED_STEP,vehicle);playground.update(FIXED_STEP,vehicle,simulationTime,!activities.race&&!battle.active);accumulator-=FIXED_STEP;}
    }else if(state==='home'){simulationTime+=dt;vehicle.y=waveHeight(vehicle.x,vehicle.z,simulationTime)+vehicle.config.rideHeight;vehicle.pitch=Math.sin(simulationTime*.7)*.015;vehicle.roll=Math.sin(simulationTime*.6)*.018;}
    const alpha=state==='playing'?accumulator/FIXED_STEP:1,p=vehicle.previous;
    const render={...vehicle,x:THREE.MathUtils.lerp(p.x,vehicle.x,alpha),y:THREE.MathUtils.lerp(p.y,vehicle.y,alpha),z:THREE.MathUtils.lerp(p.z,vehicle.z,alpha),heading:THREE.MathUtils.lerp(p.heading,vehicle.heading,alpha),pitch:THREE.MathUtils.lerp(p.pitch,vehicle.pitch,alpha),roll:THREE.MathUtils.lerp(p.roll,vehicle.roll,alpha)};
    model.position.set(render.x,render.y-(battle.sinking?(4-battle.sinking)*.6:0),render.z);model.rotation.set(-render.pitch,render.heading,render.roll+(battle.sinking?.5:0),'YXZ');
    if(model.userData.handlebars)model.userData.handlebars.rotation.y=-vehicle.steer*.43;
    for(const part of [model.userData.motor,model.userData.nozzle])if(part)part.rotation.set(vehicle.drive.trimAngle,-vehicle.drive.steeringAngle,0,'YXZ');
    if(model.userData.bucket)model.userData.bucket.rotation.x=vehicle.drive.reverse*1.3;
    if(model.userData.propeller)model.userData.propeller.rotation.z+=vehicle.drive.rpm/60*Math.PI*2*dt;for(const [i,prop]of(model.userData.propellers||[]).entries())prop.rotation.z+=vehicle.drive.rpm/60*Math.PI*2*dt*(i?1:-1);
    vehicle.animationTime=simulationTime;
    if(vehicle.type==='cruiser'){
      const rider=model.userData.rider;rider.position.set(deck.active?deck.x:0,deck.active?1.02:3.25,deck.active?deck.z:-.25);rider.rotation.y=deck.active?deck.heading:0;rider.userData.animate(simulationTime,deck.active?deck.moving:0,fishing.active,!deck.active);
    }else model.userData.rider.userData.update(vehicle,dt,model.userData);
    model.userData.passenger?.userData.update(vehicle,dt);
    if(state==='playing'&&input.sample().trim===0)persistTrim();
    speedRun.update(simulationTime,render);environment.userData.update?.(simulationTime,render);playground.render(simulationTime);barGuide.update(vehicle);barGuide.render(simulationTime);water.update(simulationTime,render.x,render.z,vehicle);spray.update(state==='playing'?dt:0,render,simulationTime,state==='playing'&&!battle.sinking,input.sample());battle.render(dt,simulationTime,innerHeight,camera.fov,renderer.getPixelRatio(),state==='playing');locals.render(dt,simulationTime,render,qualityName,innerHeight,camera.fov,renderer.getPixelRatio(),state==='playing',alpha);
    const deckPoint=deck.active&&vehicle.type==='cruiser'?bodyPoint(render,[deck.x,1.02,deck.z]):null;
    const view=deckPoint?{...render,...deckPoint,type:'character',speed:0}:render;
    offshore.render(dt,simulationTime,deckPoint?{...view,y:view.y+.45,heading:render.heading+deck.heading}:render,qualityName,state==='playing');
    const firstPerson=settings.camera===2&&state!=='home',rider=model.userData.rider;
    if(rider.userData.face)rider.userData.face.visible=!firstPerson;for(const part of [...(rider.userData.faceParts||[]),...(rider.userData.bodyParts||[])])part.visible=!firstPerson;
    model.updateWorldMatrix(true,true);const eye=rider.userData.eye?.getWorldPosition(new THREE.Vector3());
    const cameraView=deckPoint?{...view,heading:render.heading+deck.heading,hullHeading:render.heading}:view;
    if(firstPerson&&eye){eye.x+=Math.sin(cameraView.heading)*.42;eye.z+=Math.cos(cameraView.heading)*.42;}
    chase.update(dt,cameraView,input,firstPerson?2:deckPoint?1:settings.camera,state==='home',eye,firstPerson&&fishing.active?offshore.float.position:null);
    const day=dayClock.status;atmosphere.update(simulationTime,camera.position,day);sun.color.set(day.sunColour);sun.intensity=day.sunIntensity;hemi.intensity=day.ambient;scene.fog.color.set(day.fog);water.setDay(day);
    onlineWorld.update(dt,now,render,camera);
    dolphins.render(simulationTime,render,qualityName);people.render(dt,simulationTime,render,qualityName);
    spray.resize(innerHeight,camera.fov,renderer.getPixelRatio());
    sun.position.set(vehicle.x+SUN_DIRECTION.x*400,SUN_DIRECTION.y*400,vehicle.z+SUN_DIRECTION.z*400);sun.target.position.set(vehicle.x,0,vehicle.z);
    audio.update(vehicle,state==='playing');uiTime+=dt;if(uiTime>.09){updateHud(uiTime);uiTime=0;}
    water.reflect(renderer,camera);renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  // Read-only diagnostics for browser acceptance tests. No scoring or teleport cheats in the shipped game.
  window.__ESTUARY__={get status(){return {ready,state,simulationTime,online:{...online.status,visibleCrafts:[...onlineWorld.models.values()].filter(e=>e.model.visible).length},features:'shaft-balance-wildlife-first-person',day:dayClock.status,dolphins:{visible:dolphins.visible},pedestrians:{visible:people.visibleCount,focus:people.focusId,people:people.status},camera:{rearView:!!chase.rearView,mode:settings.camera,position:{x:camera.position.x,y:camera.position.y,z:camera.position.z}},deck:{active:deck.active,x:deck.x,z:deck.z},fishing:fishing.status(vehicle),sportfishers:cruisers.status,locals:{...locals.status,visible:locals.visibleCount},moorings:environment.userData.moorings.status,bar:barGuide.status(vehicle),targets:playground.status,airTrick:{pose:vehicle.airTricks.pose,completed:[...vehicle.airTricks.completed]},battle:battle.status,seaState:settings.seaState,sea:oceanReport(simulationTime),scenery:environment.userData.stats,detailedCraft:!!model?.userData.blenderShell,vehicle:vehicle.type,position:{x:vehicle.x,y:vehicle.y,z:vehicle.z},speed:vehicle.speed,forwardSpeed:vehicle.vx*Math.sin(vehicle.heading)+vehicle.vz*Math.cos(vehicle.heading),throttle:vehicle.throttle,heading:vehicle.heading,pitch:vehicle.pitch,roll:vehicle.roll,rideMode:vehicle.rideMode,trim:vehicle.trimDegrees,trimIndex:vehicle.trimIndex,shaft:vehicle.shaft?{...vehicle.shaft}:null,passengerAft:vehicle.passengerAft,hullCorrection:vehicle.hullCorrection,bounce:{load:vehicle.bounceLoad,compression:vehicle.bounceCompression,hits:vehicle.hullHits,lastHit:vehicle.lastHullHit},planing:vehicle.planing,wettedFraction:vehicle.wettedFraction,drive:{...vehicle.drive},airborne:vehicle.airborne,waveLaunch:!!vehicle.waveLaunch,slip:vehicle.slip,wipeout:vehicle.wipeout,score:activities.score,liveParticles:spray.particles.filter(p=>p.life>0).length,spray:{waterImpacts:spray.waterImpacts,turnGate:spray.state.turnGate,rearPlume:spray.plume.mesh.visible,fallingPackets:spray.plume.falling,plumePackets:spray.plume.geometry.instanceCount,left:spray.state.left,right:spray.state.right,wakeSamples:spray.wake.history.length,reflections:!!water.reflector},race:activities.race?{...activities.race}:null,challenge:activities.challenge?{...activities.challenge}:null,quality:qualityName,graphics:{textures:surfaceTextureStatus(),pixelRatio:renderer.getPixelRatio(),shadows:renderer.shadowMap.enabled,shadowSize:sun.shadow.mapSize.x,reflectionHz:water.reflectionHz,reflectionCaptures:water.reflectionCaptures,groundContacts:environment.userData.stats.contactShadows},fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,settings:{...settings}};}};
} catch(error){console.error(error);ui.error(`WebGL could not start: ${error.message}. Use a current Chrome, Edge, Firefox or Safari with hardware acceleration enabled.`);}
