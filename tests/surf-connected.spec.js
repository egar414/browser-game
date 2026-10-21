import {test,expect} from '@playwright/test';
import {surfInputPilot} from './surf-input-pilot.js';
const status=p=>p.evaluate(()=>window.__ESTUARY__.status);
test('actual keyboard input completes takeoff, barrel, turn, snap, cutback, rebound, air and landing',async({page:p})=>{
 test.setTimeout(600000);const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|shader error|VALIDATE_STATUS/.test(m.text()))errors.push(m.text());});
 await p.setViewportSize({width:960,height:640});await p.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true,locals:false,seaState:'calm',oceanVersion:1,dayMode:'day'})));
 await p.goto('/');await p.waitForFunction(()=>window.__ESTUARY__?.status.ready,null,{timeout:60000});await p.locator('#play').click();await p.locator('#visit-surf-hud').click();await p.locator('#surf-lineup').click();const pilot=surfInputPilot(),held=new Set(),captured=new Set();let last;
 for(let i=0;i<1500;i++){
  last=await status(p);const s=last.surf;if(s.rides)break;expect(s.mode,s.message).not.toBe('wipeout');
  const input=pilot(s),wanted=new Set(['KeyW',...(input.space?['Space']:[]),...(input.freestyle?['ShiftLeft']:[]),...(input.steer>0?['KeyA']:input.steer<0?['KeyD']:[])]);
  for(const code of [...held])if(!wanted.has(code)){await p.keyboard.up(code);held.delete(code);}for(const code of wanted)if(!held.has(code)){await p.keyboard.down(code);held.add(code);}
  for(const move of ['Barrel','Cutback','Air','Landing'])if(s.moves.includes(move)&&!captured.has(move)){captured.add(move);await p.screenshot({path:`test-results/surf-keyboard-${move}.png`});}
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
 }
 for(const code of held)await p.keyboard.up(code);const s=(await status(p)).surf;expect(s.rides).toBeGreaterThan(0);let index=-1;for(const move of ['Takeoff','Bottom turn','Snap','Cutback','Rebound','Barrel','Air','Landing']){index=s.moves.indexOf(move,index+1);expect(index,move+' in '+s.moves.join(', ')).toBeGreaterThanOrEqual(0);}expect(s.score).toBeGreaterThan(500);expect(errors).toEqual([]);console.log('Connected keyboard ride',JSON.stringify({moves:s.moves,sections:s.sections,points:s.score,fps:last.fps,drawCalls:last.drawCalls,triangles:last.triangles,renderer:'cloud Chromium / software SwiftShader'}));
});
