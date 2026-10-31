// 路線資料層 v6
// · 虛擬符號：GPS 錨點 + 放置方位（AR 用）
// · JSON 分享／匯入（檔案、貼上、QR）
// · 計時／倒計時、判斷題、陷阱、安全點
// COPYRIGHT © 2026 SCOUT SYSTEM

export type Direction = 'forward' | 'left' | 'right';
export type TimerMode = 'stopwatch' | 'countdown';

export const TRAIL_VERSION = 6;
export const DEFAULT_TRIGGER_DISTANCE = 8;

export interface TrailStep {
  signId: number;
  direction?: Direction;
  paces?: number;
  hiddenContent?: string;
  note?: string;
  /** 虛擬符號錨點（領袖實地放置） */
  lat?: number;
  lng?: number;
  /** 放置時面向的方位（0 = 北），用嚟還原符號朝向 */
  bearing?: number;
  /** 錨點離地高度（米）。0 = 地面，1.2 = 樹身，2.5 = 樹枝 */
  heightM?: number;
  /** 陷阱：唔按順序，行近即觸發 */
  trap?: boolean;
}

export interface Trail {
  v?: number;
  id: string;
  name: string;
  steps: TrailStep[];
  createdAt: number;
  triggerDistance?: number;
  timerMode?: TimerMode;
  timeLimitMin?: number;
  quizMode?: boolean;
  /** 全部有座標的符號以相機 AR 顯示 */
  arMode?: boolean;
  safetyLat?: number;
  safetyLng?: number;
  safetyNote?: string;
  leaderNote?: string;
}

export interface TrailResult {
  playerName: string;
  trailId: string;
  answers: { signId: number; correct: boolean }[];
  totalSteps: number;
  correctSteps: number;
  completedAt: number;
  elapsedMs: number;
  timeUp: boolean;
  success: boolean;
}

const TRAILS_KEY = 'skw_trails_v6';
const RESULTS_KEY = 'skw_results_v6';
const LEGACY_TRAILS_KEY = 'skw_trails_v5';
const LEGACY_RESULTS_KEY = 'skw_results_v5';
const MAX_AGE_MS = 72 * 60 * 60 * 1000;

function readJson<T>(key: string): T | null {
  try {
    const d = localStorage.getItem(key);
    return d ? (JSON.parse(d) as T) : null;
  } catch {
    return null;
  }
}

function purgeExpired(): void {
  const now = Date.now();
  const trails = (readJson<Trail[]>(TRAILS_KEY) ?? []).filter(t => now - t.createdAt < MAX_AGE_MS);
  const results = (readJson<TrailResult[]>(RESULTS_KEY) ?? []).filter(r => now - r.completedAt < MAX_AGE_MS);
  localStorage.setItem(TRAILS_KEY, JSON.stringify(trails));
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

/** 由 v5 讀入舊路線（保留座標，新增 bearing 欄位留空） */
function migrateLegacy(): void {
  if (localStorage.getItem(TRAILS_KEY)) return;
  const old = readJson<Trail[]>(LEGACY_TRAILS_KEY);
  if (old?.length) {
    localStorage.setItem(TRAILS_KEY, JSON.stringify(old.map(t => ({ ...t, v: TRAIL_VERSION }))));
  }
  const oldResults = readJson<TrailResult[]>(LEGACY_RESULTS_KEY);
  if (oldResults?.length) localStorage.setItem(RESULTS_KEY, JSON.stringify(oldResults));
}

function getAllTrailsRaw(): Trail[] {
  migrateLegacy();
  return readJson<Trail[]>(TRAILS_KEY) ?? [];
}

export function getAllTrails(): Trail[] {
  purgeExpired();
  return getAllTrailsRaw().sort((a, b) => b.createdAt - a.createdAt);
}

export function getTrailById(id: string): Trail | undefined {
  const clean = id.trim();
  return getAllTrails().find(t => t.id.toUpperCase() === clean.toUpperCase());
}

export function saveTrail(trail: Trail): Trail {
  const all = getAllTrailsRaw();
  const normalized: Trail = { ...trail, v: TRAIL_VERSION };
  const i = all.findIndex(t => t.id === trail.id);
  if (i >= 0) all[i] = normalized; else all.push(normalized);
  localStorage.setItem(TRAILS_KEY, JSON.stringify(all));
  return normalized;
}

export function deleteTrail(id: string): void {
  localStorage.setItem(TRAILS_KEY, JSON.stringify(getAllTrailsRaw().filter(t => t.id !== id)));
}

export function getAllResults(): TrailResult[] {
  purgeExpired();
  return readJson<TrailResult[]>(RESULTS_KEY) ?? [];
}

export function saveResult(r: TrailResult): void {
  const a = getAllResults();
  a.push(r);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(a));
}

