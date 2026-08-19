import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Share2, Check, Footprints, ArrowRight, QrCode, X, Copy, Link as LinkIcon, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { getAllTrails, deleteTrail, encodeTrail, getBestTimeMs, formatDuration, isFieldTrail, trapSteps, Trail } from '../lib/trailStore';
import SignSVG from '../components/SignSVG';
import { getSignById } from '../data/trackingSigns';

const LeaderPage: React.FC = () => {
  const nav = useNavigate();
  const [trails, setTrails] = useState<Trail[]>(getAllTrails());
  const [copiedTag, setCopiedTag] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [shareTrail, setShareTrail] = useState<Trail | null>(null);
  const [shareCode, setShareCode] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [shareErr, setShareErr] = useState('');

  const refresh = () => setTrails(getAllTrails());

  const copyText = async (text: string, tag: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(''), 2000);
  };

  const handleDelete = (id: string) => { deleteTrail(id); refresh(); setConfirmDelete(null); };

  const handleCopy = async (trail: Trail) => {
    await copyText(encodeTrail(trail), `code-${trail.id}`);
  };

  const openShare = async (trail: Trail) => {
    const code = encodeTrail(trail);
    const url = `${window.location.origin}/player?code=${encodeURIComponent(code)}`;
    setShareTrail(trail);
    setShareCode(code);
    setShareLink(url);
    setQrDataUrl('');
    setShareErr('');
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 260,
        color: { dark: '#02133E', light: '#FFFFFF' },
      });
      setQrDataUrl(dataUrl);
    } catch (e) {
      console.error(e);
      setShareErr('QR Code 產生失敗，請改用複製連結或代碼。');
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl || !shareTrail) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${shareTrail.id}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-heading font-bold text-ice">設計路線</h1>
        <span className="text-xs text-steel bg-navy-800 px-2 py-0.5 rounded-full">{trails.length} 條</span>
      </div>
      <p className="text-xs text-steel -mt-2 mb-1">設定符號順序 + 箭頭方向 + 隱藏信物，分享代碼或 QR Code 給隊員沿途追蹤</p>

      <button onClick={() => nav('/leader/create')}
        className="w-full bg-gradient-to-r from-green-dark to-navy-800 text-ice rounded-2xl p-4 flex items-center gap-4 border border-green/20 box-glow-green card-hover">
        <div className="w-12 h-12 rounded-xl bg-green/10 flex items-center justify-center"><Plus size={22} className="text-green" /></div>
        <div className="flex-1 text-left">
          <h3 className="font-heading font-semibold text-base text-green glow-green">建立新路線</h3>
          <p className="text-steel text-xs">自訂符號順序、箭頭方向、隱藏信物、防迷路安全點</p>
        </div>
        <ArrowRight size={20} className="text-green" />
      </button>

      <h2 className="font-heading font-semibold text-sm text-ice-dim pt-2">已建立路線</h2>

      {trails.length === 0 ? (
        <div className="text-center py-10">
          <Footprints size={40} className="text-steel mx-auto mb-3 opacity-50" />
          <p className="text-steel text-sm">尚未建立任何路線</p>
          <p className="text-steel text-xs mt-1">點擊上方按鈕建立第一條追蹤路線</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trails.map((trail, i) => {
            return (
              <motion.div key={trail.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-navy-800/60 rounded-2xl border border-cyan/8 overflow-hidden">
                <div className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center shrink-0"><Footprints size={18} className="text-cyan" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-sm text-ice truncate">{trail.name}</h3>
                    <p className="text-[10px] text-steel flex flex-wrap items-center gap-x-1.5">
                      <span>{isFieldTrail(trail) ? '📍實地' : '🎬模擬'}</span>·
                      <span>{(trail.timerMode ?? 'stopwatch') === 'countdown' && trail.timeLimitMin
                        ? `⏳限時${trail.timeLimitMin}分` : '⏱計時'}</span>·
                      <span>{trail.quizMode !== false ? '✏️判斷題' : '👁觀察'}</span>·
                      <span>{trail.id}</span>
                    </p>
                    {(getBestTimeMs(trail.id) != null || trapSteps(trail).length > 0) && (
                      <p className="text-[10px] mt-0.5">
                        {getBestTimeMs(trail.id) != null && <span className="text-gold">🏅最佳 {formatDuration(getBestTimeMs(trail.id)!)}</span>}
                        {trapSteps(trail).length > 0 && <span className="text-red ml-2">⚠️{trapSteps(trail).length}陷阱</span>}
                      </p>
                    )}
                  </div>
                </div>
                {/* Steps preview */}
                <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto">
                  {trail.steps.map((step, j) => {
                    const s = getSignById(step.signId);
                    const dirArrow = step.direction === 'left' ? '←' : step.direction === 'right' ? '→' : step.direction === 'forward' ? '↑' : '';
                    return (
                      <React.Fragment key={j}>
                        {j > 0 && <ArrowRight size={10} className="text-steel shrink-0" />}
                        <div className="shrink-0 flex flex-col items-center">
                          <SignSVG signId={step.signId} size={28} glow={false} />
                          <span className="text-[7px] text-steel mt-0.5 text-center leading-tight">
                            {dirArrow}{s?.nameZh}
                            {step.paces != null && step.paces > 0 ? ` ${step.paces}步` : ''}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 border-t border-cyan/5">
                  <button onClick={() => handleCopy(trail)}
                    className={`py-2.5 flex items-center justify-center gap-1.5 text-xs font-heading font-medium transition-colors ${copiedTag === `code-${trail.id}` ? 'text-green bg-green/5' : 'text-cyan hover:bg-cyan/5'}`}>
                    {copiedTag === `code-${trail.id}` ? <Check size={14} /> : <Copy size={14} />}{copiedTag === `code-${trail.id}` ? '已複製' : '代碼'}
                  </button>
                  <button onClick={() => openShare(trail)}
                    className="py-2.5 flex items-center justify-center gap-1.5 text-xs font-heading font-medium text-gold hover:bg-gold/5 transition-colors border-l border-cyan/5">
                    <QrCode size={14} />QR分享
                  </button>
                  <button onClick={() => setConfirmDelete(trail.id)}
                    className="py-2.5 flex items-center justify-center gap-1.5 text-xs font-heading font-medium text-red hover:bg-red/5 transition-colors border-l border-cyan/5">
                    <Trash2 size={14} />刪除
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="bg-navy-800/40 rounded-2xl p-4 border border-cyan/5 space-y-1.5">
        <h3 className="font-heading font-semibold text-xs text-ice-dim">📋 使用說明</h3>
        <ol className="text-[11px] text-steel space-y-0.5 list-decimal list-inside">
          <li>建立路線 → 按順序加入符號，設定箭頭方向及隱藏信物</li>
          <li>可設定一個防迷路安全點／集合點；不要標示符號位置</li>
          <li>分享「完整路線代碼」或 QR Code 給隊員（QR 會自動帶入路線）</li>
          <li>隊員掃描 QR → 輸入名稱 → 開始追蹤；地圖只顯示自己位置和安全點</li>
          <li>路線儲存在瀏覽器 localStorage，<strong className="text-steel-light">72小時後自動清除</strong></li>
        </ol>
      </div>

      <AnimatePresence>
        {shareTrail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShareTrail(null)} />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-navy-900 rounded-3xl border border-cyan/20 p-5 w-full max-w-sm max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-heading font-bold text-ice">分享路線</h3>
                  <p className="text-[10px] text-steel">{shareTrail.name} · {shareTrail.id}</p>
                </div>
                <button onClick={() => setShareTrail(null)} className="p-1 text-steel hover:text-ice"><X size={20} /></button>
              </div>

              <div className="bg-white rounded-2xl p-3 flex items-center justify-center min-h-[284px]">
                {qrDataUrl ? <img src={qrDataUrl} alt="Route QR Code" className="w-[260px] h-[260px]" /> : <p className="text-navy-900 text-sm">正在產生 QR Code...</p>}
              </div>
              {shareErr && <p className="mt-2 text-[11px] text-red text-center">{shareErr}</p>}
              <p className="mt-3 text-[11px] text-steel leading-relaxed text-center">
                隊員掃描後會進入任務簡報，可見計時模式及最佳時間；地圖只作定位防迷路，符號要行到觸發才會標示。
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => copyText(shareLink, `link-${shareTrail.id}`)}
                  className="py-2.5 rounded-xl bg-cyan/10 text-cyan border border-cyan/20 text-xs font-heading font-semibold flex items-center justify-center gap-1.5">
                  {copiedTag === `link-${shareTrail.id}` ? <Check size={14} /> : <LinkIcon size={14} />}{copiedTag === `link-${shareTrail.id}` ? '已複製' : '複製連結'}
                </button>
                <button onClick={() => copyText(shareCode, `modal-code-${shareTrail.id}`)}
                  className="py-2.5 rounded-xl bg-navy-800 text-steel-light border border-steel/10 text-xs font-heading font-semibold flex items-center justify-center gap-1.5">
                  {copiedTag === `modal-code-${shareTrail.id}` ? <Check size={14} /> : <Share2 size={14} />}{copiedTag === `modal-code-${shareTrail.id}` ? '已複製' : '複製代碼'}
                </button>
              </div>
              <button onClick={downloadQr} disabled={!qrDataUrl}
                className="w-full mt-2 py-2.5 rounded-xl bg-gold/10 text-gold border border-gold/20 text-xs font-heading font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40">
                <Download size={14} />下載 QR 圖片
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-navy-900 rounded-2xl border border-red/20 p-5 w-full max-w-xs text-center">
              <Trash2 size={28} className="text-red mx-auto mb-3" />
              <h3 className="font-heading font-bold text-ice text-base mb-1">確認刪除</h3>
              <p className="text-steel text-sm mb-4">此操作無法還原</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 bg-navy-800 text-steel rounded-xl font-heading font-semibold text-sm">取消</button>
                <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 bg-red/10 text-red border border-red/20 rounded-xl font-heading font-semibold text-sm">確認刪除</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-[9px] text-steel pt-3 tracking-widest">COPYRIGHT © 2026 SCOUT SYSTEM</p>
    </div>
  );
};

export default LeaderPage;
