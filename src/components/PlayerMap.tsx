// 隊員定位地圖 — 只顯示「你在哪」（防迷路）＋已觸發的符號（走過痕跡）
// 絕不預先顯示下一個符號位置：要靠玩家沿途觀察地面符號，行到觸發後才標示。
// COPYRIGHT © 2026 SCOUT SYSTEM

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';

export interface MapPin {
  key: string;
  lat: number;
  lng: number;
  signId: number;
  order: number;            // 第幾站
  kind: 'seq' | 'trap';     // 順序符號 / 已觸發的陷阱
  current?: boolean;        // 剛觸發的當前符號
}

interface PlayerMapProps {
  user: { lat: number; lng: number; acc: number } | null;
  pins: MapPin[];
  safety?: { lat: number; lng: number; note?: string } | null;
}

// 符號 emoji（地圖釘用）
const EMOJI: Record<number, string> = {
  1: '⬆️', 2: '↕️', 3: '❌', 4: '🏠', 5: '💧',
  6: '↩️', 7: '↪️', 8: '🚧', 9: '🎁', 10: '🔱',
};

function pinIcon(pin: MapPin): L.DivIcon {
  const emoji = EMOJI[pin.signId] ?? '📍';
  const box = pin.kind === 'trap'
    ? 'background:rgba(61,15,28,.95);border-color:#ff3366;'
    : pin.current
      ? 'background:rgba(64,53,4,.97);border-color:#ffd700;'
      : 'background:rgba(8,34,86,.95);border-color:#00d4ff;';
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:40px;height:40px;">
        <div style="width:40px;height:40px;border-radius:12px;border:2px solid ${pin.kind === 'trap' ? '#ff3366' : pin.current ? '#ffd700' : '#00d4ff'};
             ${box} display:flex;align-items:center;justify-content:center;font-size:19px;
             box-shadow:0 3px 10px rgba(0,0,0,.55);">
          ${emoji}
        </div>
        <div style="position:absolute;top:-8px;right:-8px;background:${pin.kind === 'trap' ? '#ff3366' : '#00d4ff'};
             color:#02133e;font:800 11px/18px sans-serif;min-width:18px;height:18px;border-radius:9px;
             display:flex;align-items:center;justify-content:center;padding:0 3px;box-shadow:0 1px 4px rgba(0,0,0,.5);">
          ${pin.order}
        </div>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const userIcon: L.DivIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:20px;height:20px;">
    <div style="position:absolute;left:-14px;top:-14px;width:48px;height:48px;border-radius:50%;
         background:rgba(0,212,255,.15);border:2px solid rgba(0,212,255,.35);
         animation:pm-pulse 2s ease-out infinite;"></div>
    <div style="width:20px;height:20px;border-radius:50%;background:#00d4ff;border:3px solid #ffffff;
         box-shadow:0 0 14px rgba(0,212,255,.8);"></div>
  </div>
  <style>@keyframes pm-pulse{0%{transform:scale(.5);opacity:1}100%{transform:scale(2.2);opacity:0}}</style>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const safetyIcon: L.DivIcon = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;border-radius:50%;background:#00ff88;border:3px solid #ffffff;
       box-shadow:0 0 14px rgba(0,255,136,.55);display:flex;align-items:center;justify-content:center;
       font:800 10px sans-serif;color:#02133E;">SAFE</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// 用戶拖動地圖時停止跟隨
const DragWatcher: React.FC<{ onDrag: () => void }> = ({ onDrag }) => {
  useMapEvents({ dragstart: () => onDrag() });
  return null;
};

const PlayerMap: React.FC<PlayerMapProps> = ({ user, pins, safety }) => {
  const mapRef = useRef<L.Map | null>(null);
  const followRef = useRef(true);
  const [, setTick] = useState(0);

  // 尺寸修正（flex 佈局內初 render 大小不準）
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, []);

  // 跟隨模式：有新定位而用戶沒有拖動地圖 → 平移到用戶位置
  useEffect(() => {
    if (!user || !followRef.current || !mapRef.current) return;
    const z = mapRef.current.getZoom();
    mapRef.current.setView([user.lat, user.lng], z < 16 ? 17 : z, { animate: true });
  }, [user]);

  const recenter = () => {
    followRef.current = true;
    setTick(t => t + 1);
    if (user && mapRef.current) {
      mapRef.current.setView([user.lat, user.lng], 17, { animate: true });
    }
  };

  const seqPins = pins.filter(p => p.kind === 'seq').sort((a, b) => a.order - b.order);
  const path: [number, number][] = [
    ...seqPins.map(p => [p.lat, p.lng] as [number, number]),
    ...(user ? [[user.lat, user.lng] as [number, number]] : []),
  ];

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-cyan/15"
      style={{ boxShadow: '0 0 24px rgba(0,212,255,.08)' }}>
      <MapContainer
        center={user ? [user.lat, user.lng] : [22.3193, 114.1694]}
        zoom={17}
        style={{ height: '100%', width: '100%', background: '#0a1a33' }}
        zoomControl={false}
        attributionControl={false}
        ref={(m: L.Map | null) => { mapRef.current = m; }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={20} />
        <DragWatcher onDrag={() => { followRef.current = false; }} />

        {/* 準確度圈：如實顯示 GPS 誤差範圍 */}
        {user && user.acc > 3 && (
          <Circle center={[user.lat, user.lng]} radius={user.acc}
            pathOptions={{ color: '#00d4ff', weight: 1, fillColor: '#00d4ff', fillOpacity: 0.07 }} />
        )}

        {/* 走過的痕跡 */}
        {path.length >= 2 && (
          <Polyline positions={path} pathOptions={{ color: '#00d4ff', weight: 2.5, opacity: 0.5, dashArray: '6 8' }} />
        )}

        {/* 安全集合點 */}
        {safety && <Marker position={[safety.lat, safety.lng]} icon={safetyIcon} />}

        {/* 已觸發的符號（順序＋陷阱）— 絕不預先顯示未觸發的 */}
        {pins.map(p => (
          <Marker key={p.key} position={[p.lat, p.lng]} icon={pinIcon(p)} />
        ))}

        {/* 你的位置 */}
        {user && <Marker position={[user.lat, user.lng]} icon={userIcon} zIndexOffset={1000} />}
      </MapContainer>

      {/* 回到我的位置 */}
      <button onClick={recenter} aria-label="回到我的位置"
        className="absolute right-2.5 top-2.5 z-[1000] w-10 h-10 rounded-xl bg-navy-950/90 border border-cyan/25 text-cyan flex items-center justify-center card-hover"
        style={{ backdropFilter: 'blur(6px)' }}>
        <Crosshair size={18} />
      </button>

      {/* 圖例 */}
      <div className="absolute left-2.5 bottom-2.5 z-[1000] px-2.5 py-1.5 rounded-lg bg-navy-950/85 text-[9px] text-steel leading-snug"
        style={{ backdropFilter: 'blur(6px)' }}>
        <span className="text-cyan">●</span> 你的位置 ·
        <span className="text-gold"> ◆</span> 已發現符號 ·
        <span className="text-green"> ●</span> 安全點
        <div className="text-[8px] text-steel/70 mt-0.5">不會顯示下一個符號位置</div>
      </div>
    </div>
  );
};

export default PlayerMap;
