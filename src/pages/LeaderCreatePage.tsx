import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, MoveUp, MoveDown, Edit3, MapPin, ArrowUp, ArrowLeft as ArrowLeftIcon, ArrowRight,
  Timer as TimerIcon, Hourglass, Crosshair, Loader2, AlertTriangle, Check, ShieldCheck, ScanLine,
} from 'lucide-react';
import SignSVG from '../components/SignSVG';
import CameraStage from '../components/CameraStage';
import ArSign from '../components/ArSign';
import { trackingSigns, getSignById } from '../data/trackingSigns';
import { useCamera } from '../lib/camera';
import { usePose } from '../lib/pose';
import { compassLabel, pad3 } from '../lib/geo';
import {
  saveTrail, getTrailById, generateTrailId, DEFAULT_TRIGGER_DISTANCE, getCurrentPosition,
  TrailStep, Trail, Direction, TimerMode,
} from '../lib/trailStore';
import { Btn, Card, Note, PageHeader, Sheet } from '../components/ui';
import { beep, vibrate } from '../lib/speech';

interface Draft {
  index: number | null;
  signId: number;
  direction: Direction;
  paces: number;
  hiddenContent: string;
  note: string;
  trap: boolean;
  lat?: number;
  lng?: number;
  bearing?: number;
}

const DIRS: { value: Direction; label: string; icon: React.ReactNode }[] = [
  { value: 'forward', label: '前方', icon: <ArrowUp size={13} /> },
  { value: 'left', label: '左方', icon: <ArrowLeftIcon size={13} /> },
  { value: 'right', label: '右方', icon: <ArrowRight size={13} /> },
];

const CATS: { key: 'direction' | 'warning' | 'info' | 'end'; label: string }[] = [
  { key: 'direction', label: '方向指示' },
  { key: 'warning', label: '警告標記' },
  { key: 'info', label: '資訊提示' },
  { key: 'end', label: '結束標記' },
];

