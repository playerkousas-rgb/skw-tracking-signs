import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Share2, Check, Footprints, ArrowRight } from 'lucide-react';
import { getAllTrails, deleteTrail, encodeTrail, Trail } from '../lib/trailStore';
import SignSVG from '../components/SignSVG';
import { getSignById } from '../data/trackingSigns';

const LeaderPage: React.FC = () => {
  const nav = useNavigate();
  const [trails, setTrails] = useState<Trail[]>(getAllTrails());
  const [copiedId, setCopiedId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = () => setTrails(getAllTrails());

  const handleDelete = (id: string) => { deleteTrail(id); refresh(); setConfirmDelete(null); };

  const handleCopy = async (trail: Trail) => {
    const code = encodeTrail(trail);
    try { await navigator.clipboard.writeText(code); } catch {
      const ta = document.createElement('textarea'); ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopiedId(trail.id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-heading font-bold text-ice">設計路線</h1>
        <span className="text-xs text-steel bg-navy-800 px-2 py-0.5 rounded-full">{trails.length} 條</span>
      </div>
      <p className="text-xs text-steel -mt-2 mb-1">設定符號順序 + 箭頭方向 + 隱藏信物，分享給隊員沿途追蹤</p>

      <button onClick={() => nav('/leader/create')}
        className="w-full bg-gradient-to-r from-green-dark to-navy-800 text-ice rounded-2xl p-4 flex items-center gap-4 border border-green/20 box-glow-green card-hover">
        <div className="w-12 h-12 rounded-xl bg-green/10 flex items-center justify-center"><Plus size={22} className="text-green" /></div>
        <div className="flex-1 text-left">
          <h3 className="font-heading font-semibold text-base text-green glow-green">建立新路線</h3>
          <p className="text-steel text-xs">自訂符號順序、箭頭方向、隱藏信物</p>
        </div>
        <ArrowRight size={20} className="text-green" />
      </button>

      <h2 className="font-heading font-semibold text-sm text-ice-dim pt-2">已建立路線</h2>

      {trails.length === 0 ? (
        <div className="text-center py-10">
          <Footprints size={40} className="text-steel mx-auto mb-3 opacity-50" />
          <p className="text-steel text-sm">尚未建立任何路線</p>
          <p className="text-steel text-xs mt-1">點擊上方按鈕建立第一條追蹤路線</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trails.map((trail, i) => (
            <motion.div key={trail.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-navy-800/60 rounded-2xl border border-cyan/8 overflow-hidden">
              <div className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center shrink-0"><Footprints size={18} className="text-cyan" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-sm text-ice truncate">{trail.name}</h3>
                  <p className="text-[10px] text-steel">{trail.steps.length} 個符號 · {trail.id}</p>
                </div>
              </div>
              {/* Steps preview */}
              <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto">
                {trail.steps.map((step, j) => {
                  const s = getSignById(step.signId);
                  const dirArrow = step.direction === 'left' ? '←' : step.direction === 'right' ? '→' : step.direction === 'forward' ? '↑' : '';
                  return (
                    <React.Fragment key={j}>
                      {j > 0 && <ArrowRight size={10} className="text-steel shrink-0" />}
                      <div className="shrink-0 flex flex-col items-center">
                        <SignSVG signId={step.signId} size={28} glow={false} />
                        <span className="text-[7px] text-steel mt-0.5 text-center leading-tight">
                          {dirArrow}{s?.nameZh}
                          {step.paces != null && step.paces > 0 ? ` ${step.paces}步` : ''}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="flex border-t border-cyan/5">
                <button onClick={() => handleCopy(trail)}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-heading font-medium transition-colors ${copiedId === trail.id ? 'text-green bg-green/5' : 'text-cyan hover:bg-cyan/5'}`}>
                  {copiedId === trail.id ? <Check size={14} /> : <Share2 size={14} />}{copiedId === trail.id ? '已複製' : '複製代碼'}
                </button>
                <button onClick={() => setConfirmDelete(trail.id)}
                  className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-heading font-medium text-red hover:bg-red/5 transition-colors">
                  <Trash2 size={14} />刪除
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="bg-navy-800/40 rounded-2xl p-4 border border-cyan/5 space-y-1.5">
        <h3 className="font-heading font-semibold text-xs text-ice-dim">📋 使用說明</h3>
        <ol className="text-[11px] text-steel space-y-0.5 list-decimal list-inside">
          <li>建立路線 → 按順序加入符號，設定箭頭方向及隱藏信物</li>
          <li>複製路線代碼，發送給隊員</li>
          <li>隊員沿途看到符號 → 判斷應做什麼 → 正確後揭露信物</li>
          <li>路線 <strong className="text-steel-light">72小時後自動清除</strong></li>
        </ol>
      </div>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-navy-900 rounded-2xl border border-red/20 p-5 w-full max-w-xs text-center">
              <Trash2 size={28} className="text-red mx-auto mb-3" />
              <h3 className="font-heading font-bold text-ice text-base mb-1">確認刪除</h3>
              <p className="text-steel text-sm mb-4">此操作無法還原</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 bg-navy-800 text-steel rounded-xl font-heading font-semibold text-sm">取消</button>
                <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 bg-red/10 text-red border border-red/20 rounded-xl font-heading font-semibold text-sm">確認刪除</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaderPage;