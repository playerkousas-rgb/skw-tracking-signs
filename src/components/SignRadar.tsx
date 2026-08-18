import React from 'react';

// 追蹤儀雷達：只顯示「下一個符號」的訊號強弱，不顯示地圖／方向。
// 追蹤靠符號指引，唔係看地圖。 COPYRIGHT © 2026 SCOUT SYSTEM

interface SignRadarProps {
  strength: 0 | 1 | 2 | 3 | 4; // 0無訊號 1遠 2接近 3很近 4發現
  distanceM?: number | null;   // 與下一個符號的距離（米）
  accuracyM?: number | null;   // GPS 準確度
  label: string;               // 狀態文字
  size?: number;
}

const LEVELS = [
  { text: '🔍 搜尋中', color: 'text-steel' },
  { text: '❄️ 訊號微弱', color: 'text-steel-light' },
  { text: '🌤 接近中', color: 'text-cyan' },
  { text: '🔥 非常接近', color: 'text-gold' },
  { text: '📍 發現符號！', color: 'text-green' },
];

const SignRadar: React.FC<SignRadarProps> = ({ strength, distanceM, accuracyM, label, size = 240 }) => {
  const s = size;
  const c = s / 2;
  const ringR = [s * 0.20, s * 0.30, s * 0.40];
  const ringColor = strength >= 3 ? '#ffd700' : strength >= 2 ? '#00d4ff' : strength >= 1 ? '#3a5068' : '#1a2a4a';
  const pulseColor = strength >= 4 ? '#00ff88' : ringColor;

  return (
    <div className="flex flex-col items-center select-none" style={{ width: s }}>
      {/* 雷達圓盤 */}
      <div className="relative rounded-full overflow-hidden"
        style={{
          width: s, height: s,
          background: 'radial-gradient(circle, #06214f 0%, #04163a 65%, #02133e 100%)',
          border: `3px solid ${strength >= 3 ? 'rgba(255,215,0,.45)' : 'rgba(0,212,255,.25)'}`,
          boxShadow: strength >= 3
            ? '0 0 30px rgba(255,215,0,.18), inset 0 0 40px rgba(255,215,0,.06)'
            : '0 0 24px rgba(0,212,255,.12), inset 0 0 40px rgba(0,212,255,.05)',
        }}>
        {/* 掃描線 */}
        <div className="radar-sweep absolute inset-0" />

        {/* 同心圓 */}
        <svg width={s} height={s} className="absolute inset-0">
          {ringR.map((r, i) => (
            <circle key={i} cx={c} cy={c} r={r} fill="none"
              stroke={ringColor} strokeOpacity={0.22 + i * 0.06} strokeWidth={1} strokeDasharray={i === 0 ? 'none' : '3 5'} />
          ))}
          <line x1={c} y1={s * 0.08} x2={c} y2={s * 0.92} stroke={ringColor} strokeOpacity={0.08} />
          <line x1={s * 0.08} y1={c} x2={s * 0.92} y2={c} stroke={ringColor} strokeOpacity={0.08} />
        </svg>

        {/* 中央：你的位置脈衝 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full animate-pulse-ring"
            style={{ width: s * 0.14, height: s * 0.14, border: `2px solid ${pulseColor}` }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full"
            style={{ width: s * 0.07, height: s * 0.07, background: pulseColor, boxShadow: `0 0 16px ${pulseColor}` }} />
        </div>

        {/* 訊號格 */}
        <div className="absolute bottom-3 left-3 flex items-end gap-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-sm"
              style={{
                width: 5, height: 4 + i * 4,
                background: strength >= i
                  ? (strength >= 4 ? '#00ff88' : strength >= 3 ? '#ffd700' : '#00d4ff')
                  : '#12294f',
                boxShadow: strength >= i ? '0 0 6px rgba(0,212,255,.5)' : 'none',
              }} />
          ))}
        </div>

        {/* 距離讀數 */}
        <div className="absolute bottom-2.5 right-3 text-right">
          <div className="font-mono font-bold text-sm leading-none"
            style={{ color: strength >= 3 ? '#ffd700' : '#e0f0ff' }}>
            {distanceM != null ? `${Math.round(distanceM)}m` : '---'}
          </div>
          {accuracyM != null && (
            <div className={`text-[8px] font-mono mt-0.5 ${accuracyM > 20 ? 'text-red' : 'text-steel'}`}>
              ±{Math.round(accuracyM)}m
            </div>
          )}
        </div>
      </div>

      {/* 狀態文字 */}
      <div className={`mt-3 font-heading font-bold text-sm text-center ${LEVELS[strength].color}`}>
        {label || LEVELS[strength].text}
      </div>
      <p className="text-[9px] text-steel text-center mt-1 leading-relaxed">
        追蹤儀只顯示訊號強弱 — 請用眼觀察地面的追蹤符號
      </p>
    </div>
  );
};

export default SignRadar;
