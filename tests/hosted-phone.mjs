// Public HTTPS + native Chromium touch check. No state mutation/teleport helpers.
import{chromium}from'@playwright/test';
const endpoint=process.env.ESTUARY_URL||'https://egar414.github.io/browser-game/',raw=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;let proxy;
if(raw&&endpoint.startsWith('https:')){const u=new URL(raw);proxy={server:`${u.protocol}//${u.hostname}${u.port?':'+u.port:''}`};if(u.username)proxy.username=decodeURIComponent(u.username);if(u.password)proxy.password=decodeURIComponent(u.password);}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,proxy,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});await context.addInitScript(()=>localStorage.setItem('estuary-rats-v1',JSON.stringify({muted:true})));
 const p=await context.newPage(),errors=[],failed=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('requestfailed',r=>failed.push(r.url()));
 const response=await p.goto(endpoint,{waitUntil:'networkidle'});if(response.status()!==200)throw Error(`HTTP ${response.status()}`);await p.waitForFunction(()=>window.__ESTUARY__?.status.ready);
 let s=await p.evaluate(()=>window.__ESTUARY__.status);if(s.features!=='wharf-shoal-spray-tricks'||!s.detailedCraft||s.scenery.mooredTinnies<9)throw Error('Coastal assets not served');
 await p.locator('#play').tap();await p.locator('#touch-fullscreen').tap();await p.waitForTimeout(250);
 const fullScreen=await p.evaluate(()=>!!document.fullscreenElement);if(fullScreen)await p.evaluate(()=>document.exitFullscreen());
 if(await p.evaluate(()=>window.__ESTUARY__.status.state)==='paused')await p.locator('#resume').tap();
 const session=await context.newCDPSession(p),r=await p.locator('[data-code="KeyW"]').boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});await p.waitForFunction(()=>window.__ESTUARY__.status.speed>7,null,{timeout:45000});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await p.screenshot({path:'/tmp/estuary-coastal-public-phone.png'});s=await p.evaluate(()=>window.__ESTUARY__.status);
 console.log(JSON.stringify({mobileLandscape:true,http:response.status(),fullScreen,features:s.features,scenery:s.scenery,sea:s.sea,quality:s.quality,speed:s.speed,errors,failedRequests:failed}));
 await p.locator('#menu-button').tap();await p.locator('#garage').tap();await p.locator('[data-vehicle="cat"]').tap();await p.locator('#play').tap();if(await p.evaluate(()=>window.__ESTUARY__.status.vehicle)!=='cat')throw Error('Phone cat selection failed');
 await p.setViewportSize({width:390,height:844});await p.locator('.rotate-hint').waitFor({state:'visible'});await p.screenshot({path:'/tmp/estuary-coastal-public-rotate.png'});await p.locator('#keep-portrait').tap();if(await p.locator('.rotate-hint').isVisible())throw Error('Portrait fallback failed');
 if(errors.length||failed.length)throw Error('Hosted runtime/request failure');console.log('Phone cat selection, rotate prompt and portrait fallback passed.');
}finally{await browser.close();}
