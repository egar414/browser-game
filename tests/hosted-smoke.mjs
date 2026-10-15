// Public deployment acceptance check. TLS validation stays enabled.
import { chromium } from '@playwright/test';
const endpoint=process.env.ESTUARY_URL||'https://egar414.github.io/browser-game/';
const proxyUrl=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;let proxy;
if(proxyUrl&&endpoint.startsWith('https:')){const u=new URL(proxyUrl);proxy={server:`${u.protocol}//${u.hostname}${u.port?':'+u.port:''}`};if(u.username)proxy.username=decodeURIComponent(u.username);if(u.password)proxy.password=decodeURIComponent(u.password);}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,proxy,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
  for(const type of ['ski','cat']){
    const context=await browser.newContext({viewport:{width:960,height:640}});
    await context.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({quality:'Low',muted:true})));
    const page=await context.newPage(),errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failures.push(r.url()));
    const response=await page.goto(endpoint,{waitUntil:'networkidle'});if(response.status()!==200)throw new Error(`HTTP ${response.status()}`);
    await page.waitForFunction(()=>window.__ESTUARY__?.status.ready);
    await page.locator(`[data-vehicle="${type}"]`).click();await page.locator('#play').click();await page.keyboard.press('KeyT');
    await page.keyboard.down('KeyQ');await page.waitForFunction(()=>window.__ESTUARY__.status.trim>4);await page.keyboard.up('KeyQ');
    const trim=await page.evaluate(()=>window.__ESTUARY__.status.trim);
    await page.waitForTimeout(300);if(await page.evaluate(()=>window.__ESTUARY__.status.trim)!==trim)throw new Error('Trim did not latch');
    await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__ESTUARY__.status.speed>11,{},{timeout:30000});
    const heading=await page.evaluate(()=>window.__ESTUARY__.status.heading);
    await page.keyboard.down('KeyA');await page.keyboard.down('ShiftLeft');await page.waitForFunction(start=>Math.abs(window.__ESTUARY__.status.heading-start)>.8,heading,{timeout:20000});
    await page.screenshot({path:`/tmp/estuary-realism-public-${type}.png`});
    const s=await page.evaluate(()=>window.__ESTUARY__.status);
    if(s.rideMode!=='freestyle'||s.liveParticles<=0||s.drive.flow<=0)throw new Error('New mode or water effects missing');
    console.log(JSON.stringify({vehicle:type,mode:s.rideMode,trim:s.trim,speed:s.speed,rpm:s.drive.rpm,flow:s.drive.flow,particles:s.liveParticles,spray:s.spray,fps:s.fps,errors,failedRequests:failures}));
    if(errors.length||failures.length)throw new Error('Hosted runtime or network errors');
    await context.close();
  }
}finally{await browser.close();}
