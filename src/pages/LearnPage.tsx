import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUp, ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import SignSVG from '../components/SignSVG';
import { trackingSigns, getSignById, TrackingSign } from '../data/trackingSigns';
import { Chip, Empty, PageHeader, Sheet } from '../components/ui';

const CATS: { key: 'all' | TrackingSign['category']; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'direction', label: '方向' },
  { key: 'warning', label: '警告' },
  { key: 'info', label: '資訊' },
  { key: 'end', label: '結束' },
];

const catTone: Record<TrackingSign['category'], string> = {
  direction: 'border-forest/25 bg-forest/8 text-forest',
  warning: 'border-clay/30 bg-clay/8 text-clay-2',
  info: 'border-gold/30 bg-gold/8 text-gold',
  end: 'border-ink/20 bg-ink/5 text-ink-2',
};

const LearnPage: React.FC = () => {
  const [cat, setCat] = useState<'all' | TrackingSign['category']>('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const list = useMemo(() => {
    const key = q.trim().toLowerCase();
    return trackingSigns.filter(s => {
      const inCat = cat === 'all' || s.category === cat;
      const inQ = !key || s.nameZh.includes(key) || s.nameEn.toLowerCase().includes(key) || s.action.includes(key);
      return inCat && inQ;
    });
  }, [cat, q]);

  const active = openId != null ? getSignById(openId) : null;

  return (
    <div className="space-y-3.5 pb-4">
      <PageHeader
        kicker="FIELD GUIDE"
        title="追蹤符號圖鑑"
        sub="十種童軍標準記號 — 每一種都有一個「正確應對」，唔止係睇得明。"
        right={
          <span className="shrink-0 mt-1 flex items-center gap-1 text-[10px] text-ink-3 border border-ink/15 rounded-full px-2 py-1">
            <BookOpen size={11} /> {trackingSigns.length}
          </span>
        }
      />

      <div className="flex items-center gap-2 rounded-2xl border border-ink/15 bg-[#faf3e3]/80 px-3 h-11">
        <Search size={15} className="text-ink-4 shrink-0" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="搜尋符號、意思或應對動作…"
          className="flex-1 bg-transparent outline-none text-[12px] placeholder:text-ink-4 text-ink"
        />
        {q && (
          <button onClick={() => setQ('')} className="text-[10px] text-ink-4 px-1">清除</button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-0.5">
        {CATS.map(c => (
          <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>
            {c.label}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty icon={<Search size={20} />} title="搵唔到相關符號" sub="試下其他關鍵字，或者切換分類。" />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {list.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.035, 0.28) }}
              onClick={() => setOpenId(s.id)}
              className="press card px-2.5 pt-3 pb-2.5 flex flex-col items-center text-left relative overflow-hidden"
            >
              <span className={`absolute right-2 top-2 font-mono text-[8px] px-1 py-0.5 rounded border ${catTone[s.category]}`}>
                {s.id.toString().padStart(2, '0')}
              </span>
              <SignSVG signId={s.id} size={74} glow={false} />
              <p className="text-[12px] font-medium text-ink mt-1.5">{s.nameZh}</p>
              <p className="text-[9px] text-ink-4 font-mono tracking-wide">{s.nameEn}</p>
              <p className="text-[9.5px] text-ink-3 mt-1 leading-snug line-clamp-2 text-center">{s.action}</p>
            </motion.button>
          ))}
        </div>
      )}

      <Sheet open={!!active} onClose={() => setOpenId(null)} title={active?.nameZh}>
        {active && (
          <div className="space-y-4">
            <div className="relative flex items-center justify-center rounded-2xl border border-ink/12 bg-[#efe4cd] py-5 overflow-hidden">
              <div className="absolute inset-0 opacity-40"
                style={{ backgroundImage: 'radial-gradient(circle at 30% 60%, rgba(120,95,60,.25) 0 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <SignSVG signId={active.id} size={150} glow />
            </div>

            <div className="flex items-center gap-2">
              <span className={`font-mono text-[9px] px-2 py-1 rounded border ${catTone[active.category]}`}>
                {CATS.find(c => c.key === active.category)?.label}
              </span>
              <span className="text-[10px] text-ink-4 font-mono tracking-wide">{active.nameEn}</span>
              {active.isWarning && <span className="text-[9px] text-clay-2 border border-clay/30 rounded px-1.5 py-0.5">警告</span>}
            </div>

            <div>
              <p className="stamp text-ink-4 mb-1">意思</p>
              <p className="text-[12px] text-ink-2 leading-relaxed">{active.description}</p>
            </div>

            <div className="rounded-xl border border-ink/15 bg-[#efe4cd]/70 p-3">
              <p className="stamp text-clay mb-1">實物畫法</p>
              <p className="text-[12px] text-ink-2 leading-relaxed">{active.layout}</p>
            </div>

            <div className="rounded-xl border border-forest/25 bg-forest/6 p-3">
              <p className="stamp text-forest mb-1">正確應對</p>
              <p className="text-[12.5px] text-forest-2 font-medium leading-relaxed">{active.action}</p>
            </div>

            {(active.needsDirection || active.needsPaces) && (
              <div className="rounded-xl border border-ink/12 bg-paper-2/50 p-3">
                <p className="stamp text-ink-4 mb-1.5">放置時要設定</p>
                <div className="flex gap-2">
                  {active.needsDirection && (
                    <span className="flex items-center gap-1 text-[10px] text-ink-2 border border-ink/15 rounded-full px-2 py-1">
                      <ArrowLeft size={10} /><ArrowUp size={10} /><ArrowRight size={10} /> 箭頭方向
                    </span>
                  )}
                  {active.needsPaces && (
                    <span className="text-[10px] text-ink-2 border border-ink/15 rounded-full px-2 py-1">步數 1–20</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
};

export default LearnPage;
