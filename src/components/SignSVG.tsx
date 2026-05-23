import React from 'react';

interface SignSVGProps {
  signId: number;
  size?: number;
  className?: string;
  glow?: boolean;
  direction?: 'forward' | 'left' | 'right'; // 箭頭方向
}

const WOOD = '#8B6914';
const WOOD_DARK = '#6B4F12';
const STONE = '#9E9E9E';
const STONE_DARK = '#757575';
const GROUND = '#3D2B1F';

const SignSVG: React.FC<SignSVGProps> = ({ signId, size = 140, className = '', glow = true, direction }) => {
  const s = size;
  const pad = s * 0.15;
  const inner = s - pad * 2;
  const sw = inner * 0.12;
  if (direction) {
    // 有方向時縮小主符號，旁邊放箭頭
    const mainSize = s * 0.7;
    const arrowSize = s * 0.35;
    const gap = s * 0.04;
    const totalW = mainSize + gap + arrowSize;
    const startX = (s - totalW) / 2;
    const cy = s / 2;
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
        {/* Main sign */}
        <g transform={`translate(${startX + mainSize / 2}, ${cy})`}>
          <SignContent signId={signId} size={mainSize} glow={glow} />
        </g>

        {/* Direction arrow */}
        <g transform={`translate(${startX + mainSize + gap + arrowSize / 2}, ${cy})`}>
          <DirectionArrow direction={direction} size={arrowSize} />
        </g>
      </svg>
    );
  }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
      <SignContent signId={signId} size={s} glow={glow} />
    </svg>
  );
};

// --- Direction arrow ---
const DirectionArrow: React.FC<{ direction: 'forward' | 'left' | 'right'; size: number }> = ({ direction, size }) => {
  const s = size;
  const pad = s * 0.08;
  const inner = s - pad * 2;
  const sw = inner * 0.16;
  const cx = s / 2;
  const cy = s / 2;
  const headLen = inner * 0.45;
  const shaftLen = inner * 0.55;

  let rotation = 0;
  if (direction === 'left') rotation = -90;
  if (direction === 'right') rotation = 90;

  const shaftStart = -shaftLen / 2;
  const shaftEnd = shaftLen / 2;

  const filterId = `arrow-glow-${direction}`;

  return (
    <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
      <defs>
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feFlood floodColor="#00d4ff" floodOpacity="0.3" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        {/* Shaft */}
        <line x1={cx + shaftStart} y1={cy} x2={cx + shaftEnd} y2={cy} stroke={WOOD_DARK} strokeWidth={sw + 2} strokeLinecap="round" />
        <line x1={cx + shaftStart} y1={cy} x2={cx + shaftEnd} y2={cy} stroke={WOOD} strokeWidth={sw} strokeLinecap="round" />
        {/* Arrowhead */}
        <line x1={cx + shaftEnd} y1={cy} x2={cx + shaftEnd - headLen} y2={cy - headLen * 0.55} stroke={WOOD_DARK} strokeWidth={sw + 2} strokeLinecap="round" />
        <line x1={cx + shaftEnd} y1={cy} x2={cx + shaftEnd - headLen} y2={cy - headLen * 0.55} stroke={WOOD} strokeWidth={sw} strokeLinecap="round" />
        <line x1={cx + shaftEnd} y1={cy} x2={cx + shaftEnd - headLen} y2={cy + headLen * 0.55} stroke={WOOD_DARK} strokeWidth={sw + 2} strokeLinecap="round" />
        <line x1={cx + shaftEnd} y1={cy} x2={cx + shaftEnd - headLen} y2={cy + headLen * 0.55} stroke={WOOD} strokeWidth={sw} strokeLinecap="round" />
      </g>
    </g>
  );
};

