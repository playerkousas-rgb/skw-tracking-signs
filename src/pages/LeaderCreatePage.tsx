import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, X, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import SignSVG from '../components/SignSVG';
import { trackingSigns, getSignById } from '../data/trackingSigns';
import { saveTrail, getTrailById, generateTrailId, getCurrentPosition, TrailStep } from '../lib/trailStore';

// Fix Leaflet default icon
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- Custom pin for placed signs ---
const makeSignPin = (num: number): L.DivIcon => {
  const el = document.createElement('div');
  el.innerHTML = `<div style="position:relative;width:36px;height:48px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;bottom:0;width:28px;height:28px;border-radius:50%;background:#041a3a;border:2px solid #00d4ff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(0,212,255,0.3);">
      <span style="color:#00d4ff;font-family:Fredoka,sans-serif;font-size:12px;font-weight:700;">${num}</span>
    </div>
    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:10px solid #00d4ff;"></div>
  </div>`;
  return L.divIcon({ html: el.innerHTML, className: '', iconSize: [36, 48], iconAnchor: [18, 48] });
};

const posIcon: L.DivIcon = (() => {
  const el = document.createElement('div');
  el.innerHTML = '<div style="width:16px;height:16px;border-radius:50%;background:#00ff88;border:3px solid white;box-shadow:0 0 12px rgba(0,255,136,0.5);animation:pulse 2s infinite;"></div>';
  return L.divIcon({ html: el.innerHTML, className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
})();

// --- Map click handler ---
const MapClickHandler: React.FC<{ onClick: (lat: number, lng: number) => void }> = ({ onClick }) => {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
};

// --- Recenter ---
const RecenterOnce: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 15); }, [lat, lng, map]);
  return null;
};

const DEFAULT_CENTER: [number, number] = [22.3193, 114.1694];

