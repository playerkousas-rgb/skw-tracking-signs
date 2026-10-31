import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera, CameraOff, Compass, Flame, Moon, Sun, X, ZoomIn, AlertTriangle, Loader2, ScanLine,
} from 'lucide-react';
import type { CameraController } from '../lib/camera';
import type { CompassState } from '../lib/pose';
import { compassLabel, pad3, norm360 } from '../lib/geo';

interface CameraStageProps {
  cam: CameraController;
  heading: number | null;
  pitch: number;
  roll: number;
  compass: CompassState;
  accuracy: number | null;
  title: string;
  subtitle?: string;
  onExit: () => void;
  /** 喺用戶手勢中同步呼叫（iOS 指南針授權要用） */
  onEngage: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  topRight?: React.ReactNode;
  /** 0–1：對準進度，會喺準星外圍畫一圈 */
  scanProgress?: number;
  /** 已鎖定 */
  locked?: boolean;
  /** 啟動頁嘅三步指引 */
  guide?: { title: string; body: string; steps: string[] };
}

/** 相機觀測台：HUD、羅盤帶、水平儀、電筒／變焦／夜視 */
const CameraStage: React.FC<CameraStageProps> = ({
  cam, heading, pitch, roll, compass, accuracy,
  title, subtitle, onExit, onEngage, children, footer, topRight,
  scanProgress, locked, guide,
}) => {
  const [engaged, setEngaged] = useState(false);
  const [sim, setSim] = useState(false);

  const engage = (simMode: boolean) => {
    setEngaged(true);
    setSim(simMode);
    if (simMode) return;
    onEngage();
    void cam.start();
  };

  const headingLabel = heading == null ? '—' : pad3(heading);

  // 羅盤帶：以目前朝向為中心，-75..75 度
  const tape = useMemo(() => {
    const h = heading ?? 0;
    const ticks: { deg: number; off: number; major: boolean }[] = [];
    for (let d = -75; d <= 75; d += 5) {
      const deg = Math.round(norm360(h + d));
      ticks.push({ deg, off: d, major: deg % 45 === 0 });
    }
    return ticks;
  }, [heading]);

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-hud text-hud-ink select-none">
      {/* 鏡頭畫面 */}
      <video
        ref={cam.videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          cam.night ? 'night-vision' : ''
        } ${cam.status === 'live' && !sim ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* 模擬視野（未有鏡頭時仍然可以示範） */}
      {(sim || cam.status !== 'live') && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 110%, #3a3323 0%, #22261c 45%, #10140f 100%)',
          }}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 70%, rgba(160,130,80,.35) 0 2px, transparent 2px), radial-gradient(circle at 70% 85%, rgba(120,95,60,.3) 0 3px, transparent 3px), repeating-linear-gradient(105deg, rgba(255,255,255,.03) 0 2px, transparent 2px 9px)',
              backgroundSize: '40px 40px, 55px 55px, 100% 100%',
            }}
          />
          <div className="absolute inset-x-0 top-1/3 h-px bg-hud-ink/10" />
        </div>
      )}

      {/* HUD 疊層 */}
      <div className="absolute inset-0 hud-frame pointer-events-none" />
      <div className="absolute inset-0 hud-scanlines opacity-60 pointer-events-none" />

      {/* 角落括號 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-3 top-3 hud-corner border-l-2 border-t-2 rounded-tl-md" />
        <div className="absolute right-3 top-3 hud-corner border-r-2 border-t-2 rounded-tr-md" />
        <div className="absolute left-3 bottom-3 hud-corner border-l-2 border-b-2 rounded-bl-md" />
        <div className="absolute right-3 bottom-3 hud-corner border-r-2 border-b-2 rounded-br-md" />
      </div>

      {/* 頂列 */}
      <div className="absolute inset-x-0 top-0 pt-safe z-20">
        <div className="flex items-start gap-3 px-3 pt-2 pb-2 bg-gradient-to-b from-hud/85 to-transparent">
          <button
            onClick={() => { cam.stop(); onExit(); }}
            aria-label="離開觀測"
            className="press mt-0.5 w-9 h-9 rounded-full border border-hud-ink/25 bg-hud/50 backdrop-blur flex items-center justify-center text-hud-ink"
          >
            <X size={17} />
          </button>

          <div className="flex-1 min-w-0">
            <p className="hud-label text-hud-amber">AR FIELD SCOPE</p>
            <h2 className="text-[15px] font-heading text-hud-ink leading-tight truncate">{title}</h2>
            {subtitle && <p className="text-[10px] text-hud-dim truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-1.5">
            {topRight}
            <span className="flex items-center gap-1 px-1.5 h-6 rounded border border-hud-red/50 text-hud-red">
              <span className={`w-1.5 h-1.5 rounded-full bg-hud-red ${cam.frames ? 'opacity-100' : 'opacity-30'}`} />
              <span className="font-mono text-[8px] tracking-widest">{sim ? 'SIM' : 'LIVE'}</span>
            </span>
          </div>
        </div>

        {/* 羅盤帶 */}
        <div className="relative h-11 mx-3 overflow-hidden rounded-md border border-hud-ink/15 bg-hud/45 backdrop-blur-[2px]">
          <div className="absolute inset-y-0 left-1/2 w-px bg-hud-amber z-10" />
          <div className="absolute left-1/2 -translate-x-1/2 -top-0.5 text-hud-amber z-10 text-[7px]">▼</div>
          {tape.map(t => (
            <div
              key={t.off}
              className="absolute top-0 bottom-0 flex flex-col items-center justify-end pb-1"
              style={{ left: `calc(50% + ${(t.off / 75) * 50}%)`, transform: 'translateX(-50%)' }}
            >
              <div className={`w-px ${t.major ? 'h-3 bg-hud-ink/80' : 'h-1.5 bg-hud-ink/35'}`} />
              {t.major && (
                <span className="font-mono text-[8px] text-hud-ink/80 mt-0.5">{t.deg}</span>
              )}
            </div>
          ))}
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-hud to-transparent" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-hud to-transparent" />
        </div>

        {/* 狀態列 */}
        <div className="flex items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-3">
            <span className="hud-label flex items-center gap-1">
              <Compass size={10} /> {headingLabel}° {compassLabel(heading)}
            </span>
            <span className="hud-label">GPS ±{accuracy != null ? Math.round(accuracy) : '—'}m</span>
          </div>
          <span className="hud-label flex items-center gap-1">
            <ScanLine size={10} /> {pitch > -2 ? 'HORIZON' : `PITCH ${Math.round(pitch)}°`}
          </span>
        </div>
      </div>

      {/* 中央瞄準框 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative w-36 h-36">
          {scanProgress != null && (
            <svg width="144" height="144" viewBox="0 0 144 144" className="absolute inset-0 -rotate-90">
              <circle cx="72" cy="72" r="68" fill="none"
                stroke={locked ? 'rgba(143,227,139,0.85)' : 'rgba(236,224,194,0.16)'} strokeWidth="2.5" />
              <circle cx="72" cy="72" r="68" fill="none"
                stroke={locked ? '#8fe38b' : '#f2c14e'}
                strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 68}
                strokeDashoffset={2 * Math.PI * 68 * (1 - Math.max(0, Math.min(1, scanProgress)))}
                style={{ transition: 'stroke-dashoffset 120ms linear' }}
              />
            </svg>
          )}
          <div className="absolute inset-0 border border-hud-ink/15 rounded-full" />
          <div className="absolute left-1/2 top-1/2 w-8 h-8 -translate-x-1/2 -translate-y-1/2 border border-hud-amber/60 rounded-full" />
          <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-hud-amber rounded-full" />
          {[
            'left-0 top-0 border-l-2 border-t-2 rounded-tl',
            'right-0 top-0 border-r-2 border-t-2 rounded-tr',
            'left-0 bottom-0 border-l-2 border-b-2 rounded-bl',
            'right-0 bottom-0 border-r-2 border-b-2 rounded-br',
          ].map((c, i) => (
            <div key={i} className={`absolute w-5 h-5 border-hud-ink/70 ${c}`} />
          ))}
        </div>
        {/* 水平儀 */}
        <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 w-24 h-4 rounded-full border border-hud-ink/25 overflow-hidden">
          <div
            className="absolute w-2.5 h-1.5 rounded-full"
            style={{
              left: `calc(50% + ${Math.max(-40, Math.min(40, Math.sin((roll * Math.PI) / 180) * 40))}% - 5px)`,
              top: `calc(50% + ${Math.max(-6, Math.min(6, pitch / 12))}px - 3px)`,
              background: Math.abs(roll) < 4 ? '#8fe38b' : '#f2c14e',
            }}
          />
        </div>
      </div>

      {/* AR 內容 */}
      {engaged && !sim && cam.status === 'live' && children}
      {engaged && (sim || cam.status !== 'live') && children}

      {/* 側邊控制 */}
      {engaged && (
        <div className="absolute right-3 top-[152px] flex flex-col gap-2 z-20">
          {cam.caps.torch && (
            <button
              onClick={() => { void cam.toggleTorch(); }}
              className={`press w-11 h-11 rounded-full border backdrop-blur flex items-center justify-center ${
                cam.torch ? 'bg-hud-amber text-hud border-hud-amber' : 'bg-hud/50 border-hud-ink/25 text-hud-ink'
              }`}
              aria-label="電筒"
            >
              <Flame size={17} />
            </button>
          )}
          <button
            onClick={cam.toggleNight}
            className={`press w-11 h-11 rounded-full border backdrop-blur flex items-center justify-center ${
              cam.night ? 'bg-hud-green/90 text-hud border-hud-green' : 'bg-hud/50 border-hud-ink/25 text-hud-ink'
            }`}
            aria-label="夜視"
          >
            {cam.night ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      )}

      {/* 變焦 */}
      {engaged && cam.caps.zoom && (
        <div className="absolute left-3 top-[200px] z-20 flex flex-col items-center gap-1">
          <ZoomIn size={14} className="text-hud-dim" />
          <input
            type="range"
            min={cam.caps.zoomMin}
            max={cam.caps.zoomMax}
            step={cam.caps.zoomStep}
            value={cam.zoom}
            onChange={e => { void cam.changeZoom(Number(e.target.value)); }}
            className="w-24 accent-[#f2c14e]"
            style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 96, width: 24 } as React.CSSProperties}
            aria-label="變焦"
          />
          <span className="hud-label text-[8px]">{cam.zoom.toFixed(1)}×</span>
        </div>
      )}

      {/* 底部 */}
      {engaged && footer && (
        <div className="absolute inset-x-0 bottom-0 pb-safe z-20">
          <div className="bg-gradient-to-t from-hud via-hud/85 to-transparent px-4 pt-10 pb-3">
            {footer}
          </div>
        </div>
      )}

      {/* 啟動閘 */}
      {!engaged && (
        <div className="absolute inset-0 z-30 flex items-center justify-center px-6 bg-hud/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-full border border-hud-amber/40 bg-hud-amber/10 flex items-center justify-center mb-4">
              <Camera size={26} className="text-hud-amber" />
            </div>
            <h3 className="font-heading text-[18px] text-hud-ink">
              {guide?.title ?? '舉起手機，望向現場'}
            </h3>
            <p className="text-[11px] text-hud-dim mt-1.5 leading-relaxed">
              {guide?.body ?? '需要相機同指南針，先可以將虛擬符號錨定喺真實位置。'}
            </p>

            {guide?.steps?.length ? (
              <ol className="mt-3.5 space-y-1.5 text-left">
                {guide.steps.map((st, i) => (
                  <li key={i} className="flex items-start gap-2 text-[10.5px] text-hud-ink/85">
                    <span className="shrink-0 w-4 h-4 rounded-full border border-hud-amber/50 text-hud-amber font-mono text-[8px] flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-snug">{st}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            <p className="mt-3 text-[9px] text-hud-dim/80">
              所有影像只會留喺你部手機，唔會上傳。
            </p>

            <button
              onClick={() => engage(false)}
              className="press mt-5 w-full h-12 rounded-2xl bg-hud-amber text-hud font-semibold text-[14px] flex items-center justify-center gap-2"
            >
              <Camera size={17} /> 啟動相機與指南針
            </button>

            <button
              onClick={() => engage(true)}
              className="press mt-2 w-full h-10 rounded-2xl border border-hud-ink/25 text-hud-dim text-[12px] flex items-center justify-center gap-2"
            >
              <CameraOff size={14} /> 冇鏡頭？用模擬視野示範
            </button>

            {cam.status === 'error' && (
              <div className="mt-4 flex items-start gap-2 text-left p-3 rounded-xl border border-hud-red/40 bg-hud-red/10">
                <AlertTriangle size={14} className="text-hud-red shrink-0 mt-0.5" />
                <p className="text-[10px] text-hud-red leading-relaxed">{cam.error}</p>
              </div>
            )}
            {compass === 'denied' && (
              <p className="mt-3 text-[10px] text-hud-amber">
                指南針未授權 — 符號仍會顯示，但唔會跟住你轉身而移動。
              </p>
            )}
            {cam.status === 'starting' && (
              <p className="mt-3 text-[10px] text-hud-dim flex items-center justify-center gap-1">
                <Loader2 size={11} className="animate-spin" /> 正在啟動鏡頭…
              </p>
            )}
          </motion.div>
        </div>
      )}

      {/* 鏡頭錯誤但已啟動 */}
      {engaged && !sim && cam.status === 'error' && (
        <div className="absolute inset-x-0 top-[190px] z-20 mx-4 p-2.5 rounded-lg border border-hud-red/40 bg-hud/85">
          <p className="text-[10px] text-hud-red leading-relaxed">{cam.error}</p>
          <button
            onClick={() => setSim(true)}
            className="mt-1.5 text-[10px] text-hud-amber underline underline-offset-2"
          >
            改用模擬視野
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraStage;
