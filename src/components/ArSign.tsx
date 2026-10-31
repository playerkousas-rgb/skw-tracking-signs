import React from 'react';
import { Lock } from 'lucide-react';
import SignSVG from './SignSVG';
import { formatDistance } from '../lib/geo';

interface ArSignProps {
  signId: number;
  xPct: number;
  yPct: number;
  scale: number;
  dist: number;
  /**
   * 0–1：符號「浮現」程度。
   * 0 = 幾乎睇唔到（只有粉筆痕）→ 1 = 完全實體化。
   * 用嚟做到「要停低、對準、望住」先會真正見到。
   */
  reveal?: number;
  /** 已完全鎖定 */
  locked?: boolean;
  /** 掃描中（未鎖定） */
  scanning?: boolean;
  label?: string;
}

/**
 * 投影喺相機畫面地面嘅「虛擬追蹤符號」
 * 童軍符號本來就係畫喺地上，所以呢個組件會：
 * · 按距離做透視壓扁（越遠越貼近地面）
 * · 有接觸陰影同地面錨環
 * · 由「粉筆痕」逐漸實體化，而唔係一彈就出
 */
const ArSign: React.FC<ArSignProps> = ({
  signId, xPct, yPct, scale, dist, reveal = 1, locked, scanning, label,
}) => {
  const r = Math.max(0, Math.min(1, reveal));
  const size = 116 * scale;

  // 越遠 → 越斜視 → 壓得越扁；近距離望落去較接近「俯視」
  const flat = Math.max(0.42, Math.min(0.96, 1.12 - dist * 0.055));

  const opacity = 0.16 + 0.84 * r;
  const blur = (1 - r) * 2.6;
  const brightness = 0.75 + 0.35 * r;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: 'translate(-50%, -50%)',
        width: size,
        opacity,
        filter: `blur(${blur}px) brightness(${brightness})`,
        transition: 'opacity 140ms linear, filter 140ms linear, left 90ms linear, top 90ms linear',
      }}
    >
      {/* 接觸陰影 — 令符號似「貼喺地」而唔係浮起 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-black/45 blur-[6px]"
        style={{ width: size * 0.92, height: size * 0.26 * flat, bottom: -size * 0.05 }}
      />

      {/* 地面錨環 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] border border-dashed"
        style={{
          width: size * 0.95,
          height: size * 0.3 * flat,
          bottom: -size * 0.02,
          borderColor: r > 0.9
            ? 'rgba(242,193,78,0.85)'
            : `rgba(236,224,194,${0.15 + r * 0.5})`,
        }}
      />

      {/* 粉筆痕：未實體化時嘅輪廓，似有人用粉筆輕輕畫過 */}
      {r < 0.95 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-dashed"
          style={{
            width: size * 0.9,
            height: size * 0.9 * flat,
            bottom: size * 0.05,
            borderColor: `rgba(236,224,194,${0.4 * (1 - r) + 0.12})`,
            transform: `translateX(-50%) scaleY(${flat})`,
          }}
        />
      )}

      {/* 符號本體：透視壓扁，似畫喺地上 */}
      <div
        className="relative vsign"
        style={{ transform: `scaleY(${flat})`, transformOrigin: 'bottom center' }}
      >
        <SignSVG signId={signId} size={size} glow />
        {scanning && r > 0.35 && (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="absolute left-0 right-0 h-[2px] bg-hud-amber/80 shadow-[0_0_12px_2px_rgba(242,193,78,0.8)] anim-scan" />
          </div>
        )}
      </div>

      {/* 實體化瞬間的閃光 */}
      {locked && (
        <>
          <div className="absolute inset-0 rounded-full border-2 border-hud-green/70 anim-lock" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-hud-green">
            <Lock size={13} />
          </div>
        </>
      )}

      {/* 標籤：未鎖定時唔顯示名字，只顯示距離 */}
      {r > 0.55 && (
        <div className="mt-1 flex flex-col items-center gap-0.5">
          <div className={`px-2 py-0.5 rounded-sm border font-mono text-[9px] tracking-[0.14em] ${
            locked
              ? 'border-hud-green/70 text-hud-green bg-hud/70'
              : 'border-hud-amber/50 text-hud-amber bg-hud/60'
          }`}>
            {locked ? '已鎖定' : label ?? '地面符號'}
          </div>
          <div className="hud-label text-[8px] text-hud-ink/70">{formatDistance(dist)}</div>
        </div>
      )}
    </div>
  );
};

export default ArSign;
