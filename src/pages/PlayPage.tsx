import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Crosshair, Trophy, Map as MapIcon, AlertTriangle, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';

import SignSVG from '../components/SignSVG';
import { getGameById, saveResult, getDist, watchPos, clearW, vibrate, GameConfig } from '../lib/gameStore';
import { getSignById, getWrongOptions, TrackingSign } from '../data/trackingSigns';

// --- 地圖組件：自動跟隨位置 ---
const RecenterMap = ({ pos }: { pos: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([pos.lat, pos.lng], map.getZoom());
  }, [pos, map]);
  return null;
};

// --- 自定義圖標：成員藍點 ---
const playerIcon = L.divIcon({
  html: renderToString(
    <div className="relative">
      <div className="absolute inset-0 w-4 h-4 bg-cyan rounded-full animate-ping opacity-75" />
      <div className="relative w-4 h-4 bg-cyan rounded-full border-2 border-white" />
    </div>
  ),
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// --- 自定義圖標：發現後的符號 ---
const createSignIcon = (signId: number) => L.divIcon({
  html: renderToString(
    <div className="p-1 bg-cyan/20 rounded-lg border-2 border-cyan shadow-lg animate-bounce">
      <SignSVG signId={signId} size={24} />
    </div>
  ),
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const R = 3; // 3米觸發半徑，野外實測最精準的距離

const Play: React.FC = () => {
  const nav = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const [sp] = useSearchParams();
  const pn = sp.get('name') || '隊員';
  
  const [game, setGame] = useState<GameConfig | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [idx, setIdx] = useState(0); // 當前發現的符號索引
  const [discovered, setDiscovered] = useState(false);
  const [sel, setSel] = useState<number | undefined>(undefined);
  const [showRes, setShowRes] = useState(false);
  const [opts, setOpts] = useState<TrackingSign[]>([]);
  const [ans, setAns] = useState<{ signId: number; correct: boolean }[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [flash, setFlash] = useState(false);
  const wRef = useRef(-1);

  // 初始化遊戲
  useEffect(() => { if (gameId) { const g = getGameById(gameId); if (g) setGame(g); } }, [gameId]);

  // 開啟 GPS 監控
  useEffect(() => {
    wRef.current = watchPos(
      (lat, lng, acc) => { setPos({ lat, lng, acc }); },
      e => console.error(e)
    );
    return () => clearW(wRef.current);
  }, []);

  // 核心全域感應邏輯
  useEffect(() => {
    if (!game || !pos || discovered) return;

    // 掃描地圖上所有點，只要靠近任何一個未完成的點就觸發
    for (let i = 0; i < game.trail.length; i++) {
      const node = game.trail[i];
      const d = getDist(pos.lat, pos.lng, node.lat, node.lng);

      if (d <= R) {
        // 檢查是否為重複觸發（如果不想重複做題可開啟此判斷）
        // const isDone = ans.some(a => a.signId === node.signId);
        // if (isDone) continue;

        setIdx(i);
        fireDiscover(i);
        break;
      }
    }
  }, [pos, game, discovered, ans]);

  const fireDiscover = useCallback((targetIdx: number) => {
    if (!game) return;
    const sign = getSignById(game.trail[targetIdx].signId); 
    if (!sign) return;
    
    setOpts([sign, ...getWrongOptions(sign, 3)].sort(() => Math.random() - .5));
    setDiscovered(true); 
    setSel(undefined); 
    setShowRes(false);
    
    // 發現時的手感反饋
    vibrate([100, 50, 100]);
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
  }, [game]);

  const pick = (sid: number) => {
    if (showRes || !game) return;
    const ok = sid === game.trail[idx].signId;
    setSel(sid); 
    setShowRes(true);
    setAns(p => [...p, { signId: game.trail[idx].signId, correct: ok }]);
    vibrate(ok ? [50] : [300]);
  };

  const next = () => {
    setDiscovered(false);
    // 如果全部點都跑過了，可以導向結果頁
    if (ans.length >= game!.trail.length) {
      const c = ans.filter(a => a.correct).length;
      saveResult({ playerName: pn, gameId: game!.id, answers: ans, totalScore: c * 100, completedAt: Date.now() });
      nav(`/result?score=${c * 100}&total=${game!.trail.length}&correct=${c}&name=${encodeURIComponent(pn)}`);
    }
  };

  if (!game) return <div className="min-h-screen bg-navy-950 flex items-center justify-center text-ice font-heading">頻道載入中...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-navy-950 relative overflow-hidden">
      {/* 閃光特效 */}
      <AnimatePresence>{flash && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] pointer-events-none bg-cyan/40" />)}</AnimatePresence>

      {/* 頂欄：精簡資訊 */}
      <div className="z-40 bg-navy-950/90 backdrop-blur-md border-b border-cyan/10 px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-ice text-xs font-bold truncate max-w-[150px]">{game.name}</h2>
          <div className="flex gap-1 mt-1">
            {game.trail.map((_, i) => (
              <div key={i} className={`w-2 h-1 rounded-full ${ans.length > i ? 'bg-cyan' : 'bg-navy-800'}`} />
            ))}
          </div>
        </div>
        <button onClick={() => setShowMap(!showMap)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${showMap ? 'bg-cyan text-navy-950' : 'bg-navy-800 text-steel border border-cyan/20'}`}>
          <MapIcon size={12} /> {showMap ? '隱藏地圖' : '查看定位'}
        </button>
      </div>

      {/* 迷霧地圖：只顯示自己 */}
      <AnimatePresence>
        {showMap && pos && (
          <motion.div initial={{ height: 0 }} animate={{ height: 260 }} exit={{ height: 0 }} className="relative z-30 overflow-hidden border-b border-cyan/20">
            <MapContainer center={[pos.lat, pos.lng]} zoom={18} zoomControl={false} className="h-full w-full leaflet-dark-mode">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <RecenterMap pos={pos} />
              <Marker position={[pos.lat, pos.lng]} icon={playerIcon} />
              {/* 只有在發現狀態下，才在地圖上短暫標出該點 */}
              {discovered && <Marker position={[game.trail[idx].lat, game.trail[idx].lng]} icon={createSignIcon(game.trail[idx].signId)} />}
            </MapContainer>
            <div className="absolute bottom-2 left-2 pointer-events-none">
              <div className="bg-navy-900/80 px-3 py-1 rounded-full border border-cyan/20 text-[10px] text-cyan font-mono animate-pulse">
                GPS 定位中 (±{Math.round(pos.acc)}m)
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主畫面：搜尋與互動 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {!discovered ? (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <div className="relative w-40 h-40 mx-auto mb-10">
                <div className="absolute inset-0 rounded-full border border-cyan/5" />
                <div className="absolute inset-0 animate-radar"><div className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-cyan/30 to-transparent origin-left" /></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20"><Navigation size={40} className="text-cyan" /></div>
              </div>
              <h1 className="text-2xl font-heading font-bold text-ice glow-cyan mb-2">觀察周圍環境</h1>
              <p className="text-steel text-sm max-w-[240px] mx-auto leading-relaxed">領袖已在此區域留下追蹤符號，請尋找地面、樹木或牆角的記號。</p>
            </motion.div>
          ) : (
            <motion.div key="find" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
              <div className="bg-navy-800/80 rounded-3xl border border-cyan/20 p-6 mb-6 box-glow-cyan text-center">
                <div className="text-green text-[10px] font-bold tracking-[0.2em] mb-4 uppercase">Signal Detected</div>
                <div className="flex justify-center mb-4"><SignSVG signId={game.trail[idx].signId} size={140} /></div>
                {game.trail[idx].paces && <div className="py-1 px-3 bg-gold/10 text-gold text-xs rounded-full inline-block border border-gold/20">此處需走 {game.trail[idx].paces} 步尋找信物</div>}
              </div>

              <div className="grid gap-2.5">
                {opts.map(o => {
                  const isCorrect = o.id === game.trail[idx].signId;
                  const isSelected = o.id === sel;
                  let btnStyle = "bg-navy-800/70 border-cyan/10 text-ice";
                  if (showRes) {
                    if (isCorrect) btnStyle = "bg-green/20 border-green/50 text-green";
                    else if (isSelected) btnStyle = "bg-red/20 border-red/50 text-red";
                    else btnStyle = "bg-navy-800/20 border-white/5 text-steel/20";
                  }
                  return (
                    <button key={o.id} onClick={() => pick(o.id)} disabled={showRes} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${btnStyle}`}>
                      <div className="w-10 h-10 bg-navy-950 rounded-xl flex items-center justify-center flex-shrink-0"><SignSVG signId={o.id} size={28} glow={false} /></div>
                      <div className="flex-1 text-left font-bold text-sm">{o.nameZh}</div>
                      {showRes && isCorrect && <CheckCircle size={20} />}
                    </button>
                  );
                })}
              </div>

              {showRes && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={next} className="w-full mt-6 py-4 bg-cyan text-navy-950 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan/20">
                   繼續搜尋任務 <Crosshair size={18} />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .leaflet-dark-mode .leaflet-tile-container { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
        .leaflet-container { background: #020617; }
      `}</style>
    </div>
  );
};

export default Play;
