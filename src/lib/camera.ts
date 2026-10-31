// 相機控制：後置鏡頭、電筒、變焦、夜視、截圖
// 全部用原生 getUserMedia，唔加任何相機套件
// COPYRIGHT © 2026 SCOUT SYSTEM

import { useCallback, useEffect, useRef, useState } from 'react';

type TorchZoomCaps = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
};

export type CameraStatus = 'idle' | 'starting' | 'live' | 'error';

export interface CameraCaps {
  torch: boolean;
  zoom: boolean;
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
}

export interface CameraController {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: string;
  caps: CameraCaps;
  torch: boolean;
  night: boolean;
  zoom: number;
  start: () => Promise<boolean>;
  stop: () => void;
  toggleTorch: () => Promise<void>;
  toggleNight: () => void;
  changeZoom: (v: number) => Promise<void>;
  /** 由 video 擷取一格畫面（PNG data URL） */
  snapshot: () => string | null;
  frames: number;
}

const DEFAULT_CAPS: CameraCaps = { torch: false, zoom: false, zoomMin: 1, zoomMax: 4, zoomStep: 0.1 };

function describeError(e: unknown): string {
  if (!window.isSecureContext) return '相機需要 HTTPS 或 localhost 才可以啟動';
  const err = e as { name?: string; message?: string };
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return '相機權限被拒絕 — 請喺瀏覽器網址欄旁重新允許';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return '搵唔到可用嘅後置鏡頭';
    case 'NotReadableError':
      return '鏡頭俾其他 App 佔用中，請關閉其他相機 App';
    default:
      return err?.message || '相機啟動失敗';
  }
}

export function useCamera(): CameraController {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const rafRef = useRef(0);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState('');
  const [caps, setCaps] = useState<CameraCaps>(DEFAULT_CAPS);
  const [torch, setTorch] = useState(false);
  const [night, setNight] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [frames, setFrames] = useState(0);

  const stop = useCallback(() => {
    window.clearInterval(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    trackRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
    setTorch(false);
    setZoom(1);
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setError(window.isSecureContext ? '此瀏覽器不支援相機' : '相機需要 HTTPS 或 localhost 才可以啟動');
      return false;
    }
    setStatus('starting');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0] ?? null;
      trackRef.current = track;

      if (track) {
        const c = (track.getCapabilities?.() ?? {}) as TorchZoomCaps;
        setCaps({
          torch: Boolean(c.torch),
          zoom: Boolean(c.zoom),
          zoomMin: c.zoom?.min ?? 1,
          zoomMax: c.zoom?.max ?? 4,
          zoomStep: c.zoom?.step ?? 0.1,
        });
      }

      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        v.muted = true;
        v.playsInline = true;
        await v.play().catch(() => undefined);
      }
      setStatus('live');
      // 每 700ms 跳一次，只為 HUD 嘅 LIVE 指示燈脈動（唔好每個 frame re-render）
      window.clearInterval(rafRef.current);
      rafRef.current = window.setInterval(() => setFrames(f => (f + 1) % 2), 700);
      return true;
    } catch (e) {
      setStatus('error');
      setError(describeError(e));
      return false;
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torch;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] });
      setTorch(next);
    } catch {
      setCaps(c => ({ ...c, torch: false }));
    }
  }, [torch]);

  const changeZoom = useCallback(async (v: number) => {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: v } as unknown as MediaTrackConstraintSet] });
      setZoom(v);
    } catch {
      setCaps(c => ({ ...c, zoom: false }));
    }
  }, []);

  const toggleNight = useCallback(() => setNight(n => !n), []);

  const snapshot = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const canvas = document.createElement('canvas');
    const w = Math.min(720, v.videoWidth);
    const h = Math.round((v.videoHeight / v.videoWidth) * w);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.72);
  }, []);

  useEffect(() => stop, [stop]);

  return {
    videoRef, status, error, caps, torch, night, zoom,
    start, stop, toggleTorch, toggleNight, changeZoom, snapshot, frames,
  };
}

/** 讀取 JPEG data URL 的像素，用嚟做 QR 掃描 */
export function dataUrlToImageData(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no ctx')); return; }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}
