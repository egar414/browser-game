import {TenderCrew,crewPassengers,tenderSeatPoint} from './systems/tender-crew.js';
import {TenderCrewView} from './systems/tender-crew-view.js';
import {SurfSession} from './surf/session.js';
import {SurfView} from './surf/view.js';
import {SurfUI} from './surf/ui.js';
import {encodeSurfPose} from './surf/protocol.js';
import {SURF_BREAK,setSurfClock} from './surf/break.js';
import {ReefDiving,REEF,reefFish} from './systems/reef-diving.js';
import {ReefView} from './systems/reef-view.js';
import {ReefUI} from './systems/reef-ui.js';
import {FisheriesPatrol} from './systems/fisheries-patrol.js';
import {WorkshopEconomy} from './systems/workshop-economy.js';
import {DryWharf,DRY_WHARF,wharfPoint,canDock} from './systems/dry-wharf.js';
import {WorkshopUI} from './systems/workshop-ui.js';
import {onlineSinkDrop} from './systems/online-sinking.js';
import {PoliceView} from './systems/police-view.js';
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
import { isJet, FIXED_STEP, VEHICLES, QUALITY, RIDE_MODES, setSeaState, SEA_STATES, setWeatherClock, oceanReport, waveHeight, SPAWN, UPSTREAM_LAUNCH } from './config.js';
import { VehiclePhysics } from './vehicles/physics.js';
import { makeVehicle, loadCraftAssets } from './vehicles/models.js';
import { buildEnvironment, collision, ramps, solids } from './systems/environment.js';
import{OFFSHORE_RUN}from'./config.js';
import {mapData} from './systems/geography.js';
import { Water, Spray } from './systems/water.js';
import {loadSurfaceTextures,surfaceTextureStatus} from './systems/surface-textures.js';
import { Input } from './systems/input.js';
import { TouchControls, isTouchDevice } from './systems/touch-controls.js';
import { ChaseCamera, jetRidingEye } from './systems/camera.js';
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
import {canDriveCraft,availableCraft} from './systems/craft-access.js';

