import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, CheckCircle, XCircle, Trophy, Gift, AlertTriangle, Volume2, VolumeX,
  Timer as TimerIcon, Hourglass, Play, RotateCcw, Home, ShieldCheck, ScanLine,
  Compass, Footprints, Target, MapPin, Eye,
} from 'lucide-react';
import SignSVG from '../components/SignSVG';
import Confetti from '../components/Confetti';
import CameraStage from '../components/CameraStage';
import ArSign from '../components/ArSign';
import { useCamera } from '../lib/camera';
import { usePose } from '../lib/pose';
import { distanceM, bearingDeg, projectGroundTarget, pad3, compassLabel } from '../lib/geo';
import {
  getTrailById, saveResult, getBestTimeMs, formatDuration,
  seqSteps, trapSteps, hasCoords, DEFAULT_TRIGGER_DISTANCE,
  Trail, TrailStep,
} from '../lib/trailStore';
import { getSignById, trackingSigns } from '../data/trackingSigns';
import { speak, setVoiceEnabled, beep, vibrate, warmUpSpeech } from '../lib/speech';
import { Btn, Card, Note, Sheet } from '../components/ui';

type Phase = 'briefing' | 'tracking' | 'done' | 'timeup';

/** 移動門檻（m/s）：高過呢個速度就唔會累積掃描，一定要停低 */
const MOVE_LIMIT = 1.0;

interface Option { text: string; correct: boolean }

function buildOptions(signId: number): Option[] {
  const sign = getSignById(signId);
  if (!sign) return [];
  const others = trackingSigns.filter(s => s.id !== signId).sort(() => Math.random() - 0.5).slice(0, 3);
  return [...others.map(s => ({ text: s.action, correct: false })), { text: sign.action, correct: true }]
    .sort(() => Math.random() - 0.5);
}

