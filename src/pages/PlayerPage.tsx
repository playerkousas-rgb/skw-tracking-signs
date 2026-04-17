import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ClipboardPaste, Crosshair, ScanLine } from 'lucide-react';
import { getGameById, getAllResults, saveGame, GameConfig } from '../lib/gameStore';

const PP: React.FC = () => {
  const nav = useNavigate();
  const [ch, setCh] = useState('');
  const [nm, setNm] = useState('');
  const [err, setErr] = useState('');

  // 核心功能：解碼領袖分享的長代碼 (Base64)
  const importGameData = (str: string): GameConfig | null => {
    try {
      return JSON.parse(decodeURIComponent(atob(str))) as GameConfig;
    } catch (e) {
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
    
    // 1. 如果輸入的是「長代碼」(Base64 導入模式)
    if (input.length > 20) {
      const importedGame = importGameData(input);
      if (importedGame) {
        // 彈出密碼驗證
        const userPwd = prompt(`找到路線：${importedGame.name}\n請輸入頻道密碼：`);
        if (userPwd === importedGame.password) {
          saveGame(importedGame); // 將整份地圖存入成員本地 LocalStorage
          nav(`/play/${importedGame.id}?name=${encodeURIComponent(playerName)}`);
        } else {
          setErr('頻道密碼錯誤，無法載入地圖');
        }
        return;
      }
    }

    // 2. 如果是普通的「短 ID」(本地查找模式)
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
      setCh(text.trim()); // 貼上時不自動轉大寫，因為 Base64 大小寫敏感
    } catch {
      setErr('無法讀取剪貼簿');
    }
  };

  const recent = getAllResults().slice(-3).reverse();

  return (
    <div className="min-h-[calc(100vh-5rem)] grid-bg">
      <div className="px-5 pt-8 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-green-dark flex items-center justify-center border border-green/20">
            <Compass size={20} className="text-green" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-ice glow-green">成員行動</h1>
            <p className="text-steel text-xs">頻道登入 · 雷達追蹤 · 尋寶探索</p>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* 代號輸入 */}
        <div>
          <label className="block text-ice text-xs font-medium mb-1.5">你的代號</label>
          <input
            type="text"
            value={nm}
            onChange={e => setNm(e.target.value)}
            placeholder="輸入代號"
            className="w-full px-4 py-3 bg-navy-800 rounded-xl border border-green/10 text-ice placeholder:text-steel focus:outline-none focus:border-green/30"
          />
        </div>

        {/* 頻道 ID / 代碼輸入 */}
        <div>
          <label className="block text-ice text-xs font-medium mb-1.5">頻道 ID 或地圖代碼</label>
          <p className="text-steel text-[10px] mb-2">貼入領袖分享的一長串「地圖代碼」可直接開始</p>
          <div className="relative">
            <textarea
              value={ch}
              onChange={e => setCh(e.target.value)}
              placeholder="貼入代碼或輸入 ID"
              rows={ch.length > 20 ? 3 : 1}
              className="w-full px-4 py-4 bg-navy-800 rounded-xl border border-green/10 text-center font-mono text-sm tracking-wider text-green placeholder:text-steel/30 focus:outline-none focus:border-green/30 resize-none"
            />
            <button
              onClick={paste}
              className="absolute right-3 bottom-3 p-1.5 text-steel hover:text-green transition-colors bg-navy-900/80 rounded-md"
            >
              <ClipboardPaste size={16} />
            </button>
          </div>
        </div>

        {err && <div className="bg-red/10 text-red text-xs px-4 py-2 rounded-lg border border-red/20">{err}</div>}

        <motion.button
          whileTap={{ scale: .97 }}
          onClick={join}
          className="w-full py-4 bg-gradient-to-r from-green-dark to-navy-700 text-green rounded-2xl font-heading font-bold text-lg flex items-center justify-center gap-2 border border-green/20 box-glow-green"
        >
          <Crosshair size={20} />開始追蹤
        </motion.button>

        {/* 最近紀錄 */}
        {recent.length > 0 && (
          <div>
            <h3 className="text-steel text-xs mb-2">最近紀錄</h3>
            {recent.map((r, i) => (
              <div key={i} className="bg-navy-800/50 rounded-lg border border-cyan/5 p-2.5 flex items-center justify-between mb-1.5">
                <div>
                  <div className="text-ice text-sm">{r.playerName}</div>
                  <div className="text-steel text-[10px]">得分: {r.totalScore}</div>
                </div>
                <button 
                  onClick={() => nav(`/play/${r.gameId}?name=${encodeURIComponent(r.playerName)}`)}
                  className="px-3 py-1 bg-cyan/10 text-cyan text-[10px] rounded-md border border-cyan/20"
                >
                  回歸
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => { if (!nm.trim()) { setErr('請先輸入代號'); return; } nav(`/quiz?name=${encodeURIComponent(nm.trim())}`); }}
          className="w-full py-3 bg-navy-800 text-gold rounded-xl font-heading font-semibold text-sm border border-gold/10 hover:border-gold/20 transition-colors"
        >
          快速測驗
        </button>
      </div>
      <div className="h-8" />
    </div>
  );
};

export default PP;