const economy=new WorkshopEconomy();
const settings=loadSettings();let pendingCreatorCraft=settings.vehicle==='hyper'?'hyper':null;settings.vehicle=availableCraft(settings.vehicle);const dayClock=new DayCycle(settings.dayMode);validLoadout(settings);setSeaState(settings.seaState,0,true);let state='home',controlsFrom='home',ready=false,renderer,model,water,spray,environment,hemi,dolphins,people,qualityName='Medium',sun;
let surfView,surfUI,surfReturn,surfDebug;
let reefView,reefUI,fisheriesModel,marketMarker;
let dryWharf,workshopUI,dockHold=0,leavingWharf=false;
let police,playground,barGuide,locals,cruisers,offshore,speedRun,garageReturn=null;
const deck=new DeckWalk();
const surf=new SurfSession(collision,(points,tube)=>{const money=economy.earn(tube>1?'Barrel ride':'Surf ride',points,simulationTime);ui.toast(tube>1?'Barrel banked':'Wave banked',`+${points} points · +$${money} upgrade money`);});
const diving=new ReefDiving(ids=>economy.stowCatch(ids));
const fisheries=new FisheriesPatrol(()=>{if(diving.active)endDive(true);const result=economy.confiscateCatch();diving.say(`Fisheries confiscated ${result.count} fish · $${result.paid} fine paid`);ui.toast('Fisheries inspection',diving.message);},message=>{diving.say(message);ui.toast('Fisheries',message);});
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
const crew=new TenderCrew((pose,message)=>{if(pose)vehicle.respawnAt({x:pose.x+Math.cos(pose.heading)*4,z:pose.z-Math.sin(pose.heading)*4,heading:pose.heading},simulationTime);input.clear();spray?.clear();chase.reset();ui.toast(message);});
vehicle.workshop=economy.effects(vehicle.type);vehicle.tuning=settings.tuning;vehicle.setMode(settings.rideMode);vehicle.setTrim(settings[trimKey(settings.vehicle)]);
function trimKey(type){return {ski:'trimSki',cat:'trimCat',tinny:'trimTinny',dinghy:'trimTinny',skua:'trimTinny',cruiser:'trimCruiser',dive:'trimCruiser',rib:'trimCruiser',seago:'trimSeago',racer:'trimRacer',hyper:'trimApex'}[type];}
function setRideMode(mode){vehicle.setMode(mode);settings.rideMode=vehicle.rideMode;persistTrim();saveSettings(settings);document.getElementById('ride-mode').value=mode;ui.toast(`${RIDE_MODES[mode].name} mode`,RIDE_MODES[mode].description);}
function persistTrim(){const key=trimKey(vehicle.type);if(settings[key]!==vehicle.trimDegrees){settings[key]=vehicle.trimDegrees;saveSettings(settings);}}
const input=new Input(code=>{
  if(typeof onlineUI!=='undefined'&&!onlineUI.root.classList.contains('hidden')){if(code==='Escape')onlineUI.hide();return;}
  if(state==='workshop'){if(code==='Escape')leaveWharf();return;}
  if(code==='Blur'){if(state==='playing')pause();return;}
  if(code==='Escape'){if(state==='controls')closeControls();else if(state==='paused')resume();else pause();return;}
  if(code==='KeyH'){showControls();return;}
  if(code==='KeyM'){mute();return;}
  if(state!=='playing'||police?.impounded)return;
  if(surf.active){if(code==='KeyR'){surf.restart();input.clear();surfView.cameraReady=false;}if(code==='KeyB'){if(surf.mode==='yacht')surf.launch();else if(['ski','passenger'].includes(surf.mode))surf.stepOff();else surf.join();input.clear();}if(code==='KeyC'||code==='KeyP'){surf.view=(surf.view+1)%4;surf.firstPerson=surf.view===2;surfView.cameraReady=false;}return;}
  if(diving.active){if(code==='KeyB')toggleDive();if(code==='KeyT'){diving.setMode(diving.mode==='snorkel'?'freedive':'snorkel');input.clear();}if(code==='Space')fireSpear();if(code==='KeyR')endDive(true);return;}
  if(code==='KeyB'&&vehicle.config.diveBoat){toggleDive();return;}
  if(code==='KeyT'){const modes=Object.keys(RIDE_MODES);setRideMode(modes[(modes.indexOf(vehicle.rideMode)+1)%modes.length]);}
  if(code==='KeyR')recover();
  if(code==='KeyL')visitWaterfront();
  if(code==='KeyO')visitDolphins();
  if(code==='KeyC'||code==='KeyP'){settings.camera=code==='KeyP'?(settings.camera===2?0:2):(settings.camera+1)%3;chase.reset();saveSettings(settings);ui.toast(['Wide chase view','Close riding view','First person · ahead of rider · drag to look'][settings.camera]);}
  if(crew.active){if(code==='KeyJ')toggleCrew();return;}
  if(code==='KeyJ'){if(crew.nearest(online,vehicle))toggleCrew();else toggleHelm();}
  if(code==='KeyK'){if(vehicle.type==='cruiser'&&!deck.active){ui.toast('Leave the helm first','Slow down and press J / DECK to fish from the cockpit.');return;}if(!battle.active&&!activities.race&&!activities.challenge){fishing.hour=dayClock.hour;fishing.action(vehicle,deck.active?{...bodyPoint(vehicle,[deck.x,1.02,deck.z]),heading:vehicle.heading+deck.heading}:null);if(!fishing.active)ui.toast(fishing.message);}}
  if(code==='KeyB')startBattle();
  if(code==='KeyN')toggleBar();
  if(code==='KeyF'&&['cruiser','racer','dive','rib'].includes(vehicle.type)){ui.toast('Big boat · free roam and fishing','Choose a smaller craft for the race.');return;}
  if(code==='KeyG'&&['cruiser','racer','dive','rib'].includes(vehicle.type)){ui.toast('Big boat · free roam and fishing','Choose a smaller craft for the trick session.');return;}
  if(code==='KeyF'){fishing.cancel();battle.cancel();activities.startRace(vehicle);}
  if(code==='KeyG'){fishing.cancel();battle.cancel();activities.startChallenge();}
});
const ui=new UI(settings,{
  play,resume,pause,home,toggleHelm,controls:showControls,closeControls,recover,mute,
  freeRoam(){fishing.cancel();battle.cancel();activities.cancel();resume();ui.toast('Free roam','No clock. Find your own line.');},
  vehicle(type){if(!canDriveCraft(type,online.creator)){ui.toast('Apex 300 · Creator testing craft','Sign in to your verified Creator account to use it.');return;}pendingCreatorCraft=null;selectCraft(type);},
  colour(index){settings.colour=index;saveSettings(settings);replaceModel();ui.selectVehicle();},
  loadout(key,value){const options=key==='design'?DESIGNS:TUNING;if(!options[value]||!hasUnlock(settings,options[value]))return;settings[key]=value;vehicle.tuning=settings.tuning;saveSettings(settings);replaceModel();ui.selectVehicle();},
  setting(key,value){if(key==='dayMode'){settings.dayMode=value;dayClock.setMode(value);fishing.hour=dayClock.hour;saveSettings(settings);ui.toast(dayClock.status.label,dayClock.status.fishing.label);return;}if(key==='seaState'){settings.seaState=value;setSeaState(value,simulationTime);saveSettings(settings);ui.toast(SEA_STATES[value].name,'Water conditions change smoothly. Faster crests can launch wave hops.');return;}if(key==='rideMode'){setRideMode(value);return;}settings[key]=value;saveSettings(settings);if(key==='quality')applyQuality();},
  race(){if(crew.active||surf.active||diving.active)return;if(['cruiser','racer','dive','rib'].includes(vehicle.type)){ui.toast('Choose a smaller craft for canal racing');return;}if(state==='playing'&&!police?.impounded){fishing.cancel();battle.cancel();activities.startRace(vehicle);}},challenge(){if(crew.active||surf.active||diving.active)return;if(['cruiser','racer','dive','rib'].includes(vehicle.type)){ui.toast('Choose a smaller craft for tricks');return;}if(state==='playing'&&!police?.impounded){fishing.cancel();battle.cancel();activities.startChallenge();}},battle:startBattle,bar:toggleBar,visitBar,visitPontoons,visitUpstream,watchPolice,meetPolice,meetLocals,visitFishing,visitWaterfront,visitDolphins,visitCoast,visitSpeedRun,meetBigBoats,
});
new TouchControls(input);
let lastCreator=false,onlineSinking=0,wasOnlineSinking=false;
let economyAccount=null;
const online=new OnlineClient({getPose:()=>{const pose=packPose(vehicle,settings,deck,state!=='home'&&state!=='workshop',simulationTime,state==='playing'&&!battle.sinking&&!onlineSinking&&!police?.impounded);if(crew.active)return crew.encode(pose);if(surf.active)return encodeSurfPose(pose,surf);if(vehicle.config.diveBoat)pose.type='cruiser';if(diving.active){pose.deck=true;pose.deckX=0;pose.deckZ=-3;pose.spray=[];}if(['dinghy','skua'].includes(pose.type)&&online.room?.craftVersion!==2)pose.type='tinny';return pose;},onChange(s){
 if(s.accountId!==economyAccount||economy.creator!==(s.creator===true)){if(s.accountId!==economyAccount){if(diving.active)endDive(true);economyAccount=s.accountId;economy.switchAccount(s.accountId);}economy.setCreator(s.creator===true);vehicle.workshop=economy.effects(vehicle.type);workshopUI?.render();}
 if(s.creator===lastCreator)return;lastCreator=s.creator;
 if(!s.creator)validLoadout(settings);vehicle.tuning=settings.tuning;
 if(s.creator&&pendingCreatorCraft){const type=pendingCreatorCraft;pendingCreatorCraft=null;selectCraft(type);}
 else if(!canDriveCraft(settings.vehicle,s.creator))selectCraft('ski');
 else{replaceModel();ui.selectVehicle();saveSettings(settings);}
 if(s.creator)ui.toast('★ Creator garage unlocked','All craft, designs and parts · best kits fitted · 2× garage XP · verified gold tag');
}});
// Derived from the authenticated account, never restored from local settings.
Object.defineProperty(settings,'creatorAccess',{get:()=>online.creator,enumerable:false});
const onlineWorld=new OnlineWorld(scene,online),crewView=new TenderCrewView(scene);
const crewButton=document.createElement('button');crewButton.id='tender-crew';crewButton.className='secondary';crewButton.hidden=true;crewButton.onclick=toggleCrew;document.getElementById('hud').append(crewButton);
function toggleCrew(){if(state!=='playing'||surf.active||diving.active||police?.remaining||police?.impounded||onlineSinking)return;if(crew.active){crew.leave();return;}if(crew.board(online,vehicle)){fishing.cancel();deck.reset();battle.cancel();activities.cancel();input.clear();spray?.clear();chase.reset();}ui.toast(crew.message);}
function updateCrew(){document.body.classList.toggle('riding-tender',crew.active);const passengers=crewPassengers(online.room?.players||[],online.session?.user.id),candidate=crew.nearest(online,vehicle);crewButton.hidden=state!=='playing'||surf.active||diving.active||!online.room||(!crew.active&&!candidate&&vehicle.type!=='tinny');crewButton.disabled=!crew.active&&!candidate;crewButton.textContent=crew.active?'J · LEAVE TENDER · '+(online.room?.players.find(p=>p.id===crew.driver)?.name||'Friend')+' drives':candidate?'J · BOARD TENDER · '+candidate.name:passengers.length?'TENDER · 2/2 · '+passengers[0].name:'TENDER · 1/2 · passenger seat free';}
const worldAlert=document.createElement('div');worldAlert.id='world-alert';worldAlert.setAttribute('role','status');document.getElementById('hud').append(worldAlert);
const impoundPanel=document.createElement('div');impoundPanel.id='impound-panel';impoundPanel.innerHTML='<strong>CRAFT IMPOUNDED</strong><span><b id="impound-seconds">30</b> seconds</span><small>You’ll relaunch at the Wharf. Settings and account controls are available.</small>';document.getElementById('app').append(impoundPanel);
const policeShortcuts=document.createElement('div');policeShortcuts.id='police-shortcuts';policeShortcuts.innerHTML='<span id="police-nearby"></span><button class="secondary" id="find-police-hud">FIND POLICE</button><button class="secondary" id="watch-police-hud">PATROL WATCH</button>';document.getElementById('hud').append(policeShortcuts);document.getElementById('find-police-hud').onclick=meetPolice;document.getElementById('watch-police-hud').onclick=watchPolice;
let onlineFrom='home';
const onlineUI=new OnlineUI(online,{
 open(){onlineFrom=state;if(state==='playing')pause();input.clear();},
 close(){input.clear();if(onlineFrom==='playing')resume();},
 launch(){if(state==='home')play();else resume();},
});
surfUI=new SurfUI(input,{exit:exitSurf,launch:()=>{surf.launch();input.clear();},load:()=>{surf.load();input.clear();},paddle:()=>{surf.paddle(false);input.clear();},lineup:()=>{surf.paddle(true);input.clear();surfView.cameraReady=false;},join:()=>{surf.join();input.clear();},step:()=>{surf.stepOff();input.clear();},yacht:()=>{if(surf.seats(surf.self).length){surf.message='Your passenger must step off before resetting';return;}surf.cancelRide();surf.yacht();input.clear();surfView.cameraReady=false;},view:()=>{surf.view=(surf.view+1)%4;surf.firstPerson=surf.view===2;surfView.cameraReady=false;},swell:()=>{surf.view=3;surf.firstPerson=false;surfView.cameraReady=false;},option:(key,value)=>{surf.option(key,value);input.clear();surfView.cameraReady=false;},board:type=>surf.boardName(type)});
const surfShortcut=document.createElement('button');surfShortcut.id='visit-surf-hud';surfShortcut.className='secondary';surfShortcut.textContent='SURF REEF · YACHT / BOARDS';surfShortcut.onclick=visitSurf;document.getElementById('hud').append(surfShortcut);const surfPause=document.createElement('button');surfPause.className='secondary';surfPause.textContent='SURF REEF · BOARDS / SWELLS';surfPause.onclick=visitSurf;document.querySelector('.settings-footer').append(surfPause);
const activities=new Activities(scene,settings,(title,subtitle)=>ui.toast(title,subtitle));
activities.onTrick=(label,earned,time)=>economy.earn(label,earned,time);
reefUI=new ReefUI(input,{trip:visitReef,enter:toggleDive,mode:()=>{diving.setMode(diving.mode==='snorkel'?'freedive':'snorkel');input.clear();},sell:sellReefCatch,market:visitFishMarket,fire:fireSpear});
const aim=document.createElement('div');aim.id='reef-aim';document.getElementById('hud').append(aim);
workshopUI=new WorkshopUI(economy,()=>vehicle.type,()=>{vehicle.workshop=economy.effects(vehicle.type);},leaveWharf);
const wharfHud=document.createElement('div');wharfHud.id='wharf-hud';wharfHud.innerHTML='<button id="find-wharf" class="secondary">DRY WHARF</button><span id="trick-wallet"></span><small id="wharf-distance"></small>';document.getElementById('hud').append(wharfHud);document.getElementById('find-wharf').onclick=visitWharf;
const wharfShortcut=document.createElement('button');wharfShortcut.className='secondary';wharfShortcut.id='visit-dry-wharf';wharfShortcut.textContent='DRY WHARF · UPGRADES';wharfShortcut.onclick=visitWharf;document.querySelector('.settings-footer').append(wharfShortcut);
function visitSurf(){if(!ready||state==='workshop'||police?.impounded||!reefTravelAllowed())return;if(police.remaining||onlineSinking)return;surfReturn=vehicle.snapshot();deck.reset();fishing.cancel();battle.cancel();activities.cancel();surf.self=online.session?.user.id||'solo';surf.online=!!online.room;surf.syncWorld();surf.peers=online.failures?[]:online.room?.players||[];surf.enter();vehicle.respawnAt({x:SURF_BREAK.yacht.x+12,z:SURF_BREAK.yacht.z-28,heading:0},simulationTime);input.clear();spray.clear();surfView.cameraReady=false;resume();}
function exitSurf(){if(!surf.active)return;surf.cancelRide();surf.leave();vehicle.respawnAt(surfReturn||SPAWN,simulationTime);input.clear();chase.reset();surfView.cameraReady=false;document.body.classList.remove('surfing');}
function reefTravelAllowed(){if(crew.active){ui.toast('Leave the tender first','J / LEAVE when slow, or R for recovery');return false;}if(surf.active){ui.toast('Exit surfing first','EXIT SURF returns to your boat.');return false;}if(diving.active){ui.toast('Return to the boat first','B / BOARD at the surface, or R for rescue.');return false;}if(fisheries.state==='pursuit'){ui.toast('Fisheries inspection','Stop to be inspected or escape by driving clear.');return false;}return true;}
function visitReef(){if(!ready||state==='workshop'||police?.impounded||!reefTravelAllowed())return;if(police.remaining||onlineSinking){ui.toast('Get clear and afloat first');return;}if(!vehicle.config.diveBoat){ui.toast('Choose a dive boat','CHANGE WATERCRAFT → REEF BUDDY or REEF SCOUT RIB');return;}deck.reset();fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;vehicle.respawnAt(REEF.launch,simulationTime);input.clear();spray.clear();chase.reset();resume();diving.say('Buddy Reef · B / ENTER WATER · snorkel or freedive · game bag limit 8');}
function toggleDive(){if(!ready||state!=='playing'||police?.impounded||onlineSinking)return;if(diving.active){endDive(false);return;}if(police.remaining||fisheries.state==='pursuit'){ui.toast('Get clear of the patrol before diving');return;}if(diving.start(vehicle)){fishing.cancel();battle.cancel();activities.cancel();deck.reset();input.clear();input.lookPitch=-.35;vehicle.vx=vehicle.vz=vehicle.speed=vehicle.throttle=0;vehicle.previous=vehicle.snapshot();spray.clear();}else ui.toast('Reef diving',diving.message);}
function endDive(rescue=false){if(diving.board(vehicle,rescue)){diving.rescueNeeded=false;input.clear();input.orbit=0;input.lookPitch=0;chase.reset();ui.toast('Back aboard',diving.message);}}
function fireSpear(){if(state==='playing'&&diving.active)diving.fire(input,simulationTime,economy.status.catchCount);}
function nearFishMarket(){return Math.hypot(vehicle.x-SPAWN.x,vehicle.z-SPAWN.z)<42&&vehicle.speed<1.5;}
function visitFishMarket(){if(!ready||state==='workshop'||police?.impounded||!reefTravelAllowed())return;if(police.remaining||onlineSinking){ui.toast('Get clear and afloat first');return;}deck.reset();fishing.cancel();battle.cancel();activities.cancel();vehicle.respawnAt(SPAWN,simulationTime);input.clear();spray.clear();chase.reset();resume();diving.say('Wharf fish market · stop beside the marker and SELL CATCH');}
function sellReefCatch(){if(state!=='playing'||diving.active||!nearFishMarket()||fisheries.state==='pursuit'||police?.impounded)return;const amount=economy.sellCatch();diving.say(amount?`Catch sold for $${amount} · spend it at the dry wharf`:'Catch box empty · head to Buddy Reef');if(amount)ui.toast('Catch sold',`+$${amount} upgrade money`);}
function visitWharf(){if(!reefTravelAllowed())return;if(!ready||police?.impounded||state==='workshop')return;if(police?.remaining||onlineSinking){ui.toast('Get clear first','Escape the patrol and stay afloat before using the wharf.');return;}deck.reset();fishing.cancel();battle.cancel();activities.cancel();vehicle.respawnAt(dryWharf.approach,simulationTime);spray.clear();input.clear();chase.reset();resume();ui.toast('Dry wharf ahead','Drive between the gold markers. Slow below 9 km/h and stop in the centre to raise your boat.');}
function enterWharf(){deck.reset();fishing.cancel();battle.cancel();activities.cancel();state='workshop';leavingWharf=false;vehicle.respawnAt(wharfPoint(0,0),simulationTime);vehicle.previous=vehicle.snapshot();input.clear();spray.clear();dryWharf.target=1;workshopUI.show();chase.reset();document.body.classList.add('in-workshop');}
function leaveWharf(){if(state!=='workshop'||leavingWharf)return;workshopUI.hide();dryWharf.target=0;leavingWharf=true;input.clear();}

