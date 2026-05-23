import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, Trophy, Footprints, Map as MapIcon, Navigation, Gift } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import SignSVG from '../components/SignSVG';
import Confetti from '../components/Confetti';
import { getTrailById, saveResult, watchPosition, clearWatch } from '../lib/trailStore';
import { getSignById, trackingSigns } from '../data/trackingSigns';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const safetyIcon: L.DivIcon = (() => {
  const el = document.createElement('div');
  el.innerHTML = '<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#00ff88;border:3px solid white;box-shadow:0 0 16px rgba(0,255,136,0.55);font-family:Fredoka,sans-serif;font-size:11px;font-weight:800;color:#02133E;">SAFE</div>';
  return L.divIcon({ html: el.innerHTML, className: '', iconSize: [34, 34], iconAnchor: [17, 17] });
})();

const meIcon: L.DivIcon = (() => {
  const el = document.createElement('div');
  el.innerHTML = '<div style="width:18px;height:18px;border-radius:50%;background:#00ff88;border:3px solid white;box-shadow:0 0 14px rgba(0,255,136,0.6);"></div>';
  return L.divIcon({ html: el.innerHTML, className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
})();

const RecenterMap: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
};

const TrailWalkPage: React.FC = () => {
  const nav = useNavigate();
  const { trailId } = useParams<{ trailId: string }>();
  const [sp] = useSearchParams();
  const playerName = sp.get('name') || '隊員';

  const trail = trailId ? getTrailById(trailId) : undefined;

  const [step, setStep] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<{ signId: number; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [mapOpen, setMapOpen] = useState(true); // 預設開地圖，隊員不會迷路
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const watchRef = useRef(-1);

  useEffect(() => {
    watchRef.current = watchPosition(
      (lat, lng) => { setMyLat(lat); setMyLng(lng); },
      () => {}
    );
    return () => clearWatch(watchRef.current);
  }, []);

  // 每步動畫
  useEffect(() => {
    if (!trail) return;
    setRevealed(false); setShowOptions(false); setSelected(null); setIsCorrect(null); setShowHidden(false);
    const t1 = setTimeout(() => setRevealed(true), 400);
    const t2 = setTimeout(() => setShowOptions(true), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [step, trail]);

  const options = useMemo(() => {
    if (!trail) return [];
    const sign = getSignById(trail.steps[step]?.signId);
    if (!sign) return [];
    const correct = sign.action;
    const wrongs = trackingSigns.filter(s => s.id !== sign.id).sort(() => Math.random() - 0.5).slice(0, 3).map(s => s.action);
    return [...wrongs, correct].sort(() => Math.random() - 0.5).map(a => ({ text: a, isCorrect: a === correct }));
  }, [trail, step]);

  const handlePick = (action: string, correct: boolean) => {
    if (selected !== null) return;
    setSelected(action); setIsCorrect(correct);
    setAnswers(prev => [...prev, { signId: trail!.steps[step].signId, correct }]);
    try { navigator.vibrate?.(correct ? [50] : [150, 80, 150]); } catch {}
    if (correct && trail?.steps[step]?.hiddenContent) {
      setTimeout(() => setShowHidden(true), 800);
    }
  };

  const handleNext = () => {
    if (!trail) return;
    if (step + 1 >= trail.steps.length) {
      const c = answers.filter(a => a.correct).length;
      saveResult({ playerName, trailId: trail.id, answers, totalSteps: trail.steps.length, correctSteps: c, completedAt: Date.now() });
      setDone(true);
      if (c === trail.steps.length) { setConfetti(true); setTimeout(() => setConfetti(false), 4000); }
    } else {
      setStep(prev => prev + 1);
    }
  };

  // ── 找不到路線 ──
  if (!trail) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#02133E' }}>
      <div className="text-center p-6">
        <Footprints size={48} className="text-steel mx-auto mb-4 opacity-40" />
        <h1 className="text-xl font-heading font-bold text-ice mb-2">找不到路線</h1>
        <p className="text-steel text-sm mb-4">路線可能已過期或代碼無效</p>
        <button onClick={() => nav('/player')} className="px-6 py-3 bg-cyan/10 text-cyan border border-cyan/20 rounded-xl font-heading font-semibold">返回輸入代碼</button>
      </div>
    </div>
  );

  // ── 完成 ──
  if (done) {
    const c = answers.filter(a => a.correct).length;
    const allOk = c === trail.steps.length;
    const pct = Math.round((c / trail.steps.length) * 100);
    const finalContent = trail.steps[trail.steps.length - 1]?.hiddenContent;
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#02133E' }}>
        {confetti && <Confetti pieces={50} />}
        <div className="text-center p-6 w-full max-w-sm">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
            {allOk ? <Trophy size={64} className="text-gold mx-auto mb-3" /> : <Footprints size={48} className="text-cyan mx-auto mb-3" />}
          </motion.div>
          <h1 className="text-2xl font-heading font-bold text-ice mb-1">{allOk ? '追蹤完成！' : '路線結束'}</h1>
          <p className="text-steel text-sm mb-2">{playerName}，你已完成「{trail.name}」</p>
          {finalContent && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="mb-4 p-4 bg-gold/5 border border-gold/20 rounded-2xl">
              <Gift size={20} className="text-gold mx-auto mb-1.5" />
              <p className="text-gold font-heading text-sm font-semibold">🎁 最終信物</p>
              <p className="text-ice text-sm mt-1 leading-relaxed">{finalContent}</p>
            </motion.div>
          )}
          <div className="relative w-28 h-28 mx-auto mb-4">
            <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#0d1f3c" strokeWidth="8" />
              <motion.circle cx="60" cy="60" r="52" fill="none"
                stroke={allOk ? '#00ff88' : pct >= 50 ? '#ffd700' : '#ff3366'} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - pct / 100) }}
                transition={{ duration: 1.2, delay: 0.3 }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-heading font-bold ${allOk ? 'text-green' : pct >= 50 ? 'text-gold' : 'text-red'}`}>{c}/{trail.steps.length}</span>
              <span className="text-[10px] text-steel">{pct}%</span>
            </div>
          </div>
          <div className="space-y-2 w-full">
            <button onClick={() => nav('/player')} className="w-full py-3 bg-cyan/10 text-cyan rounded-xl font-heading font-semibold border border-cyan/20 card-hover">追蹤其他路線</button>
            <button onClick={() => nav('/')} className="w-full py-3 bg-navy-800 text-steel rounded-xl font-heading font-semibold border border-steel/10 card-hover">返回首頁</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 追蹤中 ──
  const sign = getSignById(trail.steps[step]?.signId);
  const curStep = trail.steps[step];
  const prog = ((step + (selected !== null ? 1 : 0)) / trail.steps.length) * 100;
  const safetyCoord = trail.safetyLat != null && trail.safetyLng != null
    ? ([trail.safetyLat, trail.safetyLng] as [number, number])
    : null;
  const mapCenter: [number, number] = myLat != null && myLng != null
    ? [myLat, myLng]
    : safetyCoord || [22.3193, 114.1694];

  const dirLabel = curStep?.direction === 'left' ? '箭頭指向左方' :
    curStep?.direction === 'right' ? '箭頭指向右方' :
    curStep?.direction === 'forward' ? '箭頭指向前方' : '';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#02133E' }}>
      {/* ── 頂欄 ── */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <button onClick={() => { if (window.confirm('確定退出？進度不會保存。')) nav('/player'); }}
          className="text-steel text-xs hover:text-ice shrink-0">← 退出</button>
        <div className="flex-1 h-1 bg-navy-800 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-cyan to-green rounded-full"
            initial={{ width: 0 }} animate={{ width: `${prog}%` }} transition={{ duration: 0.5 }} />
        </div>
        <span className="text-[10px] text-steel font-mono shrink-0">{step + 1}/{trail.steps.length}</span>
        <button onClick={() => setMapOpen(!mapOpen)}
          className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-heading font-bold flex items-center gap-1 transition-all ${mapOpen ? 'bg-cyan text-navy-950' : 'bg-navy-800 text-steel border border-cyan/10'}`}>
          <MapIcon size={11} />{mapOpen ? '收地圖' : '地圖'}
        </button>
      </div>

      {/* ── 防迷路地圖（預設展開，不顯示符號位置） ── */}
      <AnimatePresence>
        {mapOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 170, opacity: 1, marginBottom: 10 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="relative mx-4 rounded-2xl overflow-hidden border border-cyan/10"
            >
              <MapContainer
                center={mapCenter}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                {myLat != null && myLng != null && <RecenterMap lat={myLat} lng={myLng} />}
                {myLat != null && myLng != null && (
                  <Marker position={[myLat, myLng]} icon={meIcon} />
                )}
                {safetyCoord && <Marker position={safetyCoord} icon={safetyIcon} />}
              </MapContainer>
              {/* GPS indicator */}
              {myLat != null ? (
                <div className="absolute bottom-1.5 left-1.5 bg-navy-950/80 backdrop-blur rounded-full px-2 py-0.5 text-[9px] text-green flex items-center gap-1 z-[1000]">
                  <Navigation size={9} />● 你在這裡
                </div>
              ) : (
                <div className="absolute bottom-1.5 left-1.5 bg-navy-950/80 backdrop-blur rounded-full px-2 py-0.5 text-[9px] text-steel flex items-center gap-1 z-[1000]">
                  <Navigation size={9} />等待GPS...
                </div>
              )}
              {/* Safety label */}
              <div className="absolute top-1.5 right-1.5 bg-navy-950/80 backdrop-blur rounded-full px-2 py-0.5 text-[9px] text-cyan z-[1000]">
                防迷路地圖 · 不顯示符號位置
              </div>
              {safetyCoord && trail.safetyNote && (
                <div className="absolute top-7 right-1.5 max-w-[70%] bg-navy-950/80 backdrop-blur rounded-xl px-2 py-1 text-[9px] text-green z-[1000] text-right">
                  SAFE：{trail.safetyNote}
                </div>
              )}
            </motion.div>
        )}
      </AnimatePresence>

      {/* ── 主畫面 ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div key="looking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }}>
                <Footprints size={40} className="text-cyan mx-auto mb-3" />
              </motion.div>
              <p className="text-steel text-sm animate-blink">觀察前方地面...</p>
              {!mapOpen && (
                <p className="text-[10px] text-steel mt-2">💡 按上方「地圖」查看你的位置；地圖不會標出符號。</p>
              )}
            </motion.div>
          ) : (
            <motion.div key={`sign-${step}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm flex flex-col items-center">
              {/* 符號 */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                className="mb-3 relative"
              >
                <div className="absolute inset-0 rounded-full bg-navy-900/80 blur-xl" />
                <SignSVG signId={sign?.id ?? 1} size={150} className="relative z-10" direction={curStep.direction} />
              </motion.div>

              {/* 標籤 */}
              <div className={`px-3 py-1 rounded-full text-xs font-heading font-medium mb-2 ${sign?.isWarning ? 'bg-red/10 text-red border border-red/20' : 'bg-cyan/10 text-cyan border border-cyan/20'}`}>
                第 {step + 1} 個符號{sign?.isWarning && ' · ⚠️'}
              </div>

              {dirLabel && (
                <div className="mb-1.5 px-3 py-1 bg-cyan/5 border border-cyan/10 rounded-full text-[10px] text-cyan font-heading">
                  🏹 {dirLabel}
                </div>
              )}

              {curStep.paces != null && curStep.paces > 0 && (
                <div className="mb-1.5 px-3 py-1 bg-gold/5 border border-gold/10 rounded-full text-[10px] text-gold font-heading">
                  👣 需走 {curStep.paces} 步
                </div>
              )}

              <h2 className="text-ice font-heading font-bold text-lg text-center mb-1">你發現了什麼？</h2>
              <p className="text-steel text-xs text-center mb-4">觀察符號，選擇正確的應對行動</p>

              {/* 選項 */}
              {showOptions && (
                <div className="w-full space-y-2">
                  {options.map((opt, i) => {
                    let cls = 'bg-navy-800/80 border-cyan/8 text-ice hover:border-cyan/30';
                    if (selected !== null) {
                      if (opt.isCorrect) cls = 'bg-green/10 border-green/40 text-green';
                      else if (opt.text === selected && !opt.isCorrect) cls = 'bg-red/10 border-red/40 text-red opacity-60';
                      else cls = 'bg-navy-800/30 border-steel/5 text-steel/30';
                    }
                    return (
                      <motion.button key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }} onClick={() => handlePick(opt.text, opt.isCorrect)} disabled={selected !== null}
                        className={`w-full p-3.5 rounded-2xl border text-left transition-all font-heading font-semibold text-sm flex items-center gap-3 ${cls}`}>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${selected !== null && opt.isCorrect ? 'bg-green/20 text-green' : selected === opt.text && !opt.isCorrect ? 'bg-red/20 text-red' : 'bg-cyan/10 text-cyan'}`}>{String.fromCharCode(65 + i)}</span>
                        <span className="flex-1">{opt.text}</span>
                        {selected !== null && opt.isCorrect && <CheckCircle size={18} className="text-green shrink-0" />}
                        {selected === opt.text && !opt.isCorrect && <XCircle size={18} className="text-red shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* 結果 */}
              {isCorrect !== null && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="w-full mt-4">
                  {isCorrect ? (
                    <div className="p-4 bg-green/5 border border-green/20 rounded-2xl text-center">
                      <CheckCircle size={28} className="text-green mx-auto mb-1.5" />
                      <p className="text-green font-heading font-semibold text-sm">正確！</p>
                      <p className="text-steel text-xs mt-0.5">{sign?.action}</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-red/5 border border-red/20 rounded-2xl text-center">
                      <XCircle size={28} className="text-red mx-auto mb-1.5" />
                      <p className="text-red font-heading font-semibold text-sm">不對哦</p>
                      <p className="text-steel text-xs mt-0.5">正確行動：{sign?.action}</p>
                    </div>
                  )}

                  {/* 信物 */}
                  <AnimatePresence>
                    {showHidden && curStep.hiddenContent && (
                      <motion.div initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="mt-3 p-4 bg-gold/5 border border-gold/20 rounded-2xl text-center">
                        <Gift size={22} className="text-gold mx-auto mb-1.5" />
                        <p className="text-gold font-heading text-xs font-semibold mb-1">📦 找到信物！</p>
                        <p className="text-ice text-sm leading-relaxed">{curStep.hiddenContent}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button onClick={handleNext}
                    className="w-full mt-3 py-3.5 bg-cyan/10 text-cyan rounded-xl font-heading font-bold text-base border border-cyan/20 card-hover flex items-center justify-center gap-2">
                    {step + 1 >= trail.steps.length ? <>查看成績 <Trophy size={18} /></> : <>繼續前進 <ArrowRight size={18} /></>}
                  </button>
                </motion.div>
              )}

              {selected === null && (
                <p className="mt-3 text-[10px] text-steel">路線：{trail.name} · {playerName}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TrailWalkPage;