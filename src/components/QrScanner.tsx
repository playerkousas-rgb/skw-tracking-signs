import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X, AlertTriangle } from 'lucide-react';
import jsQR from 'jsqr';
import { useCamera } from '../lib/camera';
import { vibrate, beep } from '../lib/speech';

interface QrScannerProps {
  onResult: (text: string) => void;
  onClose: () => void;
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/** QR 掃描：優先原生 BarcodeDetector，否則用 jsQR */
const QrScanner: React.FC<QrScannerProps> = ({ onResult, onClose }) => {
  const cam = useCamera();
  const [engaged, setEngaged] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!engaged) return;
    stopRef.current = false;
    doneRef.current = false;

    const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    const detector = BarcodeDetectorCtor ? new BarcodeDetectorCtor({ formats: ['qr_code'] }) : null;

    const tick = async () => {
      if (stopRef.current || doneRef.current) return;
      const v = cam.videoRef.current;
      if (v && v.readyState >= 2 && v.videoWidth) {
        try {
          let text: string | null = null;
          if (detector) {
            const codes = await detector.detect(v);
            if (codes.length) text = codes[0].rawValue;
          }
          if (!text) {
            const canvas = canvasRef.current;
            if (canvas) {
              const w = 480;
              const h = Math.round((v.videoHeight / v.videoWidth) * w);
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(v, 0, 0, w, h);
                const img = ctx.getImageData(0, 0, w, h);
                const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
                if (code?.data) text = code.data;
              }
            }
          }
          if (text) {
            doneRef.current = true;
            beep('correct');
            vibrate(60);
            onResult(text);
          }
        } catch {
          // 忽略單次解碼錯誤
        }
      }
      window.setTimeout(tick, 340);
    };

    void tick();
    return () => { stopRef.current = true; };
  }, [engaged, cam.videoRef, onResult]);

  useEffect(() => {
    if (cam.status === 'error') setError(cam.error);
  }, [cam.status, cam.error]);

  const stopCam = cam.stop;
  useEffect(() => () => stopCam(), [stopCam]);

  return (
    <div className="fixed inset-0 z-[95] bg-hud text-hud-ink">
      <video ref={cam.videoRef} playsInline muted autoPlay
        className={`absolute inset-0 h-full w-full object-cover ${engaged && cam.status === 'live' ? 'opacity-100' : 'opacity-0'}`} />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 hud-frame pointer-events-none" />
      <div className="absolute inset-0 hud-scanlines opacity-50 pointer-events-none" />

      <div className="absolute inset-x-0 top-0 pt-safe px-4 pt-3 flex items-center gap-3 z-10">
        <button onClick={() => { cam.stop(); onClose(); }}
          className="press w-9 h-9 rounded-full border border-hud-ink/25 bg-hud/50 flex items-center justify-center">
          <X size={17} />
        </button>
        <div>
          <p className="hud-label text-hud-amber">QR SCANNER</p>
          <p className="text-[13px] font-heading">掃描領袖嘅路線 QR</p>
        </div>
      </div>

      {/* 掃描框 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[62vw] max-w-[260px] aspect-square">
          {[
            'left-0 top-0 border-l-2 border-t-2 rounded-tl-lg',
            'right-0 top-0 border-r-2 border-t-2 rounded-tr-lg',
            'left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg',
            'right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg',
          ].map((c, i) => <div key={i} className={`absolute w-7 h-7 border-hud-amber ${c}`} />)}
          <div className="absolute left-0 right-0 h-[2px] bg-hud-amber/80 shadow-[0_0_12px_2px_rgba(242,193,78,0.7)] anim-scan" />
        </div>
      </div>

      {!engaged && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6 bg-hud/75 backdrop-blur-sm">
          <div className="text-center max-w-xs">
            <div className="mx-auto w-14 h-14 rounded-full border border-hud-amber/40 bg-hud-amber/10 flex items-center justify-center mb-3">
              <Camera size={23} className="text-hud-amber" />
            </div>
            <p className="font-heading text-[16px]">對準路線 QR Code</p>
            <p className="text-[10.5px] text-hud-dim mt-1.5 leading-relaxed">掃到就會自動匯入符號座標</p>
            <button
              onClick={() => { setEngaged(true); void cam.start(); }}
              className="press mt-4 w-full h-11 rounded-2xl bg-hud-amber text-hud font-semibold text-[13px]"
            >
              啟動鏡頭
            </button>
            {error && (
              <p className="mt-3 text-[10px] text-hud-red flex items-start gap-1.5 text-left">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />{error}
              </p>
            )}
            <button onClick={onClose} className="mt-3 text-[11px] text-hud-dim underline underline-offset-2">改用手動輸入代碼</button>
          </div>
        </div>
      )}

      {engaged && cam.status === 'starting' && (
        <div className="absolute inset-x-0 bottom-24 flex justify-center">
          <span className="hud-label flex items-center gap-1.5 bg-hud/70 px-3 py-1.5 rounded-full border border-hud-ink/20">
            <Loader2 size={11} className="animate-spin" /> 啟動鏡頭…
          </span>
        </div>
      )}
    </div>
  );
};

export default QrScanner;
