import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, Share2, Copy, QrCode, Download, Link2, Footprints, ArrowRight, Crosshair,
  FileJson, Trophy, AlertTriangle, Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  getAllTrails, deleteTrail, encodeTrail, getBestTimeMs, formatDuration,
  trailToJson, trailFileName, trailSummary, getAllResults, Trail,
} from '../lib/trailStore';
import SignSVG from '../components/SignSVG';
import { Btn, Empty, Note, PageHeader, Sheet, Stat } from '../components/ui';

const LeaderPage: React.FC = () => {
  const nav = useNavigate();
  const [trails, setTrails] = useState<Trail[]>(getAllTrails());
  const [shareTrail, setShareTrail] = useState<Trail | null>(null);
  const [qr, setQr] = useState('');
  const [qrErr, setQrErr] = useState('');
  const [copied, setCopied] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const results = getAllResults();

  const refresh = () => setTrails(getAllTrails());

  const copy = async (text: string, tag: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(tag);
    window.setTimeout(() => setCopied(''), 1800);
  };

  const openShare = async (trail: Trail) => {
    setShareTrail(trail);
    setQr('');
    setQrErr('');
    try {
      const url = `${window.location.origin}/player?code=${encodeURIComponent(encodeTrail(trail))}`;
      const data = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M', margin: 1, width: 420,
        color: { dark: '#26211a', light: '#fbf5e7' },
      });
      setQr(data);
    } catch {
      setQr('');
      setQrErr('路線太長，QR 產生失敗 — 請改用「複製 JSON」或下載 JSON 檔。');
    }
  };

  const downloadJson = (trail: Trail) => {
    const blob = new Blob([trailToJson(trail)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = trailFileName(trail);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareFile = async (trail: Trail) => {
    const file = new File([trailToJson(trail)], trailFileName(trail), { type: 'application/json' });
    const nav2 = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (navigator.share && nav2.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: trail.name }); return; } catch { /* cancelled */ }
    }
    downloadJson(trail);
  };

  const shareLink = (trail: Trail) =>
    `${window.location.origin}/player?code=${encodeURIComponent(encodeTrail(trail))}`;

  return (
    <div className="space-y-3.5 pb-4">
      <PageHeader
        kicker="LEADER MODE"
        title="領袖路線"
        sub="先行一次，喺現場用相機放低虛擬符號，再將路線以 JSON／QR 交俾隊員。"
        right={
          <span className="shrink-0 mt-1 flex items-center gap-1 text-[10px] text-ink-3 border border-ink/15 rounded-full px-2 py-1">
            <Footprints size={11} /> {trails.length} 條
          </span>
        }
      />

      <button
        onClick={() => nav('/leader/create')}
        className="press w-full relative overflow-hidden rounded-[20px] bg-forest text-paper p-4 text-left border border-forest-2 shadow-[0_14px_28px_-18px_rgba(29,49,35,1)]"
      >
        <div className="absolute right-0 top-0 bottom-0 w-28 opacity-20"
          style={{ background: 'radial-gradient(circle at 80% 30%, #f2c14e, transparent 65%)' }} />
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl border border-hud-amber/40 bg-hud-amber/10 flex items-center justify-center">
            <Plus size={20} className="text-hud-amber" />
          </span>
          <div className="flex-1">
            <p className="font-heading text-[15px]">建立新路線</p>
            <p className="text-[10px] text-paper/65 mt-0.5">排符號 · 現場放置 · 觸發距離 · 計時</p>
          </div>
          <ArrowRight size={17} className="text-paper/70" />
        </div>
      </button>

      <div className="flex gap-2">
        <div className="card-flat flex-1 px-3 py-2.5 flex items-center gap-3">
          <Stat value={results.filter(r => r.success).length} label="成功完成" tone="text-forest" />
          <span className="w-px h-6 bg-ink/10" />
          <Stat value={trails.reduce((n, t) => n + trailSummary(t).ar, 0)} label="已錨定符號" tone="text-clay" />
          <span className="w-px h-6 bg-ink/10" />
          <Stat value={new Set(results.map(r => r.playerName)).size} label="參加隊員" tone="text-gold" />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <h2 className="text-[13px] text-ink-2">我的路線</h2>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      {trails.length === 0 ? (
        <Empty
          icon={<Footprints size={20} />}
          title="仲未有路線"
          sub="建立第一條路線：排好符號，然後行一次現場放低虛擬記號。"
        />
      ) : (
        <div className="space-y-2.5">
          {trails.map((trail, i) => {
            const sum = trailSummary(trail);
            const best = getBestTimeMs(trail.id);
            return (
              <motion.div
                key={trail.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.2) }}
                className="card overflow-hidden"
              >
                <button onClick={() => nav(`/leader/create?edit=${trail.id}`)} className="w-full text-left px-3.5 pt-3 pb-2">
                  <div className="flex items-start gap-3">
                    <div className="flex -space-x-2 shrink-0 pt-0.5">
                      {trail.steps.slice(0, 3).map((s, k) => (
                        <span key={k} className="w-7 h-7 rounded-full border border-ink/10 bg-[#efe4cd] flex items-center justify-center overflow-hidden">
                          <SignSVG signId={s.signId} size={26} glow={false} />
                        </span>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13.5px] font-medium text-ink truncate">{trail.name}</h3>
                      <p className="font-mono text-[9px] text-ink-4 mt-0.5">{trail.id}</p>
                    </div>
                    <span className="font-mono text-[9px] text-ink-4 border border-ink/12 rounded px-1.5 py-0.5 shrink-0">
                      {sum.steps} 站
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {sum.ar > 0 ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-forest/25 bg-forest/8 text-forest">
                        AR {sum.ar}
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-clay/30 bg-clay/5 text-clay-2 flex items-center gap-1">
                        <AlertTriangle size={9} /> 未放置
                      </span>
                    )}
                    {sum.traps > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded border border-clay/30 text-clay-2">陷阱 {sum.traps}</span>}
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-ink/15 text-ink-3">
                      {(trail.timerMode ?? 'stopwatch') === 'countdown' ? `限時 ${trail.timeLimitMin} 分` : '計時'}
                    </span>
                    {trail.quizMode !== false && <span className="text-[9px] px-1.5 py-0.5 rounded border border-ink/15 text-ink-3">判斷題</span>}
                    {best != null && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-gold/35 text-gold flex items-center gap-1">
                        <Trophy size={9} /> {formatDuration(best)}
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex border-t border-ink/10">
                  <button onClick={() => nav(`/leader/place/${trail.id}`)} className="press flex-1 py-2.5 text-[10.5px] text-forest flex items-center justify-center gap-1">
                    <Crosshair size={13} /> 放置
                  </button>
                  <span className="w-px bg-ink/10 my-2" />
                  <button onClick={() => openShare(trail)} className="press flex-1 py-2.5 text-[10.5px] text-forest flex items-center justify-center gap-1">
                    <Share2 size={13} /> 分享
                  </button>
                  <span className="w-px bg-ink/10 my-2" />
                  <button onClick={() => nav(`/play/${trail.id}?name=測試`)} className="press flex-1 py-2.5 text-[10.5px] text-ink-2 flex items-center justify-center gap-1">
                    <Users size={13} /> 預覽
                  </button>
                  <span className="w-px bg-ink/10 my-2" />
                  <button onClick={() => setConfirmDelete(trail.id)} className="press flex-1 py-2.5 text-[10.5px] text-clay-2 flex items-center justify-center gap-1">
                    <Trash2 size={13} /> 刪除
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Note tone="warn">
        符號座標只喺觸發半徑內先會俾隊員見到。分享 JSON 前請確認：<strong>唔好</strong>預先貼出符號位置或路線圖。
      </Note>

      {/* 分享 */}
      <Sheet open={!!shareTrail} onClose={() => setShareTrail(null)} title={shareTrail ? `分享「${shareTrail.name}」` : ''}>
        {shareTrail && (
          <div className="space-y-3.5">
            <div className="flex justify-center">
              <div className="p-3 rounded-2xl bg-[#fbf5e7] border border-ink/15 shadow-sm">
                {qr ? <img src={qr} alt="路線 QR" className="w-[210px] h-[210px]" /> : (
                  <div className="w-[210px] h-[210px] flex items-center justify-center px-4 text-center text-ink-4 text-[10px] leading-relaxed">
                    {qrErr || 'QR 產生中…'}
                  </div>
                )}
              </div>
            </div>
            <p className="text-center text-[10px] text-ink-3 -mt-1">隊員用手機掃描即可匯入路線同符號座標</p>

            <div className="rounded-xl border border-ink/12 bg-paper-2/50 p-3">
              <p className="stamp text-ink-4 mb-1">路線代碼</p>
              <p className="font-mono text-[12px] text-ink break-all leading-relaxed">{shareTrail.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Btn variant="secondary" icon={<Copy size={14} />} onClick={() => copy(shareLink(shareTrail), 'link')}>
                {copied === 'link' ? '已複製' : '複製連結'}
              </Btn>
              <Btn variant="secondary" icon={<FileJson size={14} />} onClick={() => copy(trailToJson(shareTrail), 'json')}>
                {copied === 'json' ? '已複製' : '複製 JSON'}
              </Btn>
              <Btn variant="ghost" icon={<Download size={14} />} onClick={() => downloadJson(shareTrail)}>下載 JSON</Btn>
              <Btn variant="ghost" icon={<Link2 size={14} />} onClick={() => copy(encodeTrail(shareTrail), 'code')}>
                {copied === 'code' ? '已複製' : '複製代碼'}
              </Btn>
            </div>

            <Btn icon={<Share2 size={15} />} onClick={() => { void shareFile(shareTrail); }}>
              用系統分享 JSON 檔
            </Btn>

            <div className="flex items-center gap-1.5 text-[9.5px] text-ink-4 justify-center">
              <QrCode size={11} /> JSON 包含符號 GPS 座標，請只分享俾自己隊員
            </div>
          </div>
        )}
      </Sheet>

      {/* 刪除確認 */}
      <Sheet open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="刪除路線？">
        <p className="text-[12px] text-ink-3 leading-relaxed">
          呢個動作會刪除路線同已錨定嘅符號座標，無法復原。
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>取消</Btn>
          <Btn variant="danger" icon={<Trash2 size={14} />} onClick={() => {
            if (confirmDelete) { deleteTrail(confirmDelete); refresh(); }
            setConfirmDelete(null);
          }}>刪除</Btn>
        </div>
      </Sheet>
    </div>
  );
};

export default LeaderPage;
