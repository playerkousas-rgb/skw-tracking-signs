// 姿態感測：GPS + 指南針 + 俯仰
// iOS 13+ 需要喺用戶手勢中呼叫 DeviceOrientationEvent.requestPermission()
// COPYRIGHT © 2026 SCOUT SYSTEM

import { useCallback, useEffect, useRef, useState } from 'react';
import { lerpAngle, R2D, D2R } from './geo';

export type CompassState = 'idle' | 'unsupported' | 'needs-permission' | 'active' | 'denied';

export interface PoseState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  /** 由 GPS 推算嘅移動速度（m/s），用嚟判斷「跑緊」 */
  speed: number | null;
  heading: number | null;
  /** 0 = 水平，負數 = 向下望 */
  pitch: number;
  roll: number;
  compass: CompassState;
  gpsError: string | null;
  gpsState: 'idle' | 'locating' | 'live' | 'error';
}

interface RawPose {
  heading: number | null;
  pitch: number;
  roll: number;
}

type PermissionCapable = {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

export function usePose(enabled: boolean): PoseState & { requestCompass: () => Promise<boolean> } {
  const [state, setState] = useState<PoseState>({
    lat: null, lng: null, accuracy: null, speed: null,
    heading: null, pitch: 0, roll: 0,
    compass: 'idle', gpsError: null, gpsState: 'idle',
  });

  const raw = useRef<RawPose>({ heading: null, pitch: 0, roll: 0 });
  const smooth = useRef<RawPose>({ heading: null, pitch: 0, roll: 0 });
  const active = useRef(false);
  const geo = useRef<{ lat: number | null; lng: number | null; accuracy: number | null; err: string | null }>({
    lat: null, lng: null, accuracy: null, err: null,
  });


  // ── GPS ──
  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setState(s => ({ ...s, gpsState: 'error', gpsError: '此裝置不支援定位' }));
      return;
    }
    setState(s => ({ ...s, gpsState: 'locating' }));
    const id = navigator.geolocation.watchPosition(
      p => {
        geo.current = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, err: null };
        setState(s => ({
          ...s,
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          speed: typeof p.coords.speed === 'number' && Number.isFinite(p.coords.speed) ? p.coords.speed : null,
          gpsState: 'live',
          gpsError: null,
        }));
      },
      e => {
        const msg = e.code === e.PERMISSION_DENIED
          ? '未授權定位 — 請喺瀏覽器設定開啟'
          : e.code === e.POSITION_UNAVAILABLE
            ? '收唔到 GPS 訊號，行去空曠位置再試'
            : '定位逾時，請重試';
        geo.current.err = msg;
        setState(s => ({ ...s, gpsState: 'error', gpsError: msg }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  // ── 方向感測 ──
  const attach = useCallback(() => {
    if (active.current) return;
    active.current = true;

    const onOrient = (e: DeviceOrientationEvent) => {
      const anyE = e as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
      let h: number | null = null;
      if (typeof anyE.webkitCompassHeading === 'number' && !Number.isNaN(anyE.webkitCompassHeading)) {
        h = anyE.webkitCompassHeading;
      } else if (e.alpha != null && e.absolute === true) {
        h = 360 - e.alpha;
      } else if (e.alpha != null) {
        // 部分 Android 只有相對 alpha；仍然比完全冇方向好
        h = 360 - e.alpha;
      }
      raw.current.heading = h;
      const beta = e.beta ?? 90;
      raw.current.pitch = Math.max(-88, Math.min(80, beta - 90));
      raw.current.roll = Math.max(-90, Math.min(90, e.gamma ?? 0));
      setState(s => (s.compass === 'active' ? s : { ...s, compass: 'active' }));
    };

    window.addEventListener('deviceorientationabsolute', onOrient as EventListener, true);
    window.addEventListener('deviceorientation', onOrient as EventListener, true);
    setState(s => ({ ...s, compass: 'active' }));
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrient as EventListener, true);
      window.removeEventListener('deviceorientation', onOrient as EventListener, true);
      active.current = false;
    };
  }, []);

  const detachRef = useRef<(() => void) | null>(null);

  const requestCompass = useCallback(async (): Promise<boolean> => {
    const DOE = window.DeviceOrientationEvent as unknown as PermissionCapable | undefined;
    if (!DOE) {
      setState(s => ({ ...s, compass: 'unsupported' }));
      return false;
    }
    if (typeof DOE.requestPermission === 'function') {
      try {
        const res = await DOE.requestPermission();
        if (res !== 'granted') {
          setState(s => ({ ...s, compass: 'denied' }));
          return false;
        }
      } catch {
        setState(s => ({ ...s, compass: 'denied' }));
        return false;
      }
    }
    detachRef.current?.();
    detachRef.current = attach() ?? null;
    return true;
  }, [attach]);

  useEffect(() => {
    // Android / 桌面：唔需要手勢就可以直接監聽
    const DOE = window.DeviceOrientationEvent as unknown as PermissionCapable | undefined;
    if (!enabled || !DOE || typeof DOE.requestPermission === 'function') return;
    detachRef.current = attach() ?? null;
    return () => { detachRef.current?.(); detachRef.current = null; };
  }, [enabled, attach]);

  useEffect(() => () => { detachRef.current?.(); detachRef.current = null; }, []);

  // ── 平滑 + 節流輸出 ──
  useEffect(() => {
    if (!enabled) return;
    const t = window.setInterval(() => {
      const r = raw.current;
      const s = smooth.current;
      if (r.heading != null) s.heading = s.heading == null ? r.heading : lerpAngle(s.heading, r.heading, 0.25);
      s.pitch += (r.pitch - s.pitch) * 0.25;
      s.roll += (r.roll - s.roll) * 0.25;
      setState(prev => ({ ...prev, heading: s.heading, pitch: s.pitch, roll: s.roll }));
    }, 66);
    return () => window.clearInterval(t);
  }, [enabled]);

  return { ...state, requestCompass };
}

/** 由 beta/gamma 推算水平儀氣泡位置（%） */
export function levelBubble(pitch: number, roll: number): { x: number; y: number } {
  return {
    x: Math.max(-1, Math.min(1, Math.sin(roll * D2R))) * 42,
    y: Math.max(-1, Math.min(1, Math.sin(pitch * D2R))) * 42,
  };
}

export function pitchDegFromBeta(beta: number): number {
  return Math.max(-88, Math.min(80, beta - 90));
}

export function toDeg(rad: number): number {
  return rad * R2D;
}
