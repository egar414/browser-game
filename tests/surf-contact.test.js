import test from 'node:test';import assert from 'node:assert/strict';
import {SurfSession} from '../src/surf/session.js';
import {sampleSurfSurface,sampleBoardContact,supportBoard} from '../src/surf/contact.js';
import {SURF_BREAK as B,surfWave,setSurfOptions} from '../src/surf/break.js';
import {practiceSpawn} from '../src/surf/practice.js';
import {BOARDS} from '../src/surf/boards.js';
import {surfMove} from '../src/surf/board-physics.js';
const idle={steer:0,throttle:0,trim:0,freestyle:false};
test('shared sample exposes a stable frame, normal, water velocity and parametric overhang',()=>{
 const s=new SurfSession();s.enter();practiceSpawn(s,'barrel');const w=sampleSurfSurface(s.x,s.z,s.time);
 assert(w.barrel.roof!==null);assert(w.barrel.insideSpan);assert(w.steepness>0);assert(Math.abs(Math.hypot(w.normal.x,w.normal.y,w.normal.z)-1)<1e-8);assert.equal(w.frame.along,73);assert(Math.abs(w.surfaceVelocity.z-B.travelSpeed)>1);s.leave();
});
test('nose centre and tail contact differ on a slope; damped support neither teleports nor explodes',()=>{
 const s=new SurfSession();s.enter();practiceSpawn(s,'bottom');const c=BOARDS.short,w=surfWave(s.x,s.z,s.time);const a=sampleBoardContact(s,c,s.time);assert.equal(s.contacts.length,3);assert(Math.abs(s.contacts[0].height-s.contacts[2].height)>.01);
 s.y=a.height+.3;s.vy=0;s.vx=s.vz=0;supportBoard(s,c,{...w,surfaceVelocity:{x:0,y:0,z:0}},1/60);assert(s.y>a.height+.01);assert(s.y<a.height+.3);
 for(let i=0;i<60;i++)supportBoard(s,c,{...w,surfaceVelocity:{x:0,y:0,z:0}},1/60);assert(Math.abs(s.y-a.height)<.02);assert(Number.isFinite(s.pitch));
 s.y=a.height+.5;sampleBoardContact(s,c,s.time);assert(s.contact<.5);s.leave();
});
test('fixed-step simulation is identical at 30, 60 and 144 Hz rendering',()=>{
 function run(hz){const s=new SurfSession();s.enter();s.paddle(true);let accumulator=0,steps=0;for(let f=0;f<hz*6;f++){accumulator=Math.min(.12,accumulator+1/hz);while(accumulator+1e-10>=1/60){s.update(1/60,{...idle,throttle:1},true);accumulator-=1/60;steps++;}const rendered=s.renderState(Math.max(0,accumulator*60));assert(Number.isFinite(rendered.y));}const out={x:s.x,y:s.y,z:s.z,speed:s.speed,steps};s.leave();return out;}
 const baseline=run(60);for(const hz of [30,144]){const result=run(hz);assert.equal(result.steps,baseline.steps);for(const key of ['x','y','z','speed'])assert(Math.abs(result[key]-baseline[key])<1e-8);}
});
test('interpolation crosses headings smoothly and practice restart is repeatable on both breaks',()=>{
 for(const direction of [1,-1]){const s=new SurfSession();s.enter();s.option('direction',direction);s.paddle(true);s.update(1/60,{...idle,throttle:1},true);const p=s.previous,r=s.renderState(.5);assert(Math.abs(r.x-(p.x+s.x)/2)<1e-8);s.update(1/60,{...idle,steer:1},false);s.restart();assert.equal(s.mode,'paddle');assert.equal(s.time,1.5);assert.equal(s.speed,0);assert.equal(s.ridePoints,0);assert.equal(s.status.options.direction,direction);s.leave();}setSurfOptions({direction:1});
});
test('steering spam at a fixed position cannot repeatedly award a manoeuvre',()=>{
 const s=new SurfSession();s.enter();practiceSpawn(s,'bottom');surfMove(s,'Snap',75);const points=s.ridePoints;for(let i=0;i<100;i++){s.time+=4;surfMove(s,'Snap',75);}assert.equal(s.ridePoints,points);s.leave();
});
test('development spawns cannot relocate an online surfer',()=>{const s=new SurfSession();s.online=true;s.enter();const before={x:s.x,z:s.z};assert.equal(practiceSpawn(s,'air'),false);assert.equal(s.x,before.x);assert.equal(s.z,before.z);s.leave();});
test('lost support falls under gravity rather than pulling a distant board onto the face',()=>{
 const s=new SurfSession();s.enter();practiceSpawn(s,'bottom');const c=BOARDS.short,w=surfWave(s.x,s.z,s.time);s.y+=2;s.vy=0;const before=s.y;supportBoard(s,c,w,1/60);assert.equal(s.contactState,'FREE');assert(s.vy<0);assert(s.y<before&&s.y>before-.01);assert.equal(s.planing,0);s.leave();
});
test('rail input rotates heading gradually and preserves momentum instead of snapping velocity',()=>{
 const s=new SurfSession();s.enter();practiceSpawn(s,'bottom');const heading=s.heading,vx=s.vx,vz=s.vz;s.update(1/60,{...idle,steer:1},false);assert(Math.abs(s.heading-heading)<.04);assert(Math.abs(s.vx-vx)<1);assert(Math.abs(s.vz-vz)<1);assert(Math.abs(Math.atan2(s.vx,s.vz)-s.heading)>.001);assert(s.grip>0);s.leave();
});