const LeaderCreatePage: React.FC = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const existing = sp.get('edit') ? getTrailById(sp.get('edit')!) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [leaderNote, setLeaderNote] = useState(existing?.leaderNote ?? '');
  const [steps, setSteps] = useState<TrailStep[]>(existing?.steps ?? []);
  const [triggerDistance, setTriggerDistance] = useState(existing?.triggerDistance ?? DEFAULT_TRIGGER_DISTANCE);
  const [timerMode, setTimerMode] = useState<TimerMode>(existing?.timerMode ?? 'stopwatch');
  const [timeLimitMin, setTimeLimitMin] = useState(existing?.timeLimitMin ?? 15);
  const [quizMode, setQuizMode] = useState(existing?.quizMode !== false);
  const [arMode, setArMode] = useState(existing?.arMode !== false);
  const [safetyNote, setSafetyNote] = useState(existing?.safetyNote ?? '');
  const [safety, setSafety] = useState<{ lat: number; lng: number } | null>(
    existing?.safetyLat != null && existing?.safetyLng != null
      ? { lat: existing.safetyLat, lng: existing.safetyLng }
      : null
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [flash, setFlash] = useState(false);
  const [safetyBusy, setSafetyBusy] = useState(false);

  const cam = useCamera();
  const pose = usePose(placing);

  const draftSign = draft ? getSignById(draft.signId) : null;

  const openNew = (signId: number) => {
    const sign = getSignById(signId);
    setPickerOpen(false);
    setDraft({
      index: null, signId,
      direction: 'forward',
      paces: sign?.needsPaces ? 8 : 0,
      hiddenContent: '', note: '', trap: false,
    });
  };

  const openEdit = (i: number) => {
    const s = steps[i];
    setDraft({
      index: i, signId: s.signId,
      direction: s.direction ?? 'forward',
      paces: s.paces ?? 0,
      hiddenContent: s.hiddenContent ?? '',
      note: s.note ?? '',
      trap: !!s.trap,
      lat: s.lat, lng: s.lng, bearing: s.bearing,
    });
  };

  const commitDraft = () => {
    if (!draft) return;
    const sign = getSignById(draft.signId);
    const step: TrailStep = { signId: draft.signId };
    if (sign?.needsDirection) step.direction = draft.direction;
    if (sign?.needsPaces && draft.paces > 0) step.paces = draft.paces;
    if (draft.hiddenContent.trim()) step.hiddenContent = draft.hiddenContent.trim();
    if (draft.note.trim()) step.note = draft.note.trim();
    if (draft.lat != null && draft.lng != null) { step.lat = draft.lat; step.lng = draft.lng; }
    if (draft.bearing != null) step.bearing = draft.bearing;
    if (draft.trap && sign?.isWarning) step.trap = true;

    setSteps(prev => {
      if (draft.index == null) return [...prev, step];
      const n = [...prev];
      n[draft.index] = step;
      return n;
    });
    setDraft(null);
  };

  const dropHere = useCallback(() => {
    if (pose.lat == null || pose.lng == null) {
      setError('仲未收到 GPS — 行去空曠啲嘅位置再試');
      return;
    }
    setDraft(d => (d ? {
      ...d,
      lat: pose.lat!,
      lng: pose.lng!,
      bearing: pose.heading ?? undefined,
    } : d));
    setPlacing(false);
    cam.stop();
    beep('correct');
    vibrate([30, 40, 30]);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1200);
  }, [pose.lat, pose.lng, pose.heading, cam]);

  const save = () => {
    setError('');
    const seqIndexes = steps.map((s, i) => ({ s, i })).filter(x => !x.s.trap);
    if (!name.trim()) { setError('請輸入路線名稱'); return; }
    if (seqIndexes.length < 2) { setError('最少要有 2 個順序符號（起點同「已回家」）'); return; }
    const last = seqIndexes[seqIndexes.length - 1].s;
    if (last.signId !== 4) { setError('順序路線最後一個符號必須係「已回家」'); return; }
    if (timerMode === 'countdown' && timeLimitMin < 1) { setError('倒計時最少 1 分鐘'); return; }

    const trail: Trail = {
      v: 6,
      id: existing?.id ?? generateTrailId(),
      name: name.trim(),
      steps,
      createdAt: existing?.createdAt ?? Date.now(),
      triggerDistance,
      timerMode,
      ...(timerMode === 'countdown' ? { timeLimitMin } : {}),
      quizMode,
      arMode,
      ...(leaderNote.trim() ? { leaderNote: leaderNote.trim() } : {}),
      ...(safety ? { safetyLat: safety.lat, safetyLng: safety.lng } : {}),
      ...(safetyNote.trim() ? { safetyNote: safetyNote.trim() } : {}),
    };
    saveTrail(trail);
    setSaved(true);
    const needPlacement = steps.some(s => s.lat == null || s.lng == null);
    window.setTimeout(() => nav(needPlacement ? `/leader/place/${trail.id}` : '/leader'), 650);
  };

  const placedCount = steps.filter(s => s.lat != null && s.lng != null).length;
  const seqCount = steps.filter(s => !s.trap).length;

  const previewProjection = { xPct: 50, yPct: 62 };

  return (
    <div className="space-y-3.5 pb-6">
      <PageHeader
        kicker={existing ? 'EDIT ROUTE' : 'NEW ROUTE'}
        title={existing ? '編輯路線' : '建立路線'}
        sub="先排符號，再行一次現場逐個放低。有座標嘅符號先會用相機 AR 顯示。"
        back={() => nav('/leader')}
      />

      {/* 名稱 */}
      <Card className="p-3.5 space-y-3">
        <div>
          <label className="stamp text-ink-4 block mb-1">路線名稱</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：大棠樹林追蹤線"
            className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-[#fbf5e7] outline-none focus:border-forest/50 text-[13px] text-ink placeholder:text-ink-4"
          />
        </div>
        <div>
          <label className="stamp text-ink-4 block mb-1">領袖備註（隊員簡報會見到）</label>
          <input
            value={leaderNote}
            onChange={e => setLeaderNote(e.target.value)}
            placeholder="例：全程約 1.2 公里，請帶水"
            className="w-full h-10 px-3 rounded-xl border border-ink/12 bg-[#fbf5e7] outline-none focus:border-forest/50 text-[12px] text-ink placeholder:text-ink-4"
          />
        </div>
      </Card>

      {/* 任務設定 */}
      <Card className="p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <TimerIcon size={13} className="text-clay" />
          <h3 className="text-[12.5px] text-ink-2">任務模式</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {([
            { v: 'stopwatch' as TimerMode, label: '計時', sub: '挑戰最佳時間', icon: <TimerIcon size={14} /> },
            { v: 'countdown' as TimerMode, label: '倒計時', sub: '歸零即失敗', icon: <Hourglass size={14} /> },
          ]).map(o => (
            <button
              key={o.v}
              onClick={() => setTimerMode(o.v)}
              className={`press rounded-xl border p-2.5 text-left ${timerMode === o.v
                ? 'border-forest/45 bg-forest/8' : 'border-ink/12 bg-paper-2/40'}`}
            >
              <span className={timerMode === o.v ? 'text-forest' : 'text-ink-4'}>{o.icon}</span>
              <p className={`text-[12px] font-medium mt-1 ${timerMode === o.v ? 'text-forest-2' : 'text-ink-2'}`}>{o.label}</p>
              <p className="text-[9px] text-ink-4 mt-0.5">{o.sub}</p>
            </button>
          ))}
        </div>

        {timerMode === 'countdown' && (
          <div className="flex items-center gap-2 rounded-xl border border-clay/25 bg-clay/5 p-2.5">
            <span className="text-[10px] text-ink-3">限時</span>
            <button onClick={() => setTimeLimitMin(m => Math.max(5, m - 5))}
              className="press w-8 h-8 rounded-full border border-ink/15 text-ink-2">−</button>
            <span className="font-mono text-[16px] font-bold text-clay-2 w-12 text-center">{timeLimitMin}</span>
            <button onClick={() => setTimeLimitMin(m => Math.min(180, m + 5))}
              className="press w-8 h-8 rounded-full border border-ink/15 text-ink-2">+</button>
            <span className="text-[10px] text-ink-3">分鐘</span>
            <div className="ml-auto flex gap-1">
              {[10, 15, 30].map(m => (
                <button key={m} onClick={() => setTimeLimitMin(m)}
                  className={`text-[9px] px-1.5 py-1 rounded border ${timeLimitMin === m ? 'border-clay/40 text-clay-2 bg-clay/10' : 'border-ink/12 text-ink-4'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] text-ink-3 flex items-center gap-1"><Crosshair size={11} className="text-forest" />觸發半徑</span>
            <span className="font-mono text-[12px] text-forest font-bold">{triggerDistance} m</span>
          </div>
          <input type="range" min={3} max={25} step={1} value={triggerDistance}
            onChange={e => setTriggerDistance(Number(e.target.value))} className="w-full" />
          <p className="text-[9px] text-ink-4 mt-0.5">行到符號呢個距離內，隊員先可以舉機發現。建議 6–10 米。</p>
        </div>

        <div className="flex gap-2">
          <Toggle label="判斷題" sub="發現後要答對應對" on={quizMode} onChange={() => setQuizMode(v => !v)} />
          <Toggle label="AR 顯示" sub="用相機睇符號" on={arMode} onChange={() => setArMode(v => !v)} />
        </div>
      </Card>

      {/* 符號序列 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-[13px] text-ink-2">符號序列</h2>
          <span className="text-[9px] font-mono text-ink-4">{seqCount} 站 · {placedCount} 已錨定</span>
          <span className="h-px flex-1 bg-ink/10" />
          <button onClick={() => setPickerOpen(true)}
            className="press flex items-center gap-1 h-8 px-2.5 rounded-full bg-forest text-paper text-[11px]">
            <Plus size={13} /> 加入
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="stitch px-4 py-8 text-center">
            <ScanLine size={22} className="text-ink-4 mx-auto mb-2" />
            <p className="text-[12px] text-ink-2">未有符號</p>
            <p className="text-[10px] text-ink-4 mt-1">加入第一個記號，再喺現場放置。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((s, i) => {
              const sign = getSignById(s.signId);
              if (!sign) return null;
              const anchored = s.lat != null && s.lng != null;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`card px-3 py-2.5 ${s.trap ? 'border-clay/25' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[9px] shrink-0 ${
                      s.trap ? 'bg-clay/10 text-clay-2' : 'bg-forest/10 text-forest'}`}>
                      {s.trap ? '!' : i + 1}
                    </span>
                    <SignSVG signId={s.signId} size={40} glow={false} direction={s.direction} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-ink truncate">{sign.nameZh}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {anchored ? (
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded border border-forest/25 bg-forest/8 text-forest flex items-center gap-0.5">
                            <MapPin size={8} /> AR · {pad3(s.bearing ?? 0)}°
                          </span>
                        ) : (
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded border border-clay/25 text-clay-2">未錨定</span>
                        )}
                        {s.paces ? <span className="text-[8.5px] px-1.5 py-0.5 rounded border border-ink/15 text-ink-3">{s.paces} 步</span> : null}
                        {s.hiddenContent && <span className="text-[8.5px] px-1.5 py-0.5 rounded border border-ink/15 text-ink-3">📦 信物</span>}
                        {s.trap && <span className="text-[8.5px] px-1.5 py-0.5 rounded border border-clay/30 text-clay-2">陷阱</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setSteps(p => { const n = [...p]; if (i > 0) [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}
                        className="press p-1.5 text-ink-4" aria-label="上移"><MoveUp size={13} /></button>
                      <button onClick={() => setSteps(p => { const n = [...p]; if (i < n.length - 1) [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n; })}
                        className="press p-1.5 text-ink-4" aria-label="下移"><MoveDown size={13} /></button>
                      <button onClick={() => openEdit(i)} className="press p-1.5 text-forest" aria-label="編輯"><Edit3 size={13} /></button>
                      <button onClick={() => setSteps(p => p.filter((_, j) => j !== i))} className="press p-1.5 text-clay-2" aria-label="刪除"><X size={14} /></button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 安全點 */}
      <Card className="p-3.5 space-y-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-forest" />
          <h3 className="text-[12.5px] text-ink-2">安全集合點</h3>
          <span className="text-[9px] text-ink-4 ml-auto">防迷路用</span>
        </div>
        {safety ? (
          <div className="flex items-center justify-between rounded-lg border border-forest/25 bg-forest/6 px-2.5 py-2">
            <span className="font-mono text-[10px] text-forest">
              {safety.lat.toFixed(5)}, {safety.lng.toFixed(5)}
            </span>
            <button onClick={() => setSafety(null)} className="text-[9px] text-clay-2 border border-clay/25 rounded px-1.5 py-0.5">移除</button>
          </div>
        ) : (
          <button
            onClick={async () => {
              setSafetyBusy(true); setError('');
              try {
                const p = await getCurrentPosition();
                setSafety({ lat: p.lat, lng: p.lng });
              } catch (e) {
                setError(e instanceof Error ? e.message : '定位失敗');
              } finally { setSafetyBusy(false); }
            }}
            disabled={safetyBusy}
            className="press w-full h-10 rounded-xl border border-forest/25 bg-forest/6 text-forest text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {safetyBusy ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
            {safetyBusy ? '定位中…' : '用目前位置作安全點'}
          </button>
        )}
        <input value={safetyNote} onChange={e => setSafetyNote(e.target.value)}
          placeholder="安全點說明：例：入口涼亭，迷路返呢度"
          className="w-full h-9 px-2.5 rounded-lg border border-ink/12 bg-[#fbf5e7] outline-none text-[11px] placeholder:text-ink-4" />
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-clay/30 bg-clay/8 px-3 py-2.5 text-[11px] text-clay-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />{error}
        </div>
      )}

      <Btn onClick={save} disabled={saved} icon={saved ? <Check size={15} /> : undefined}>
        {saved
          ? '已儲存'
          : placedCount < seqCount
            ? '儲存並開始現場放置'
            : existing ? '儲存變更' : '儲存路線'}
      </Btn>

      {placedCount < seqCount && seqCount > 0 && (
        <Note tone="warn">
          仲有 {seqCount - placedCount} 個符號未錨定。未錨定嘅符號隊員會見唔到 AR 投影，只可以用文字提示。
        </Note>
      )}

      {/* 符號選擇 */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="選擇追蹤符號" maxH="90vh">
        <div className="space-y-4">
          {CATS.map(cat => (
            <div key={cat.key}>
              <p className="stamp text-ink-4 mb-1.5">{cat.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {trackingSigns.filter(s => s.category === cat.key).map(s => (
                  <button key={s.id} onClick={() => openNew(s.id)}
                    className="press flex items-center gap-2 rounded-xl border border-ink/12 bg-[#fbf5e7] p-2 text-left">
                    <SignSVG signId={s.id} size={38} glow={false} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11px] text-ink truncate">{s.nameZh}</span>
                      <span className="block text-[8.5px] text-ink-4 font-mono">{s.nameEn}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sheet>

      {/* 符號設定 */}
      <Sheet open={!!draft} onClose={() => setDraft(null)} title={draft?.index == null ? '設定符號' : '編輯符號'}>
        {draft && draftSign && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-3 rounded-xl border border-ink/12 bg-[#efe4cd] p-3">
              <SignSVG signId={draft.signId} size={64} glow={false} direction={draftSign.needsDirection ? draft.direction : undefined} />
              <div>
                <p className="text-[13px] font-medium text-ink">{draftSign.nameZh}</p>
                <p className="text-[10px] text-ink-3 mt-0.5 leading-snug">{draftSign.action}</p>
              </div>
            </div>

            {draftSign.needsDirection && (
              <div>
                <p className="stamp text-ink-4 mb-1">箭頭方向</p>
                <div className="flex gap-2">
                  {DIRS.map(d => (
                    <button key={d.value} onClick={() => setDraft({ ...draft, direction: d.value })}
                      className={`press flex-1 h-10 rounded-xl border text-[11px] flex items-center justify-center gap-1 ${
                        draft.direction === d.value ? 'bg-forest text-paper border-forest' : 'border-ink/15 text-ink-3'}`}>
                      {d.icon}{d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {draftSign.needsPaces && (
              <div>
                <p className="stamp text-ink-4 mb-1">步數</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setDraft({ ...draft, paces: Math.max(1, draft.paces - 1) })}
                    className="press w-9 h-9 rounded-full border border-ink/15 text-ink-2">−</button>
                  <span className="font-mono text-[16px] font-bold text-ink w-10 text-center">{draft.paces}</span>
                  <button onClick={() => setDraft({ ...draft, paces: draft.paces + 1 })}
                    className="press w-9 h-9 rounded-full border border-ink/15 text-ink-2">+</button>
                  <span className="text-[10px] text-ink-4">步</span>
                </div>
              </div>
            )}

            <div>
              <p className="stamp text-ink-4 mb-1">隱藏訊息／信物（答對後顯示）</p>
              <input value={draft.hiddenContent} onChange={e => setDraft({ ...draft, hiddenContent: e.target.value })}
                placeholder={draftSign.category === 'end' ? '例：恭喜！去涼亭搵領袖領獎章' : '例：檢查哨密碼 SKW2026'}
                className="w-full h-10 px-3 rounded-xl border border-ink/12 bg-[#fbf5e7] outline-none text-[11px] placeholder:text-ink-4" />
            </div>

            {draftSign.isWarning && (
              <button onClick={() => setDraft({ ...draft, trap: !draft.trap })}
                className={`press w-full flex items-center justify-between rounded-xl border p-2.5 ${
                  draft.trap ? 'border-clay/35 bg-clay/8' : 'border-ink/12'}`}>
                <span className="text-left">
                  <span className={`block text-[11px] font-medium ${draft.trap ? 'text-clay-2' : 'text-ink-2'}`}>設為陷阱</span>
                  <span className="block text-[9px] text-ink-4 mt-0.5">唔跟順序，行近即彈警告</span>
                </span>
                <span className={`w-9 h-5 rounded-full relative ${draft.trap ? 'bg-clay/60' : 'bg-ink/15'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${draft.trap ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
              </button>
            )}

            {/* AR 放置 */}
            <div className={`rounded-xl border p-3 ${draft.lat != null ? 'border-forest/30 bg-forest/6' : 'border-dashed border-ink/25'}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <ScanLine size={12} className="text-forest" />
                <p className="text-[11px] font-medium text-ink-2">虛擬符號位置</p>
              </div>
              {draft.lat != null && draft.lng != null ? (
                <>
                  <p className="font-mono text-[10px] text-forest">
                    {draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}
                  </p>
                  <p className="text-[9px] text-ink-4 mt-0.5">
                    方位 {pad3(draft.bearing ?? 0)}° {compassLabel(draft.bearing ?? null)}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setPlacing(true)} className="press flex-1 h-8 rounded-lg border border-forest/30 text-forest text-[10px]">重新放置</button>
                    <button onClick={() => setDraft({ ...draft, lat: undefined, lng: undefined, bearing: undefined })}
                      className="press flex-1 h-8 rounded-lg border border-ink/15 text-ink-3 text-[10px]">清除</button>
                  </div>
                </>
              ) : (
                <button onClick={() => setPlacing(true)}
                  className="press w-full h-10 rounded-lg bg-forest text-paper text-[11px] flex items-center justify-center gap-1.5">
                  <Crosshair size={13} /> 行到現場，開相機放置
                </button>
              )}
              <p className="text-[8.5px] text-ink-4 mt-1.5 leading-relaxed">
                隊員行到觸發半徑以內，舉機先會見到呢個符號。位置只會存喺路線 JSON 入面。
              </p>
            </div>

            <Btn onClick={commitDraft} icon={<Check size={15} />}>
              {draft.index == null ? '加入路線' : '儲存修改'}
            </Btn>
          </div>
        )}
      </Sheet>

      {/* ── AR 放置相機 ── */}
      {placing && draft && (
        <CameraStage
          cam={cam}
          heading={pose.heading}
          pitch={pose.pitch}
          roll={pose.roll}
          compass={pose.compass}
          accuracy={pose.accuracy}
          title={`放置「${draftSign?.nameZh ?? ''}」`}
          subtitle={`第 ${(draft.index ?? steps.length) + 1} 站 · 站喺符號位置，手機指向隊員行過嚟嘅方向`}
          onExit={() => { cam.stop(); setPlacing(false); }}
          onEngage={() => { void pose.requestCompass(); }}
          guide={{
            title: '放置虛擬符號',
            body: '企喺符號位置，將佢錨定落地面。',
            steps: [
              '企定喺要放符號嘅位置',
              '手機指向隊員行過嚟嘅方向',
              '按「喺呢度放低符號」',
            ],
          }}
          footer={
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-hud-dim">
                  {pose.lat != null ? `${pose.lat.toFixed(5)}, ${pose.lng!.toFixed(5)}` : '等待 GPS…'}
                </span>
                <span className={pose.accuracy != null && pose.accuracy > 30 ? 'text-hud-amber' : 'text-hud-green'}>
                  {pose.accuracy != null ? `±${Math.round(pose.accuracy)}m` : '—'}
                </span>
              </div>
              <button
                onClick={dropHere}
                disabled={pose.lat == null}
                className="press w-full h-12 rounded-2xl bg-hud-amber text-hud font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {pose.gpsState === 'locating' ? <><Loader2 size={16} className="animate-spin" /> 等 GPS…</> : <><Crosshair size={16} /> 喺呢度放低符號</>}
              </button>
              <p className="text-center text-[9px] text-hud-dim">
                方位 {pad3(pose.heading ?? 0)}° {compassLabel(pose.heading)} · 符號畫喺地面 · 隊員要停低對準先見到
              </p>
            </div>
          }
        >
          <div className="absolute inset-0 pointer-events-none">
            <ArSign
              signId={draft.signId}
              xPct={previewProjection.xPct}
              yPct={previewProjection.yPct}
              scale={1}
              dist={2}
              label="預覽"
              scanning
            />
          </div>
        </CameraStage>
      )}

      {/* 放置成功閃光 */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none bg-[#f2c14e]/20"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="px-5 py-3 rounded-2xl bg-hud/90 border border-hud-green/50 text-hud-green font-mono text-[11px] tracking-widest">
                ✓ 已錨定
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Toggle: React.FC<{ label: string; sub: string; on: boolean; onChange: () => void }> = ({ label, sub, on, onChange }) => (
  <button onClick={onChange}
    className={`press flex-1 flex items-center justify-between rounded-xl border p-2.5 text-left ${on ? 'border-forest/35 bg-forest/6' : 'border-ink/12'}`}>
    <span>
      <span className={`block text-[11px] font-medium ${on ? 'text-forest-2' : 'text-ink-3'}`}>{label}</span>
      <span className="block text-[8.5px] text-ink-4 mt-0.5">{sub}</span>
    </span>
    <span className={`w-8 h-4.5 rounded-full relative shrink-0 ${on ? 'bg-forest/60' : 'bg-ink/15'}`} style={{ height: 18 }}>
      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${on ? 'left-[16px]' : 'left-0.5'}`} />
    </span>
  </button>
);

export default LeaderCreatePage;