export function getBestTimeMs(trailId: string): number | null {
  const done = getAllResults().filter(r => r.trailId === trailId && r.success && r.elapsedMs > 0);
  return done.length ? Math.min(...done.map(r => r.elapsedMs)) : null;
}

export function getResultsFor(trailId: string): TrailResult[] {
  return getAllResults().filter(r => r.trailId === trailId).sort((a, b) => b.completedAt - a.completedAt);
}

// ── 路線屬性 ──
export function hasCoords(step: TrailStep): boolean {
  return typeof step.lat === 'number' && typeof step.lng === 'number';
}

export function isFieldTrail(trail: Trail): boolean {
  return trail.steps.some(s => !s.trap && hasCoords(s));
}

export function seqSteps(trail: Trail): TrailStep[] {
  return trail.steps.filter(s => !s.trap);
}

export function trapSteps(trail: Trail): TrailStep[] {
  return trail.steps.filter(s => s.trap === true);
}

export function arStepCount(trail: Trail): number {
  return trail.steps.filter(s => hasCoords(s)).length;
}

// ── 分享 ──
/** 緊湊 JSON（人可以讀，亦可以直接貼去另一部機） */
export function trailToJson(trail: Trail): string {
  return JSON.stringify({
    app: 'skw-tracking-signs',
    v: TRAIL_VERSION,
    id: trail.id,
    name: trail.name,
    createdAt: trail.createdAt,
    ...(trail.leaderNote ? { leaderNote: trail.leaderNote } : {}),
    settings: {
      triggerDistance: trail.triggerDistance ?? DEFAULT_TRIGGER_DISTANCE,
      timerMode: trail.timerMode ?? 'stopwatch',
      ...(trail.timerMode === 'countdown' && trail.timeLimitMin ? { timeLimitMin: trail.timeLimitMin } : {}),
      quizMode: trail.quizMode !== false,
      arMode: trail.arMode !== false,
    },
    ...(trail.safetyLat != null && trail.safetyLng != null
      ? { safety: { lat: trail.safetyLat, lng: trail.safetyLng, note: trail.safetyNote ?? '' } }
      : {}),
    steps: trail.steps.map(s => ({
      signId: s.signId,
      ...(s.lat != null && s.lng != null
        ? { lat: +s.lat.toFixed(6), lng: +s.lng.toFixed(6) }
        : {}),
      ...(s.bearing != null ? { bearing: Math.round(s.bearing) } : {}),
      ...(s.heightM != null && s.heightM > 0.05 ? { heightM: +s.heightM.toFixed(2) } : {}),
      ...(s.direction ? { direction: s.direction } : {}),
      ...(s.paces != null ? { paces: s.paces } : {}),
      ...(s.hiddenContent ? { hiddenContent: s.hiddenContent } : {}),
      ...(s.note ? { note: s.note } : {}),
      ...(s.trap ? { trap: true } : {}),
    })),
  });
}