// --- Individual sign content (no outer SVG) ---
const SignContent: React.FC<{ signId: number; size: number; glow: boolean }> = ({ signId, size, glow }) => {
  const s = size;
  const pad = s * 0.15;
  const inner = s - pad * 2;
  const sw = inner * 0.12;
  const cx = s / 2;
  const cy = s / 2;

  const filterId = `glow-${signId}`;

  const renderStick = (x1: number, y1: number, x2: number, y2: number) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={WOOD_DARK} strokeWidth={sw + 2} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={WOOD} strokeWidth={sw} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#A0782C" strokeWidth={sw * 0.3} strokeLinecap="round" opacity={0.5} />
    </g>
  );

  const renderStone = (scx: number, scy: number, rs: number) => (
    <g>
      <ellipse cx={scx} cy={scy} rx={rs} ry={rs * 0.75} fill={STONE_DARK} />
      <ellipse cx={scx - rs * 0.15} cy={scy - rs * 0.1} rx={rs * 0.8} ry={rs * 0.6} fill={STONE} />
      <ellipse cx={scx - rs * 0.2} cy={scy - rs * 0.2} rx={rs * 0.3} ry={rs * 0.2} fill="#BDBDBD" opacity={0.4} />
    </g>
  );

  const ground = <rect x={pad - 2} y={pad - 2} width={inner + 4} height={inner + 4} rx={inner * 0.15} fill={GROUND} opacity={0.5} />;

  const glowFilter = glow ? (
    <defs>
      <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feFlood floodColor="#00d4ff" floodOpacity="0.25" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  ) : null;

  const renderBody = (): React.ReactNode => {
    switch (signId) {
      case 1: { // Arrow forward
        const shaftLen = inner * 0.5;
        const headLen = inner * 0.28;
        return <>{ground}{renderStick(cx - shaftLen / 2, cy, cx + shaftLen / 2, cy)}{renderStick(cx + shaftLen / 2, cy, cx + shaftLen / 2 - headLen, cy - headLen * 0.6)}{renderStick(cx + shaftLen / 2, cy, cx + shaftLen / 2 - headLen, cy + headLen * 0.6)}</>;
      }
      case 2: { // Straight on - two parallel sticks
        const gap = inner * 0.25;
        const len = inner * 0.6;
        return <>{ground}{renderStick(cx - len / 2, cy - gap / 2, cx + len / 2, cy - gap / 2)}{renderStick(cx - len / 2, cy + gap / 2, cx + len / 2, cy + gap / 2)}</>;
      }
      case 3: { // X
        const d = inner * 0.5;
        return <>{ground}{renderStick(cx - d, cy - d, cx + d, cy + d)}{renderStick(cx + d, cy - d, cx - d, cy + d)}</>;
      }
      case 4: { // Gone home - circle of stones
        const r = inner * 0.32;
        const count = 8;
        const stones = [];
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 - Math.PI / 2;
          stones.push(renderStone(cx + Math.cos(a) * r, cy + Math.sin(a) * r, inner * 0.08));
        }
        return <>{ground}{stones}{renderStone(cx, cy, inner * 0.1)}</>;
      }
      case 5: { // Water wave
        const w = inner * 0.55;
        const h = inner * 0.3;
        const pts = 12;
        const parts = [];
        for (let i = 0; i < pts - 1; i++) {
          const t1 = i / (pts - 1), t2 = (i + 1) / (pts - 1);
          parts.push(renderStick(cx - w / 2 + t1 * w, cy + Math.sin(t1 * Math.PI * 3) * h, cx - w / 2 + t2 * w, cy + Math.sin(t2 * Math.PI * 3) * h));
        }
        return <>{ground}{parts}</>;
      }
      case 6: { // Turn left
        const sx = cx + inner * 0.08;
        return <>{ground}{renderStick(sx, cy + inner * 0.32, sx, cy - inner * 0.12)}{renderStick(sx, cy - inner * 0.12, cx - inner * 0.18, cy - inner * 0.18)}{renderStick(cx - inner * 0.18, cy - inner * 0.18, cx - inner * 0.32, cy - inner * 0.08)}{renderStick(cx - inner * 0.18, cy - inner * 0.18, cx - inner * 0.22, cy - inner * 0.34)}</>;
      }
      case 7: { // Turn right
        const sx = cx - inner * 0.08;
        return <>{ground}{renderStick(sx, cy + inner * 0.32, sx, cy - inner * 0.12)}{renderStick(sx, cy - inner * 0.12, cx + inner * 0.18, cy - inner * 0.18)}{renderStick(cx + inner * 0.18, cy - inner * 0.18, cx + inner * 0.32, cy - inner * 0.08)}{renderStick(cx + inner * 0.18, cy - inner * 0.18, cx + inner * 0.22, cy - inner * 0.34)}</>;
      }
      case 8: { // Obstacle
        const gap = inner * 0.28;
        const len = inner * 0.52;
        const sX = cx - len / 2;
        return <>{ground}{renderStick(sX, cy - gap / 2, cx + len / 2, cy - gap / 2)}{renderStick(sX, cy + gap / 2, cx + len / 2, cy + gap / 2)}{renderStick(cx, cy - gap / 2, cx, cy + gap / 2)}</>;
      }
      case 9: { // Box + arrow
        const bs = inner * 0.28;
        const bx = cx - inner * 0.24;
        const by = cy - bs / 2;
        const eX = bx + bs;
        return <>{ground}{renderStick(bx, by, eX, by)}{renderStick(bx, by + bs, eX, by + bs)}{renderStick(bx, by, bx, by + bs)}{renderStick(eX, by, eX, by + bs)}{renderStick(eX, cy, eX + inner * 0.22, cy)}{renderStick(eX + inner * 0.22, cy, eX + inner * 0.1, cy - inner * 0.1)}{renderStick(eX + inner * 0.22, cy, eX + inner * 0.1, cy + inner * 0.1)}</>;
      }
      case 10: { // Split path
        const forkY = cy - inner * 0.1;
        const fLen = inner * 0.28;
        return <>{ground}{renderStick(cx, cy + inner * 0.28, cx, forkY)}{renderStick(cx, forkY, cx - fLen, cy - fLen)}{renderStick(cx, forkY, cx + fLen, cy - fLen)}{renderStick(cx - fLen, cy - fLen, cx - fLen - inner * 0.1, cy - fLen - inner * 0.08)}{renderStick(cx - fLen, cy - fLen, cx - fLen + inner * 0.04, cy - fLen - inner * 0.14)}{renderStick(cx + fLen, cy - fLen, cx + fLen + inner * 0.1, cy - fLen - inner * 0.08)}{renderStick(cx + fLen, cy - fLen, cx + fLen - inner * 0.04, cy - fLen - inner * 0.14)}</>;
      }
      default:
        return <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#5a7a98" fontSize={inner * 0.3}>?</text>;
    }
  };

  return (
    <g filter={glow ? `url(#${filterId})` : undefined}>
      {glowFilter}
      {renderBody()}
    </g>
  );
};

export default SignSVG;
