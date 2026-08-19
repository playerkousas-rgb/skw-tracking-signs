import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, X, Navigation, Loader2, AlertCircle, Edit3, MoveUp, MoveDown, ArrowUp, ArrowLeft as ArrowLeftIcon, ArrowRight, Map as MapIcon, ChevronDown, ChevronUp, ShieldCheck, MapPin, Timer as TimerIcon, Hourglass, Zap } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import SignSVG from '../components/SignSVG';
import { trackingSigns, getSignById } from '../data/trackingSigns';
import { saveTrail, getTrailById, generateTrailId, getCurrentPosition, TrailStep, Direction, TimerMode, DEFAULT_TRIGGER_DISTANCE } from '../lib/trailStore';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const safetyIcon: L.DivIcon = (() => {
  const el = document.createElement('div');
  el.innerHTML = `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#00ff88;border:3px solid #ffffff;box-shadow:0 0 16px rgba(0,255,136,0.55);font-family:Fredoka,sans-serif;font-size:11px;font-weight:800;color:#02133E;">SAFE</div>`;
  return L.divIcon({ html: el.innerHTML, className: '', iconSize: [34, 34], iconAnchor: [17, 17] });
})();

const posIcon: L.DivIcon = (() => {
  const el = document.createElement('div');
  el.innerHTML = '<div style="width:18px;height:18px;border-radius:50%;background:#00d4ff;border:3px solid white;box-shadow:0 0 14px rgba(0,212,255,0.6);"></div>';
  return L.divIcon({ html: el.innerHTML, className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
})();

const MapClickHandler: React.FC<{ onClick: (lat: number, lng: number) => void }> = ({ onClick }) => {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const RecenterOnce: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 15); }, [lat, lng, map]);
  return null;
};

const DEFAULT_CENTER: [number, number] = [22.3193, 114.1694];

const DIR_OPTIONS: { value: Direction; label: string; icon: React.ReactNode }[] = [
  { value: 'forward', label: '前方', icon: <ArrowUp size={14} /> },
  { value: 'left', label: '左方', icon: <ArrowLeftIcon size={14} /> },
  { value: 'right', label: '右方', icon: <ArrowRight size={14} /> },
];

