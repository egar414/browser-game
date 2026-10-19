export const DESIGNS={classic:{name:'Classic',points:0},race:{name:'Race stripes',points:250},heritage:{name:'Coastal heritage',points:750}};
export const TUNING={stock:{name:'Factory feel',points:0,grip:1,yaw:1},agile:{name:'Carve kit',points:400,grip:1.08,yaw:1.16},race:{name:'Freestyle kit',points:1000,grip:.88,yaw:1.1}};
export function hasUnlock(settings,item){return settings.creatorAccess===true||(settings.careerPoints||0)>=item.points;}
export function validLoadout(settings){
  if(!DESIGNS[settings.design]||!hasUnlock(settings,DESIGNS[settings.design]))settings.design='classic';
  if(!TUNING[settings.tuning]||!hasUnlock(settings,TUNING[settings.tuning]))settings.tuning='stock';
}
export function earnProgress(settings,points){
  const before=settings.careerPoints||0;settings.careerPoints=Math.min(1e9,before+Math.max(0,Math.floor(points*(settings.creatorAccess?2:1))));
  return [...Object.values(DESIGNS),...Object.values(TUNING)].filter(u=>u.points>before&&u.points<=settings.careerPoints).map(u=>u.name);
}
