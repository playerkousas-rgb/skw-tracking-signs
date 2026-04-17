export interface TrailPoint {
  signId: number;
  lat: number;
  lng: number;
  paces?: number;
  timestamp: number;
}

export interface GameConfig {
  id: string;          // shared channel ID e.g. "ALPHA7"
  name: string;
  password: string;    // game password (1201 or 0728)
  trail: TrailPoint[];
  createdAt: number;
}

export interface PlayerResult {
  playerName: string;
  gameId: string;
  answers: { signId:number; correct:boolean }[];
  totalScore: number;
  completedAt: number;
}

const GK = 'skw_navy_games';
const RK = 'skw_navy_results';
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

function purgeExpired(): void {
  const now = Date.now();
  const games = getAllGamesRaw().filter(g => now - g.createdAt < MAX_AGE_MS);
  localStorage.setItem(GK, JSON.stringify(games));
  const results = getAllResultsRaw().filter(r => now - r.completedAt < MAX_AGE_MS);
  localStorage.setItem(RK, JSON.stringify(results));
}

export function genId(): string {
  const W = 'ALPHA BRAVO CHARLIE DELTA ECHO FOXTROT GOLF HOTEL INDIA JULIET KILO LIMA MIKE NOVEMBER OSCAR PAPA QUEBEC ROMEO SIERRA TANGO UNIFORM VICTOR WHISKEY XRAY YANKEE ZULU'.split(' ');
  return W[Math.floor(Math.random()*W.length)] + (Math.floor(Math.random()*90)+10);
}

export function saveGame(g: GameConfig) { purgeExpired(); const all=getAllGamesRaw(); const i=all.findIndex(x=>x.id===g.id); if(i>=0)all[i]=g;else all.push(g); localStorage.setItem(GK,JSON.stringify(all)); }
function getAllGamesRaw(): GameConfig[] { try{const d=localStorage.getItem(GK);return d?JSON.parse(d):[];}catch{return[];} }
export function getAllGames(): GameConfig[] { purgeExpired(); return getAllGamesRaw(); }
export function getGameById(id:string): GameConfig|undefined { return getAllGames().find(g=>g.id===id); }
export function deleteGame(id:string) { localStorage.setItem(GK,JSON.stringify(getAllGamesRaw().filter(g=>g.id!==id))); }

export function saveResult(r:PlayerResult) { purgeExpired(); const a=getAllResultsRaw();a.push(r);localStorage.setItem(RK,JSON.stringify(a)); }
function getAllResultsRaw(): PlayerResult[] { try{const d=localStorage.getItem(RK);return d?JSON.parse(d):[];}catch{return[];} }
export function getAllResults(): PlayerResult[] { purgeExpired(); return getAllResultsRaw(); }

// ── Password check ──
export function checkPassword(pwd: string): boolean {
  return pwd === '1201' || pwd === '0728';
}

// ── JSON export/import ──
export function exportGameJSON(game: GameConfig): string {
  return JSON.stringify({
    channelId: game.id,
    name: game.name,
    trail: game.trail.map(p => ({
      sign: p.signId,
      lat: +p.lat.toFixed(6),
      lng: +p.lng.toFixed(6),
      ...(p.paces ? { paces: p.paces } : {}),
    })),
  }, null, 2);
}

export function importGameJSON(json: string): GameConfig | null {
  try {
    const obj = JSON.parse(json);
    const trail: TrailPoint[] = (obj.trail || []).map((p: { sign: number; lat: number; lng: number; paces?: number }) => ({
      signId: p.sign,
      lat: p.lat,
      lng: p.lng,
      paces: p.paces,
      timestamp: Date.now(),
    }));
    return {
      id: obj.channelId || genId(),
      name: obj.name || '導入路線',
      password: '',
      trail,
      createdAt: Date.now(),
    };
  } catch { return null; }
}

// ── QR-safe encoding ──
export function encodeForQR(game: GameConfig): string[] {
  const compact = {
    id: game.id,
    n: game.name,
    t: game.trail.map(p => `${p.signId}@${p.lat.toFixed(5)},${p.lng.toFixed(5)}${p.paces?'#'+p.paces:''}`).join('|'),
  };
  const full = btoa(encodeURIComponent(JSON.stringify(compact)));
  const chunks: string[] = [];
  for (let i = 0; i < full.length; i += 200) chunks.push(full.slice(i, i + 200));
  return chunks.map((c, i) => `SKW${i + 1}/${chunks.length}:${c}`);
}

export function decodeFromQR(parts: string[]): GameConfig | null {
  try {
    const data = parts.map(p => p.split(':').slice(1).join(':')).join('');
    const json = JSON.parse(decodeURIComponent(atob(data)));
    const trail: TrailPoint[] = (json.t || '').split('|').filter((s: string) => s).map((s: string) => {
      const [signStr, rest] = s.split('@');
      const [coords, pacesStr] = rest.split('#');
      const [latStr, lngStr] = coords.split(',');
      return { signId: parseInt(signStr, 10), lat: parseFloat(latStr), lng: parseFloat(lngStr), paces: pacesStr ? parseInt(pacesStr, 10) : undefined, timestamp: Date.now() };
    });
    return { id: json.id || genId(), name: json.n || 'QR導入', password: '', trail, createdAt: Date.now() };
  } catch { return null; }
}

// ── GPS ──
export function getDist(lat1:number,lng1:number,lat2:number,lng2:number):number{
  const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export function getPos():Promise<{lat:number;lng:number;accuracy:number}>{
  return new Promise((ok,no)=>{
    if(!navigator.geolocation){no(new Error('不支援GPS'));return;}
    navigator.geolocation.getCurrentPosition(
      p=>ok({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),
      e=>no(new Error('定位失敗：'+e.message)),
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  });
}

export function watchPos(onPos:(lat:number,lng:number,acc:number)=>void,onErr:(e:string)=>void):number{
  if(!navigator.geolocation){onErr('不支援GPS');return -1;}
  return navigator.geolocation.watchPosition(
    p=>onPos(p.coords.latitude,p.coords.longitude,p.coords.accuracy),
    e=>onErr(e.message),
    {enableHighAccuracy:true,timeout:15000,maximumAge:3000}
  );
}
export function clearW(id:number){if(id>=0&&navigator.geolocation)navigator.geolocation.clearWatch(id);}

export function vibrate(pattern: number | number[] = [100, 50, 100, 50, 200]): void {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}