const LeaderCreatePage: React.FC = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const editId = sp.get('edit');
  const existing = editId ? getTrailById(editId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [steps, setSteps] = useState<TrailStep[]>(
    (existing?.steps || []).map(({ signId, direction, paces, hiddenContent, lat, lng, trap }) => ({ signId, direction, paces, hiddenContent, lat, lng, trap }))
  );
  const [error, setError] = useState('');
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsErr, setGpsErr] = useState('');

  const [showPicker, setShowPicker] = useState(false);
  const [configStep, setConfigStep] = useState<{ signId: number } | null>(null);
  const [configDirection, setConfigDirection] = useState<Direction>('forward');
  const [configPaces, setConfigPaces] = useState(6);
  const [configContent, setConfigContent] = useState('');
  const [configAnchor, setConfigAnchor] = useState<{ lat: number; lng: number } | null>(null);
  const [configTrap, setConfigTrap] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  // ── 任務設定（計時／倒計時／觸發距離／判斷題）──
  const [triggerDistance, setTriggerDistance] = useState(existing?.triggerDistance ?? DEFAULT_TRIGGER_DISTANCE);
  const [timerMode, setTimerMode] = useState<TimerMode>(existing?.timerMode ?? 'stopwatch');
  const [timeLimitMin, setTimeLimitMin] = useState(existing?.timeLimitMin ?? 10);
  const [quizMode, setQuizMode] = useState(existing?.quizMode !== false);

  const [mapOpen, setMapOpen] = useState(false);
  const [safetyLat, setSafetyLat] = useState<number | null>(existing?.safetyLat ?? null);
  const [safetyLng, setSafetyLng] = useState<number | null>(existing?.safetyLng ?? null);
  const [safetyNote, setSafetyNote] = useState(existing?.safetyNote || '');

  const initLat = safetyLat ?? DEFAULT_CENTER[0];
  const initLng = safetyLng ?? DEFAULT_CENTER[1];

  const requestGps = useCallback(async () => {
    setGpsLoading(true); setGpsErr('');
    try {
      const p = await getCurrentPosition();
      setGpsLat(p.lat); setGpsLng(p.lng);
    } catch (e: unknown) {
      setGpsErr(e instanceof Error ? e.message : '定位失敗');
    } finally { setGpsLoading(false); }
  }, []);

  const useGpsAsSafetyPoint = useCallback(async () => {
    setGpsLoading(true); setGpsErr('');
    try {
      const p = await getCurrentPosition();
      setGpsLat(p.lat); setGpsLng(p.lng);
      setSafetyLat(p.lat); setSafetyLng(p.lng);
      if (!safetyNote.trim()) setSafetyNote('集合點 / 安全返回點');
    } catch (e: unknown) {
      setGpsErr(e instanceof Error ? e.message : '定位失敗');
    } finally { setGpsLoading(false); }
  }, [safetyNote]);

  useEffect(() => { requestGps(); }, [requestGps]);

  const pickSign = (signId: number) => {
    const sign = getSignById(signId);
    setShowPicker(false);
    setConfigDirection('forward');
    setConfigPaces(sign?.needsPaces ? 6 : 0);
    setConfigContent('');
    setConfigAnchor(null);
    setConfigTrap(false);
    setConfigStep({ signId });
  };

  const mapClick = (lat: number, lng: number) => {
    setSafetyLat(lat);
    setSafetyLng(lng);
    if (!safetyNote.trim()) setSafetyNote('集合點 / 安全返回點');
  };

  // 走到哪放到哪：用目前 GPS 位置做此符號的實地錨點（取自 v2／v5.2）
  const anchorHere = async () => {
    setGpsLoading(true); setGpsErr('');
    try {
      const p = await getCurrentPosition();
      setGpsLat(p.lat); setGpsLng(p.lng);
      setConfigAnchor({ lat: p.lat, lng: p.lng });
    } catch (e: unknown) {
      setGpsErr(e instanceof Error ? e.message : '定位失敗');
    } finally { setGpsLoading(false); }
  };

  const confirmStep = () => {
    if (!configStep) return;
    const sign = getSignById(configStep.signId);
    const step: TrailStep = { signId: configStep.signId };
    if (sign?.needsDirection) step.direction = configDirection;
    if (sign?.needsPaces) step.paces = configPaces;
    if (configContent.trim()) step.hiddenContent = configContent.trim();
    if (configAnchor) { step.lat = configAnchor.lat; step.lng = configAnchor.lng; }
    if (configTrap && sign?.isWarning) step.trap = true;

    if (editIdx !== null) {
      setSteps(prev => { const n = [...prev]; n[editIdx] = step; return n; });
      setEditIdx(null);
    } else {
      setSteps(prev => [...prev, step]);
    }
    setConfigStep(null);
  };

  const startEdit = (idx: number) => {
    const s = steps[idx];
    const sign = getSignById(s.signId);
    setEditIdx(idx);
    setConfigDirection(s.direction || 'forward');
    setConfigPaces(s.paces || (sign?.needsPaces ? 6 : 0));
    setConfigContent(s.hiddenContent || '');
    setConfigAnchor(s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null);
    setConfigTrap(s.trap === true);
    setConfigStep({ signId: s.signId });
  };

  const removeStep = (i: number) => setSteps(prev => prev.filter((_, j) => j !== i));
  const moveStep = (i: number, dir: -1 | 1) => {
    const ni = i + dir;
    if (ni < 0 || ni >= steps.length) return;
    setSteps(prev => { const n = [...prev]; [n[i], n[ni]] = [n[ni], n[i]]; return n; });
  };

  const handleSave = () => {
    setError('');
    const seq = steps.filter(s => !s.trap);
    if (!name.trim()) { setError('請輸入路線名稱'); return; }
    if (seq.length < 2) { setError('至少需要2個順序符號（起點和終點）'); return; }
    if (seq[seq.length - 1].signId !== 4) { setError('順序路線最後一個符號必須是「已回家」（陷阱符號不計）'); return; }
    if (timerMode === 'countdown' && (!timeLimitMin || timeLimitMin < 1)) { setError('倒計時模式請設定至少 1 分鐘時限'); return; }
    saveTrail({
      id: existing?.id || generateTrailId(),
      name: name.trim(),
      steps,
      createdAt: existing?.createdAt || Date.now(),
      triggerDistance,
      timerMode,
      ...(timerMode === 'countdown' ? { timeLimitMin } : {}),
      quizMode,
      ...(safetyLat != null && safetyLng != null ? { safetyLat, safetyLng } : {}),
      ...(safetyNote.trim() ? { safetyNote: safetyNote.trim() } : {}),
    });
    nav('/leader');
  };

  const cats = [
    { key: 'direction' as const, label: '方向指示' },
    { key: 'warning' as const, label: '警告標記' },
    { key: 'info' as const, label: '資訊提示' },
    { key: 'end' as const, label: '結束標記' },
  ];

  const hasSafetyPoint = safetyLat != null && safetyLng != null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/leader')} className="p-2 -ml-2 rounded-xl text-steel hover:text-ice"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-heading font-bold text-ice">{existing ? '編輯路線' : '建立路線'}</h1>
      </div>

      <div>
        <label className="block text-xs text-steel mb-1.5 font-heading">路線名稱</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="例：公園樹林追蹤路線"
          className="w-full px-4 py-3 bg-navy-800/70 rounded-xl border border-cyan/10 text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30 text-sm" />
      </div>

      {/* ── 防迷路地圖：只標安全參考點，不標符號位置 ── */}
      <div>
        <button
          onClick={() => setMapOpen(!mapOpen)}
          className="w-full flex items-center justify-between py-2.5 px-4 bg-navy-800/50 rounded-xl border border-cyan/10 text-steel hover:text-ice transition-colors"
        >
          <span className="flex items-center gap-2 text-xs font-heading font-medium">
            <MapIcon size={14} className="text-cyan" />
            防迷路地圖（不標示符號）
            {hasSafetyPoint && <span className="text-[10px] text-green">已設定安全點</span>}
          </span>
          <span className="flex items-center gap-2">
            <span onClick={(e) => { e.stopPropagation(); requestGps(); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan/10 text-cyan text-[10px] font-heading border border-cyan/20">
              {gpsLoading ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />}定位
            </span>
            {mapOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        <AnimatePresence>
          {mapOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2">
                {gpsErr && <p className="text-[10px] text-red">{gpsErr}</p>}
                <div className="relative rounded-2xl overflow-hidden border border-cyan/10" style={{ height: 220 }}>
                  <MapContainer center={[initLat, initLng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                    {gpsLat != null && gpsLng != null && <RecenterOnce lat={gpsLat} lng={gpsLng} />}
                    {gpsLat != null && gpsLng != null && <Marker position={[gpsLat, gpsLng]} icon={posIcon} />}
                    {hasSafetyPoint && <Marker position={[safetyLat!, safetyLng!]} icon={safetyIcon} />}
                    <MapClickHandler onClick={mapClick} />
                  </MapContainer>
                  <div className="absolute left-2 right-2 top-2 z-[1000] rounded-xl bg-navy-950/90 border border-green/20 p-2 backdrop-blur">
                    <p className="text-[11px] text-green font-heading font-semibold flex items-center gap-1 justify-center"><ShieldCheck size={12} /> 點地圖設定集合點／安全返回點</p>
                    <p className="text-[9px] text-steel text-center mt-0.5">隊員端只會看到安全參考，不會看到任何追蹤符號位置。</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={useGpsAsSafetyPoint} disabled={gpsLoading}
                    className="py-2 rounded-xl bg-green/10 text-green border border-green/20 text-[10px] font-heading font-semibold disabled:opacity-50">
                    {gpsLoading ? '定位中...' : '用目前GPS作安全點'}
                  </button>
                  <button type="button" onClick={() => { setSafetyLat(null); setSafetyLng(null); }}
                    className="py-2 rounded-xl bg-navy-800 text-steel border border-steel/10 text-[10px] font-heading font-semibold">
                    清除安全點
                  </button>
                </div>
                <input value={safetyNote} onChange={e => setSafetyNote(e.target.value)} placeholder="安全點說明：例：公園入口集合 / 迷路回到此處"
                  className="w-full px-3 py-2.5 bg-navy-800/70 rounded-xl border border-cyan/10 text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30 text-xs" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 任務設定：計時／倒計時／觸發距離／判斷題 ── */}
      <div className="bg-navy-800/50 rounded-2xl p-4 border border-cyan/10 space-y-4">
        <h3 className="font-heading font-semibold text-sm text-ice-dim flex items-center gap-1.5">
          <TimerIcon size={14} className="text-cyan" />任務模式設定
        </h3>

        {/* 計時 vs 倒計時 */}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTimerMode('stopwatch')}
            className={`p-3 rounded-xl border text-left transition-all ${timerMode === 'stopwatch'
              ? 'bg-green/10 border-green/30' : 'bg-navy-800 border-cyan/5'}`}>
            <TimerIcon size={16} className={timerMode === 'stopwatch' ? 'text-green' : 'text-steel'} />
            <p className={`font-heading font-semibold text-xs mt-1 ${timerMode === 'stopwatch' ? 'text-green' : 'text-steel'}`}>⏱ 計時模式</p>
            <p className="text-[9px] text-steel mt-0.5 leading-tight">時間向上計，挑戰最佳時間</p>
          </button>
          <button type="button" onClick={() => setTimerMode('countdown')}
            className={`p-3 rounded-xl border text-left transition-all ${timerMode === 'countdown'
              ? 'bg-red/10 border-red/30' : 'bg-navy-800 border-cyan/5'}`}>
            <Hourglass size={16} className={timerMode === 'countdown' ? 'text-red' : 'text-steel'} />
            <p className={`font-heading font-semibold text-xs mt-1 ${timerMode === 'countdown' ? 'text-red' : 'text-steel'}`}>⏳ 倒計時模式</p>
            <p className="text-[9px] text-steel mt-0.5 leading-tight">限時內完成，歸零即失敗</p>
          </button>
        </div>

        {timerMode === 'countdown' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
            <div className="flex items-center gap-3 p-3 bg-navy-900/60 rounded-xl border border-red/15">
              <span className="text-xs text-steel font-heading shrink-0">限時</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setTimeLimitMin(m => Math.max(1, m - 5))}
                  className="w-9 h-9 rounded-full bg-navy-800 text-ice font-heading font-bold border border-cyan/10">−</button>
                <span className="text-xl font-heading font-bold text-red w-14 text-center tabular-nums">{timeLimitMin}<span className="text-[10px] text-steel ml-0.5">分</span></span>
                <button type="button" onClick={() => setTimeLimitMin(m => Math.min(120, m + 5))}
                  className="w-9 h-9 rounded-full bg-navy-800 text-ice font-heading font-bold border border-cyan/10">+</button>
              </div>
              <div className="flex gap-1 ml-auto">
                {[5, 10, 15, 30].map(m => (
                  <button key={m} type="button" onClick={() => setTimeLimitMin(m)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-heading font-bold border ${timeLimitMin === m ? 'bg-red/15 text-red border-red/30' : 'bg-navy-800 text-steel border-cyan/5'}`}>
                    {m}分
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* GPS 觸發距離（實地符號） */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-steel font-heading flex items-center gap-1">
              <MapPin size={12} className="text-cyan" />GPS 觸發距離（實地符號用）
            </label>
            <span className="text-cyan font-mono font-bold text-sm">{triggerDistance} 米</span>
          </div>
          <input type="range" min={3} max={20} step={1} value={triggerDistance}
            onChange={e => setTriggerDistance(parseInt(e.target.value, 10))}
            className="w-full accent-cyan" />
          <p className="text-[9px] text-steel mt-1">隊員行到符號此距離內，追蹤儀便會觸發。越小越精準（建議 5～10 米）</p>
        </div>

        {/* 判斷題開關 */}
        <button type="button" onClick={() => setQuizMode(q => !q)}
          className="w-full flex items-center justify-between p-3 bg-navy-900/60 rounded-xl border border-cyan/10">
          <div className="text-left">
            <p className="font-heading font-semibold text-xs text-ice flex items-center gap-1.5"><Zap size={13} className="text-gold" />符號判斷題</p>
            <p className="text-[9px] text-steel mt-0.5">發現符號後要答對「應對行動」 — 成功運用符號先算完成</p>
          </div>
          <span className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${quizMode ? 'bg-green/40' : 'bg-navy-700'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${quizMode ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      </div>

      {/* ── 符號列表 ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-steel font-heading">追蹤符號順序 ({steps.length}個)</label>
          <button onClick={() => { setEditIdx(null); setShowPicker(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green/10 text-green text-xs font-heading font-medium border border-green/20">
            <Plus size={14} />加入符號
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="bg-navy-800/40 rounded-xl p-6 text-center border border-dashed border-cyan/10">
            <p className="text-steel text-sm">尚未加入任何符號</p>
            <p className="text-steel text-xs mt-1">點擊「加入符號」開始建立路線</p>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, i) => {
              const s = getSignById(step.signId);
              if (!s) return null;
              const dirLabel = step.direction === 'left' ? '←左' : step.direction === 'right' ? '右→' : step.direction === 'forward' ? '↑前' : '';
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className={`bg-navy-800/60 rounded-xl p-3 border ${s.isWarning ? 'border-red/10' : 'border-cyan/8'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading font-bold shrink-0 ${s.isWarning ? 'bg-red/10 text-red' : 'bg-cyan/10 text-cyan'}`}>{i + 1}</div>
                    <div className="shrink-0"><SignSVG signId={s.id} size={38} glow={false} direction={step.direction} /></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-heading font-semibold text-sm text-ice flex items-center gap-1.5">
                        {s.nameZh}
                        {dirLabel && <span className="text-[10px] text-cyan bg-cyan/10 px-1.5 py-0.5 rounded">{dirLabel}</span>}
                        {step.paces != null && step.paces > 0 && <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded">{step.paces}步</span>}
                      </h4>
                      {step.hiddenContent && <p className="text-[10px] text-steel truncate">📦 {step.hiddenContent}</p>}
                      {step.lat != null && <span className="inline-flex items-center gap-0.5 text-[9px] text-green bg-green/10 px-1.5 py-0.5 rounded mr-1">📍GPS</span>}
                      {step.trap && <span className="inline-flex items-center gap-0.5 text-[9px] text-red bg-red/10 px-1.5 py-0.5 rounded">⚠️陷阱</span>}
                      {i === 0 && !step.trap && <span className="text-[9px] text-cyan">起點</span>}
                      {i === steps.length - 1 && !step.trap && <span className="text-[9px] text-green">終點</span>}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveStep(i, -1)} disabled={i === 0} className="p-1 text-steel hover:text-ice disabled:opacity-20"><MoveUp size={14} /></button>
                      <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="p-1 text-steel hover:text-ice disabled:opacity-20"><MoveDown size={14} /></button>
                    </div>
                    <button onClick={() => startEdit(i)} className="p-1.5 text-steel hover:text-cyan"><Edit3 size={14} /></button>
                    <button onClick={() => removeStep(i)} className="p-1.5 text-steel hover:text-red"><X size={16} /></button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red/5 border border-red/10 rounded-xl text-red text-xs">
          <AlertCircle size={16} className="shrink-0" />{error}
        </div>
      )}

      <div className="bg-navy-800/40 rounded-xl p-3 border border-cyan/5">
        <p className="text-[10px] text-steel leading-relaxed">
          💡 <strong className="text-steel-light">提示：</strong>這是追蹤，不是尋寶。地圖的作用是讓隊員知道自己在哪（防迷路）—
          符號位置不會預先顯示，行到觸發後才標示；配合「符號判斷題」確保隊員真正讀懂符號。
        </p>
      </div>

      <button onClick={handleSave} disabled={!name.trim() || steps.length < 2}
        className={`w-full py-3.5 rounded-2xl font-heading font-bold text-base transition-all ${name.trim() && steps.length >= 2
          ? 'bg-gradient-to-r from-green/20 to-cyan/10 text-cyan border border-cyan/30 box-glow-cyan'
          : 'bg-navy-800 text-steel/40 cursor-not-allowed border border-steel/10'}`}>
        {existing ? '儲存變更' : '儲存並發布路線'}
      </button>

      {/* Sign Picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowPicker(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="relative bg-navy-900 rounded-3xl border border-cyan/20 p-5 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-ice">選擇追蹤符號</h3>
                <button onClick={() => setShowPicker(false)} className="p-1 text-steel hover:text-ice"><X size={20} /></button>
              </div>
              {cats.map(cat => (
                <div key={cat.key} className="mb-4">
                  <h4 className="text-xs text-steel font-heading mb-2">{cat.label}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {trackingSigns.filter(s => s.category === cat.key).map(sign => (
                      <button key={sign.id} onClick={() => pickSign(sign.id)}
                        className="flex flex-col items-center gap-1 p-2.5 bg-navy-800 rounded-xl border border-cyan/5 card-hover">
                        <SignSVG signId={sign.id} size={48} glow={false} />
                        <span className="text-xs font-heading font-medium text-ice">{sign.nameZh}</span>
                        {sign.needsDirection && <span className="text-[9px] text-cyan">需選方向</span>}
                        {sign.needsPaces && <span className="text-[9px] text-gold">需設步數</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Config Modal */}
      <AnimatePresence>
        {configStep && (() => {
          const s = getSignById(configStep.signId);
          if (!s) return null;
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
              onClick={() => { setConfigStep(null); setEditIdx(null); }}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="relative bg-navy-900 rounded-3xl border border-cyan/20 p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-ice">{editIdx !== null ? '編輯符號' : '設定符號'}</h3>
                  <button onClick={() => { setConfigStep(null); setEditIdx(null); }} className="p-1 text-steel hover:text-ice"><X size={20} /></button>
                </div>

                <div className="flex items-center gap-3 mb-4 p-3 bg-navy-800/60 rounded-xl">
                  <SignSVG signId={s.id} size={60} glow={true} direction={s.needsDirection ? configDirection : undefined} />
                  <div>
                    <h4 className="font-heading font-semibold text-ice">{s.nameZh}</h4>
                    <p className="text-[10px] text-steel">{s.action}</p>
                  </div>
                </div>

                {s.needsDirection && (
                  <div className="mb-4">
                    <label className="block text-xs text-steel font-heading mb-2">箭頭指向哪個方向？</label>
                    <div className="flex gap-2">
                      {DIR_OPTIONS.map(opt => (
                        <button key={opt.value}
                          onClick={() => setConfigDirection(opt.value)}
                          className={`flex-1 py-2.5 rounded-xl font-heading text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            configDirection === opt.value
                              ? 'bg-cyan/10 text-cyan border border-cyan/30'
                              : 'bg-navy-800 text-steel border border-cyan/5'
                          }`}>
                          {opt.icon}{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {s.needsPaces && (
                  <div className="mb-4">
                    <label className="block text-xs text-steel font-heading mb-2">步數（方格內數字）</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setConfigPaces(p => Math.max(1, p - 1))}
                        className="w-10 h-10 rounded-full bg-navy-800 text-ice font-heading font-bold text-lg border border-cyan/10">−</button>
                      <span className="text-xl font-heading font-bold text-ice w-12 text-center">{configPaces}</span>
                      <button onClick={() => setConfigPaces(p => p + 1)}
                        className="w-10 h-10 rounded-full bg-navy-800 text-ice font-heading font-bold text-lg border border-cyan/10">+</button>
                      <span className="text-xs text-steel">步</span>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-xs text-steel font-heading mb-2">
                    隱藏訊息／信物 <span className="text-[9px] text-steel">（隊員答對後顯示）</span>
                  </label>
                  <input
                    value={configContent}
                    onChange={e => setConfigContent(e.target.value)}
                    placeholder={s.category === 'end' ? '例：恭喜完成！去涼亭找領袖領取獎章🏅' : s.needsPaces ? '例：大樹下的紅色盒子' : '例：檢查哨密碼：SKW2026'}
                    className="w-full px-4 py-3 bg-navy-800/70 rounded-xl border border-cyan/10 text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30 text-sm"
                  />
                </div>

                {/* 實地 GPS 錨點：走到哪放到哪 */}
                <div className="mb-4 p-3 bg-navy-800/60 rounded-xl border border-cyan/10">
                  <label className="block text-xs text-steel font-heading mb-2 flex items-center gap-1">
                    <MapPin size={12} className="text-green" />實地 GPS 錨點（可選）
                  </label>
                  {configAnchor ? (
                    <div className="flex items-center justify-between p-2.5 bg-green/10 rounded-lg border border-green/20">
                      <span className="text-[10px] text-green font-mono">
                        📍 {configAnchor.lat.toFixed(5)}, {configAnchor.lng.toFixed(5)}
                      </span>
                      <button type="button" onClick={() => setConfigAnchor(null)}
                        className="text-[10px] text-red px-2 py-1 rounded bg-red/10 border border-red/20">移除</button>
                    </div>
                  ) : (
                    <button type="button" onClick={anchorHere} disabled={gpsLoading}
                      className="w-full py-2.5 rounded-lg bg-green/10 text-green border border-green/25 text-xs font-heading font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5">
                      {gpsLoading ? <><Loader2 size={13} className="animate-spin" />定位中…</> : <><Navigation size={13} />走到哪放到哪 — 用目前位置</>}
                    </button>
                  )}
                  <p className="text-[9px] text-steel mt-1.5 leading-relaxed">
                    加了錨點的路線為「實地追蹤」：隊員的地圖只顯示自己的位置（防迷路），
                    行到符號附近自動觸發後才會標示在地圖上 — 下一個符號在哪不會預先顯示
                  </p>
                </div>

                {/* 陷阱：警告類符號可設為自由觸發 */}
                {s.isWarning && (
                  <button type="button" onClick={() => setConfigTrap(t => !t)}
                    className={`w-full mb-4 flex items-center justify-between p-3 rounded-xl border transition-all ${configTrap ? 'bg-red/10 border-red/30' : 'bg-navy-800/60 border-cyan/10'}`}>
                    <div className="text-left">
                      <p className={`font-heading font-semibold text-xs ${configTrap ? 'text-red' : 'text-steel'}`}>⚠️ 設為陷阱（自由觸發）</p>
                      <p className="text-[9px] text-steel mt-0.5">不按順序，隊員行近即彈出警告 — 放在錯路／危險位置</p>
                    </div>
                    <span className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${configTrap ? 'bg-red/50' : 'bg-navy-700'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${configTrap ? 'left-[22px]' : 'left-0.5'}`} />
                    </span>
                  </button>
                )}

                <button onClick={confirmStep}
                  className="w-full py-3 bg-cyan/10 text-cyan rounded-xl font-heading font-bold border border-cyan/20 card-hover">
                  {editIdx !== null ? '儲存修改' : '加入路線'}
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default LeaderCreatePage;
