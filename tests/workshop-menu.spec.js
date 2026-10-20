import {test,expect} from '@playwright/test';import {bootAccount} from './online-browser-fixture.js';import {database,users} from './multiplayer-fixture.js';
test('landscape touch shop scrolls, buys, keeps trick/video gates and closes within the viewport',async({browser})=>{
 const ctx=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const p=await ctx.newPage();
 try{await p.route('**/__workshop-ui-test',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/style.css"></head><body><div id="app"></div></body></html>'}));await p.goto('/__workshop-ui-test');await p.evaluate(async()=>{const {WorkshopEconomy}=await import('/src/systems/workshop-economy.js'),{WorkshopUI}=await import('/src/systems/workshop-ui.js');const w=new WorkshopEconomy({getItem:()=>null,setItem(){}});w.earn('Clean air',5000,0);const ui=new WorkshopUI(w,()=>'tinny',()=>{},()=>{ui.hide();document.body.dataset.closed='yes';});ui.show();});
 const bounds=await p.locator('#workshop').boundingBox();expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(390);expect(bounds.x+bounds.width).toBeLessThanOrEqual(844);
 await p.locator('[data-upgrade="engine"]').tap();await expect(p.locator('#workshop-wallet')).toContainText('$820');await expect(p.locator('[data-upgrade="pro-engine"]')).toBeDisabled();await p.locator('[data-upgrade="pro-engine"]').scrollIntoViewIfNeeded();await expect(p.getByRole('button',{name:'VIDEO REWARDS · COMING LATER'}).first()).toBeDisabled();await p.screenshot({path:'test-results/workshop-landscape-phone.png'});await p.locator('#workshop-exit').tap();await expect(p.locator('#workshop')).toBeHidden();
 }finally{await ctx.close();}
});
test('signing in and out changes the workshop wallet independently of Creator status',async({page:p})=>{
 test.setTimeout(120000);const f=await database();try{await p.addInitScript(()=>localStorage.setItem('estuary-rats-workshop-v1:guest',JSON.stringify({balance:800,earned:800})));
 await bootAccount(p,f,users[0],'workshop@example.test');expect((await p.evaluate(()=>window.__ESTUARY__.status)).workshop.balance).toBe(0);await p.getByRole('button',{name:'SIGN OUT',exact:true}).click();await expect.poll(async()=>(await p.evaluate(()=>window.__ESTUARY__.status)).workshop.account).toBe('guest');expect((await p.evaluate(()=>window.__ESTUARY__.status)).workshop.balance).toBe(800);
 }finally{await f.db.close();}
});
