import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, X, Navigation, Loader2, AlertCircle, Edit3, MoveUp, MoveDown, ArrowUp, ArrowLeft as ArrowLeftIcon, ArrowRight, Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import SignSVG from '../components/SignSVG';
import { trackingSigns, getSignById } from '../data/trackingSigns';
import { saveTrail, getTrailById, generateTrailId, getCurrentPosition, TrailStep, Direction } from '../lib/trailStore';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const makePin = (num: number): L.DivIcon => {
  const el = document.createElement('div');
  el.innerHTML = `<div style="position:relative;width:36px;height:48px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;bottom:0;width:28px;height:28px;border-radius:50%;background:#041a3a;border:2px solid #00d4ff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(0,212,255,0.4);"><span style="color:#00d4ff;font-family:Fredoka,sans-serif;font-size:12px;font-weight:700;">${num}</span></div>
    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:10px solid #00d4ff;filter:drop-shadow(0 0 4px rgba(0,212,255,0.5));"></div></div>`;
  return L.divIcon({ html: el.innerHTML, className: '', iconSize: [36, 48], iconAnchor: [18, 48] });
};

const posIcon: L.DivIcon = (() => {
  const el = document.createElement('div');
  el.innerHTML = '<div style="width:18px;height:18px;border-radius:50%;background:#00ff88;border:3px solid white;box-shadow:0 0 14px rgba(0,255,136,0.6);"></div>';
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
  const [steps, setSteps] = useState<TrailStep[]>(existing?.steps || []);
  const [error, setError] = useState('');
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsErr, setGpsErr] = useState('');

  const [showPicker, setShowPicker] = useState(false);
  const [configStep, setConfigStep] = useState<{ signId: number; lat?: number; lng?: number } | null>(null);
  const [configDirection, setConfigDirection] = useState<Direction>('forward');
  const [configPaces, setConfigPaces] = useState(6);
  const [configContent, setConfigContent] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const [mapOpen, setMapOpen] = useState(false);

  const initLat = existing?.steps.find(s => s.lat != null)?.lat ?? DEFAULT_CENTER[0];
  const initLng = existing?.steps.find(s => s.lng != null)?.lng ?? DEFAULT_CENTER[1];

  const requestGps = useCallback(async () => {
    setGpsLoading(true); setGpsErr('');
    try {
      const p = await getCurrentPosition();
      setGpsLat(p.lat); setGpsLng(p.lng);
    } catch (e: unknown) {
      setGpsErr(e instanceof Error ? e.message : '定位失敗');
    } finally { setGpsLoading(false); }
  }, []);

  useEffect(() => { requestGps(); }, [requestGps]);

  const pickSign = (signId: number) => {
    const sign = getSignById(signId);
    setShowPicker(false);
    setConfigDirection('forward');
    setConfigPaces(sign?.needsPaces ? 6 : 0);
    setConfigContent('');
    setConfigStep({ signId });
    // 不自動開地圖 — 用戶自己需要時才開
  };

  const mapClick = (lat: number, lng: number) => {
    if (configStep) {
      setConfigStep(prev => prev ? { ...prev, lat, lng } : null);
    }
  };

  const confirmStep = () => {
    if (!configStep) return;
    const sign = getSignById(configStep.signId);
    const step: TrailStep = { signId: configStep.signId };
    if (sign?.needsDirection) step.direction = configDirection;
    if (sign?.needsPaces) step.paces = configPaces;
    if (configContent.trim()) step.hiddenContent = configContent.trim();
    if (configStep.lat != null) { step.lat = configStep.lat; step.lng = configStep.lng; }

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
    setConfigStep({ signId: s.signId, lat: s.lat, lng: s.lng });
    // 不自動開地圖
  };

  const removeStep = (i: number) => setSteps(prev => prev.filter((_, j) => j !== i));
  const moveStep = (i: number, dir: -1 | 1) => {
    const ni = i + dir;
    if (ni < 0 || ni >= steps.length) return;
    setSteps(prev => { const n = [...prev]; [n[i], n[ni]] = [n[ni], n[i]]; return n; });
  };

  const handleSave = () => {
    setError('');
    if (!name.trim()) { setError('請輸入路線名稱'); return; }
    if (steps.length < 2) { setError('至少需要2個符號（起點和終點）'); return; }
    if (steps[steps.length - 1].signId !== 4) { setError('路線最後一個符號必須是「已回家」'); return; }
    saveTrail({ id: existing?.id || generateTrailId(), name: name.trim(), steps, createdAt: existing?.createdAt || Date.now() });
    nav('/leader');
  };

  const cats = [
    { key: 'direction' as const, label: '方向指示' },
    { key: 'warning' as const, label: '警告標記' },
    { key: 'info' as const, label: '資訊提示' },
    { key: 'end' as const, label: '結束標記' },
  ];

  const hasCoords = steps.filter(s => s.lat != null && s.lng != null);

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

      {/* ── 可開合地圖（純手動開關，不會自動彈出） ── */}
      <div>
        <button
          onClick={() => setMapOpen(!mapOpen)}
          className="w-full flex items-center justify-between py-2.5 px-4 bg-navy-800/50 rounded-xl border border-cyan/10 text-steel hover:text-ice transition-colors"
        >
          <span className="flex items-center gap-2 text-xs font-heading font-medium">
            <MapIcon size={14} className="text-cyan" />
            地圖標記位置（需要時才開）
            {hasCoords.length > 0 && <span className="text-[10px] text-cyan">{hasCoords.length}點</span>}
          </span>
          <span className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); requestGps(); }} disabled={gpsLoading}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan/10 text-cyan text-[10px] font-heading border border-cyan/20">
              {gpsLoading ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />}定位
            </button>
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
              <div className="mt-2 space-y-1.5">
                {gpsErr && <p className="text-[10px] text-red">{gpsErr}</p>}
                <div className="rounded-2xl overflow-hidden border border-cyan/10" style={{ height: 220 }}>
                  <MapContainer center={[initLat, initLng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                    {gpsLat != null && gpsLng != null && <RecenterOnce lat={gpsLat} lng={gpsLng} />}
                    {gpsLat != null && gpsLng != null && <Marker position={[gpsLat, gpsLng]} icon={posIcon} />}
                    <MapClickHandler onClick={mapClick} />
                    {configStep?.lat != null && configStep.lng != null && (
                      <Marker position={[configStep.lat, configStep.lng]} icon={makePin(steps.length + 1)} />
                    )}
                    {hasCoords.map((s, i) => (
                      <Marker key={i} position={[s.lat!, s.lng!]} icon={makePin(i + 1)} />
                    ))}
                  </MapContainer>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                      {i === 0 && <span className="text-[9px] text-cyan">起點</span>}
                      {i === steps.length - 1 && <span className="text-[9px] text-green">終點</span>}
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
          💡 <strong className="text-steel-light">提示：</strong>起點通常「沿此路前進」，終點必須「已回家」。需要標地圖位置時手動展開上方地圖，點擊即可標記。
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

                <div className="mb-4">
                  <label className="block text-xs text-steel font-heading mb-2">地圖位置</label>
                  {configStep.lat != null ? (
                    <div className="flex items-center gap-2 p-2.5 bg-green/5 border border-green/10 rounded-xl text-xs text-green">
                      <Navigation size={14} /> {configStep.lat.toFixed(5)}, {configStep.lng!.toFixed(5)}
                      <button onClick={() => setConfigStep(prev => prev ? { ...prev, lat: undefined, lng: undefined } : null)}
                        className="ml-auto text-steel hover:text-red"><X size={14} /></button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] text-steel mb-1.5">關閉此視窗後，手動展開上方地圖再點擊標記</p>
                      <button
                        type="button"
                        onClick={() => { setMapOpen(true); }}
                        className="text-[10px] text-cyan underline hover:text-cyan/80"
                      >
                        一鍵展開地圖
                      </button>
                    </div>
                  )}
                </div>

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