import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Check, X, Navigation, Crosshair, AlertTriangle, Lock } from 'lucide-react';
import SignSVG from '../components/SignSVG';
import { trackingSigns } from '../data/trackingSigns';
import { saveGame, genId, getGameById, getPos, GameConfig, TrailPoint } from '../lib/gameStore';

const LC: React.FC = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const eid = sp.get('edit');
  const ex = eid ? getGameById(eid) : null;

  const [name, setName] = useState(ex?.name || '');
  const [password, setPassword] = useState(ex?.password || '');   // 新增
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
    if (!name.trim() || trail.length < 2 || !password.trim()) return;   // 新增密碼檢查

    const g: GameConfig = {
      id: ex?.id || genId(),
      name: name.trim(),
      password: password.trim(),        // ← 加入密碼
      trail,
      createdAt: ex?.createdAt || Date.now(),
    };

    saveGame(g);
    nav('/leader');
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] grid-bg">
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

            {/* 新增：頻道密碼 */}
            <div>
              <label className="block text-ice text-xs font-medium mb-1.5 flex items-center gap-2">
                <Lock size={14} /> 頻道密碼
              </label>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="領袖自訂密碼（例如：SKW2026）"
                className="w-full px-4 py-3 bg-navy-800 rounded-xl border border-cyan/10 text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30"
              />
              <p className="text-steel text-[10px] mt-1.5">
                成員必須輸入此密碼才能加入路線，防止直接看答案
              </p>
            </div>

            {/* 追蹤路線列表 */}
            <div>
              <label className="text-ice text-xs font-medium mb-1.5">
                追蹤路線 <span className="text-steel">({trail.length}個)</span>
              </label>
              {trail.length > 0 ? (
                <div className="bg-navy-800/70 rounded-xl border border-cyan/8 p-3 space-y-1.5">
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
                          className="text-steel hover:text-red"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-navy-800/40 rounded-xl border border-dashed border-steel/30 p-6 text-center text-steel text-sm">
                  尚未投放
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('drop')}
              className="w-full py-3 bg-cyan-dark text-cyan rounded-xl font-heading font-semibold border border-cyan/20"
            >
              開始投放
            </button>

            <button
              onClick={save}
              disabled={!name.trim() || trail.length < 2 || !password.trim()}
              className={`w-full py-4 rounded-2xl font-heading font-bold text-lg flex items-center justify-center gap-2 
                ${name.trim() && trail.length >= 2 && password.trim()
                  ? 'bg-gradient-to-r from-cyan/20 to-green/10 text-cyan border border-cyan/30 box-glow-cyan'
                  : 'bg-navy-800 text-steel/30 cursor-not-allowed border border-steel/10'
                }`}
            >
              <Check size={20} /> 儲存路線
            </button>

            {name.trim() && trail.length >= 2 && password.trim() && (
              <p className="text-center text-steel/40 text-[10px] mt-2">
                路線將於 48 小時後自動刪除
              </p>
            )}
          </motion.div>
        ) : (
          // ... 投放符號的部分保持不變（下面省略以節省空間，你可以直接保留原本的 drop step 程式碼）
          <motion.div key="d" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="px-5 py-5">
            {/* 你原本的投放符號內容全部貼在這裡，不需要改動 */}
            {/* ...（保持原樣）... */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* pacesModal 部分也保持不變 */}
      <AnimatePresence>
        {pacesModal && (
          // ... 你原本的 pacesModal 程式碼 ...
        )}
      </AnimatePresence>
    </div>
  );
};

export default LC;
