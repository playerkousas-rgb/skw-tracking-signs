import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Check, X, Navigation, Crosshair, AlertTriangle, Lock, Loader2, Plus } from 'lucide-react';
import SignSVG from '../components/SignSVG';
import { trackingSigns } from '../data/trackingSigns';
import { saveGame, genId, getGameById, getPos, GameConfig, TrailPoint } from '../lib/gameStore';

const LC: React.FC = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const eid = sp.get('edit');
  const ex = eid ? getGameById(eid) : null;

  const [name, setName] = useState(ex?.name || '');
  const [password, setPassword] = useState(ex?.password || '');
  const [trail, setTrail] = useState<TrailPoint[]>(ex?.trail || []);
  const [step, setStep] = useState<'cfg' | 'drop'>('cfg');
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsErr, setGpsErr] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gpsUnstable, setGpsUnstable] = useState(false);
  const [pacesModal, setPacesModal] = useState<{ idx: number; val: number } | null>(null);

  const getGps = useCallback(async () => {
    setLoading(true);
    setGpsErr('');
    try {
      const p = await getPos();
      setPos(p);
      setGpsUnstable(p.accuracy > 15);
    } catch (e: unknown) {
      setGpsErr(e instanceof Error ? e.message : '定位失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'drop') getGps();
  }, [step, getGps]);

  const drop = (signId: number) => {
    if (!pos) return;
    const pt: TrailPoint = { signId, lat: pos.lat, lng: pos.lng, timestamp: Date.now() };
    if (signId === 9) {
      setPacesModal({ idx: trail.length, val: 6 });
      setTrail(p => [...p, { ...pt, paces: 6 }]);
    } else {
      setTrail(p => [...p, pt]);
    }
    setSelecting(false);
  };

  const setPaces = (val: number) => {
    if (!pacesModal) return;
    setTrail(p => {
      const n = [...p];
      n[pacesModal.idx] = { ...n[pacesModal.idx], paces: val };
      return n;
    });
    setPacesModal(null);
  };

  const save = () => {
    if (!name.trim() || trail.length < 2 || !password.trim()) return;

    const g: GameConfig = {
      id: ex?.id || genId(),
      name: name.trim(),
      password: password.trim(),
      trail,
      createdAt: ex?.createdAt || Date.now(),
    };

    saveGame(g);
    nav('/leader');
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] grid-bg text-ice">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-navy-950/90 backdrop-blur-xl border-b border-cyan/10">
        <div className="px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => (step === 'drop' ? setStep('cfg') : nav('/leader'))}
            className="p-2 -ml-2 rounded-xl text-steel hover:text-ice"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-heading font-bold text-lg text-ice">
            {step === 'cfg' ? '建立路線' : '投放符號'}
          </h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'cfg' ? (
          <motion.div
            key="c"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="px-5 py-5 space-y-5"
          >
            {/* 路線名稱 */}
            <div>
              <label className="block text-ice text-xs font-medium mb-1.5">路線名稱</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：公園夜間追蹤"
                className="w-full px-4 py-3 bg-navy-800 rounded-xl border border-cyan/10 text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30"
              />
            </div>

            {/* 頻道密碼 */}
            <div>
              <label className="block text-ice text-xs font-medium mb-1.5 flex items-center gap-2">
                <Lock size={14} /> 頻道密碼
              </label>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="領袖自訂密碼"
                className="w-full px-4 py-3 bg-navy-800 rounded-xl border border-cyan/10 text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30"
              />
            </div>

            {/* 追蹤路線列表 */}
            <div>
              <label className="text-ice text-xs font-medium mb-1.5 block">
                追蹤路線 <span className="text-steel">({trail.length}個)</span>
              </label>
              {trail.length > 0 ? (
                <div className="bg-navy-800/70 rounded-xl border border-cyan/10 p-3 space-y-1.5">
                  {trail.map((pt, i) => {
                    const s = trackingSigns.find(x => x.id === pt.signId);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-steel text-[10px] font-mono w-4">{i + 1}</span>
                        <div className="w-7 h-7 flex items-center justify-center">
                          <SignSVG signId={pt.signId} size={28} glow={false} />
                        </div>
                        <span className="text-ice text-xs flex-1">{s?.nameZh}</span>
                        {pt.paces && <span className="text-gold text-[10px] font-mono">{pt.paces}步</span>}
                        <button
                          onClick={() => setTrail(p => p.filter((_, j) => j !== i))}
                          className="text-steel hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-navy-800/40 rounded-xl border border-dashed border-steel/30 p-6 text-center text-steel text-sm">
                  尚未投放任何符號
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('drop')}
              className="w-full py-3 bg-cyan/10 text-cyan rounded-xl font-heading font-semibold border border-cyan/20"
            >
              進入投放模式
            </button>

            <button
              onClick={save}
              disabled={!name.trim() || trail.length < 2 || !password.trim()}
              className={`w-full py-4 rounded-2xl font-heading font-bold text-lg flex items-center justify-center gap-2 
                ${name.trim() && trail.length >= 2 && password.trim()
                  ? 'bg-gradient-to-r from-cyan/20 to-blue/20 text-cyan border border-cyan/30'
                  : 'bg-navy-800 text-steel/30 cursor-not-allowed border border-steel/10'
                }`}
            >
              <Check size={20} /> 儲存並發布
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="d"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="px-5 py-5 space-y-6"
          >
            {/* GPS 狀態 */}
            <div className="bg-navy-800 rounded-2xl p-4 border border-cyan/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${pos ? (gpsUnstable ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-red-400'} animate-pulse`} />
                  <span className="text-xs font-medium text-ice">GPS 定位狀態</span>
                </div>
                <button onClick={getGps} disabled={loading} className="text-cyan text-xs flex items-center gap-1">
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Crosshair size={12} />}
                  重新校準
                </button>
              </div>

              {pos ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-navy-900/50 rounded-lg p-2">
                    <p className="text-[10px] text-steel">精確度</p>
                    <p className={`text-sm font-mono ${gpsUnstable ? 'text-amber-400' : 'text-emerald-400'}`}>± {pos.accuracy.toFixed(1)}m</p>
                  </div>
                  <div className="bg-navy-900/50 rounded-lg p-2">
                    <p className="text-[10px] text-steel">已標記點</p>
                    <p className="text-sm font-mono text-ice">{trail.length} 個位置</p>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-center text-red-400 text-xs flex items-center justify-center gap-2">
                  <AlertTriangle size={14} /> {gpsErr || '正在獲取定位...'}
                </div>
              )}
            </div>

            {/* 投放按鈕 */}
            <button
              onClick={() => setSelecting(true)}
              disabled={!pos || loading}
              className="w-full aspect-square max-h-[300px] rounded-3xl bg-navy-800 border-2 border-dashed border-cyan/20 flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-cyan/10 flex items-center justify-center text-cyan">
                <Plus size={32} />
              </div>
              <span className="text-ice font-bold">在此位置投放符號</span>
            </button>

            {/* 符號選擇 Modal */}
            <AnimatePresence>
              {selecting && (
                <motion.div 
                  initial={{ opacity: 0, y: 100 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 100 }}
                  className="fixed inset-0 z-50 bg-navy-950/95 p-6 overflow-y-auto"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-ice">選擇追蹤符號</h2>
                    <button onClick={() => setSelecting(false)} className="p-2 text-steel"><X /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {trackingSigns.map(s => (
                      <button
                        key={s.id}
                        onClick={() => drop(s.id)}
                        className="flex flex-col items-center gap-2 p-3 bg-navy-800 rounded-xl border border-cyan/5"
                      >
                        <SignSVG signId={s.id} size={40} />
                        <span className="text-[10px] text-steel">{s.nameZh}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paces Modal */}
      <AnimatePresence>
        {pacesModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-navy-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-navy-800 border border-cyan/20 rounded-2xl p-6 w-full max-w-xs text-center">
              <h3 className="text-ice font-bold mb-4">設定步數 (前進此路)</h3>
              <div className="flex items-center justify-center gap-6 mb-6">
                <button onClick={() => setPacesModal(p => p ? { ...p, val: Math.max(1, p.val - 1) } : null)} className="w-10 h-10 rounded-full bg-navy-700 text-ice">-</button>
                <span className="text-3xl font-mono text-gold">{pacesModal.val}</span>
                <button onClick={() => setPacesModal(p => p ? { ...p, val: p.val + 1 } : null)} className="w-10 h-10 rounded-full bg-navy-700 text-ice">+</button>
              </div>
              <button onClick={() => setPaces(pacesModal.val)} className="w-full py-3 bg-cyan text-navy-950 rounded-xl font-bold">確認</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LC;
