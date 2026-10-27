import {test,expect} from '@playwright/test';
test('upgraded fleet renders actual hulls, interiors and independent motor assemblies from multiple angles',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('/art/fleet-review.html');await page.waitForFunction(()=>window.fleetReview);const report=[];
 for(const type of ['angler','tinny','dinghy','skua','cat','ski','seago','hyper','racer','cruiser','dive','rib','yacht']){
  const stats=await page.evaluate(type=>fleetReview.select(type),type);expect(stats.triangles).toBeGreaterThan(5000);expect(stats.triangles).toBeLessThan(36000);expect(stats.draws).toBeLessThan(40);report.push(stats);
  for(const view of ['angle','top','side']){await page.evaluate(v=>fleetReview.view(v),view);await page.screenshot({path:`test-results/fleet-${type}-${view}.png`});}
 }
 console.log(JSON.stringify(report));expect(errors).toEqual([]);
});
