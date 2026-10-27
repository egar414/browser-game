import {test,expect} from '@playwright/test';
test('ocean stencil cuts every hull, follows pitched and sunk boats, preserves catamaran channels and intentional flood water',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('/art/hull-water-review.html');await page.waitForFunction(()=>window.hullReview);
 for(const type of ['tinny','dinghy','skua','angler','ski','hyper','seago','cat','racer','cruiser','dive','rib','yacht'])for(const rotation of [[0,0,0],[-.7,.4,.25]]){
  const result=await page.evaluate(({type,rotation})=>{hullReview.setup(type,{rotation});return hullReview.check();},{type,rotation});expect(result.stencil).toBe(true);expect(result.inside,JSON.stringify({type,rotation,result})).toBeGreaterThan(0);expect(result.outside).toBeGreaterThan(0);expect(result.mismatches,JSON.stringify({type,rotation,result})).toBeLessThanOrEqual(4);expect(result.flags).toEqual([true,true,true,true]);
 }
 const submerged=await page.evaluate(()=>{hullReview.setup('angler',{position:[0,-3,0]});return hullReview.check();});expect(submerged.inside).toBe(0);expect(submerged.mismatches).toBe(0);
 const movingCamera=await page.evaluate(()=>{hullReview.setup('angler');hullReview.camera.position.set(2,5,-3);hullReview.camera.lookAt(0,0,0);return hullReview.check();});expect(movingCamera.inside).toBeGreaterThan(0);expect(movingCamera.mismatches).toBeLessThanOrEqual(4);
 const instanced=await page.evaluate(()=>{hullReview.setup('tinny',{rotation:[-.1,.8,.03]},true);return hullReview.check();});expect(instanced.inside).toBeGreaterThan(0);expect(instanced.mismatches).toBeLessThanOrEqual(4);
 const flood=await page.evaluate(()=>{hullReview.setup('angler');return hullReview.addFlood();});expect(flood[1]).toBeGreaterThan(240);expect(flood[0]).toBeLessThan(20);
 await page.evaluate(()=>hullReview.showBoat('angler'));await page.screenshot({path:'test-results/310-wasp-dry-interior.png'});expect(errors).toEqual([]);
});