const LeaderCreatePage: React.FC = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const editId = sp.get('edit');
  const existing = editId ? getTrailById(editId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [steps, setSteps] = useState<TrailStep[]>(existing?.steps || []);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsErr, setGpsErr] = useState('');
  const [pendingSignId, setPendingSignId] = useState<number | null>(null);

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

  const chooseSign = (signId: number) => {
    setPendingSignId(signId);
    setShowPicker(false);
  };

  const placeOnMap = (lat: number, lng: number) => {
    if (pendingSignId === null) return;
    setSteps(prev => [...prev, { signId: pendingSignId, lat, lng }]);
    setPendingSignId(null);
  };

  const placeAtGps = (signId: number) => {
    if (gpsLat == null || gpsLng == null) { setError('請先取得GPS定位'); return; }
    setSteps(prev => [...prev, { signId, lat: gpsLat, lng: gpsLng }]);
    setShowPicker(false);
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
    saveTrail({
      id: existing?.id || generateTrailId(),
      name: name.trim(), steps,
      createdAt: existing?.createdAt || Date.now(),
    });
    nav('/leader');
  };

  const cats = [
    { key: 'direction' as const, label: '方向指示' },
    { key: 'warning' as const, label: '警告標記' },
    { key: 'info' as const, label: '資訊提示' },
    { key: 'end' as const, label: '結束標記' },
  ];

  const hasCoords = steps.filter(s => s.lat != null && s.lng != null);
  const polyCoords: [number, number][] = hasCoords.map(s => [s.lat!, s.lng!]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/leader')} className="p-2 -ml-2 rounded-xl text-steel hover:text-ice"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-heading font-bold text-ice">{existing ? '編輯路線' : '建立路線'}</h1>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs text-steel mb-1.5 font-heading">路線名稱</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="例：公園樹林追蹤路線"
          className="w-full px-4 py-3 bg-navy-800/70 rounded-xl border border-cyan/10 text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30 text-sm" />
      </div>

      {/* Map */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-steel font-heading">在地圖標記符號位置（防迷路用）</label>
          <button onClick={requestGps} disabled={gpsLoading}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan/10 text-cyan text-[10px] font-heading border border-cyan/20">
            {gpsLoading ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}定位
          </button>
        </div>

        {/* Pending banner */}
        <AnimatePresence>
          {pendingSignId !== null && (() => {
            const s = getSignById(pendingSignId);
            return (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-2 p-2.5 bg-green/10 border border-green/20 rounded-xl flex items-center gap-2">
                <SignSVG signId={pendingSignId} size={32} glow={false} />
                <span className="text-xs text-green font-heading">點擊地圖放置「{s?.nameZh}」</span>
                <button onClick={() => setPendingSignId(null)} className="ml-auto p-1 text-steel hover:text-ice"><X size={14} /></button>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        <div className="rounded-2xl overflow-hidden border border-cyan/10" style={{ height: 220 }}>
          <MapContainer center={[initLat, initLng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {gpsLat != null && gpsLng != null && <RecenterOnce lat={gpsLat} lng={gpsLng} />}
            {gpsLat != null && gpsLng != null && <Marker position={[gpsLat, gpsLng]} icon={posIcon} />}
            <MapClickHandler onClick={placeOnMap} />
            {hasCoords.map((s, i) => (
              <Marker key={i} position={[s.lat!, s.lng!]} icon={makeSignPin(i + 1)} />
            ))}
            {polyCoords.length >= 2 && (
              <Polyline positions={polyCoords} pathOptions={{ color: '#00d4ff', weight: 2, dashArray: '6 4', opacity: 0.6 }} />
            )}
          </MapContainer>
        </div>
        {gpsErr && <p className="text-[10px] text-red mt-1">{gpsErr}</p>}
        <p className="text-[9px] text-steel mt-1">
          {pendingSignId !== null ? '👆 點擊地圖放置符號位置' : '選擇符號 → 點地圖標記位置（或直接用GPS定位）'}
        </p>
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-steel font-heading">追蹤符號順序 ({steps.length}個)</label>
          <button onClick={() => { setPendingSignId(null); setShowPicker(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green/10 text-green text-xs font-heading font-medium border border-green/20">
            <Plus size={14} />加入符號
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="bg-navy-800/40 rounded-xl p-6 text-center border border-dashed border-cyan/10">
            <p className="text-steel text-sm">尚未加入任何符號</p>
            <p className="text-steel text-xs mt-1">選擇符號後，在地圖上點擊標記位置</p>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, i) => {
              const s = getSignById(step.signId);
              if (!s) return null;
              const coordStr = step.lat != null ? `${step.lat.toFixed(5)}, ${step.lng!.toFixed(5)}` : '無座標';
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className={`bg-navy-800/60 rounded-xl p-3 border flex items-center gap-3 ${s.isWarning ? 'border-red/10' : 'border-cyan/8'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading font-bold shrink-0 ${s.isWarning ? 'bg-red/10 text-red' : 'bg-cyan/10 text-cyan'}`}>{i + 1}</div>
                  <SignSVG signId={s.id} size={40} glow={false} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-semibold text-sm text-ice">{s.nameZh}</h4>
                    <p className="text-[10px] text-steel truncate">{coordStr}</p>
                    {i === 0 && <span className="text-[9px] text-cyan">起點</span>}
                    {i === steps.length - 1 && <span className="text-[9px] text-green">終點</span>}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveStep(i, -1)} disabled={i === 0} className="p-1 text-steel hover:text-ice disabled:opacity-20">▲</button>
                    <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="p-1 text-steel hover:text-ice disabled:opacity-20">▼</button>
                  </div>
                  <button onClick={() => removeStep(i)} className="p-1.5 text-steel hover:text-red"><X size={16} /></button>
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
          💡 <strong className="text-steel-light">提示：</strong>起點通常是「沿此路前進」，終點必須是「已回家」。在地圖標記每個符號，隊員追蹤時可查看地圖以免迷路。
        </p>
      </div>

      <button onClick={handleSave} disabled={!name.trim() || steps.length < 2}
        className={`w-full py-3.5 rounded-2xl font-heading font-bold text-base transition-all ${name.trim() && steps.length >= 2
          ? 'bg-gradient-to-r from-green/20 to-cyan/10 text-cyan border border-cyan/30 box-glow-cyan'
          : 'bg-navy-800 text-steel/40 cursor-not-allowed border border-steel/10'}`}>
        {existing ? '儲存變更' : '儲存並發布路線'}
      </button>

      {/* Sign Picker Modal */}
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
                <h3 className="font-heading font-bold text-ice">選擇符號 → 標位置</h3>
                <button onClick={() => setShowPicker(false)} className="p-1 text-steel hover:text-ice"><X size={20} /></button>
              </div>
              <p className="text-[10px] text-steel -mt-2 mb-3">關閉視窗後點擊地圖放置位置（或按 📍用GPS定位）</p>
              {cats.map(cat => (
                <div key={cat.key} className="mb-4">
                  <h4 className="text-xs text-steel font-heading mb-2">{cat.label}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {trackingSigns.filter(s => s.category === cat.key).map(sign => (
                      <div key={sign.id} className="space-y-1">
                        <button onClick={() => chooseSign(sign.id)}
                          className="w-full flex flex-col items-center gap-1 p-2.5 bg-navy-800 rounded-xl border border-cyan/5 card-hover">
                          <SignSVG signId={sign.id} size={48} glow={false} />
                          <span className="text-xs font-heading font-medium text-ice">{sign.nameZh}</span>
                        </button>
                        <button onClick={() => placeAtGps(sign.id)}
                          className="w-full text-[9px] text-cyan/70 hover:text-cyan text-center py-0.5">
                          📍 用GPS定位
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaderCreatePage;
