import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, PenTool, Compass, Footprints } from 'lucide-react';

const HomePage: React.FC = () => {
  const nav = useNavigate();

  const containers = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
  };

  const itemV = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
  };

  const colorMap: Record<string, { text: string; bg: string; glow: string; box: string }> = {
    cyan: { text: 'text-cyan', bg: 'bg-cyan/10', glow: 'glow-cyan', box: 'box-glow-cyan' },
    green: { text: 'text-green', bg: 'bg-green/10', glow: 'glow-green', box: 'box-glow-green' },
    gold: { text: 'text-gold', bg: 'bg-gold/10', glow: 'glow-gold', box: 'box-glow-gold' },
  };

  const cards = [
    { to: '/learn', icon: BookOpen, color: 'cyan' as const, g: 'from-cyan-dark/60 to-navy-800/80', b: 'border-cyan/15', t: '符號圖鑑', d: '認識10種追蹤符號，學習每種符號的意義與應對動作', s: '10', sl: '符號' },
    { to: '/leader', icon: PenTool, color: 'green' as const, g: 'from-green-dark/60 to-navy-800/80', b: 'border-green/15', t: '設計路線', d: '領袖建立追蹤路線，在地圖上標記每個符號位置', s: '建立', sl: '路線' },
    { to: '/player', icon: Compass, color: 'gold' as const, g: 'from-navy-700/60 to-navy-800/80', b: 'border-gold/15', t: '沿途追蹤', d: '輸入路線代碼，沿路觀察符號並做出正確判斷', s: '追蹤', sl: '開始' },
  ];

  return (
    <motion.div variants={containers} initial="hidden" animate="show" className="space-y-4">
      {/* Hero */}
      <motion.div variants={itemV} className="text-center pt-4 pb-2">
        <div className="inline-flex items-center gap-2 mb-2">
          <Footprints size={32} className="text-cyan" />
          <h1 className="text-3xl font-heading font-bold text-ice tracking-wide">SKW 追蹤符號</h1>
        </div>
        <p className="text-steel-light text-sm leading-relaxed max-w-xs mx-auto">
          童軍追蹤訓練工具 — 觀察符號，跟隨指示，沿路追尋
        </p>
      </motion.div>

      {/* Stats bar */}
      <motion.div variants={itemV} className="flex items-center justify-center gap-6 py-3 px-6 bg-navy-800/50 rounded-2xl border border-cyan/5">
        {[{ value: '10', label: '官方符號' }, { value: '4', label: '符號類別' }, { value: '沿路', label: '追蹤模式' }].map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-lg font-heading font-bold text-ice">{s.value}</div>
            <div className="text-[10px] text-steel">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Cards */}
      <motion.div variants={itemV} className="space-y-3">
        {cards.map(c => {
          const cl = colorMap[c.color];
          return (
            <button key={c.to} onClick={() => nav(c.to)}
              className={`w-full bg-gradient-to-r ${c.g} ${c.b} border rounded-2xl p-4 flex items-center gap-4 text-left card-hover ${cl.box}`}>
              <div className={`w-12 h-12 rounded-xl ${cl.bg} flex items-center justify-center shrink-0`}><c.icon size={22} className={cl.text} /></div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-heading font-semibold text-base ${cl.text} ${cl.glow}`}>{c.t}</h3>
                <p className="text-steel text-xs mt-0.5 leading-relaxed">{c.d}</p>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xl font-heading font-bold ${cl.text}`}>{c.s}</div>
                <div className="text-[10px] text-steel">{c.sl}</div>
              </div>
            </button>
          );
        })}
      </motion.div>

      <motion.p variants={itemV} className="text-center text-[10px] text-steel pt-2 pb-4">
        © 2026 SKW SCOUT · 童軍追蹤符號訓練工具
      </motion.p>
    </motion.div>
  );
};

export default HomePage;