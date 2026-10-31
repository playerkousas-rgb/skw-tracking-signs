import React, { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Compass, QrCode, ClipboardPaste, ArrowRight, FileJson, Upload, Clock, Trophy, AlertTriangle, User, Sparkles,
} from 'lucide-react';
import QrScanner from '../components/QrScanner';
import {
  decodeTrail, saveTrail, getTrailById, formatDuration, getAllResults, trailSummary, trailFileName, Trail,
  getCurrentPosition,
} from '../lib/trailStore';
import { createDemoTrail } from '../lib/demo';
import { Btn, Card, Empty, Note, PageHeader } from '../components/ui';

const PlayerPage: React.FC = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [code, setCode] = useState(sp.get('code') ?? '');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('skw_player_name') ?? '');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<Trail | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const results = getAllResults().slice().reverse().slice(0, 4);

  const resolve = (raw: string): Trail | null => {
    const text = raw.trim();
    if (!text) return null;
    const decoded = decodeTrail(text);
    if (decoded) return decoded;
    return getTrailById(text) ?? null;
  };

  const onChangeCode = (v: string) => {
    setCode(v);
    setError('');
    setPreview(resolve(v));
  };

  const handleQr = (text: string) => {
    setScanning(false);
    onChangeCode(text);
    const found = resolve(text);
    if (!found) setError('QR 內容唔似路線資料，請確認係領袖分享嘅碼');
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      setCode(text);
      const found = resolve(text);
      setPreview(found);
      if (!found) setError('JSON 格式唔正確');
    } catch {
      setError('讀取檔案失敗');
    }
  };

  const join = () => {
    setError('');
    if (!playerName.trim()) { setError('請輸入你嘅代號'); return; }
    const found = preview ?? resolve(code);
    if (!found) { setError('搵唔到路線 — 請重新掃 QR 或貼上完整 JSON'); return; }
    localStorage.setItem('skw_player_name', playerName.trim());
    saveTrail(found);
    nav(`/play/${found.id}?name=${encodeURIComponent(playerName.trim())}`);
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChangeCode(text);
    } catch {
      setError('無法讀取剪貼簿，請長按貼上');
    }
  };

  const sum = preview ? trailSummary(preview) : null;

  const playDemo = async () => {
    setError('');
    const name = playerName.trim() || '示範隊員';
    localStorage.setItem('skw_player_name', name);
    let origin: { lat: number; lng: number } | null = null;
    try { const p = await getCurrentPosition(); origin = { lat: p.lat, lng: p.lng }; } catch { /* 用預設座標 */ }
    const demo = createDemoTrail(origin);
    saveTrail(demo);
    nav(`/play/${demo.id}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="space-y-3.5 pb-4">
      <PageHeader
        kicker="PLAYER MODE"
        title="出發追蹤"
        sub="匯入領袖嘅路線。符號位置唔會預先顯示 — 行到現場，舉機先會見到。"
        right={<span className="shrink-0 mt-1 text-[10px] text-ink-3 border border-ink/15 rounded-full px-2 py-1 flex items-center gap-1"><User size={11} /> 隊員</span>}
      />

      <Card className="p-3.5 space-y-3">
        <div>
          <label className="stamp text-ink-4 block mb-1">你嘅代號</label>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="例：小狼 3 號"
            className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-[#fbf5e7] outline-none focus:border-forest/50 text-[13px] placeholder:text-ink-4"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="stamp text-ink-4">路線代碼 / JSON</label>
            <div className="flex gap-1.5">
              <button onClick={paste} className="text-[9.5px] text-ink-3 border border-ink/15 rounded px-1.5 py-0.5 flex items-center gap-1">
                <ClipboardPaste size={10} /> 貼上
              </button>
              <button onClick={() => fileRef.current?.click()} className="text-[9.5px] text-ink-3 border border-ink/15 rounded px-1.5 py-0.5 flex items-center gap-1">
                <Upload size={10} /> 檔案
              </button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={e => onChangeCode(e.target.value)}
            rows={3}
            placeholder="貼上領袖俾你嘅完整 JSON 或路線代碼…"
            className="w-full px-3 py-2.5 rounded-xl border border-ink/15 bg-[#fbf5e7] outline-none focus:border-forest/50 text-[11px] font-mono leading-relaxed placeholder:text-ink-4 placeholder:font-body resize-none"
          />
          <input ref={fileRef} type="file" accept=".json,application/json,text/plain"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }} />
        </div>

        <button
          onClick={() => setScanning(true)}
          className="press w-full h-12 rounded-2xl bg-forest text-paper text-[13px] font-semibold flex items-center justify-center gap-2"
        >
          <QrCode size={16} /> 掃描領袖 QR 即入
        </button>

        <button
          onClick={() => { void playDemo(); }}
          className="press w-full h-10 rounded-2xl border border-forest/25 bg-forest/5 text-forest text-[11.5px] flex items-center justify-center gap-1.5"
        >
          <Sparkles size={13} /> 未有路線？原地試玩示範路線
        </button>
      </Card>

      {preview && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-3.5">
          <div className="flex items-center gap-2">
            <span className="stamp text-forest">ROUTE FOUND</span>
            <span className="h-px flex-1 bg-ink/10" />
            <span className="font-mono text-[9px] text-ink-4">{preview.id}</span>
          </div>
          <h3 className="text-[15px] text-ink mt-1.5">{preview.name}</h3>
          <div className="grid grid-cols-4 gap-1 mt-2.5">
            {[
              { l: '站數', v: sum?.steps ?? 0 },
              { l: 'AR', v: sum?.ar ?? 0 },
              { l: '距離', v: `${(sum?.distanceKm ?? 0).toFixed(2)}km` },
              { l: '限時', v: preview.timerMode === 'countdown' ? `${preview.timeLimitMin}分` : '計時' },
            ].map(s => (
              <div key={s.l} className="rounded-lg border border-ink/10 bg-paper-2/50 py-1.5 text-center">
                <p className="font-mono text-[12px] font-bold text-ink-2">{s.v}</p>
                <p className="text-[8.5px] text-ink-4 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
          {preview.leaderNote && (
            <p className="text-[10.5px] text-ink-3 mt-2 leading-relaxed">📝 {preview.leaderNote}</p>
          )}
          {sum && sum.ar < sum.steps && (
            <p className="text-[9px] text-clay-2 mt-2 flex items-center gap-1">
              <AlertTriangle size={10} /> 有 {sum.steps - sum.ar} 個符號未錨定，只會用文字提示
            </p>
          )}
          <Btn className="mt-3" onClick={join} icon={<ArrowRight size={16} />}>開始任務</Btn>
        </motion.div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-clay/30 bg-clay/8 px-3 py-2.5 text-[11px] text-clay-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />{error}
        </div>
      )}

      {!preview && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] text-ink-2">最近完成</h2>
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          {results.length === 0 ? (
            <Empty icon={<Compass size={20} />} title="未完成過任務" sub="完成路線後，成績同用時會顯示喺呢度。" />
          ) : (
            results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-ink/12 bg-[#faf3e3]/70 px-3 py-2.5">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${r.success ? 'bg-forest/10 text-forest' : 'bg-clay/10 text-clay-2'}`}>
                  {r.success ? <Trophy size={14} /> : <AlertTriangle size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-ink truncate">{r.playerName}</p>
                  <p className="text-[9px] text-ink-4 font-mono">
                    {r.correctSteps}/{r.totalSteps} 正確 · {r.timeUp ? '超時' : '完成'}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-ink-3 flex items-center gap-1">
                  <Clock size={10} />{formatDuration(r.elapsedMs)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <Note>
        領袖需要將 <strong className="text-ink-2">JSON 檔</strong>（例如 <span className="font-mono text-[10px]">{preview ? trailFileName(preview) : 'route.json'}</span>）
        或 QR 交俾你。入到路線之後，手機全程唔會顯示下一個符號嘅位置。
      </Note>

      {scanning && (
        <QrScanner
          onClose={() => setScanning(false)}
          onResult={handleQr}
        />
      )}

      <div className="flex items-center justify-center gap-1.5 text-[9px] font-mono tracking-widest text-ink-4 pt-1">
        <FileJson size={10} /> JSON ROUTE · OFFLINE READY
      </div>
    </div>
  );
};

export default PlayerPage;
