import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, BookOpen, Compass, Footprints, Layers, PenTool, ScanLine, Users } from 'lucide-react';
import { Chip, Note } from '../components/ui';
import { trackingSigns } from '../data/trackingSigns';

const Rose: React.FC<{ size?: number }> = ({ size = 168 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
    <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(236,224,194,0.22)" strokeWidth="1" />
    <circle cx="100" cy="100" r="76" fill="none" stroke="rgba(236,224,194,0.14)" strokeWidth="1" strokeDasharray="2 4" />
    <circle cx="100" cy="100" r="54" fill="none" stroke="rgba(236,224,194,0.12)" strokeWidth="1" />
    {Array.from({ length: 24 }).map((_, i) => {
      const a = (i * 15 * Math.PI) / 180;
      const r1 = i % 6 === 0 ? 82 : i % 2 === 0 ? 88 : 91;
      return (
        <line
          key={i}
          x1={100 + Math.sin(a) * r1}
          y1={100 - Math.cos(a) * r1}
          x2={100 + Math.sin(a) * 94}
          y2={100 - Math.cos(a) * 94}
          stroke={i % 6 === 0 ? 'rgba(242,193,78,0.75)' : 'rgba(236,224,194,0.28)'}
          strokeWidth={i % 6 === 0 ? 1.6 : 0.8}
        />
      );
    })}
    {/* 指北針 */}
    <path d="M100 26 L108 100 L100 116 L92 100 Z" fill="#f2c14e" opacity="0.95" />
    <path d="M100 174 L108 100 L100 84 L92 100 Z" fill="#ece0c2" opacity="0.28" />
    <circle cx="100" cy="100" r="4.5" fill="#0d120e" stroke="#f2c14e" strokeWidth="1.6" />
    <text x="100" y="20" textAnchor="middle" fontSize="10" fill="#f2c14e" fontFamily="JetBrains Mono, monospace">N</text>
    <text x="100" y="192" textAnchor="middle" fontSize="9" fill="rgba(236,224,194,0.45)" fontFamily="JetBrains Mono, monospace">S</text>
    <text x="188" y="104" textAnchor="middle" fontSize="9" fill="rgba(236,224,194,0.45)" fontFamily="JetBrains Mono, monospace">E</text>
    <text x="12" y="104" textAnchor="middle" fontSize="9" fill="rgba(236,224,194,0.45)" fontFamily="JetBrains Mono, monospace">W</text>
  </svg>
);

const HomePage: React.FC = () => {
  const nav = useNavigate();

  const tools = [
    { to: '/learn', icon: BookOpen, title: '符號圖鑑', sub: '十種官方追蹤記號', badge: `${trackingSigns.length}` },
    { to: '/leader', icon: PenTool, title: '領袖設計', sub: '行一次路線，放下虛擬符號', badge: '領袖' },
    { to: '/player', icon: Compass, title: '隊員追蹤', sub: '行到現場，舉機先見到', badge: '出發' },
  ];

  const steps = [
    { icon: PenTool, t: '領袖先行一次', d: '沿路線行，喺每個轉折位用相機「放低」一個虛擬符號，記錄 GPS 同方位。' },
    { icon: Layers, t: '匯出 JSON', d: '整條路線連符號座標變成一個 JSON 檔／QR，分享俾隊員。' },
    { icon: Users, t: '隊員入營', d: '隊員匯入路線，現場只會知道自己喺邊，唔會預先見到下一個符號。' },
    { icon: ScanLine, t: '舉機發現', d: '行到觸發半徑，舉起手機望向地面 — 虛擬符號先會浮現。' },
  ];

  return (
    <motion.div initial="hidden" animate="show" className="space-y-4 pb-4">
      {/* 抬頭 */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="stamp text-clay inline-block">SKW · TRACKING SIGNS</p>
          <h1 className="text-[30px] leading-[1.15] text-ink mt-1.5">
            追蹤符號<span className="text-forest">訓練</span>
          </h1>
          <p className="text-[12px] text-ink-3 mt-1.5 leading-relaxed max-w-[240px]">
            符號唔喺地上。佢喺你舉機、行到位嘅一刻先出現。
          </p>
        </div>
        <div className="shrink-0 mt-1 text-right">
          <div className="w-11 h-11 rounded-full border border-forest/30 bg-forest/8 flex items-center justify-center">
            <Footprints size={19} className="text-forest" />
          </div>
          <p className="text-[8px] font-mono text-ink-4 mt-1 tracking-widest">EST.2026</p>
        </div>
      </div>

      {/* 主視覺 */}
      <div className="relative overflow-hidden rounded-[22px] border border-forest-2/40 bg-[#16241a] shadow-[0_18px_38px_-22px_rgba(29,49,35,0.9)]">
        <div className="absolute inset-0 opacity-[0.55]"
          style={{ background: 'radial-gradient(90% 70% at 75% 15%, rgba(143,227,139,0.16), transparent 60%)' }} />
        <div className="relative flex items-center gap-2 px-4 pt-4">
          <span className="hud-label !text-hud-amber">AR FIELD MODE</span>
          <span className="h-px flex-1 bg-hud-ink/15" />
          <span className="hud-label">V6</span>
        </div>
        <div className="relative flex items-center gap-3 px-4 pb-4 pt-1">
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-[19px] text-[#f0e6cc] leading-snug">
              虛擬符號<br />實地錨定
            </h2>
            <p className="text-[10.5px] text-[#a9b79b] mt-1.5 leading-relaxed">
              領袖放低 → JSON 分享 → 隊員行到現場，<br />用相機先睇得見。
            </p>
            <div className="flex gap-1.5 mt-2.5">
              <span className="px-2 py-0.5 rounded-sm border border-hud-amber/40 text-hud-amber font-mono text-[8px] tracking-widest">GPS</span>
              <span className="px-2 py-0.5 rounded-sm border border-hud-green/40 text-hud-green font-mono text-[8px] tracking-widest">COMPASS</span>
              <span className="px-2 py-0.5 rounded-sm border border-hud-ink/25 text-hud-ink/70 font-mono text-[8px] tracking-widest">CAMERA</span>
            </div>
          </div>
          <div className="shrink-0 -mr-3 opacity-95">
            <Rose size={150} />
          </div>
        </div>
      </div>

      {/* 主行動 */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => nav('/player')}
          className="press relative overflow-hidden rounded-[18px] bg-forest text-paper px-4 py-3.5 text-left border border-forest-2 shadow-[0_12px_24px_-16px_rgba(29,49,35,1)]"
        >
          <Compass size={18} className="text-hud-amber" />
          <p className="font-heading text-[15px] mt-2">出發追蹤</p>
          <p className="text-[9.5px] text-paper/65 mt-0.5">匯入路線 · 舉機搵符號</p>
          <ArrowUpRight size={15} className="absolute right-3 top-3 text-paper/60" />
        </button>

        <button
          onClick={() => nav('/leader')}
          className="press relative rounded-[18px] bg-paper-2/80 border border-ink/15 px-4 py-3.5 text-left"
        >
          <PenTool size={18} className="text-clay" />
          <p className="font-heading text-[15px] mt-2 text-ink">設計路線</p>
          <p className="text-[9.5px] text-ink-3 mt-0.5">領袖現場放置符號</p>
          <ArrowUpRight size={15} className="absolute right-3 top-3 text-ink-4" />
        </button>
      </div>

      {/* 工具 */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-[13px] text-ink-2">營地工具</h3>
          <span className="h-px flex-1 bg-ink/10" />
          <span className="text-[9px] font-mono text-ink-4 tracking-widest">03</span>
        </div>
        <div className="space-y-2">
          {tools.map(t => (
            <button
              key={t.to}
              onClick={() => nav(t.to)}
              className="press w-full flex items-center gap-3 rounded-2xl border border-ink/12 bg-[#faf3e3]/80 px-3.5 py-3 text-left"
            >
              <span className="w-9 h-9 rounded-xl border border-forest/20 bg-forest/8 flex items-center justify-center text-forest">
                <t.icon size={16} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-ink">{t.title}</span>
                <span className="block text-[10px] text-ink-3 mt-0.5">{t.sub}</span>
              </span>
              <span className="font-mono text-[9px] text-ink-4 border border-ink/12 rounded px-1.5 py-0.5">{t.badge}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 玩法 */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-[13px] text-ink-2">點樣玩</h3>
          <span className="h-px flex-1 bg-ink/10" />
          <Chip tone="clay">4 步</Chip>
        </div>
        <div className="relative pl-7">
          <div className="absolute left-[11px] top-2 bottom-3 w-px bg-[repeating-linear-gradient(180deg,rgba(74,65,51,0.28)_0_4px,transparent_4px_8px)]" />
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="relative">
                <span className="absolute -left-7 top-0.5 w-6 h-6 rounded-full bg-paper border border-ink/20 flex items-center justify-center font-mono text-[9px] text-ink-3">
                  {i + 1}
                </span>
                <p className="text-[12px] font-medium text-ink-2 flex items-center gap-1.5">
                  <s.icon size={12} className="text-clay" />{s.t}
                </p>
                <p className="text-[10.5px] text-ink-3 mt-0.5 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Note>
        <strong className="text-ink-2">追蹤唔等於尋寶。</strong>
        地圖只話你知自己喺邊；下一個符號嘅位置、距離、方向都唔會預先顯示。
        你要行到、舉機、望 —— 同真正嘅追蹤一樣。
      </Note>

      <p className="text-center text-[9px] font-mono tracking-[0.2em] text-ink-4 pt-1">
        SCOUT SYSTEM · SKW TRACKING · 2026
      </p>
    </motion.div>
  );
};

export default HomePage;