const TrailWalkPage: React.FC = () => {
  const nav = useNavigate();
  const { trailId } = useParams<{ trailId: string }>();
  const [sp] = useSearchParams();
  const playerName = sp.get('name') || '隊員';

  // 喺 lazy initializer 讀一次 localStorage（唔會每次 render 讀）
  const [trail] = useState<Trail | undefined>(() => (trailId ? getTrailById(trailId) : undefined));
  const seq = useMemo(() => (trail ? seqSteps(trail) : []), [trail]);
  const traps = useMemo(() => (trail ? trapSteps(trail) : []), [trail]);
  const triggerDistance = trail?.triggerDistance ?? DEFAULT_TRIGGER_DISTANCE;
  const isCountdown = (trail?.timerMode ?? 'stopwatch') === 'countdown' && (trail?.timeLimitMin ?? 0) > 0;
  const limitMs = isCountdown ? (trail?.timeLimitMin ?? 0) * 60000 : 0;

  const [phase, setPhase] = useState<Phase>('briefing');
  const [step, setStep] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [finalMs, setFinalMs] = useState(0);
  const [answers, setAnswers] = useState<{ signId: number; correct: boolean }[]>([]);

  const [arOpen, setArOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [scan, setScan] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [trapHit, setTrapHit] = useState<TrailStep | null>(null);
  const hitTraps = useRef<Set<number>>(new Set());

  const cam = useCamera();
  const pose = usePose(phase === 'tracking');
  const current = seq[step];
  const currentSign = current ? getSignById(current.signId) : null;
  const prev = step > 0 ? seq[step - 1] : null;
  const prevSign = prev ? getSignById(prev.signId) : null;

  const elapsedMs = startedAt != null ? (phase === 'tracking' ? nowTick - startedAt : finalMs) : 0;
  const remainingMs = isCountdown ? Math.max(0, limitMs - elapsedMs) : null;
  const bestMs = trail ? getBestTimeMs(trail.id) : null;

  const dist = useMemo(() => {
    if (!current || !hasCoords(current) || pose.lat == null || pose.lng == null) return null;
    return distanceM({ lat: pose.lat, lng: pose.lng }, { lat: current.lat!, lng: current.lng! });
  }, [current, pose.lat, pose.lng]);

  const inRange = dist != null && dist <= triggerDistance;

  useEffect(() => { warmUpSpeech(); }, []);
  useEffect(() => { setVoiceEnabled(soundOn); }, [soundOn]);

  const finish = useCallback((timeUp: boolean, usedMs: number) => {
    if (!trail) return;
    const correct = answers.filter(a => a.correct).length;
    saveResult({
      playerName, trailId: trail.id, answers,
      totalSteps: seq.length, correctSteps: correct,
      completedAt: Date.now(), elapsedMs: usedMs, timeUp, success: !timeUp,
    });
    setFinalMs(usedMs);
    setPhase(timeUp ? 'timeup' : 'done');
    cam.stop();
    setArOpen(false);
    if (timeUp) { beep('alarm'); vibrate([300, 150, 300]); speak('時間到，任務結束'); }
    else { beep('finish'); vibrate([80, 60, 120]); speak('恭喜，完成追蹤任務'); }
  }, [trail, answers, playerName, seq.length, cam]);

  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; });

  // 計時器
  useEffect(() => {
    if (phase !== 'tracking' || startedAt == null) return;
    const tick = () => {
      const now = Date.now();
      setNowTick(now);
      if (!isCountdown) return;
      const rem = limitMs - (now - startedAt);
      if (rem <= 0) finishRef.current(true, limitMs);
    };
    tick();
    const t = window.setInterval(tick, 500);
    return () => window.clearInterval(t);
  }, [phase, startedAt, isCountdown, limitMs]);

  // 陷阱：行近即觸發
  useEffect(() => {
    if (phase !== 'tracking' || pose.lat == null || pose.lng == null) return;
    for (let i = 0; i < traps.length; i++) {
      const t = traps[i];
      if (!hasCoords(t) || hitTraps.current.has(i)) continue;
      if (distanceM({ lat: pose.lat, lng: pose.lng }, { lat: t.lat!, lng: t.lng! }) <= triggerDistance) {
        hitTraps.current.add(i);
        setTrapHit(t);
        beep('wrong');
        vibrate([120, 80, 120]);
        speak('警告，呢條路有問題');
        break;
      }
    }
  }, [phase, pose.lat, pose.lng, traps, triggerDistance]);

  const start = async () => {
    setPhase('tracking');
    setStartedAt(Date.now());
    speak('任務開始，觀察地面追蹤符號');
    warmUpSpeech();
  };

  const openScope = async () => {
    setArOpen(true);
    setLocked(false);
    setScan(0);
    await cam.start();
  };

  // 對準鎖定
  const projection = useMemo(() => {
    if (!current || !hasCoords(current) || pose.lat == null || pose.lng == null) return null;
    const target = { lat: current.lat!, lng: current.lng! };
    const heading = pose.heading ?? bearingDeg({ lat: pose.lat, lng: pose.lng }, target);
    return projectGroundTarget({
      user: { lat: pose.lat, lng: pose.lng },
      target,
      heading,
      cameraPitch: pose.pitch,
      targetHeight: current.heightM ?? 0,
    });
  }, [current, pose.lat, pose.lng, pose.heading, pose.pitch]);

  const projectionRef = useRef(projection);
  useEffect(() => { projectionRef.current = projection; }, [projection]);
  const headingRef = useRef(pose.heading);
  useEffect(() => { headingRef.current = pose.heading; }, [pose.heading]);
  const speedRef = useRef(pose.speed);
  useEffect(() => { speedRef.current = pose.speed; }, [pose.speed]);
  // 移動太快（跑緊／踩單車）就唔會累積掃描 — 一定要停低望
  const moving = pose.speed != null && pose.speed > MOVE_LIMIT;

  // 掃描進度：水平（方位差）＋ 垂直（準星高度）都要對準，先會累積
  useEffect(() => {
    if (!arOpen) { setScan(0); return; }
    const id = window.setInterval(() => {
      const p = projectionRef.current;
      if (!p || headingRef.current == null) return;
      const running = speedRef.current != null && speedRef.current > MOVE_LIMIT;
      const aimed =
        !running &&
        p.visible &&
        Math.abs(p.relBearing) < 8 &&
        Math.abs(p.yPct - 50) < 18;
      setScan(prev => (aimed ? Math.min(1, prev + 0.085) : Math.max(0, prev - 0.22)));
    }, 110);
    return () => window.clearInterval(id);
  }, [arOpen]);

  // 進度滿先算「掃到」
  useEffect(() => {
    if (!arOpen || revealed) return;
    if (scan >= 1 && !locked) {
      setLocked(true);
      beep('found');
      vibrate([40, 30, 60]);
      speak('發現追蹤符號');
    } else if (scan < 0.35 && locked) {
      setLocked(false);
    }
  }, [scan, locked, arOpen, revealed]);

  const reveal = (viaScan: boolean) => {
    if (revealed) return;
    setRevealed(true);
    setLocked(true);
    if (viaScan) { beep('found'); vibrate([40, 30, 60]); }
    window.setTimeout(() => {
      setArOpen(false);
      cam.stop();
      setOptions(buildOptions(current.signId));
      setQuizOpen(true);
      setPicked(null);
      setShowHidden(false);
    }, 700);
  };

  const revealRef = useRef(reveal);
  useEffect(() => { revealRef.current = reveal; });

  // 鎖定後保持對準 0.95 秒 → 自動讀取；一移開視線就會取消
  useEffect(() => {
    if (!arOpen || revealed || !locked) return;
    const t = window.setTimeout(() => revealRef.current(false), 950);
    return () => window.clearTimeout(t);
  }, [locked, arOpen, revealed]);

  const answer = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    const correct = options[i].correct;
    setAnswers(a => [...a, { signId: current.signId, correct }]);
    if (correct) { beep('correct'); vibrate([30, 30, 30]); } else { beep('wrong'); vibrate(120); }
  };

  const nextStep = () => {
    setQuizOpen(false);
    setRevealed(false);
    setLocked(false);
    setPicked(null);
    setOptions([]);
    if (step + 1 >= seq.length) {
      finish(false, startedAt != null ? Date.now() - startedAt : 0);
      return;
    }
    setStep(s => s + 1);
    speak('繼續追蹤下一個符號');
  };

  if (!trail) {
    return (
      <div className="min-h-screen paper-grain flex flex-col items-center justify-center px-6 text-center">
        <AlertTriangle size={34} className="text-clay mb-3" />
        <h1 className="text-[18px] text-ink">搵唔到呢條路線</h1>
        <p className="text-[12px] text-ink-3 mt-1.5">可能已過期（72 小時）或者未匯入。</p>
        <Btn className="mt-5 max-w-[220px]" onClick={() => nav('/player')}>返去匯入路線</Btn>
      </div>
    );
  }

  /* ───────────────── 簡報 ───────────────── */
  if (phase === 'briefing') {
    const arCount = seq.filter(hasCoords).length;
    return (
      <div className="min-h-screen paper-grain">
        <div className="h-safe-top" />
        <div className="mx-auto max-w-[520px] px-5 pt-4 pb-10 space-y-4">
          <button onClick={() => nav('/player')} className="press text-[11px] text-ink-3 flex items-center gap-1">
            <ArrowRight size={12} className="rotate-180" /> 返回
          </button>

          <div>
            <p className="stamp text-clay inline-block">MISSION BRIEF</p>
            <h1 className="text-[26px] leading-tight text-ink mt-2">{trail.name}</h1>
            <p className="text-[11px] text-ink-4 font-mono mt-1">{trail.id} · {playerName}</p>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { l: '記號', v: seq.length },
              { l: 'AR 錨定', v: arCount },
              { l: '陷阱', v: traps.length },
              { l: '模式', v: isCountdown ? `${trail.timeLimitMin}分` : '計時' },
            ].map(s => (
              <div key={s.l} className="card-flat py-2 text-center">
                <p className="font-mono text-[14px] font-bold text-forest">{s.v}</p>
                <p className="text-[8px] text-ink-4 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>

          {trail.leaderNote && (
            <Card className="p-3.5">
              <p className="stamp text-ink-4 mb-1">領袖的話</p>
              <p className="text-[12px] text-ink-2 leading-relaxed">{trail.leaderNote}</p>
            </Card>
          )}

          <Card className="p-3.5 space-y-2.5">
            <p className="stamp text-ink-4">任務須知</p>
            {[
              { icon: ScanLine, t: '符號唔喺地上', d: '佢係領袖放低嘅虛擬記號。行到觸發半徑，舉起手機望向地面先會見到。' },
              { icon: Compass, t: '跟住上一個指示行', d: '每個記號嘅應對動作就係去下一個記號嘅方法 — 唔會預先顯示位置。' },
              { icon: AlertTriangle, t: '小心陷阱記號', d: '警告類記號可能係陷阱，行近會自動彈出。' },
              { icon: ShieldCheck, t: '迷路就去安全點', d: trail.safetyNote || '有需要返去起點集合。' },
            ].map((r, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="w-7 h-7 rounded-full bg-forest/8 border border-forest/20 flex items-center justify-center shrink-0 text-forest">
                  <r.icon size={13} />
                </span>
                <div>
                  <p className="text-[11.5px] font-medium text-ink-2">{r.t}</p>
                  <p className="text-[10px] text-ink-3 mt-0.5 leading-relaxed">{r.d}</p>
                </div>
              </div>
            ))}
          </Card>

          <Note>
            呢個係<strong className="text-ink-2">追蹤</strong>，唔係尋寶。全程唔會有「距離／方向／冷熱」提示。
          </Note>

          <Btn onClick={start} icon={<Play size={16} />}>開始任務</Btn>
        </div>
      </div>
    );
  }

  /* ───────────────── 完成 ───────────────── */
  if (phase === 'done' || phase === 'timeup') {
    const correct = answers.filter(a => a.correct).length;
    const isBest = phase === 'done' && (bestMs == null || finalMs <= bestMs);
    return (
      <div className="min-h-screen paper-grain">
        {phase === 'done' && <Confetti pieces={36} />}
        <div className="h-safe-top" />
        <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10 space-y-4 text-center">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center border-2 ${
            phase === 'done' ? 'border-forest/40 bg-forest/10 text-forest' : 'border-clay/40 bg-clay/10 text-clay-2'}`}>
            {phase === 'done' ? <Trophy size={34} /> : <Hourglass size={32} />}
          </div>
          <div>
            <p className="stamp text-clay inline-block">{phase === 'done' ? 'MISSION COMPLETE' : 'TIME UP'}</p>
            <h1 className="text-[24px] text-ink mt-2">{phase === 'done' ? '任務完成' : '時間到'}</h1>
            <p className="text-[12px] text-ink-3 mt-1">{playerName} · {trail.name}</p>
          </div>

          <div className="card p-4 grid grid-cols-3 divide-x divide-ink/10">
            <div>
              <p className="font-mono text-[19px] font-bold text-ink">{formatDuration(finalMs)}</p>
              <p className="text-[8.5px] text-ink-4 mt-1">用時</p>
            </div>
            <div>
              <p className="font-mono text-[19px] font-bold text-forest">{correct}/{seq.length}</p>
              <p className="text-[8.5px] text-ink-4 mt-1">判斷正確</p>
            </div>
            <div>
              <p className="font-mono text-[19px] font-bold text-clay-2">{answers.filter(a => !a.correct).length}</p>
              <p className="text-[8.5px] text-ink-4 mt-1">答錯</p>
            </div>
          </div>

          {isBest && phase === 'done' && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[11px] text-gold">
              🏅 新最佳時間
            </div>
          )}

          <div className="space-y-2 pt-2">
            <Btn onClick={() => nav('/player')} icon={<Home size={15} />}>返去營地</Btn>
            <Btn variant="secondary" onClick={() => window.location.reload()} icon={<RotateCcw size={15} />}>再行一次</Btn>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────── 追蹤中 ───────────────── */
  const progress = ((step + (revealed ? 1 : 0)) / Math.max(seq.length, 1)) * 100;

  return (
    <div className="min-h-screen paper-grain">
      <div className="h-safe-top" />
      <div className="mx-auto max-w-[520px] px-4 pt-3 pb-8 space-y-3.5">

        {/* 頂列 */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="stamp text-clay inline-block">TRACKING</p>
            <h1 className="text-[16px] text-ink mt-1 truncate">{trail.name}</h1>
          </div>
          <button onClick={() => setSoundOn(v => !v)} className="press w-9 h-9 rounded-full border border-ink/15 flex items-center justify-center text-ink-3">
            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>

        {/* 計時 + 進度 */}
        <div className={`card px-3.5 py-2.5 flex items-center gap-3 ${isCountdown && (remainingMs ?? 0) < 60000 ? 'border-clay/40' : ''}`}>
          <div className="flex items-center gap-1.5">
            {isCountdown ? <Hourglass size={14} className="text-clay" /> : <TimerIcon size={14} className="text-forest" />}
            <span className={`font-mono text-[17px] font-bold tabular-nums ${isCountdown && (remainingMs ?? 0) < 60000 ? 'text-clay-2' : 'text-ink'}`}>
              {formatDuration(isCountdown ? remainingMs ?? 0 : elapsedMs)}
            </span>
          </div>
          <span className="h-5 w-px bg-ink/10" />
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
              <motion.div className="h-full bg-forest" animate={{ width: `${progress}%` }} transition={{ type: 'spring', damping: 22 }} />
            </div>
          </div>
          <span className="font-mono text-[10px] text-ink-3">{step + 1}/{seq.length}</span>
        </div>

        {/* 上一記號指示 */}
        {prev && prevSign && (
          <div className="rounded-2xl border border-forest/20 bg-forest/5 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <Footprints size={11} className="text-forest" />
              <p className="stamp text-forest">上一個指示</p>
            </div>
            <p className="text-[12px] text-forest-2 font-medium mt-1 leading-relaxed">
              {prevSign.action}
              {prev.paces ? <span className="text-[10px] text-ink-3"> · {prev.paces} 步</span> : null}
              {prev.direction ? <span className="text-[10px] text-ink-3"> · 箭頭{prev.direction === 'left' ? '向左' : prev.direction === 'right' ? '向右' : '向前'}</span> : null}
            </p>
          </div>
        )}

        {/* 現場卡 */}
        <div className="relative overflow-hidden rounded-[22px] border border-ink/15 bg-[#1b2a1f] text-[#ece0c2] p-5 min-h-[260px] flex flex-col">
          <div className="absolute inset-0 opacity-50"
            style={{ background: 'radial-gradient(80% 60% at 50% 110%, rgba(242,193,78,0.18), transparent 60%)' }} />
          <div className="absolute inset-0 hud-scanlines opacity-30" />

          <div className="relative flex items-center justify-between">
            <span className="hud-label text-hud-amber">SEARCHING · 第 {step + 1} 記號</span>
            <span className={`hud-label flex items-center gap-1 ${pose.gpsState === 'live' ? 'text-hud-green' : 'text-hud-amber'}`}>
              <MapPin size={9} /> GPS ±{pose.accuracy != null ? Math.round(pose.accuracy) : '—'}m
            </span>
          </div>

          <div className="relative flex-1 flex flex-col items-center justify-center gap-3 py-4">
            <div className={`w-16 h-16 rounded-full border flex items-center justify-center ${
              inRange ? 'border-hud-amber/70 bg-hud-amber/10 anim-breathe' : 'border-hud-ink/20'}`}>
              {inRange ? <Target size={26} className="text-hud-amber" /> : <Eye size={24} className="text-hud-dim" />}
            </div>
            <p className="text-center text-[13px] font-heading">
              {inRange ? '已進入符號範圍' : '沿指示前進，觀察地面'}
            </p>
            <p className="text-center text-[10px] text-hud-dim leading-relaxed max-w-[260px]">
              {inRange
                ? '領袖嘅虛擬記號就喺附近。舉起手機，慢慢掃視地面。'
                : '未進入觸發半徑之前，符號唔會出現。唔會有距離或方向提示 — 靠上一個記號嘅指示。'}
            </p>

            {inRange && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                onClick={() => { void openScope(); }}
                className="press mt-1 h-11 px-5 rounded-full bg-hud-amber text-hud text-[13px] font-semibold flex items-center gap-2"
              >
                <ScanLine size={16} /> 舉機觀察
              </motion.button>
            )}
          </div>

          <div className="relative flex items-center justify-between text-[9px] font-mono text-hud-dim">
            <span>{pose.lat != null ? `${pose.lat.toFixed(4)}, ${pose.lng!.toFixed(4)}` : '定位中…'}</span>
            <span>{pose.heading != null ? `${pad3(pose.heading)}° ${compassLabel(pose.heading)}` : '指南針待命'}</span>
          </div>
        </div>

        {(inRange || !hasCoords(current)) && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setOptions(buildOptions(current.signId));
                setQuizOpen(true);
                setPicked(null);
                setShowHidden(false);
              }}
              className="press flex-1 h-11 rounded-xl border border-ink/15 bg-paper-2/60 text-[11px] text-ink-2 flex items-center justify-center gap-1.5"
            >
              <ScanLine size={13} /> 相機用唔到？直接核對符號
            </button>
          </div>
        )}

        {pose.gpsError && (
          <div className="flex items-start gap-2 rounded-xl border border-clay/30 bg-clay/8 px-3 py-2 text-[10px] text-clay-2">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />{pose.gpsError}
          </div>
        )}

        <Note>
          追蹤規則：唔會預先顯示下一個符號。到達後用相機對準，符號先會「亮起」。
        </Note>
      </div>

      {/* ── 相機觀測 ── */}
      {arOpen && current && hasCoords(current) && (
        <CameraStage
          cam={cam}
          heading={pose.heading}
          pitch={pose.pitch}
          roll={pose.roll}
          compass={pose.compass}
          accuracy={pose.accuracy}
          scanProgress={scan}
          locked={locked}
          title={`觀測 · 第 ${step + 1} 記號`}
          subtitle="慢慢掃視，將中央準星對準符號"
          onExit={() => { cam.stop(); setArOpen(false); setLocked(false); }}
          onEngage={() => { void pose.requestCompass(); }}
          guide={{
            title: '讀取地面符號',
            body: '符號畫喺地面，要你真係掃到先會出現。',
            steps: [
              '俯低手機，望向地面',
              '慢慢左右掃視（唔會提示方向）',
              '見到粉筆輪廓就保持對準，等佢實體化',
            ],
          }}
          footer={
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={locked ? 'text-hud-green' : moving ? 'text-hud-red' : 'text-hud-amber'}>
                  {locked
                    ? '● 已鎖定地面符號'
                    : moving
                      ? '✕ 移動中 — 停低先可以掃描'
                      : scan > 0.05
                        ? `◐ 浮現中 ${Math.round(scan * 100)}% — 保持對準`
                        : '○ 望向地面，慢慢掃視'}
                </span>
                <span className="text-hud-dim">{pad3(pose.heading ?? 0)}° {compassLabel(pose.heading)}</span>
              </div>
              <button
                onClick={() => reveal(false)}
                disabled={!locked}
                className="press w-full h-12 rounded-2xl bg-hud-amber text-hud font-semibold text-[13px] flex items-center justify-center gap-2 disabled:opacity-35"
              >
                <CheckCircle size={16} /> {locked ? '立即讀取符號' : moving ? '停低先可以讀取' : '對準準星先可以讀取'}
              </button>
              {locked && (
                <p className="text-center text-[9px] text-hud-green/90 font-mono">
                  保持對準中… 符號正在讀取
                </p>
              )}
              {pose.heading == null && (
                <button onClick={() => reveal(true)} className="w-full text-[10px] text-hud-dim underline underline-offset-2">
                  指南針用唔到？直接確認
                </button>
              )}
            </div>
          }
        >
          {projection && (
            <div className="absolute inset-0">
              {projection.visible && (
                <ArSign
                  signId={current.signId}
                  xPct={projection.xPct}
                  yPct={projection.yPct}
                  scale={projection.scale}
                  dist={projection.dist}
                  reveal={scan}
                  locked={locked}
                  scanning={!locked && scan > 0.2}
                  label="地面符號"
                />
              )}
              {!projection.visible && (
                <div className="absolute left-1/2 top-[62%] -translate-x-1/2 text-center">
                  <p className="hud-label text-hud-ink/70">符號喺你身後 / 畫面外</p>
                  <p className="hud-label text-hud-ink/45 mt-1">慢慢轉身，留意準星方向</p>
                </div>
              )}
            </div>
          )}
        </CameraStage>
      )}

      {/* ── 陷阱警告 ── */}
      <AnimatePresence>
        {trapHit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-clay-2/95 flex items-center justify-center px-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center max-w-sm">
              <div className="mx-auto w-16 h-16 rounded-full bg-white/15 border border-white/40 flex items-center justify-center mb-3">
                <AlertTriangle size={30} className="text-white" />
              </div>
              <p className="font-mono text-[10px] tracking-[0.25em] text-white/70">TRAP SIGNAL</p>
              <h2 className="font-heading text-[24px] text-white mt-1">陷阱記號</h2>
              <div className="my-3 flex justify-center">
                <SignSVG signId={trapHit.signId} size={90} glow={false} />
              </div>
              <p className="text-[13px] text-white/95">{getSignById(trapHit.signId)?.nameZh}</p>
              <p className="text-[11px] text-white/80 mt-1 leading-relaxed">{getSignById(trapHit.signId)?.action}</p>
              <button onClick={() => setTrapHit(null)}
                className="press mt-4 h-11 px-6 rounded-full bg-white text-clay-2 text-[12px] font-semibold">
                知道，繼續追蹤
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 符號詳情 + 判斷題 ── */}
      <Sheet open={quizOpen} onClose={() => { if (revealed) nextStep(); }} title="你發現咗一個追蹤符號">
        {currentSign && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-3 rounded-xl border border-ink/12 bg-[#efe4cd] p-3">
              <SignSVG signId={currentSign.id} size={78} glow direction={current.direction} />
              <div>
                <p className="text-[15px] font-heading text-ink">{currentSign.nameZh}</p>
                <p className="font-mono text-[9px] text-ink-4 tracking-wide">{currentSign.nameEn}</p>
                <p className="text-[10px] text-ink-3 mt-1 leading-snug line-clamp-2">{currentSign.description}</p>
              </div>
            </div>

            {trail.quizMode !== false ? (
              <>
                <div>
                  <p className="stamp text-clay mb-1.5">你應該點做？</p>
                  <div className="space-y-2">
                    {options.map((o, i) => {
                      const isPicked = picked === i;
                      const showState = picked != null;
                      return (
                        <button key={i} onClick={() => answer(i)}
                          className={`press w-full text-left rounded-xl border px-3 py-2.5 text-[11.5px] leading-snug flex items-start gap-2 ${
                            showState
                              ? o.correct
                                ? 'border-forest/45 bg-forest/10 text-forest-2'
                                : isPicked
                                  ? 'border-clay/45 bg-clay/10 text-clay-2'
                                  : 'border-ink/12 text-ink-3 opacity-60'
                              : 'border-ink/15 text-ink-2'
                          }`}>
                          <span className="font-mono text-[9px] mt-0.5 shrink-0">{String.fromCharCode(65 + i)}</span>
                          <span className="flex-1">{o.text}</span>
                          {showState && o.correct && <CheckCircle size={13} className="text-forest shrink-0 mt-0.5" />}
                          {showState && isPicked && !o.correct && <XCircle size={13} className="text-clay-2 shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {picked != null && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <div className={`rounded-xl border p-3 ${options[picked].correct ? 'border-forest/30 bg-forest/8' : 'border-clay/30 bg-clay/8'}`}>
                      <p className={`text-[11.5px] font-medium ${options[picked].correct ? 'text-forest-2' : 'text-clay-2'}`}>
                        {options[picked].correct ? '✓ 正確 — 你讀懂了呢個符號' : '✗ 唔啱 — 正確應對係：'}
                      </p>
                      {!options[picked].correct && (
                        <p className="text-[11px] text-ink-2 mt-1">{currentSign.action}</p>
                      )}
                    </div>

                    {current.hiddenContent && !showHidden && (
                      <button onClick={() => setShowHidden(true)}
                        className="press w-full h-11 rounded-xl border border-gold/40 bg-gold/8 text-gold text-[11.5px] flex items-center justify-center gap-1.5">
                        <Gift size={14} /> 打開隱藏訊息
                      </button>
                    )}
                    {showHidden && current.hiddenContent && (
                      <div className="rounded-xl border border-gold/40 bg-[#fbf3da] p-3">
                        <p className="stamp text-gold mb-1">隱藏訊息</p>
                        <p className="text-[12px] text-ink-2 leading-relaxed">{current.hiddenContent}</p>
                      </div>
                    )}

                    <Btn onClick={nextStep} icon={<ArrowRight size={15} />}>
                      {step + 1 >= seq.length ? '完成任務' : '繼續追蹤下一個'}
                    </Btn>
                  </motion.div>
                )}
              </>
            ) : (
              <Btn onClick={() => { setAnswers(a => [...a, { signId: current.signId, correct: true }]); nextStep(); }} icon={<ArrowRight size={15} />}>
                {step + 1 >= seq.length ? '完成任務' : '繼續追蹤'}
              </Btn>
            )}
          </div>
        )}
      </Sheet>

    </div>
  );
};

export default TrailWalkPage;