const battle=new SprayBattle(scene,event=>{
  if(event.type==='score')activities.event(event);
  else{if(event.type==='battle-sink'){activities.combo=0;activities.comboTime=0;input.clear();}if(event.type==='battle-recover'){input.clear();spray?.clear();environment?.userData.moorings?.clearSpray();locals?.flood.clearSpray();people?.flood.clearSpray();}ui.toast(event.label,event.detail);}
});
function updateHud(dt){updateCrew();surfUI.update(surf,state==='playing',!!online.room);updateFishingHud();reefUI.update(diving.status,economy.status,vehicle,nearFishMarket(),state==='playing',fisheries.status);document.getElementById('day-clock').textContent=`${dayClock.status.clock} · ${dayClock.status.label} · ${dayClock.status.fishing.label}`;ui.update(dt,vehicle,activities,fps,qualityName,battle.status,oceanReport(simulationTime),playground.status,barGuide.status(vehicle),environment.userData.moorings.status,locals?.status,cruisers?.status,police?.status);if(crew.active){document.getElementById('craft-label').textContent='TENDER 225 · PASSENGER';document.getElementById('state-label').textContent='FRIEND DRIVES';document.getElementById('ride-label').textContent='J LEAVE · C CAMERA';}}
function startBattle(){if(crew.active||surf.active||diving.active)return;
  if(police?.impounded)return;
  if(['cruiser','racer','dive','rib'].includes(vehicle.type)){ui.toast('Offshore craft · free roam','Choose a smaller craft for spray battles.');return;}
  if(state!=='playing')return;fishing.cancel();activities.cancel();battle.start(vehicle);
  // The first rival frame can compile shaders on slower devices. Show the
  // new mode and water meter immediately instead of waiting for that frame.
  updateHud(0);
}
function toggleBar(){if(diving.active)return;
  if(state!=='playing'||!barGuide)return;
  barGuide.toggle(vehicle);
  if(barGuide.active){battle.cancel();activities.cancel();if(settings.seaState==='calm'){settings.seaState='swell';setSeaState('swell',simulationTime);saveSettings(settings);document.getElementById('sea-state').value='swell';}
    ui.toast('Route to the bar marked','Follow the orange route out between the rock walls, then left outside the entrance. Calm seas switch to Rolling swell.');
  }else ui.toast('Bar guide off');
}
function visitBar(){if(!reefTravelAllowed())return;
  if(police?.impounded)return;
  fishing.cancel();
  if(!ready||!barGuide)return;
  battle.cancel();activities.cancel();activities.combo=0;activities.comboTime=0;vehicle.respawnAt(BAR_LAUNCH,simulationTime);
  spray.clear();environment?.userData.moorings?.clearSpray();locals?.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();barGuide.active=false;resume();toggleBar();ui.toast('At the bar wave zone','Orange buoys mark the bank. Carry speed across the crests. Pause → Rolling swell for larger sets.');
}
function visitPontoons(){if(!reefTravelAllowed())return;
  if(police?.impounded)return;
  fishing.cancel();
  if(!ready)return;
  const boats=environment.userData.moorings.boats;
  const spawn=pontoonApproach(boats,vehicle.type,collision);
  if(!spawn){ui.toast('Find a waterfront pontoon','Moored alloy tenders are dotted along the residential canals.');return;}
  battle.cancel();activities.cancel();vehicle.respawnAt(spawn,simulationTime);spray.clear();environment.userData.moorings.clearSpray();locals.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();resume();
  ui.toast('House pontoon run','Carve alongside and land spray inside the tender. Watch its water meter.');
}
function visitUpstream(){if(!reefTravelAllowed())return;
  if(police?.impounded)return;
  fishing.cancel();
  if(!ready)return;
  battle.cancel();activities.cancel();activities.combo=0;activities.comboTime=0;
  vehicle.respawnAt(UPSTREAM_LAUNCH,simulationTime);spray.clear();environment.userData.moorings.clearSpray();locals.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();barGuide.active=false;resume();
  ui.toast('Upstream · Wyuna Canal','Explore the added canal reach and river bends. You can cruise back toward the Wharf.');
}
function meetLocals(){if(!reefTravelAllowed())return;
  if(police?.impounded)return;
  fishing.cancel();
  if(!ready)return;settings.locals=true;saveSettings(settings);document.getElementById('locals').value='on';
  battle.cancel();activities.cancel();locals.setEnabled(true);const spawn=locals.meetPosition(vehicle);
  if(!spawn){ui.toast('Locals are cruising','Look for tinnies and Thundercats near the Wharf and in the canals.');return;}
  vehicle.respawnAt(spawn,simulationTime);spray.clear();environment.userData.moorings.clearSpray();locals.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();barGuide.active=false;resume();
  ui.toast('Cruise with the locals','Catch up, pull alongside and carve a spray. No clock — just free roam.');
}
function toggleHelm(){
  if(police?.impounded)return;
 if(state!=='playing'||vehicle.type!=='cruiser')return;
 if(!deck.toggle(vehicle)){ui.toast('Slow below 5 km/h to leave the helm');return;}
 fishing.cancel();input.clear();chase.reset();ui.toast(deck.active?'Walking the cockpit':'Back at the helm',deck.active?'WASD / arrows & GO walk · K / FISH casts · J returns to helm':'WASD drives · J leaves the helm when stopped');
}
function visitFishing(){if(!reefTravelAllowed())return;
  if(police?.impounded)return;
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
function meetBigBoats(){if(!reefTravelAllowed())return;
  if(police?.impounded)return;
 if(!ready)return;settings.locals=true;saveSettings(settings);document.getElementById('locals').value='on';cruisers.setEnabled(true);const spawn=cruisers.meetPosition(vehicle);if(!spawn){ui.toast('No clear big-boat approach','Try from the open estuary.');return;}
 deck.reset();fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;vehicle.respawnAt(spawn,simulationTime);spray.clear();cruisers.flood.clearSpray();chase.reset();input.clear();resume();ui.toast('Big boat spray pass','Hold U / REAR to look back. Land the falling rear plume inside the open cockpit; sharp side fans also count.');
}
function visitSpeedRun(){if(!reefTravelAllowed())return;
  if(police?.impounded)return;
 if(!ready)return;deck.reset();fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;vehicle.respawnAt(OFFSHORE_RUN.start,simulationTime);spray.clear();people.flood.clearSpray();locals.flood.clearSpray();chase.reset();input.clear();resume();ui.toast('Offshore speed run','Long clear water ahead. W / GO accelerates; S / BRAKE slows down. R recovers.');
}
function visitCoast(id){if(!reefTravelAllowed())return;
 if(police?.impounded)return;
 if(!ready)return;const place=mapData.coastalExtension.destinations.find(p=>p.id===id);if(!place||collision(place.x,place.z,9,0))return;
 deck.reset();fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;vehicle.respawnAt(place,simulationTime);spray.clear();people.flood.clearSpray();locals.flood.clearSpray();chase.reset();input.clear();resume();ui.toast(place.name,'Cruise north along the beach, or head south towards Mooloolaba and the river mouth.');
}
function visitDolphins(){if(!reefTravelAllowed())return;
  if(police?.impounded)return;
 if(!ready)return;const spawn=dolphins.approach(simulationTime,collision);if(!spawn){ui.toast('Dolphins are beyond the bar','Visit the offshore fishing grounds.');return;}
 settings.camera=1;deck.reset();fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;vehicle.respawnAt(spawn,simulationTime);spray.clear();people.flood.clearSpray();locals.flood.clearSpray();chase.reset();input.clear();resume();ui.toast('Dolphin watch · look ahead','A pod surfaces and breaches here. Slow down and watch; O returns here, L visits waterfront walkers.');
}
function visitWaterfront(){if(!reefTravelAllowed())return;
  if(police?.impounded)return;
 if(!ready)return;const spawn=people.approach(collision);if(!spawn){ui.toast('Explore the Wharf jetties');return;}
 people.focusId=spawn.targetId;people.focusUntil=simulationTime+40;deck.reset();fishing.cancel();battle.cancel();activities.cancel();vehicle.respawnAt(spawn,simulationTime);spray.clear();people.flood.clearSpray();locals.flood.clearSpray();people?.flood.clearSpray();chase.reset();input.clear();resume();ui.toast('Waterfront walkers','Carve alongside the jetty to send falling spray onto the deck. People get back up after a tumble.');
}
function selectCraft(type){crew.leave(true);
 if(surf.active)exitSurf();
 if(diving.active)endDive(true);
 const position=garageReturn||(state!=='home'?vehicle.snapshot():null);deck.reset();fishing.cancel();settings.vehicle=type;vehicle.setType(type);vehicle.workshop=economy.effects(type);vehicle.setTrim(settings[trimKey(type)]);if(position)vehicle.respawnAt(position,simulationTime);replaceModel();ui.selectVehicle();chase.reset();saveSettings(settings);
}
function replaceModel(){
  if(model){scene.remove(model);model.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material?.map)o.material.map.dispose();});}
  model=makeVehicle(settings.vehicle,VEHICLES[settings.vehicle].colours[settings.colour],settings.design,{creator:online.creator});scene.add(model);
}
// Start Auto conservatively on laptops; higher detail remains selectable.
// Lower resolution and fewer scene submissions preserve responsive driving.
function selectedQuality(){return settings.quality==='Auto'?'Low':settings.quality;}
function applyQuality(force){
  qualityName=force||selectedQuality();const q=QUALITY[qualityName];
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.pixelRatio));renderer.shadowMap.enabled=q.shadows;configureSunShadow(sun,q);
  water?.setQuality(q);surfView?.setQuality(q);
  if(spray){spray.dispose();spray=new Spray(scene,q);}
  saveSettings(settings);
}
function pause(){if(state!=='playing')return;surf.paused=true;persistTrim();state='paused';input.clear();ui.show('pause',true);}
function resume(){if(!ready||state==='workshop')return;if(surf.paused&&surf.mode==='ski'&&surf.members().some(p=>p.mode==='ski'))surf.yacht();surf.paused=false;state='playing';input.clear();audio.start();ui.show('pause',false);ui.show('controls',false);last=performance.now();}
function play(){
  if(!ready)return;
  if(!canDriveCraft(vehicle.type,online.creator))selectCraft('ski');
  const returning=!!garageReturn,spawn=garageReturn||(vehicle.type==='racer'?OFFSHORE_RUN.start:SPAWN);garageReturn=null;
  state='playing';vehicle.respawnAt(spawn,simulationTime);spray?.clear();environment?.userData.moorings?.clearSpray();locals?.flood.clearSpray();people?.flood.clearSpray();chase.reset();audio.start();input.clear();ui.show('home',false);ui.show('hud',true);
  ui.toast(returning?'Back in your spot':vehicle.type==='racer'?'Offshore speed run · 500 km/h arcade':'Launched beside The Wharf',vehicle.type==='cruiser'?(isTouchDevice()?'GO drives · DECK switches to walking when stopped · FISH casts':'WASD drives · J switches helm / deck · K casts · SPACE reels'):isTouchDevice()?'Hold GO to drive · arrows steer · tap LIFT for bow rides':'WASD to drive · T riding mode · Q/E trim · H for moves');
}
function home(show=true){crew.leave(true);
 if(surf.active)exitSurf();
 if(diving.active)endDive(true);
  if(state==='workshop')return;
  fishing.cancel();
  if(!show)return;deck.reset();if(state!=='home')garageReturn=vehicle.snapshot();ui.updateGarage();state='home';if(barGuide)barGuide.active=false;battle.cancel();activities.cancel();input.clear();spray?.clear();environment?.userData.moorings?.clearSpray();locals?.flood.clearSpray();people?.flood.clearSpray();chase.reset();ui.show('home',true);ui.show('hud',false);ui.show('pause',false);
}
function policeBoaters(){return [...online.remote.players.values()].flatMap(r=>{const p=r.history.at(-1);return p?.active?[{...p,id:r.id,name:r.name}]:[]});}
function watchPolice(){if(police?.impounded)return;meetPolice();ui.toast('Patrol watch','Police only pursue players after witnessing speeding or dangerous spray. AI boaters are not suspects.');}
function policeEvent(e){
 ui.toast(e.label,e.detail);
 if(e.type==='impound'){if(surf.active)exitSurf();if(diving.active)endDive(true);input.clear();deck.reset();battle.cancel();fishing.cancel();activities.cancel();vehicle.vx=0;vehicle.vz=0;vehicle.speed=0;vehicle.throttle=0;vehicle.previous=vehicle.snapshot();spray.clear();}
 if(e.type==='released'){deck.reset();vehicle.respawnAt(SPAWN,simulationTime);input.clear();spray.clear();chase.reset();}
}
function meetPolice(){if(!reefTravelAllowed())return;if(!ready||police?.impounded)return;const p=police.meetPosition();if(!p)return;deck.reset();fishing.cancel();battle.cancel();activities.cancel();barGuide.active=false;vehicle.respawnAt(p,simulationTime);spray.clear();input.clear();chase.reset();resume();}
function recover(){if(crew.active){crew.leave(true,'Left the tender · back in safe water');return;}if(surf.active){surf.recover();input.clear();return;}if(diving.active){endDive(true);return;}if(police?.impounded)return;deck.reset();fishing.cancel();battle.recover();vehicle.recover(true);spray?.clear();environment?.userData.moorings?.clearSpray();locals?.flood.clearSpray();people?.flood.clearSpray();input.clear();chase.reset();activities.combo=0;activities.comboTime=0;ui.toast('Back in safe water','Fresh start. Send it again.');if(state==='paused')resume();}
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
  applyQuality();environment=buildEnvironment(scene,QUALITY[qualityName]);dryWharf=new DryWharf(scene,solids);environment.userData.moorings.onEvent=e=>{if(e.points)activities.event({type:'score',label:e.label,points:e.points});ui.toast(e.label,e.detail);};playground=new CanalPlayground(scene,solids,e=>activities.event(e));barGuide=new BarGuide(scene,solids);water=new Water(scene,QUALITY[qualityName]);surfView=new SurfView(scene,water,solids,QUALITY[qualityName]);if(import.meta.env.DEV)import('./surf/debug.js').then(({createSurfDebug})=>{surfDebug=createSurfDebug(scene,surf,surfView);});spray=new Spray(scene,QUALITY[qualityName]);locals=new LocalBoaters(scene,collision,e=>ui.toast(e.label,e.detail));solids.push(...locals.colliders);police=new PoliceView(scene,collision,policeEvent);solids.push(...police.colliders);cruisers=new SportfishingTraffic(collision,e=>ui.toast(e.label,e.detail));solids.push(...cruisers.colliders);offshore=new OffshoreView(scene,cruisers,fishing);speedRun=new SpeedRun(scene);reefView=new ReefView(scene);camera.add(reefView.gun);scene.add(camera);fisheriesModel=makeVehicle('rib','#3c715f');scene.add(fisheriesModel);const fisheriesLabel=visitLabel('FISHERIES · BAG LIMIT 8');fisheriesLabel.visible=true;fisheriesLabel.position.y=3.5;fisheriesLabel.scale.set(5.5,.9,1);fisheriesModel.add(fisheriesLabel);fisheriesModel.userData.label=fisheriesLabel;marketMarker=visitLabel('WHARF FISH MARKET · SELL CATCH');marketMarker.visible=true;marketMarker.position.set(SPAWN.x,4,SPAWN.z);scene.add(marketMarker);dolphins=new Dolphins(scene,visitLabel('DOLPHIN POD ↓'));people=new WaterfrontPeople(scene,e=>ui.toast(e.label,e.detail));replaceModel();
  document.getElementById('loading').textContent='Loading coastal textures and watercraft…';
  Promise.all([loadCraftAssets(),loadSurfaceTextures().then(report=>{atmosphere.refreshEnvironment();if(report.failed.length)console.warn('Surface texture fallback:',report.failed.join(', '));})]).then(()=>{replaceModel();ready=true;ui.ready();}).catch(error=>{console.warn('Detailed craft load failed',error);ready=true;ui.ready();ui.toast('Lightweight craft loaded','The detailed model could not load. Reload to try again.');});
  // Restore existing accounts without opening the menu or blocking solo launch.
  void online.restoreSession();
  const canvas=document.querySelector('#game');canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();ui.error('The graphics connection was lost. Reload to relaunch. Try Low quality if this repeats.');});
  function frame(now){
    requestAnimationFrame(frame);if(document.hidden){last=now;return;}setWeatherClock(Date.now()/1000);surf.self=online.session?.user.id||'solo';surf.online=!!online.room;surf.syncWorld();surf.peers=online.failures?[]:online.room?.players||[];setSurfClock(surf.online?(Date.now()/1000)%2200:surf.active?surf.time:simulationTime);
    const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(.1,elapsed);last=now;fpsTime+=elapsed;frameCount++;
    if(fpsTime>=1){fps=frameCount/fpsTime;fpsTime=0;frameCount=0;if(state==='playing'&&settings.quality==='Auto'){lowFrames=fps<28?lowFrames+1:0;if(lowFrames>2){if(qualityName!=='Low'){applyQuality(qualityName==='High'?'Medium':'Low');ui.toast('Keeping it smooth',`Auto quality adjusted to ${qualityName}.`);}else if(renderer.getPixelRatio()>.46){renderer.setPixelRatio(Math.max(.45,renderer.getPixelRatio()*.85));ui.toast('Keeping controls responsive','Auto reduced render resolution; your spray and world stay in place.');}lowFrames=0;}}}
    locals.setEnabled(settings.locals&&!battle.active&&!activities.race);cruisers.setEnabled(settings.locals&&!battle.active&&!activities.race);
    const impound=police.tickImpound();document.body.classList.toggle('impounded',impound>0);document.getElementById('impound-seconds').textContent=String(Math.ceil(impound));
    dryWharf.update(dt);
    if(state==='workshop'&&leavingWharf&&dryWharf.lift<.001){leavingWharf=false;dryWharf.cooldown=8;dockHold=0;vehicle.respawnAt({...wharfPoint(0,0),heading:DRY_WHARF.heading+Math.PI},simulationTime);document.body.classList.remove('in-workshop');state='paused';resume();chase.reset();}
    const wallet=economy.status;document.getElementById('trick-wallet').textContent=`$${wallet.balance.toLocaleString()} UPGRADE MONEY`;const wharfDistance=Math.hypot(vehicle.x-DRY_WHARF.x,vehicle.z-DRY_WHARF.z);document.getElementById('wharf-distance').textContent=wharfDistance<60?'BAY ENTRY · SLOW BELOW 9 KM/H':Math.round(wharfDistance)+' m';
    if(impound&&crew.active)crew.leave(true,'Impounded · left the tender');crew.sync(online,vehicle);
    const combat=online.combat;onlineSinking=combat?.sinking||0;
    if(onlineSinking&&!wasOnlineSinking){if(surf.active)surf.recover();if(diving.active)endDive(true);input.clear();activities.combo=0;activities.comboTime=0;spray.splash(vehicle,10);ui.toast('Swamped by another player','Relaunching in six seconds. Incoming spray counts automatically in online worlds.');}
    if(!onlineSinking&&wasOnlineSinking){vehicle.recover(true);spray.clear();input.clear();chase.reset();ui.toast('Back afloat','A short shield gives you time to pull away.');}
    wasOnlineSinking=onlineSinking>0;
    document.getElementById('police-nearby').textContent=`POLICE · ${Math.round(Math.min(...police.units.map(u=>Math.hypot(u.v.x-vehicle.x,u.v.z-vehicle.z))))} m${Number.isFinite(police.status.speedLimit)?` · LIMIT ${Math.round(police.status.speedLimit)} KM/H`:''}`;const chaseRemaining=police.remaining;document.getElementById('world-alert').textContent=impound?`IMPOUNDED · ${Math.ceil(impound)}s`:onlineSinking?`SWAMPED · relaunch ${Math.ceil(onlineSinking)}s`:combat?.shield>0?`RELAUNCH SHIELD · ${Math.ceil(combat.shield)}s`:combat?.water>1?`WATER ABOARD ${Math.round(combat.water)}%`:chaseRemaining>0?`POLICE → ${police.targetName?.toUpperCase()||'YOU'} · ${police.state==='search'?'ESCAPE IN '+Math.ceil(police.status.escapeIn)+'s':'BREAK LINE OF SIGHT'}${police.catchLoad>0?' · STOPPING RISK':''}`:'';
    if(state==='playing'){
      accumulator=Math.min(.12,accumulator+dt);
      while(accumulator>=FIXED_STEP){simulationTime+=FIXED_STEP;dayClock.update(FIXED_STEP);fishing.hour=dayClock.hour;const controls=impound?{throttle:0,steer:0,trim:0}:input.sample(true);vehicle.deckMode=diving.active||vehicle.type==='cruiser'&&deck.active;if(!crew.active&&!surf.active&&!battle.sinking&&!onlineSinking&&!impound)vehicle.update(FIXED_STEP,vehicle.deckMode?{throttle:0,steer:0,trim:0}:controls,simulationTime,ramps);if(deck.active&&!impound&&!diving.active)deck.update(FIXED_STEP,controls,fishing.active);battle.update(FIXED_STEP,vehicle,simulationTime);locals.update(FIXED_STEP,vehicle,simulationTime);police.update(FIXED_STEP,vehicle,simulationTime,policeBoaters());cruisers.update(FIXED_STEP,vehicle,simulationTime);fishing.update(FIXED_STEP,vehicle,input.held('Space'));people.update(FIXED_STEP,vehicle,simulationTime);environment.userData.moorings.update(FIXED_STEP,vehicle,simulationTime,!battle.sinking&&!vehicle.wipeout);if(!crew.active&&!diving.active&&!surf.active)activities.update(FIXED_STEP,vehicle);diving.update(FIXED_STEP,{...controls,orbit:input.orbit,lookPitch:input.lookPitch},simulationTime,waveHeight(diving.x||vehicle.x,diving.z||vehicle.z,simulationTime));if(diving.rescueNeeded)endDive(true);fisheries.update(FIXED_STEP,vehicle,economy.status.catchCount,diving.active,!!impound,collision);playground.update(FIXED_STEP,vehicle,simulationTime,!activities.race&&!battle.active);accumulator-=FIXED_STEP;if(surf.active){surf.self=online.session?.user.id||'solo';surf.online=!!online.room;surf.syncWorld();surf.peers=online.failures?[]:online.room?.players||[];surf.update(FIXED_STEP,controls,input.held('Space'));}const blocked=crew.active||surf.active||diving.active||fisheries.state==='pursuit'||dryWharf.cooldown>0||police.remaining>0||impound>0||onlineSinking>0||battle.active||activities.race||activities.challenge;dockHold=canDock(vehicle,blocked)?dockHold+FIXED_STEP:0;if(dockHold>.7){enterWharf();accumulator=0;break;}}
    }else if(state==='home'){simulationTime+=dt;vehicle.y=waveHeight(vehicle.x,vehicle.z,simulationTime)+vehicle.config.rideHeight;vehicle.pitch=Math.sin(simulationTime*.7)*.015+(vehicle.config.restPitch||0);vehicle.roll=Math.sin(simulationTime*.6)*.018+(vehicle.config.restRoll||0);}
    const alpha=state==='playing'?accumulator/FIXED_STEP:1,p=vehicle.previous;
    const render={...vehicle,x:THREE.MathUtils.lerp(p.x,vehicle.x,alpha),y:THREE.MathUtils.lerp(p.y,vehicle.y,alpha),z:THREE.MathUtils.lerp(p.z,vehicle.z,alpha),heading:THREE.MathUtils.lerp(p.heading,vehicle.heading,alpha),pitch:THREE.MathUtils.lerp(p.pitch,vehicle.pitch,alpha),roll:THREE.MathUtils.lerp(p.roll,vehicle.roll,alpha)};
    if(crew.active&&crew.pose)Object.assign(render,crew.pose,{type:'tinny',config:VEHICLES.tinny});
    if(state==='workshop')render.y+=dryWharf.lift*DRY_WHARF.lift;
    model.position.set(render.x,render.y-(onlineSinking?onlineSinkDrop(vehicle.type,onlineSinking):battle.sinking?(4-battle.sinking)*.6:0),render.z);model.rotation.set(-render.pitch,render.heading,render.roll+(battle.sinking?.5:0),'YXZ');
    model.visible=!surf.active&&!crew.active;
    if(model.userData.handlebars)model.userData.handlebars.rotation.y=-vehicle.steer*.43;
    for(const part of [model.userData.motor,model.userData.nozzle])if(part)part.rotation.set(vehicle.drive.trimAngle,-vehicle.drive.steeringAngle,0,'YXZ');
    if(model.userData.bucket)model.userData.bucket.rotation.x=vehicle.drive.reverse*1.3;
    if(model.userData.propeller)model.userData.propeller.rotation.z+=vehicle.drive.rpm/60*Math.PI*2*dt;for(const [i,prop]of(model.userData.propellers||[]).entries())prop.rotation.z+=vehicle.drive.rpm/60*Math.PI*2*dt*(i?1:-1);
    vehicle.animationTime=simulationTime;
    if(vehicle.type==='cruiser'){
      const rider=model.userData.rider;rider.position.set(deck.active?deck.x:0,deck.active?1.02:3.25,deck.active?deck.z:-.25);rider.rotation.y=deck.active?deck.heading:0;rider.userData.animate(simulationTime,deck.active?deck.moving:0,fishing.active,!deck.active);
    }else model.userData.rider.userData.update(vehicle,dt,model.userData);
    model.userData.passenger?.userData.update(vehicle,dt);if(model.userData.passenger)model.userData.passenger.visible=!crewPassengers(online.room?.players||[],online.session?.user.id).length;
    if(state==='playing'&&input.sample().trim===0)persistTrim();
    speedRun.update(simulationTime,render);environment.userData.update?.(simulationTime,render);playground.render(simulationTime);barGuide.update(vehicle);barGuide.render(simulationTime);water.update(simulationTime,surf.active?surf.x:render.x,surf.active?surf.z:render.z,surf.active?{...surf.status,config:surf.mode==='ski'?surf.ski.config:{width:.7,length:2.1}}:vehicle);spray.update(state==='playing'?dt:0,render,simulationTime,state==='playing'&&!crew.active&&!surf.active&&!diving.active&&!battle.sinking&&!onlineSinking&&!police?.impounded,input.sample());battle.render(dt,simulationTime,innerHeight,camera.fov,renderer.getPixelRatio(),state==='playing');locals.render(dt,simulationTime,render,qualityName,innerHeight,camera.fov,renderer.getPixelRatio(),state==='playing',alpha);
    const deckPoint=deck.active&&vehicle.type==='cruiser'?bodyPoint(render,[deck.x,1.02,deck.z]):null;
    const view=deckPoint?{...render,...deckPoint,type:'character',speed:0}:render;
    offshore.render(dt,simulationTime,deckPoint?{...view,y:view.y+.45,heading:render.heading+deck.heading}:render,qualityName,state==='playing');
    const firstPerson=settings.camera===2&&state!=='home'&&state!=='workshop'&&!onlineSinking,rider=model.userData.rider;
    if(rider.userData.face)rider.userData.face.visible=!firstPerson;for(const part of [...(rider.userData.faceParts||[]),...(rider.userData.bodyParts||[])])part.visible=!firstPerson;
    model.updateWorldMatrix(true,true);let eye=rider.userData.eye?.getWorldPosition(new THREE.Vector3());
    const cameraView=state==='workshop'?{...view,heading:DRY_WHARF.heading+.85}:deckPoint?{...view,heading:render.heading+deck.heading,hullHeading:render.heading}:view;
    crewView.update(crew.active?crew.pose:null,dt,firstPerson);if(crew.active&&crew.pose){const seat=tenderSeatPoint(crew.pose);eye=new THREE.Vector3(seat.x,seat.y+.95,seat.z);}
    if(firstPerson&&!crew.active&&isJet(vehicle.type))eye=jetRidingEye(render);
    else if(firstPerson&&eye){eye.x+=Math.sin(cameraView.heading)*.42;eye.z+=Math.cos(cameraView.heading)*.42;}
    if(!diving.active&&!surf.active)chase.update(dt,cameraView,input,state==='workshop'?0:onlineSinking?0:firstPerson?2:deckPoint?1:settings.camera,state==='home',eye,firstPerson&&fishing.active?offshore.float.position:null);
    if(diving.active){const direction=diving.direction(input);camera.position.set(diving.x,diving.y,diving.z);camera.lookAt(diving.x+direction.x*10,diving.y+direction.y*10,diving.z+direction.z*10);camera.fov=82;camera.updateProjectionMatrix();}
    surfDebug?.update(dt);surfView.render(dt,surf,{...render,time:simulationTime,alpha},state==='playing',camera,input);
    atmosphere.setUnderwater(diving.active);
    const day=dayClock.status;atmosphere.update(simulationTime,camera.position,day);sun.color.set(day.sunColour);sun.intensity=day.sunIntensity;hemi.intensity=day.ambient;scene.fog.color.set(day.fog);water.setDay(day);
    if(diving.active){scene.fog.color.set('#206b77');scene.fog.density=.032;scene.background=new THREE.Color('#206b77');hemi.intensity=Math.max(.9,day.ambient);document.getElementById('reef-aim').classList.toggle('ready',!!diving.target(input,simulationTime));}else{scene.fog.density=ART.hazeDensity;scene.background=new THREE.Color(day.fog);}
    reefView.render(simulationTime,diving,diving.active?diving:render,waveHeight(REEF.launch.x,REEF.launch.z,simulationTime));fisheriesModel.visible=Math.hypot(vehicle.x-fisheries.x,vehicle.z-fisheries.z)<400;fisheriesModel.position.set(fisheries.x,waveHeight(fisheries.x,fisheries.z,simulationTime)+.1,fisheries.z);fisheriesModel.rotation.y=fisheries.heading;fisheriesModel.userData.label.visible=Math.hypot(vehicle.x-fisheries.x,vehicle.z-fisheries.z)>12;marketMarker.visible=state==='playing'&&!diving.active&&Math.hypot(vehicle.x-SPAWN.x,vehicle.z-SPAWN.z)<120;
    onlineWorld.update(dt,now,surf.active?{...render,...surf.status}:render,camera,{craft:render,crewDriverId:crew.driver,playing:state==='playing',firstPerson:surf.active?true:firstPerson,eye,time:surf.active?surf.time:simulationTime});
    police.render(dt,simulationTime,render,state==='playing',camera);
    dolphins.render(simulationTime,render,qualityName);people.render(dt,simulationTime,render,qualityName);
    spray.resize(innerHeight,camera.fov,renderer.getPixelRatio());
    sun.position.set(vehicle.x+SUN_DIRECTION.x*400,SUN_DIRECTION.y*400,vehicle.z+SUN_DIRECTION.z*400);sun.target.position.set(vehicle.x,0,vehicle.z);
    audio.update(surf.active&&surf.mode==='ski'?surf.ski:vehicle,state==='playing'&&!crew.active&&!diving.active&&(!surf.active||surf.mode==='ski'));uiTime+=dt;if(uiTime>.09){updateHud(uiTime);uiTime=0;}
    if(!diving.active)water.reflect(renderer,camera);renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  // Read-only diagnostics for browser acceptance tests. No scoring or teleport cheats in the shipped game.
  window.__ESTUARY__={get status(){return {ready,state,simulationTime,crew:{...crew.status,passengers:crewPassengers(online.room?.players||[],online.session?.user.id).map(p=>p.id),candidate:crew.nearest(online,vehicle)?.id||null,renderedPassengers:[...onlineWorld.models.values()].filter(e=>e.key.startsWith('crew:')).length},surf:{...surf.status,pumping:input.held('Space'),online:surf.online,peers:surf.members(),ski:{x:surf.ski.x,y:surf.ski.y,z:surf.ski.z,speed:surf.ski.speed},yacht:{...SURF_BREAK.yacht},surfaceTriangles:surfView.patch.geometry.index.count/3},diving:{...diving.status,fish:diving.active?Array.from({length:24},(_,i)=>({...reefFish(i,simulationTime),index:i,available:(diving.cooldowns.get(i)||0)<=simulationTime})):[],aim:{heading:diving.heading+input.orbit,pitch:input.lookPitch},target:diving.target(input,simulationTime)?{...diving.target(input,simulationTime).fish,index:diving.target(input,simulationTime).index}:null},fisheries:fisheries.status,workshop:{...economy.status,type:vehicle.type,effects:economy.effects(vehicle.type),owned:[...economy.boat(vehicle.type).owned],active:{...economy.boat(vehicle.type).active},lift:dryWharf.lift,position:{x:DRY_WHARF.x,z:DRY_WHARF.z},docking:dockHold},online:{...online.status,remoteSprayMaxSpeed:Math.max(0,...[...onlineWorld.models.values()].flatMap(e=>(e.spray?.plume.packets||[]).filter(p=>p.active).map(p=>Math.hypot(p.vx,p.vz)))),visibleSprays:[...onlineWorld.models.values()].filter(e=>e.spray?.plume.mesh.visible||e.spray?.state.left>0||e.spray?.state.right>0).length,visibleCrafts:[...onlineWorld.models.values()].filter(e=>e.model.visible).length},police:police.status,features:'police-online-spray',day:dayClock.status,dolphins:{visible:dolphins.visible},pedestrians:{visible:people.visibleCount,focus:people.focusId,people:people.status},camera:{fov:camera.fov,rearView:!!chase.rearView,mode:settings.camera,position:{x:camera.position.x,y:camera.position.y,z:camera.position.z}},deck:{active:deck.active,x:deck.x,z:deck.z},fishing:fishing.status(vehicle),sportfishers:cruisers.status,locals:{...locals.status,visible:locals.visibleCount},moorings:environment.userData.moorings.status,bar:barGuide.status(vehicle),targets:playground.status,airTrick:{pose:vehicle.airTricks.pose,completed:[...vehicle.airTricks.completed]},battle:battle.status,seaState:settings.seaState,sea:oceanReport(simulationTime),scenery:environment.userData.stats,detailedCraft:!!(model?.userData.detailedModel||model?.userData.blenderShell),vehicle:vehicle.type,position:{x:vehicle.x,y:vehicle.y,z:vehicle.z},speed:vehicle.speed,forwardSpeed:vehicle.vx*Math.sin(vehicle.heading)+vehicle.vz*Math.cos(vehicle.heading),throttle:vehicle.throttle,heading:vehicle.heading,pitch:vehicle.pitch,roll:vehicle.roll,rideMode:vehicle.rideMode,trim:vehicle.trimDegrees,trimIndex:vehicle.trimIndex,shaft:vehicle.shaft?{...vehicle.shaft}:null,womp:vehicle.womp,passengerAft:vehicle.passengerAft,hullCorrection:vehicle.hullCorrection,bounce:{load:vehicle.bounceLoad,compression:vehicle.bounceCompression,hits:vehicle.hullHits,lastHit:vehicle.lastHullHit},planing:vehicle.planing,wettedFraction:vehicle.wettedFraction,drive:{...vehicle.drive},airborne:vehicle.airborne,waveLaunch:!!vehicle.waveLaunch,slip:vehicle.slip,wipeout:vehicle.wipeout,wipeoutReason:vehicle.wipeoutReason,score:activities.score,liveParticles:spray.particles.filter(p=>p.life>0).length,spray:{waterImpacts:spray.waterImpacts,turnGate:spray.state.turnGate,rearPlume:spray.plume.mesh.visible,fallingPackets:spray.plume.falling,plumePackets:spray.plume.geometry.instanceCount,left:spray.state.left,right:spray.state.right,wakeSamples:spray.wake.history.length,reflections:!!water.reflector},race:activities.race?{...activities.race}:null,challenge:activities.challenge?{...activities.challenge}:null,quality:qualityName,graphics:{textures:surfaceTextureStatus(),pixelRatio:renderer.getPixelRatio(),shadows:renderer.shadowMap.enabled,shadowSize:sun.shadow.mapSize.x,reflectionHz:water.reflectionHz,reflectionCaptures:water.reflectionCaptures,groundContacts:environment.userData.stats.contactShadows},fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,settings:{...settings}};}};
} catch(error){console.error(error);ui.error(`WebGL could not start: ${error.message}. Use a current Chrome, Edge, Firefox or Safari with hardware acceleration enabled.`);}
