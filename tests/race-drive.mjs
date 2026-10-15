// End-to-end acceptance drive using only the shipped keyboard controls.
// Run manually: node tests/race-drive.mjs (a local dev server must be running).
import { chromium } from '@playwright/test';
import { RACE } from '../src/config.js';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:800,height:500}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true})));
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);await page.locator('#play').click();await page.keyboard.press('KeyF');
  let held=new Set(),lastGate=-1,complete=false,steps=0;const started=Date.now();
  while(Date.now()-started<240000){
    const s=await page.evaluate(()=>window.__ESTUARY__.status);
    if(!s.race){if(s.settings.bestRace>0){complete=true;console.log('RACE COMPLETE',s.settings.bestRace.toFixed(2),'seconds; FPS',s.fps.toFixed(1),'errors',errors);break;}throw new Error('Race unexpectedly cancelled');}
    const target=RACE[s.race.index],dx=target[0]-s.position.x,dz=target[1]-s.position.z;
    const angle=Math.atan2(dx,dz);const delta=Math.atan2(Math.sin(angle-s.heading),Math.cos(angle-s.heading));
    const distance=Math.hypot(dx,dz),turn=Math.abs(delta);
    const desired=turn>1?7:turn>.5?10:distance<45?12:21;
    const next=new Set();
    // With this heading convention A increases heading. Slow down before
    // sharp corners to test the actual finite-turn-radius handling.
    if(delta>.1)next.add('KeyA');else if(delta<-.1)next.add('KeyD');
    if(s.speed>desired+2)next.add('KeyS');else next.add('KeyW');
    for(const key of held)if(!next.has(key))await page.keyboard.up(key);
    for(const key of next)if(!held.has(key))await page.keyboard.down(key);
    held=next;
    if(s.race.index!==lastGate){lastGate=s.race.index;console.log('GATE',lastGate,'position',s.position,'speed',s.speed.toFixed(1),'fps',s.fps.toFixed(1));}
    if(++steps%80===0)console.log('Driving',s.race.index,'distance',distance.toFixed(1),'speed',s.speed.toFixed(1),'heading error',delta.toFixed(2));
    await page.waitForTimeout(100);
  }
  await page.screenshot({path:'/tmp/estuary-race-finish.png'});
  if(!complete)throw new Error('The keyboard acceptance driver did not finish the race in four minutes');
  if(errors.length)throw new Error(errors.join('\n'));
  await page.keyboard.press('KeyF');const restarted=await page.evaluate(()=>window.__ESTUARY__.status.race);if(restarted?.index!==0)throw new Error('Race restart failed');
} finally {await browser.close();}
