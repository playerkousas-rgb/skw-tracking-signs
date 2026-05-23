import React from 'react';

interface SignSVGProps {
  signId: number;
  size?: number;
  className?: string;
  glow?: boolean;
}

const WOOD = '#8B6914';
const WOOD_DARK = '#6B4F12';
const STONE = '#9E9E9E';
const STONE_DARK = '#757575';
const GROUND = '#3D2B1F';
const GROUND_LIGHT = '#5C4033';
const MOSS = '#4A7C3F';

const SignSVG: React.FC<SignSVGProps> = ({ signId, size = 140, className = '', glow = true }) => {
  const s = size;
  const pad = s * 0.15;
  const inner = s - pad * 2;
  const sw = inner * 0.12; // stick width
  const r = sw / 2;

  const filterId = `glow-${signId}`;

  const renderStick = (x1: number, y1: number, x2: number, y2: number, key: string) => (
    <g key={key}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={WOOD_DARK} strokeWidth={sw + 2} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={WOOD} strokeWidth={sw} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#A0782C" strokeWidth={sw * 0.3} strokeLinecap="round" opacity={0.5} />
    </g>
  );

  const renderStone = (cx: number, cy: number, rs: number, key: string) => (
    <g key={key}>
      <ellipse cx={cx} cy={cy} rx={rs} ry={rs * 0.75} fill={STONE_DARK} />
      <ellipse cx={cx - rs * 0.15} cy={cy - rs * 0.1} rx={rs * 0.8} ry={rs * 0.6} fill={STONE} />
      <ellipse cx={cx - rs * 0.2} cy={cy - rs * 0.2} rx={rs * 0.3} ry={rs * 0.2} fill="#BDBDBD" opacity={0.4} />
    </g>
  );

  const renderGroundPatch = () => (
    <rect x={pad - 2} y={pad - 2} width={inner + 4} height={inner + 4} rx={inner * 0.15} fill={GROUND} opacity={0.5} />
  );

  const renderSVG = (): React.ReactNode => {
    switch (signId) {
      // 1 - This Way (arrow made of sticks)
      case 1: {
        const cx = s / 2;
        const cy = s / 2;
        const shaftLen = inner * 0.55;
        const headLen = inner * 0.3;
        const startX = cx - shaftLen / 2;
        const endX = cx + shaftLen / 2;
        return (
          <>
            {renderGroundPatch()}
            {renderStick(startX, cy, endX, cy, 'shaft')}
            {renderStick(endX, cy, endX - headLen, cy - headLen * 0.6, 'head1')}
            {renderStick(endX, cy, endX - headLen, cy + headLen * 0.6, 'head2')}
          </>
        );
      }
      // 2 - Straight On (two parallel sticks)
      case 2: {
        const gap = inner * 0.25;
        const len = inner * 0.65;
        const startX = s / 2 - len / 2;
        const endX = s / 2 + len / 2;
        return (
          <>
            {renderGroundPatch()}
            {renderStick(startX, s / 2 - gap / 2, endX, s / 2 - gap / 2, 'top')}
            {renderStick(startX, s / 2 + gap / 2, endX, s / 2 + gap / 2, 'bot')}
          </>
        );
      }
      // 3 - Wrong Way / Danger (X made of two sticks)
      case 3: {
        const diag = inner * 0.55;
        const cx = s / 2;
        const cy = s / 2;
        return (
          <>
            {renderGroundPatch()}
            {renderStick(cx - diag, cy - diag, cx + diag, cy + diag, 'x1')}
            {renderStick(cx + diag, cy - diag, cx - diag, cy + diag, 'x2')}
          </>
        );
      }
      // 4 - Gone Home (circle of stones with center stone)
      case 4: {
        const cx = s / 2;
        const cy = s / 2;
        const radius = inner * 0.35;
        const stoneCount = 8;
        const stones = [];
        for (let i = 0; i < stoneCount; i++) {
          const angle = (i / stoneCount) * Math.PI * 2 - Math.PI / 2;
          const sx = cx + Math.cos(angle) * radius;
          const sy = cy + Math.sin(angle) * radius;
          stones.push(renderStone(sx, sy, inner * 0.08, `s${i}`));
        }
        return (
          <>
            {renderGroundPatch()}
            {stones}
            {renderStone(cx, cy, inner * 0.1, 'center')}
          </>
        );
      }
      // 5 - Water Ahead (wavy lines made of sticks)
      case 5: {
        const cx = s / 2;
        const cy = s / 2;
        const w = inner * 0.6;
        const h = inner * 0.35;
        const sX = cx - w / 2;
        const pts = 12;
        const parts = [];
        for (let i = 0; i < pts - 1; i++) {
          const t1 = i / (pts - 1);
          const t2 = (i + 1) / (pts - 1);
          const x1 = sX + t1 * w;
          const x2 = sX + t2 * w;
          const y1 = cy + Math.sin(t1 * Math.PI * 3) * h;
          const y2 = cy + Math.sin(t2 * Math.PI * 3) * h;
          parts.push(renderStick(x1, y1, x2, y2, `w${i}`));
        }
        return <>{renderGroundPatch()}{parts}</>;
      }
      // 6 - Turn Left (arrow curving left)
      case 6: {
        const cx = s / 2;
        const cy = s / 2;
        const shaftX = cx + inner * 0.1;
        const shaftY1 = cy + inner * 0.35;
        const shaftY2 = cy - inner * 0.15;
        const curveX = cx - inner * 0.2;
        const curveY = cy - inner * 0.2;
        return (
          <>
            {renderGroundPatch()}
            {renderStick(shaftX, shaftY1, shaftX, shaftY2, 'shaft')}
            {renderStick(shaftX, shaftY2, curveX, curveY, 'curve')}
            {renderStick(curveX, curveY, curveX - inner * 0.15, curveY - inner * 0.12, 'head1')}
            {renderStick(curveX, curveY, curveX + inner * 0.05, curveY - inner * 0.18, 'head2')}
          </>
        );
      }
      // 7 - Turn Right (arrow curving right)
      case 7: {
        const cx = s / 2;
        const cy = s / 2;
        const shaftX = cx - inner * 0.1;
        const shaftY1 = cy + inner * 0.35;
        const shaftY2 = cy - inner * 0.15;
        const curveX = cx + inner * 0.2;
        const curveY = cy - inner * 0.2;
        return (
          <>
            {renderGroundPatch()}
            {renderStick(shaftX, shaftY1, shaftX, shaftY2, 'shaft')}
            {renderStick(shaftX, shaftY2, curveX, curveY, 'curve')}
            {renderStick(curveX, curveY, curveX + inner * 0.15, curveY - inner * 0.12, 'head1')}
            {renderStick(curveX, curveY, curveX - inner * 0.05, curveY - inner * 0.18, 'head2')}
          </>
        );
      }
      // 8 - Obstacle Ahead (parallel lines with cross bar)
      case 8: {
        const gap = inner * 0.3;
        const len = inner * 0.55;
        const sX = s / 2 - len / 2;
        const eX = s / 2 + len / 2;
        const barX = s / 2;
        const barY1 = s / 2 - gap / 2;
        const barY2 = s / 2 + gap / 2;
        return (
          <>
            {renderGroundPatch()}
            {renderStick(sX, s / 2 - gap / 2, eX, s / 2 - gap / 2, 'top')}
            {renderStick(sX, s / 2 + gap / 2, eX, s / 2 + gap / 2, 'bot')}
            {renderStick(barX, barY1, barX, barY2, 'cross')}
          </>
        );
      }
      // 9 - Paces to Message (box with arrow + number)
      case 9: {
        const cx = s / 2;
        const cy = s / 2;
        const boxSize = inner * 0.3;
        const bx = cx - inner * 0.25;
        const by = cy - boxSize / 2;
        return (
          <>
            {renderGroundPatch()}
            {renderStick(bx, by, bx + boxSize, by, 'bt')}
            {renderStick(bx, by + boxSize, bx + boxSize, by + boxSize, 'bb')}
            {renderStick(bx, by, bx, by + boxSize, 'bl')}
            {renderStick(bx + boxSize, by, bx + boxSize, by + boxSize, 'br')}
            {renderStick(bx + boxSize, cy, bx + boxSize + inner * 0.25, cy, 'arrS')}
            {renderStick(bx + boxSize + inner * 0.25, cy, bx + boxSize + inner * 0.12, cy - inner * 0.1, 'arr1')}
            {renderStick(bx + boxSize + inner * 0.25, cy, bx + boxSize + inner * 0.12, cy + inner * 0.1, 'arr2')}
          </>
        );
      }
      // 10 - Split Path (arrow that forks)
      case 10: {
        const cx = s / 2;
        const cy = s / 2;
        const shaftY = cy + inner * 0.3;
        const splitY = cy - inner * 0.05;
        const forkLen = inner * 0.3;
        return (
          <>
            {renderGroundPatch()}
            {renderStick(cx, shaftY, cx, splitY, 'shaft')}
            {renderStick(cx, splitY, cx - forkLen, cy - forkLen, 'forkL')}
            {renderStick(cx, splitY, cx + forkLen, cy - forkLen, 'forkR')}
            {renderStick(cx - forkLen, cy - forkLen, cx - forkLen - inner * 0.1, cy - forkLen - inner * 0.1, 'hl1')}
            {renderStick(cx - forkLen, cy - forkLen, cx - forkLen + inner * 0.05, cy - forkLen - inner * 0.15, 'hl2')}
            {renderStick(cx + forkLen, cy - forkLen, cx + forkLen + inner * 0.1, cy - forkLen - inner * 0.1, 'hr1')}
            {renderStick(cx + forkLen, cy - forkLen, cx + forkLen - inner * 0.05, cy - forkLen - inner * 0.15, 'hr2')}
          </>
        );
      }
      default:
        return (
          <text x={s / 2} y={s / 2} textAnchor="middle" dominantBaseline="central" fill="#5a7a98" fontSize={inner * 0.3}>
            ?
          </text>
        );
    }
  };

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

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className={className}
      style={{ filter: glow ? `url(#${filterId})` : undefined }}
    >
      {glowFilter}
      {renderSVG()}
    </svg>
  );
};

export default SignSVG;