import * as THREE from 'three';
import { RACE } from '../config.js';
import { saveSettings } from './storage.js';
export function formatTime(seconds) { return `${Math.floor(seconds/60)}:${(seconds%60).toFixed(1).padStart(4,'0')}`; }
export class Activities {
  constructor(scene, settings, toast) {
    this.settings=settings;this.toast=toast;this.race=null;this.challenge=null;this.score=0;this.combo=0;this.comboTime=0;this.lastLabel='';this.repeat=0;this.totalTime=0;
    this.marker=new THREE.Group();scene.add(this.marker);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(10,0.28,8,48),new THREE.MeshBasicMaterial({color:'#ecbd58'}));ring.position.y=4.8;this.marker.add(ring);
    const arrow=new THREE.Mesh(new THREE.ConeGeometry(1,2,3),new THREE.MeshBasicMaterial({color:'#fff3c7'}));arrow.position.y=16;arrow.rotation.z=Math.PI;this.marker.add(arrow);
    this.marker.visible=false;
  }
  startRace(v) {
    this.challenge=null;this.race={index:0,time:0,started:false};
    this.toast('Canal run','Reach the gold gate to start. F restarts.');this.placeGate();
  }
  placeGate() {
    this.marker.visible=!!this.race;if(!this.race)return;
    const p=RACE[this.race.index],prev=RACE[(this.race.index+RACE.length-1)%RACE.length];
    this.marker.position.set(p[0],0,p[1]);this.marker.rotation.y=Math.atan2(p[0]-prev[0],p[1]-prev[1]);
  }
  startChallenge() {
    this.race=null;this.marker.visible=false;this.challenge={remaining:90,score:0};this.combo=0;
    this.toast('90-second spray session','Head for the ramps. Land clean to bank aerial tricks.');
  }
  cancel() {this.race=null;this.challenge=null;this.marker.visible=false;}
  event(event) {
    if(event.type==='wipeout'){this.combo=0;this.comboTime=0;this.toast('Wipeout',`${event.label}. Recovering…`);return;}
    if(event.type!=='score')return;
    this.repeat=this.lastLabel===event.label?this.repeat+1:0;this.lastLabel=event.label;
    const points=Math.round(event.points*Math.max(0,1-this.repeat*.25));
    if(points===0){this.toast('Mix it up','Try a different move before banking this trick again.');return;}
    this.combo=this.comboTime>0?Math.min(3,this.combo+.25):1;this.comboTime=7;
    const earned=Math.round(points*this.combo);this.score+=earned;
    if(this.challenge)this.challenge.score+=earned;
    this.toast(event.label,`+${earned}  ·  ${this.combo.toFixed(2).replace(/\.00$/,'')}× combo`);
  }
  update(dt,v) {
    this.totalTime+=dt;this.comboTime=Math.max(0,this.comboTime-dt);if(!this.comboTime)this.combo=0;
    if(this.race){
      if(this.race.started)this.race.time+=dt;
      const gate=RACE[this.race.index];
      if(Math.hypot(v.x-gate[0],v.z-gate[1])<21){
        if(!this.race.started){this.race.started=true;this.toast('You’re on!','Follow the gold gates through the canals.');}
        this.race.index++;
        if(this.race.index===RACE.length){
          const time=this.race.time,best=this.settings.bestRace;
          if(!best||time<best){this.settings.bestRace=time;saveSettings(this.settings);}
          this.toast(`Finished · ${formatTime(time)}`,`${!best||time<best?'New personal best! ':''}Press F to race again.`);this.race=null;
        }
        this.placeGate();
      }
    }
    if(this.challenge){
      this.challenge.remaining-=dt;
      if(this.challenge.remaining<=0){
        const score=this.challenge.score;this.settings.bestTricks=Math.max(score,this.settings.bestTricks);saveSettings(this.settings);
        this.toast(`Session complete · ${score.toLocaleString()}`,'G starts another spray session.');this.challenge=null;
      }
    }
    this.marker.children[1].position.y=16+Math.sin(this.totalTime*2)*.5;
  }
}
