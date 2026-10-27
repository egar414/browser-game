import{test,expect}from'@playwright/test';
import{readFile}from'node:fs/promises';
test('310 Wasp actual game factory renders from every reference direction and exports a real GLB',async({page:p})=>{
 const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.setViewportSize({width:1600,height:1000});await p.goto('/art/wasp-review.html');await p.waitForFunction(()=>window.waspReview);
 for(const name of['top','frontAngle','rearAngle','left','right','front','rear','inside']){await p.evaluate(n=>window.waspReview.view(n),name);await p.screenshot({path:`test-results/wasp-${name}.png`});}
 await p.evaluate(()=>window.waspReview.sheet());await p.screenshot({path:'test-results/wasp-reference-sheet.png'});
 const waiting=p.waitForEvent('download');await p.locator('#export').click();const download=await waiting;await download.saveAs('/workspace/310-wasp.glb');const buffer=await readFile('/workspace/310-wasp.glb');expect(buffer.readUInt32LE(0)).toBe(0x46546c67);expect(buffer.readUInt32LE(4)).toBe(2);const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());for(const name of['Hull','Aft bench','Forward bench','Bow seat','25 hp outboard','Propeller'])expect(json.nodes.some(n=>n.name===name)).toBe(true);expect(json.meshes.length).toBeGreaterThan(10);expect(json.images.length).toBeGreaterThan(0);expect(errors).toEqual([]);
});
