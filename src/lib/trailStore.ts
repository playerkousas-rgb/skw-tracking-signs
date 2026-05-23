export type Direction = 'forward' | 'left' | 'right';

export interface TrailStep {
  signId: number;
  direction?: Direction;     // 箭頭方向（需要配方向指示的符號）
  paces?: number;            // 步數（信物在前）
  hiddenContent?: string;    // 到達後顯示的隱藏訊息／信物
  lat?: number;
  lng?: number;
  note?: string;
}

export interface Trail {
  id: string;
  name: string;
  steps: TrailStep[];
  createdAt: number;
  // 安全地圖參考點：只作防迷路／集合點用途，不是符號位置
  safetyLat?: number;
  safetyLng?: number;
  safetyNote?: string;
}

export interface TrailResult {
  playerName: string;
  trailId: string;
  answers: { signId: number; correct: boolean }[];
  totalSteps: number;
  correctSteps: number;
  completedAt: number;
}

const TRAILS_KEY = 'skw_trails_v4';
const RESULTS_KEY = 'skw_results_v4';
const MAX_AGE_MS = 72 * 60 * 60 * 1000;

function purgeExpired(): void {
  const now = Date.now();
  const trails = getAllTrailsRaw().filter(t => now - t.createdAt < MAX_AGE_MS);
  localStorage.setItem(TRAILS_KEY, JSON.stringify(trails));
  const results = getAllResultsRaw().filter(r => now - r.completedAt < MAX_AGE_MS);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

export function generateTrailId(): string {
  const words = ['PATH', 'WOOD', 'WILD', 'LAKE', 'HILL', 'ROCK', 'PINE', 'DEER', 'WOLF', 'BEAR',
    'FIRE', 'WIND', 'STAR', 'MOON', 'FERN', 'OAK', 'FISH', 'BIRD', 'NEST', 'CAVE'];
  return `SKW-${words[Math.floor(Math.random() * words.length)]}${Math.floor(Math.random() * 90) + 10}`;
}

function getAllTrailsRaw(): Trail[] {
  try { const d = localStorage.getItem(TRAILS_KEY); return d ? JSON.parse(d) : []; } catch { return []; }
}
export function getAllTrails(): Trail[] { purgeExpired(); return getAllTrailsRaw(); }
export function getTrailById(id: string): Trail | undefined { return getAllTrails().find(t => t.id === id); }

export function saveTrail(trail: Trail): void {
  purgeExpired();
  const all = getAllTrailsRaw();
  const i = all.findIndex(t => t.id === trail.id);
  if (i >= 0) all[i] = trail; else all.push(trail);
  localStorage.setItem(TRAILS_KEY, JSON.stringify(all));
}

export function deleteTrail(id: string): void {
  localStorage.setItem(TRAILS_KEY, JSON.stringify(getAllTrailsRaw().filter(t => t.id !== id)));
}

function getAllResultsRaw(): TrailResult[] {
  try { const d = localStorage.getItem(RESULTS_KEY); return d ? JSON.parse(d) : []; } catch { return []; }
}
export function getAllResults(): TrailResult[] { purgeExpired(); return getAllResultsRaw(); }

export function saveResult(r: TrailResult): void {
  purgeExpired();
  const a = getAllResultsRaw(); a.push(r);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(a));
}

export function encodeTrail(trail: Trail): string {
  try {
    // QR/分享時不要輸出每個符號的座標；追蹤活動不應變成按地圖尋寶。
    const safeTrail: Trail = {
      ...trail,
      steps: trail.steps.map(({ signId, direction, paces, hiddenContent }) => ({
        signId,
        ...(direction ? { direction } : {}),
        ...(paces != null ? { paces } : {}),
        ...(hiddenContent ? { hiddenContent } : {}),
      })),
    };
    return btoa(encodeURIComponent(JSON.stringify(safeTrail)));
  } catch { return ''; }
}

export function decodeTrail(str: string): Trail | null {
  try { return JSON.parse(decodeURIComponent(atob(str))) as Trail; } catch { return null; }
}

// --- GPS helpers ---
export function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((ok, no) => {
    if (!navigator.geolocation) { no(new Error('不支援GPS')); return; }
    navigator.geolocation.getCurrentPosition(
      p => ok({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      e => no(new Error('定位失敗：' + e.message)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export function watchPosition(
  onPos: (lat: number, lng: number, acc: number) => void,
  onErr: (e: string) => void
): number {
  if (!navigator.geolocation) { onErr('不支援GPS'); return -1; }
  return navigator.geolocation.watchPosition(
    p => onPos(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
    e => onErr(e.message),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
  );
}

export function clearWatch(id: number): void {
  if (id >= 0 && navigator.geolocation) navigator.geolocation.clearWatch(id);
}
