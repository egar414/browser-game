import test from 'node:test';import assert from 'node:assert/strict';
import {SurfSession} from '../src/surf/session.js';
import {surfInputPilot} from './surf-input-pilot.js';
import {surfWave,setSurfOptions,SURF_BREAK as B} from '../src/surf/break.js';
const sequence=['Takeoff','Barrel','Bottom turn','Snap','Cutback','Rebound','Air','Landing'];
for(const board of ['short','body'])for(const direction of [1,-1])test(`${board} ${direction===1?'left':'right'}: keyboard inputs complete the connected ride and bank only after landing`,()=>{
 const awards=[],s=new SurfSession(()=>null,(points,tube)=>awards.push({points,tube}));s.enter();s.option('direction',direction);s.boardName(board);s.paddle(true);const pilot=surfInputPilot();let air=false,apex=0,landed=false;
 for(let i=0;i<7200;i++){const input=pilot(s.status);s.update(1/60,input,input.space);if(s.airborne){air=true;apex=Math.max(apex,s.y-surfWave(s.x,s.z,s.time).height);assert.equal(awards.length,0);}landed ||=s.moves.includes('Landing');assert.notEqual(s.mode,'wipeout',s.message);if(s.rides)break;}
 assert(air&&landed&&apex>.15);assert.equal(awards.length,1);assert(awards[0].points>500);let index=-1;for(const move of sequence){index=s.moves.indexOf(move,index+1);assert(index>=0,move+' in '+s.moves.join(', '));}assert(s.sections.includes('REBUILT POCKET'));assert(s.sections.includes('AIR SECTION'));s.leave();setSurfOptions({direction:1});
});
test('expert barrel clearance requires crouching and rail steering preserves existing velocity',()=>{
 const s=new SurfSession(()=>null);s.enter();s.option('difficulty','expert');s.paddle(true);let slip=0;const pilot=surfInputPilot();for(let i=0;i<900&&s.mode!=='wipeout';i++){const input=pilot(s.status);const heading=s.heading;s.update(1/60,input,input.space);assert(Math.abs(s.heading-heading)<.08);if(s.mode==='ride')slip=Math.max(slip,Math.abs(Math.atan2(Math.sin(s.heading-Math.atan2(s.vx,s.vz)),Math.cos(s.heading-Math.atan2(s.vx,s.vz)))));}assert(slip>.03);assert.equal(s.mode,'wipeout');assert.match(s.message,/lip contact/);s.leave();setSurfOptions({difficulty:'forgiving'});
});
test('an airborne board falls under gravity and a nose-first landing wipes out without banking',()=>{
 const awards=[],s=new SurfSession(()=>null,p=>awards.push(p));s.enter();s.paddle(true);s.mode='ride';s.airborne=true;s.airTime=.2;s.y=surfWave(s.x,s.z,s.time).height+.7;s.vy=-1;s.vx=6;s.vz=3;s.speed=7;s.pitch=Math.PI;const initial=s.vy;s.update(1/60,{throttle:0,steer:0,trim:0,freestyle:false},false);assert(s.vy<initial);for(let i=0;i<120&&s.mode!=='wipeout';i++)s.update(1/60,{throttle:0,steer:0,trim:0,freestyle:false},false);assert.equal(s.mode,'wipeout');assert.match(s.message,/landing/);assert.equal(awards.length,0);s.leave();
});
test('bodyboard rail release completes a grounded spin with a speed cost and never acts as a jump',()=>{
 const s=new SurfSession(()=>null);s.enter();s.boardName('body');s.paddle(true);const input={throttle:1,steer:0,trim:0,freestyle:false,pose:''};for(let i=0;i<240;i++)s.update(1/60,input,true);const before=s.speed;for(let i=0;i<240;i++){s.update(1/60,{...input,steer:1,pose:'nohander'},false);assert(!s.airborne);}assert(s.moves.includes('Bodyboard spin'));assert(s.speed<before);s.leave();
});
test('fore/aft weight responds progressively and changes physical drag and grip',()=>{
 const rear=new SurfSession(()=>null),front=new SurfSession(()=>null);rear.enter();rear.paddle(true);front.enter();front.paddle(true);const input={throttle:1,steer:.1,trim:0,freestyle:false,pose:''};for(let i=0;i<200;i++){rear.update(1/60,input,true);front.update(1/60,input,true);}for(let i=0;i<40;i++){rear.update(1/60,{...input,trim:1},false);front.update(1/60,{...input,trim:-1},false);}assert(rear.foreAft>.9);assert(front.foreAft<-.9);assert(Math.abs(rear.vz-front.vz)>.005);assert(Number.isFinite(rear.pitch)&&Number.isFinite(front.pitch));rear.leave();front.leave();
});
