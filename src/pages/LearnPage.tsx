import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, AlertTriangle, Info, Flag, CornerUpLeft } from 'lucide-react';
import SignSVG from '../components/SignSVG';
import { trackingSigns, getSignsByCategory } from '../data/trackingSigns';

const categoryLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  direction: { label: '方向指示', icon: <ArrowRight size={14} />, color: 'text-cyan bg-cyan/10 border-cyan/20' },
  warning: { label: '警告標記', icon: <AlertTriangle size={14} />, color: 'text-red bg-red/10 border-red/20' },
  info: { label: '資訊提示', icon: <Info size={14} />, color: 'text-gold bg-gold/10 border-gold/20' },
  end: { label: '結束標記', icon: <Flag size={14} />, color: 'text-green bg-green/10 border-green/20' },
};

const LearnPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let signs = trackingSigns;
    if (activeCat) {
      signs = getSignsByCategory(activeCat as 'direction' | 'warning' | 'info' | 'end');
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      signs = signs.filter(s =>
        s.nameZh.includes(q) || s.nameEn.toLowerCase().includes(q) || s.description.includes(q)
      );
    }
    return signs;
  }, [query, activeCat]);

  const categories = ['direction', 'warning', 'info', 'end'] as const;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-heading font-bold text-ice">符號圖鑑</h1>
        <span className="text-xs text-steel bg-navy-800 px-2 py-0.5 rounded-full">
          {trackingSigns.length} 種符號
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜尋符號名稱..."
          className="w-full pl-9 pr-4 py-2.5 bg-navy-800/70 rounded-xl border border-cyan/8 text-sm text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30 transition-colors"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-ice">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <button
          onClick={() => setActiveCat(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-heading font-medium transition-all ${
            activeCat === null
              ? 'bg-ice/10 text-ice border border-ice/20'
              : 'bg-navy-800 text-steel border border-transparent'
          }`}
        >
          全部
        </button>
        {categories.map(cat => {
          const cl = categoryLabels[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(activeCat === cat ? null : cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-heading font-medium border transition-all flex items-center gap-1.5 ${
                activeCat === cat ? cl.color : 'bg-navy-800 text-steel border-transparent'
              }`}
            >
              {cl.icon}
              {cl.label}
            </button>
          );
        })}
      </div>

      {/* Sign Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {filtered.map((sign, i) => (
          <motion.button
            key={sign.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setSelected(selected === sign.id ? null : sign.id)}
            className={`bg-navy-800/60 rounded-xl p-3 border text-left card-hover transition-all ${
              selected === sign.id
                ? 'border-cyan/30 box-glow-cyan'
                : 'border-cyan/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <SignSVG signId={sign.id} size={44} glow={false} />
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-sm text-ice truncate">{sign.nameZh}</h3>
                <p className="text-[10px] text-steel">{sign.nameEn}</p>
              </div>
            </div>
            {sign.isWarning && (
              <span className="inline-block text-[9px] text-red bg-red/10 px-1.5 py-0.5 rounded">
                警告
              </span>
            )}
          </motion.button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-10 text-steel text-sm">
            找不到相關符號
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected !== null && (() => {
          const sign = trackingSigns.find(s => s.id === selected);
          if (!sign) return null;
          const cl = categoryLabels[sign.category];
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
              onClick={() => setSelected(null)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="relative bg-navy-900 rounded-3xl border border-cyan/20 p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto box-glow-cyan"
              >
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-3 right-3 p-2 text-steel hover:text-ice transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center mb-4">
                  <SignSVG signId={sign.id} size={120} className="mb-3" />
                  <h2 className="text-xl font-heading font-bold text-ice glow-cyan">{sign.nameZh}</h2>
                  <p className="text-steel text-sm">{sign.nameEn}</p>
                  <span className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${cl.color}`}>
                    {cl.icon}
                    {cl.label}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="bg-navy-800/70 rounded-xl p-3 border border-cyan/5">
                    <p className="text-steel-light leading-relaxed">{sign.description}</p>
                  </div>
                  <div className="bg-cyan/5 rounded-xl p-3 border border-cyan/10">
                    <p className="text-cyan text-xs font-heading font-semibold mb-1">看到此符號時：</p>
                    <p className="text-ice leading-relaxed">{sign.action}</p>
                  </div>
                  {sign.isWarning && (
                    <div className="bg-red/5 rounded-xl p-3 border border-red/10 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-red mt-0.5 shrink-0" />
                      <p className="text-red text-xs leading-relaxed">這是警告符號 — 看到後應立即採取相應行動，確保安全。</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="w-full mt-4 py-2.5 bg-cyan/10 text-cyan border border-cyan/20 rounded-xl font-heading font-semibold text-sm"
                >
                  關閉
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <p className="text-center text-[9px] text-steel pt-3 tracking-widest">COPYRIGHT © 2026 SCOUT SYSTEM</p>
    </div>
  );
};

export default LearnPage;