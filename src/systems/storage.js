const defaults = { vehicle: 'ski', colour: 0, quality: 'Auto', master: 0.55, engine: 0.65, water: 0.45, muted: false, bestRace: 0, bestTricks: 0, camera: 0 };
export function loadSettings(storage) {
  try {
    storage ||= globalThis.localStorage;
    const data = JSON.parse(storage.getItem('estuary-rats-v1') || '{}');
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (typeof data?.[key] === typeof defaults[key] && (typeof data[key] !== 'number' || Number.isFinite(data[key]))) result[key] = data[key];
    }
    if (!['ski', 'cat'].includes(result.vehicle)) result.vehicle = 'ski';
    if (!['Auto', 'Low', 'Medium', 'High'].includes(result.quality)) result.quality = 'Auto';
    for (const key of ['master', 'engine', 'water']) result[key] = Math.max(0, Math.min(1, result[key]));
    result.colour = Math.abs(Math.floor(result.colour)) % 3;
    result.camera = Math.abs(Math.floor(result.camera)) % 2;
    return result;
  } catch { return { ...defaults }; }
}
export function saveSettings(settings) {
  try { localStorage.setItem('estuary-rats-v1', JSON.stringify(settings)); } catch { /* Private browsing still supports play. */ }
}
