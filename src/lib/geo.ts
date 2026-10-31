// 地理及 AR 投影數學
// 將「地面上一點」投影到手機相機畫面，唔靠任何 3D 引擎或外部模型
// COPYRIGHT © 2026 SCOUT SYSTEM

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

export interface LatLng {
  lat: number;
  lng: number;
}

/** 兩點距離（米，Haversine） */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * D2R;
  const dLng = (b.lng - a.lng) * D2R;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** 由 a 望向 b 的方位角（0 = 北，順時針） */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const y = Math.sin((b.lng - a.lng) * D2R) * Math.cos(b.lat * D2R);
  const x =
    Math.cos(a.lat * D2R) * Math.sin(b.lat * D2R) -
    Math.sin(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.cos((b.lng - a.lng) * D2R);
  return (Math.atan2(y, x) * R2D + 360) % 360;
}

export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** 將角度收窄到 -180..180 */
export function signedAngle(deg: number): number {
  let d = norm360(deg);
  if (d > 180) d -= 360;
  return d;
}

/** 圓形插值：處理 359° → 0° */
export function lerpAngle(from: number, to: number, t: number): number {
  return norm360(from + signedAngle(to - from) * t);
}

const DIRS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
export function compassLabel(deg: number | null): string {
  if (deg == null) return '—';
  return DIRS[Math.round(norm360(deg) / 45) % 8];
}

export function formatDistance(m: number): string {
  if (m < 1) return '<1 m';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function pad3(n: number): string {
  return String(Math.round(n)).padStart(3, '0');
}

export interface ProjectionInput {
  user: LatLng;
  target: LatLng;
  /** 裝置朝向 0..360；null = 未取得指南針 */
  heading: number | null;
  /** 相機俯仰：0 = 水平，負數 = 向下望 */
  cameraPitch: number;
  /** 畫面橫向視角（度） */
  hFov?: number;
  /** 畫面高／闊比（直向手機約 1.78） */
  aspect?: number;
  /** 眼睛高度（米），用嚟計地面點的仰角 */
  eyeHeight?: number;
  /** 符號離地高度（米）。0 = 畫喺地面；1.2 = 掛喺樹身 */
  targetHeight?: number;
}

export interface Projection {
  visible: boolean;
  onScreen: boolean;
  xPct: number;
  yPct: number;
  scale: number;
  relBearing: number;
  dist: number;
  elevationDeg: number;
  behind: boolean;
}

/**
 * 把「地面上一點」投影到畫面百分比座標。
 * 原理：方位差 → 橫向位置；地面仰角與相機俯仰差 → 縱向位置；距離 → 大小。
 * 呢個做法唔需要 WebXR，iOS Safari 都用得到。
 */
export function projectGroundTarget({
  user,
  target,
  heading,
  cameraPitch,
  hFov = 62,
  aspect = 1.78,
  eyeHeight = 1.5,
  targetHeight = 0,
}: ProjectionInput): Projection {
  const dist = distanceM(user, target);
  const targetBearing = bearingDeg(user, target);
  const relBearing = heading == null ? 0 : signedAngle(targetBearing - heading);

  const vFov = 2 * Math.atan(Math.tan((hFov * D2R) / 2) * aspect) * R2D;

  const xPct = 50 + (relBearing / (hFov / 2)) * 50;
  // 目標離地越高，仰角越大（負值減少）；喺樹身 1.2m 就會接近水平
  const elevationDeg = Math.atan2(targetHeight - eyeHeight, Math.max(dist, 0.4)) * R2D;
  const yPct = 50 - ((elevationDeg - cameraPitch) / (vFov / 2)) * 50;

  const behind = Math.abs(relBearing) > 92;
  const onScreen = xPct > 1 && xPct < 99 && yPct > 2 && yPct < 98;
  const visible = !behind && Math.abs(relBearing) < hFov / 2 + 5;

  return {
    visible,
    onScreen,
    xPct: Math.max(-30, Math.min(130, xPct)),
    yPct: Math.max(-40, Math.min(140, yPct)),
    scale: Math.max(0.42, Math.min(2.1, 4.2 / Math.max(dist, 1))),
    relBearing,
    dist,
    elevationDeg,
    behind,
  };
}