/** 由 JSON 物件還原 Trail（容忍舊格式／外層包 settings） */
function fromAnyObject(obj: Record<string, unknown>): Trail | null {
  const stepsRaw = obj.steps;
  if (!Array.isArray(stepsRaw)) return null;

  const settings = (obj.settings ?? {}) as Record<string, unknown>;
  const safety = (obj.safety ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

  const steps: TrailStep[] = stepsRaw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map(s => {
      const step: TrailStep = { signId: num(s.signId) ?? 1 };
      if (typeof s.direction === 'string') step.direction = s.direction as Direction;
      if (num(s.paces) != null) step.paces = num(s.paces);
      if (typeof s.hiddenContent === 'string') step.hiddenContent = s.hiddenContent;
      if (typeof s.note === 'string') step.note = s.note;
      if (num(s.lat) != null) step.lat = num(s.lat);
      if (num(s.lng) != null) step.lng = num(s.lng);
      if (num(s.bearing) != null) step.bearing = num(s.bearing);
      if (num(s.heightM) != null) step.heightM = num(s.heightM);
      if (s.trap === true) step.trap = true;
      return step;
    });

  if (!steps.length) return null;

  return {
    v: TRAIL_VERSION,
    id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : generateTrailId(),
    name: typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : '未命名路線',
    steps,
    createdAt: num(obj.createdAt) ?? Date.now(),
    triggerDistance: num(obj.triggerDistance) ?? num(settings.triggerDistance) ?? DEFAULT_TRIGGER_DISTANCE,
    timerMode: (obj.timerMode ?? settings.timerMode) === 'countdown' ? 'countdown' : 'stopwatch',
    timeLimitMin: num(obj.timeLimitMin) ?? num(settings.timeLimitMin),
    quizMode: (obj.quizMode ?? settings.quizMode) !== false,
    arMode: (obj.arMode ?? settings.arMode) !== false,
    ...(num(obj.safetyLat) ?? num(safety.lat)) != null
      ? { safetyLat: num(obj.safetyLat) ?? num(safety.lat) }
      : {},
    ...(num(obj.safetyLng) ?? num(safety.lng)) != null
      ? { safetyLng: num(obj.safetyLng) ?? num(safety.lng) }
      : {},
    safetyNote: typeof obj.safetyNote === 'string' ? obj.safetyNote
      : typeof safety.note === 'string' ? safety.note : undefined,
    leaderNote: typeof obj.leaderNote === 'string' ? obj.leaderNote : undefined,
  };
}

/** 接受：純 JSON、base64 代碼、含 ?code= 的分享連結 */
export function parseTrailInput(input: string): Trail | null {
  const raw = input.trim();
  if (!raw) return null;

  // 分享連結
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const code = url.searchParams.get('code');
      if (code) return parseTrailInput(code);
    } catch { /* fallthrough */ }
  }

  // 純 JSON
  if (raw.startsWith('{')) {
    try {
      return fromAnyObject(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  // base64（新）或 URI-encoded base64（舊 v5）
  try {
    const decoded = decodeURIComponent(atob(raw));
    return fromAnyObject(JSON.parse(decoded) as Record<string, unknown>);
  } catch { /* next */ }
  try {
    const obj = JSON.parse(decodeURIComponent(atob(raw))) as Record<string, unknown>;
    return fromAnyObject(obj);
  } catch {
    return null;
  }
}

/** QR／短連結用：base64（不壓縮，方便除錯） */
export function encodeTrail(trail: Trail): string {
  try {
    return btoa(unescape(encodeURIComponent(trailToJson(trail))));
  } catch {
    return '';
  }
}

export function decodeTrail(str: string): Trail | null {
  return parseTrailInput(str);
}

export function trailFileName(trail: Trail): string {
  const safe = trail.name.replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 24) || 'trail';
  return `${safe}-${trail.id}.json`;
}

// ── 工具 ──
export function generateTrailId(): string {
  const words = ['PATH', 'WOOD', 'WILD', 'LAKE', 'HILL', 'ROCK', 'PINE', 'DEER', 'WOLF', 'BEAR',
    'FIRE', 'WIND', 'STAR', 'MOON', 'FERN', 'OAK', 'FISH', 'BIRD', 'NEST', 'CAVE'];
  const w = words[Math.floor(Math.random() * words.length)];
  return `SKW-${w}${Math.floor(Math.random() * 90) + 10}`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((ok, no) => {
    if (!navigator.geolocation) { no(new Error('此裝置不支援 GPS')); return; }
    navigator.geolocation.getCurrentPosition(
      p => ok({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      e => no(new Error(e.code === e.PERMISSION_DENIED ? '未授權定位，請喺瀏覽器設定開啟' : '定位失敗，請到空曠位置再試')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/** 由路線產生「JSON 預覽」用嘅統計 */
export function trailSummary(trail: Trail) {
  const seq = seqSteps(trail);
  return {
    steps: seq.length,
    traps: trapSteps(trail).length,
    ar: arStepCount(trail),
    distanceKm: (() => {
      let total = 0;
      for (let i = 1; i < seq.length; i++) {
        const a = seq[i - 1], b = seq[i];
        if (hasCoords(a) && hasCoords(b)) {
          const R = 6371000;
          const dLat = ((b.lat! - a.lat!) * Math.PI) / 180;
          const dLng = ((b.lng! - a.lng!) * Math.PI) / 180;
          const s = Math.sin(dLat / 2) ** 2 +
            Math.cos((a.lat! * Math.PI) / 180) * Math.cos((b.lat! * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
          total += R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
        }
      }
      return total / 1000;
    })(),
  };
}
