import React from 'react';

interface P { signId:number; size?:number; className?:string; glow?:boolean; }
const C='#00d4ff',G='#00ff88',R='#ff3366',Y='#ffd700',SW=6;

export const SignSVG:React.FC<P>=({signId,size=120,className='',glow=true})=>{
  const f=glow?`drop-shadow(0 0 8px ${C}) drop-shadow(0 0 18px rgba(0,212,255,0.25))`:undefined;
  const fr=glow?`drop-shadow(0 0 8px ${R}) drop-shadow(0 0 18px rgba(255,51,102,0.25))`:undefined;
  const fg=glow?`drop-shadow(0 0 8px ${G}) drop-shadow(0 0 18px rgba(0,255,136,0.25))`:undefined;
  const fy=glow?`drop-shadow(0 0 8px ${Y}) drop-shadow(0 0 18px rgba(255,215,0,0.25))`:undefined;

  const s:Record<number,React.ReactNode>={
    1:<svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{filter:f}}>
      <line x1="15" y1="60" x2="78" y2="60" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="62" y1="38" x2="85" y2="60" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="62" y1="82" x2="85" y2="60" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <circle cx="28" cy="48" r="4" fill={G} opacity=".6"/><circle cx="42" cy="74" r="3" fill={G} opacity=".4"/>
    </svg>,
    2:<svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{filter:f}}>
      <line x1="60" y1="22" x2="60" y2="98" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="46" y1="38" x2="60" y2="22" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="74" y1="38" x2="60" y2="22" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
    </svg>,
    3:<svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{filter:fr}}>
      <line x1="32" y1="32" x2="88" y2="88" stroke={R} strokeWidth={SW+1} strokeLinecap="round"/>
      <line x1="88" y1="32" x2="32" y2="88" stroke={R} strokeWidth={SW+1} strokeLinecap="round"/>
    </svg>,
    4:<svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{filter:fg}}>
      <circle cx="60" cy="32" r="7" fill="none" stroke={G} strokeWidth="2.5" opacity=".7"/>
      <circle cx="88" cy="48" r="7" fill="none" stroke={G} strokeWidth="2.5" opacity=".6"/>
      <circle cx="88" cy="78" r="7" fill="none" stroke={G} strokeWidth="2.5" opacity=".7"/>
      <circle cx="60" cy="94" r="7" fill="none" stroke={G} strokeWidth="2.5" opacity=".6"/>
      <circle cx="32" cy="78" r="7" fill="none" stroke={G} strokeWidth="2.5" opacity=".7"/>
      <circle cx="32" cy="48" r="7" fill="none" stroke={G} strokeWidth="2.5" opacity=".6"/>
      <circle cx="60" cy="63" r="9" fill={G} opacity=".9"/>
    </svg>,
    5:<svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{filter:f}}>
      <path d="M20 42Q40 28,60 42Q80 56,100 42" stroke={C} strokeWidth={SW} fill="none" strokeLinecap="round"/>
      <path d="M20 64Q40 50,60 64Q80 78,100 64" stroke={C} strokeWidth={SW} fill="none" strokeLinecap="round"/>
      <path d="M20 86Q40 72,60 86Q80 100,100 86" stroke={C} strokeWidth={SW} fill="none" strokeLinecap="round"/>
    </svg>,
    6:<svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{filter:f}}>
      <line x1="72" y1="88" x2="72" y2="52" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="72" y1="52" x2="32" y2="52" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="48" y1="36" x2="32" y2="52" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="48" y1="68" x2="32" y2="52" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
    </svg>,
    7:<svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{filter:f}}>
      <line x1="48" y1="88" x2="48" y2="52" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="48" y1="52" x2="88" y2="52" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="72" y1="36" x2="88" y2="52" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="72" y1="68" x2="88" y2="52" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
    </svg>,
    8:<svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{filter:fr}}>
      <line x1="38" y1="28" x2="38" y2="92" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="82" y1="28" x2="82" y2="92" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="28" y1="60" x2="92" y2="60" stroke={R} strokeWidth={SW+1} strokeLinecap="round"/>
    </svg>,
    9:<svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{filter:fy}}>
      <line x1="28" y1="32" x2="72" y2="32" stroke={Y} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="72" y1="32" x2="72" y2="76" stroke={Y} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="72" y1="76" x2="28" y2="76" stroke={Y} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="28" y1="76" x2="28" y2="32" stroke={Y} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="72" y1="54" x2="98" y2="54" stroke={Y} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="84" y1="42" x2="98" y2="54" stroke={Y} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="84" y1="66" x2="98" y2="54" stroke={Y} strokeWidth={SW} strokeLinecap="round"/>
      <text x="50" y="60" textAnchor="middle" dominantBaseline="central" fill={Y} fontSize="22" fontWeight="bold" fontFamily="Fredoka">6</text>
    </svg>,
    10:<svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{filter:f}}>
      <line x1="60" y1="92" x2="60" y2="52" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="60" y1="52" x2="28" y2="26" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <line x1="60" y1="52" x2="92" y2="26" stroke={C} strokeWidth={SW} strokeLinecap="round"/>
      <circle cx="22" cy="38" r="3" fill={G} opacity=".6"/><circle cx="22" cy="50" r="3" fill={G} opacity=".4"/>
      <circle cx="98" cy="38" r="3" fill={G} opacity=".6"/><circle cx="98" cy="50" r="3" fill={G} opacity=".4"/>
    </svg>,
  };
  return <div className="flex items-center justify-center">{s[signId]||<div className="text-ice-dim">?</div>}</div>;
};
export default SignSVG;
