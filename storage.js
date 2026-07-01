const STORE_KEY='gm_water_meter_v1';
const DEFAULT_METERS=['Main Meter','Second Main','Cooling Tower','Boiler'];
function loadState(){try{const raw=localStorage.getItem(STORE_KEY);if(raw)return JSON.parse(raw)}catch(e){}return{meters:[...DEFAULT_METERS],readings:{}}}
function saveState(){localStorage.setItem(STORE_KEY,JSON.stringify(state))}
