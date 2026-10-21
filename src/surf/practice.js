import {SURF_BREAK as B,SURF_OPTIONS,surfWave,surfWidth,setSurfClock} from './break.js';
import {resetBoard} from './board-physics.js';
import {waveHeight} from '../config.js';
export const PRACTICE_SPAWNS={
 takeoff:{time:1.5,progress:22.5,q:10,speed:0},
 bottom:{time:17,progress:96,q:12,speed:9},
 barrel:{time:47.5,progress:213,q:6,speed:7},
 air:{time:51,progress:234,q:3,speed:8},
};
// Development-only caller: deterministic comparison, never moves an online peer.
export function practiceSpawn(s,region){
 const p=PRACTICE_SPAWNS[region];if(!p||s.online||!s.active)return false;
 s.cancelRide();resetBoard(s);s.previous=null;s.helper=false;s.partner=null;s.time=p.time;setSurfClock(s.time);
 s.x=B.x+SURF_OPTIONS.direction*(p.progress-140);const crest=surfWave(s.x,B.z-85+p.time*B.travelSpeed,s.time).crest;
 s.z=crest+p.q*surfWidth();s.y=waveHeight(s.x,s.z,s.time)+.12;s.heading=SURF_OPTIONS.direction*(region==='air'?1.5:.8);s.pitch=s.roll=0;s.mode='paddle';s.speed=p.speed;s.vx=Math.sin(s.heading)*s.speed;s.vz=Math.cos(s.heading)*s.speed;
 if(region!=='takeoff')s.tryCatch(true);s.message='Practice: '+region+' · identical wave, position and velocity';return true;
}
