// 示範路線：以你目前位置為中心，2m / 6m / 10m 放三個虛擬符號
// 目的：唔使真係行山，都可以即場試到「舉機 → 鎖定 → 判斷題」完整流程
// COPYRIGHT © 2026 SCOUT SYSTEM

import type { Trail, TrailStep } from './trailStore';

const FALLBACK = { lat: 22.4231, lng: 114.0192 };

function offset(origin: { lat: number; lng: number }, meters: number, bearingDeg: number) {
  const R = 6371000;
  const brg = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const d = meters / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg));
  const lng2 = lng1 + Math.atan2(
    Math.sin(brg) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );
  return {
    lat: +((lat2 * 180) / Math.PI).toFixed(6),
    lng: +((lng2 * 180) / Math.PI).toFixed(6),
  };
}

export function createDemoTrail(origin: { lat: number; lng: number } | null): Trail {
  const o = origin ?? FALLBACK;

  const steps: TrailStep[] = [
    { signId: 1, direction: 'forward', ...offset(o, 2, 15), bearing: 15 },
    {
      signId: 9, direction: 'right', paces: 8,
      hiddenContent: '示範信物：一支朱古力棒 🍫（真路線由領袖自訂）',
      ...offset(o, 6, 40), bearing: 40,
    },
    { signId: 4, ...offset(o, 10, 65), bearing: 65 },
  ];

  return {
    v: 6,
    id: 'SKW-DEMO01',
    name: '示範路線 · 原地試玩',
    steps,
    createdAt: Date.now(),
    triggerDistance: 10,
    timerMode: 'stopwatch',
    quizMode: true,
    arMode: true,
    leaderNote: '呢條係示範線：三個虛擬符號放喺你 2–10 米範圍內，唔使行山都試到。',
    safetyLat: o.lat,
    safetyLng: o.lng,
    safetyNote: '你目前位置',
  };
}
