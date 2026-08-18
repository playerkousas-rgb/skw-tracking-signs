// 路線數據層 v5 — 合併三版所長
// · 符號序列（skw-tracking-signs）
// · GPS 實地錨點／觸發距離（skw-tracking-signs2）
// · 陷阱符號自由觸發（skw_tracking_signs）
// · 計時／倒計時任務模式（新）
// COPYRIGHT © 2026 SCOUT SYSTEM

export type Direction = 'forward' | 'left' | 'right';
export type TimerMode = 'stopwatch' | 'countdown';

export interface TrailStep {
  signId: number;
  direction?: Direction;     // 箭頭方向（需要配方向指示的符號）
  paces?: number;            // 步數（信物在前）
  hiddenContent?: string;    // 到達後顯示的隱藏訊息／信物
  note?: string;
  // ── 實地模式（GPS）──
  lat?: number;              // 符號實地 GPS 錨點（走到哪放到哪）
  lng?: number;
  trap?: boolean;            // 陷阱：不按順序，走近即自由觸發（錯路／危險／分岔）
}

export interface Trail {
  id: string;
  name: string;
  steps: TrailStep[];
  createdAt: number;
  // ── 任務設定 ──
  triggerDistance?: number;  // GPS 觸發距離（米），預設 8
  timerMode?: TimerMode;     // 計時（stopwatch）／倒計時（countdown）
  timeLimitMin?: number;     // 倒計時分鐘數（timerMode=countdown 時有效）
  quizMode?: boolean;        // 每個符號要答「正確應對行動」，預設 true
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
  // ── 計時任務 ──
  elapsedMs: number;         // 實際用時
  timeUp: boolean;           // 倒計時歸零，任務未完成
  success: boolean;          // 成功於時限內完成任務
}

const TRAILS_KEY = 'skw_trails_v5';
const RESULTS_KEY = 'skw_results_v5';
const MAX_AGE_MS = 72 * 60 * 60 * 1000;

export const DEFAULT_TRIGGER_DISTANCE = 8;

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
  const a = getAllResultsRaw();
  a.push(r);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(a));
}

// 該路線最佳（最快成功）時間；無紀錄回傳 null
export function getBestTimeMs(trailId: string): number | null {
  const done = getAllResults().filter(r => r.trailId === trailId && r.success && r.elapsedMs > 0);
  if (done.length === 0) return null;
  return Math.min(...done.map(r => r.elapsedMs));
}

// ── 路線屬性判斷 ──
// 實地模式：最少一個符號設有 GPS 錨點
export function isFieldTrail(trail: Trail): boolean {
  return trail.steps.some(s => s.lat != null && s.lng != null && !s.trap);
}
export function seqSteps(trail: Trail): TrailStep[] {
  return trail.steps.filter(s => !s.trap);
}
export function trapSteps(trail: Trail): TrailStep[] {
  return trail.steps.filter(s => s.trap === true);
}

// ── 分享編碼（QR／代碼）──
// 注意：GPS 錨點只供手機偵測「行到符號附近」，
// 隊員端全程不會顯示地圖或座標，不會變成看地圖尋寶。
export function encodeTrail(trail: Trail): string {
  try {
    const safeTrail: Trail = {
      ...trail,
      steps: trail.steps.map(({ signId, direction, paces, hiddenContent, lat, lng, trap }) => ({
        signId,
        ...(direction ? { direction } : {}),
        ...(paces != null ? { paces } : {}),
        ...(hiddenContent ? { hiddenContent } : {}),
        ...(lat != null && lng != null ? { lat: +lat.toFixed(6), lng: +lng.toFixed(6) } : {}),
        ...(trap ? { trap } : {}),
      })),
    };
    return btoa(encodeURIComponent(JSON.stringify(safeTrail)));
  } catch { return ''; }
}

export function decodeTrail(str: string): Trail | null {
  try {
    const obj = JSON.parse(decodeURIComponent(atob(str))) as Trail;
    if (!obj || !Array.isArray(obj.steps)) return null;
    return obj;
  } catch { return null; }
}

// ── 時間格式 ──
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ── GPS helpers ──
// GPS 準確度加強：高精度、零快取（不用舊定位）、較短逾時
// 部分安卓瀏覽器要配合 maximumAge:0 先會持續追求最佳定位
export function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((ok, no) => {
    if (!navigator.geolocation) { no(new Error('不支援GPS')); return; }
    navigator.geolocation.getCurrentPosition(
      p => ok({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      e => no(new Error('定位失敗：' + e.message)),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
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
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

export function clearWatch(id: number): void {
  if (id >= 0 && navigator.geolocation) navigator.geolocation.clearWatch(id);
}

export function getDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
