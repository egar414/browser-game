import { mapData, lands, pointInPoly, edgeDistance, landAt, geographicSolids } from './geography.js';
import { buildEstuaryScenery } from './scenery.js';
import { BAR_RAMP } from '../vehicles/ramps.js';
export { lands, pointInPoly };
export const ramps=[...mapData.ramps,BAR_RAMP];
export const solids=geographicSolids();
export function collision(x,z,radius=1,y=0){
  for(const land of lands){
    const b=land.bounds;if(x<b[0]-radius||x>b[2]+radius||z<b[1]-radius||z>b[3]+radius)continue;
    if(landAt(x,z)===land)return land.name;
    for(const ring of [land.points,...(land.holes||[])])for(let i=0;i<ring.length;i++)if(edgeDistance(x,z,ring[i],ring[(i+1)%ring.length])<radius)return land.name;
  }
  for(const s of solids){
    if(s.disabled||y>=s.height)continue;
    if(s.points){if(x<s.bounds[0]-radius||x>s.bounds[2]+radius||z<s.bounds[1]-radius||z>s.bounds[3]+radius)continue;if(pointInPoly(x,z,s.points)||s.points.some((p,i)=>edgeDistance(x,z,p,s.points[(i+1)%s.points.length])<radius))return s.name;}
    else if(s.a){if(edgeDistance(x,z,s.a,s.b)<radius+s.width*.5)return s.name;}
    else if(Math.abs(x-s.x)<s.w*.5+radius&&Math.abs(z-s.z)<s.d*.5+radius)return s.name;
  }
  return null;
}
export function buildEnvironment(scene,quality){solids.splice(0,solids.length,...geographicSolids());return buildEstuaryScenery(scene,quality,solids);}
