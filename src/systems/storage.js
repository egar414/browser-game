const RACE_COURSE='minyama-island-2026-10';
const defaults = { dayMode:'changing',trimSeago:0,fishCaught:0,bestFishKg:0,bestFishSpecies:'', locals:true,oceanVersion:1,seaState:'changing',careerPoints:0,design:'classic',tuning:'stock',raceCourse:RACE_COURSE, vehicle: 'ski', rideMode:'sport', trimSki:0, trimCat:0, trimTinny:0,trimCruiser:0, colour: 0, quality: 'Auto', master: 0.55, engine: 0.65, water: 0.45, muted: false, bestRace: 0, bestTricks: 0, camera: 0 };
export function loadSettings(storage) {
  try {
    storage ||= globalThis.localStorage;
    const data = JSON.parse(storage.getItem('estuary-rats-v1') || '{}');
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (typeof data?.[key] === typeof defaults[key] && (typeof data[key] !== 'number' || Number.isFinite(data[key]))) result[key] = data[key];
    }
    if(data?.oceanVersion!==1){result.seaState='changing';result.oceanVersion=1;}
    if(data?.raceCourse!==RACE_COURSE){result.bestRace=0;result.raceCourse=RACE_COURSE;}
    if(!['calm','chop','swell','changing'].includes(result.seaState))result.seaState='changing';
    result.fishCaught=Math.max(0,Math.min(1e7,Math.floor(result.fishCaught)));result.bestFishKg=Math.max(0,Math.min(1000,result.bestFishKg));result.bestFishSpecies=result.bestFishSpecies.slice(0,50);
    result.careerPoints=Math.max(0,Math.min(1e9,Math.floor(result.careerPoints)));
    if(!['classic','race','heritage'].includes(result.design))result.design='classic';
    if(!['stock','agile','race'].includes(result.tuning))result.tuning='stock';
    if (!['cruise','sport','freestyle'].includes(result.rideMode)) result.rideMode='sport';
    if(!['changing','sunrise','day','sunset','night'].includes(result.dayMode))result.dayMode='changing';result.trimSeago=Math.max(-10,Math.min(19,result.trimSeago));
    result.trimSki=Math.max(-10,Math.min(19,result.trimSki));result.trimCat=Math.max(-7,Math.min(8,result.trimCat));result.trimTinny=Math.max(-7,Math.min(8,result.trimTinny));
    if (!['ski', 'cat', 'tinny','cruiser','seago'].includes(result.vehicle)) result.vehicle = 'ski';
    if (!['Auto', 'Low', 'Medium', 'High'].includes(result.quality)) result.quality = 'Auto';
    for (const key of ['master', 'engine', 'water']) result[key] = Math.max(0, Math.min(1, result[key]));
    result.colour = Math.abs(Math.floor(result.colour)) % 3;
    result.camera = Math.abs(Math.floor(result.camera)) % 3;
    return result;
  } catch { return { ...defaults }; }
}
export function saveSettings(settings) {
  try { localStorage.setItem('estuary-rats-v1', JSON.stringify(settings)); } catch { /* Private browsing still supports play. */ }
}
