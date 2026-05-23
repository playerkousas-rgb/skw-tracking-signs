import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ClipboardPaste, LogIn, History, Gift, QrCode } from 'lucide-react';
import { getTrailById, decodeTrail, saveTrail, getAllResults } from '../lib/trailStore';

const PlayerPage: React.FC = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [code, setCode] = useState(sp.get('code') || '');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const codeFromUrl = sp.get('code');
    if (codeFromUrl) {
      setCode(codeFromUrl);
      setError('');
    }
  }, [sp]);

  const handleJoin = () => {
    setError('');
    if (!playerName.trim()) { setError('請輸入你的代號（隊員名稱）'); return; }
    if (!code.trim()) { setError('請輸入路線代碼'); return; }

    const input = code.trim();

    // Encoded full trail code (from copy/paste or QR link)
    if (input.length > 40 || input.includes('eyJ')) {
      const decoded = decodeTrail(input);
      if (decoded) { saveTrail(decoded); nav(`/play/${decoded.id}?name=${encodeURIComponent(playerName.trim())}`); return; }
      setError('路線代碼格式無效，請檢查是否完整複製或重新掃描 QR');
      return;
    }

    // Trail ID only works on the same browser/device that created or imported the trail.
    const trail = getTrailById(input);
    if (!trail) { setError('找不到此路線 — 若你使用另一部手機，請掃描QR或貼上「完整路線代碼」'); return; }
    nav(`/play/${trail.id}?name=${encodeURIComponent(playerName.trim())}`);
  };

  const handlePaste = async () => {
    try { const text = await navigator.clipboard.readText(); setCode(text.trim()); setError(''); }
    catch { setError('無法讀取剪貼簿，請手動貼上'); }
  };

  const recentResults = getAllResults().slice(-3).reverse();
  const cameFromQr = Boolean(sp.get('code'));

  return (
    <div className="space-y-4">
      <div className="text-center pt-2 pb-1">
        <Compass size={36} className="text-cyan mx-auto mb-2" />
        <h1 className="text-xl font-heading font-bold text-ice glow-cyan">沿途追蹤</h1>
        <p className="text-xs text-steel mt-1">輸入路線代碼，觀察符號箭頭，尋找隱藏信物</p>
      </div>

      {cameFromQr && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-green/5 border border-green/10 rounded-xl text-green text-xs flex items-center gap-2">
          <QrCode size={15} className="shrink-0" /> 已由 QR Code 帶入路線代碼，請輸入你的代號後開始。
        </motion.div>
      )}

      <div>
        <label className="block text-xs text-steel mb-1.5 font-heading">你的代號</label>
        <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="例如：小狼A、隊長"
          className="w-full px-4 py-3 bg-navy-800/70 rounded-xl border border-cyan/10 text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30 transition-colors text-sm" />
      </div>

      <div>
        <label className="block text-xs text-steel mb-1.5 font-heading">路線代碼</label>
        <div className="flex gap-2">
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="貼上完整路線代碼或輸入本機路線ID"
            className="flex-1 px-4 py-3 bg-navy-800/70 rounded-xl border border-cyan/10 text-ice placeholder:text-steel focus:outline-none focus:border-cyan/30 transition-colors text-sm font-mono" />
          <button onClick={handlePaste} className="px-3 py-3 bg-navy-800/70 rounded-xl border border-cyan/10 text-steel hover:text-cyan transition-colors"><ClipboardPaste size={18} /></button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red/5 border border-red/10 rounded-xl text-red text-xs text-center">{error}</motion.div>
      )}

      <button onClick={handleJoin}
        className="w-full py-4 bg-gradient-to-r from-green/20 to-cyan/10 text-cyan rounded-2xl font-heading font-bold text-lg border border-cyan/20 box-glow-cyan card-hover flex items-center justify-center gap-2">
        <LogIn size={20} />開始追蹤
      </button>

      {recentResults.length > 0 && (
        <div>
          <h3 className="text-xs text-steel font-heading mb-2 flex items-center gap-1.5"><History size={12} />最近追蹤記錄</h3>
          <div className="space-y-1">
            {recentResults.map((r, i) => (
              <div key={i} className="bg-navy-800/40 rounded-lg px-3 py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-xs text-ice font-heading">{r.playerName}</span>
                  <span className="text-[10px] text-steel ml-2">{r.trailId}</span>
                </div>
                <span className={`text-xs font-heading font-bold ${r.correctSteps === r.totalSteps ? 'text-green' : r.correctSteps >= r.totalSteps / 2 ? 'text-gold' : 'text-red'}`}>
                  {r.correctSteps}/{r.totalSteps}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-navy-800/40 rounded-xl p-3 border border-cyan/5">
        <p className="text-[10px] text-steel leading-relaxed">
          💡 <strong className="text-steel-light">玩法：</strong>領袖給你 QR Code 或完整路線代碼，沿途觀察符號+箭頭方向→判斷應做什麼→答對後<Gift size={10} className="inline text-gold" />揭露隱藏信物→繼續前進直到「已回家」。
        </p>
      </div>
    </div>
  );
};

export default PlayerPage;
