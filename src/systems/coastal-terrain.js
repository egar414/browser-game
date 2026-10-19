// Authored relief, deliberately separate from the mapped horizontal footprint.
// These heights are approximate game scenery, not a surveyed elevation model.
export const COASTAL_RELIEF_REGIONS=[{minX:1120,maxX:1540,minZ:-1660,maxZ:-1280,step:16},{minX:-2050,maxX:-750,minZ:-2650,maxZ:-1920,step:24}];
const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function coastalTerrainHeight(x,z,shoreDistance){
 const cartwright=22*Math.exp(-((x-1410)**2+(z+1560)**2)/32000)*smooth(shoreDistance,0,28)*smooth(x,1120,1200)*(1-smooth(x,1460,1540))*smooth(z,-1660,-1580)*(1-smooth(z,-1360,-1280));
 const alexandra=20*Math.exp(-((x+1260)**2/100000+(z+2320)**2/62000))*smooth(shoreDistance,0,50)*smooth(x,-2050,-1900)*(1-smooth(x,-900,-750))*smooth(z,-2650,-2550)*(1-smooth(z,-2040,-1920));
 return .62+cartwright+alexandra;
}
