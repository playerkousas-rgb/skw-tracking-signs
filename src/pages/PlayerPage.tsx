import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ClipboardPaste, Crosshair, History } from 'lucide-react';
import { getGameById, getAllResults, saveGame, GameConfig } from '../lib/gameStore';

const PP: React.FC = () => {
  const nav = useNavigate();
  const [ch, setCh] = useState('');
  const [nm, setNm] = useState('');
  const [err, setErr] = useState('');

  // --- 強效解碼：支援 Base64 中的中文字元 ---
  const importGameData = (str: string): GameConfig | null => {
    try {
      const binString = atob(str);
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
      const jsonString = new TextDecoder().decode(bytes);
      return JSON.parse(jsonString) as GameConfig;
    } catch (e) {
      console.error("解碼失敗:", e);
      return null;
    }
  };

  const join = () => {
    setErr('');
    const input = ch.trim();
    const playerName = nm.trim();

    if (!playerName) {
      setErr('請輸入代號');
      return;
    }
    if (!input) {
      setErr('請輸入頻道 ID 或地圖代碼');
      return;
    }

    // --- 智能識別邏輯 ---
    
    // 1. 如果輸入是長代碼 (Base64 模式)
    // 判斷條件：長度大於 40 且不含空白，或包含 JSON 特徵字串 eyJ
    if (input.length > 40 || input.includes('eyJ')) {
      const importedGame = importGameData(input);
      
      if (importedGame) {
        // 彈出密碼驗證 (與領袖端設定的密碼對比)
        const userPwd = prompt(`找到路線：${importedGame.name}\n請輸入頻道密碼以載入：`);
        
        if (userPwd === importedGame.password) {
          saveGame(importedGame); // 存入本地 LocalStorage 供 Play 頁面讀取
          nav(`/play/${importedGame.id}?name=${encodeURIComponent(playerName)}`);
        } else if (userPwd !== null) {
          setErr('頻道密碼錯誤，載入失敗');
        }
        return;
      } else {
        setErr('地圖代碼格式無效');
        return;
      }
    }

    // 2. 如果是短 ID (本地已存遊戲查找模式)
    const g = getGameById(input.toUpperCase());
    if (!g) {
      setErr('找不到此頻道 — 請確認 ID 或貼入完整代碼');
      return;
    }
    
    nav(`/play/${g.id}?name=${encodeURIComponent(playerName)}`);
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCh(text.trim()); 
      setErr(''); // 貼上後清除錯誤提示
    } catch {
      setErr('無法讀取剪貼簿，請手動貼上');
    }
  };

  const recent = getAllResults().slice(-3).reverse();

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      {/* 標題區 */}
      <div className="px-6 pt-10 pb-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-green/10 flex items-center justify-center border border-green/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <Compass size={24} className="text-green" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-ice tracking-tight">成員行動</h1>
            <p className="text-steel text-xs tracking-widest uppercase opacity-70">Member Radar System</p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6 flex-1">
        {/* 代號輸入 */}
        <div className="space-y-2">
          <label className="text-ice text-[10px] font-bold uppercase tracking-widest ml-1">Your Identity / 你的代號</label>
          <input
            type="text"
            value={nm}
            onChange={e => setNm(e.target.value)}
            placeholder="例如：小狼 A"
            className="w-full px-5 py-4 bg-navy-900/50 rounded-2xl border border-green/10 text-ice placeholder:text-steel/40 focus:outline-none focus:border-green/40 focus:ring-1 focus:ring-green/40 transition-all"
          />
        </div>

        {/* 頻道輸入 */}
        <div className="space-y-2">
          <div className="flex justify-between items-end ml-1">
            <label className="text-ice text-[10px] font-bold uppercase tracking-widest">Channel ID or Code / 頻道代碼</label>
            <span className="text-[9px] text-steel opacity-60">支援貼入長代碼</span>
          </div>
          <div className="relative group">
            <textarea
              value={ch}
              onChange={e => setCh(e.target.value)}
              placeholder="貼入領袖分享的地圖代碼..."
              rows={ch.length > 30 ? 4 : 2}
              className="w-full px-5 py-4 bg-navy-900/50 rounded-2xl border border-green/10 text-green font-mono text-sm tracking-tighter placeholder:text-steel/30 focus:outline-none focus:border-green/40 transition-all resize-none overflow-hidden"
            />
            <button
              onClick={paste}
              className="absolute right-3 bottom-3 p-2 text-steel hover:text-green transition-colors bg-navy-950/80 rounded-xl border border-white/5 shadow-xl"
            >
              <ClipboardPaste size={18} />
            </button>
          </div>
        </div>

        {err && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red/10 text-red text-xs px-4 py-3 rounded-xl border border-red/20 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-red animate-pulse" />
            {err}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={join}
          className="w-full py-5 bg-gradient-to-br from-green to-green-dark text-navy-950 rounded-2xl font-heading font-black text-lg flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(34,197,94,0.2)] active:shadow-none transition-all"
        >
          <Crosshair size={22} strokeWidth={3} />
          開始雷達追蹤
        </motion.button>

        {/* 最近紀錄 */}
        {recent.length > 0 && (
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3 ml-1">
              <History size={14} className="text-steel" />
              <h3 className="text-steel text-[10px] font-bold uppercase tracking-widest">Recent / 最近紀錄</h3>
            </div>
            <div className="space-y-2">
              {recent.map((r, i) => (
                <div key={i} className="bg-navy-900/30 rounded-2xl border border-white/5 p-4 flex items-center justify-between group hover:border-cyan/30 transition-colors">
                  <div>
                    <div className="text-ice text-sm font-bold">{r.playerName}</div>
                    <div className="text-steel text-[10px] mt-0.5">上次得分: <span className="text-cyan">{r.totalScore}</span></div>
                  </div>
                  <button 
                    onClick={() => nav(`/play/${r.gameId}?name=${encodeURIComponent(r.playerName)}`)}
                    className="px-4 py-2 bg-navy-800 text-cyan text-xs font-bold rounded-xl border border-cyan/20 group-hover:bg-cyan group-hover:text-navy-950 transition-all shadow-sm"
                  >
                    重新載入
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => { if (!nm.trim()) { setErr('請先輸入代號'); return; } nav(`/quiz?name=${encodeURIComponent(nm.trim())}`); }}
          className="w-full py-4 bg-navy-900/50 text-gold/80 rounded-2xl font-heading font-bold text-xs border border-gold/10 hover:border-gold/30 hover:text-gold transition-all mt-4"
        >
          進入術科快速測驗模式
        </button>
      </div>

      <div className="h-10" />
    </div>
  );
};

export default PP;
