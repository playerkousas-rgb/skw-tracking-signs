// 沿途追縱（任務模式）— 合併三版所長：
// · 符號序列 + 判斷題（skw-tracking-signs）
// · GPS 接近觸發（skw-tracking-signs2）
// · 雷達訊號／語音導航／陷阱自由觸發（skw_tracking_signs）
// · 計時及倒計時模式（新）
// 隊員全程不看地圖 — 只靠追蹤符號指引完成任務。
// COPYRIGHT © 2026 SCOUT SYSTEM

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, ArrowRight, Trophy, Footprints, Gift, AlertTriangle,
  Volume2, VolumeX, Timer as TimerIcon, Hourglass, Play, RotateCcw, Home,
  RadioTower, MapPin, ShieldCheck, Loader2, ChevronRight,
} from 'lucide-react';
import SignSVG from '../components/SignSVG';
import Confetti from '../components/Confetti';
import SignRadar from '../components/SignRadar';
import {
  getTrailById, saveResult, getBestTimeMs, formatDuration,
  watchPosition, clearWatch, getDist, isFieldTrail, seqSteps, trapSteps,
  DEFAULT_TRIGGER_DISTANCE, Trail, TrailStep,
} from '../lib/trailStore';
import { getSignById, trackingSigns } from '../data/trackingSigns';
import { speak, setVoiceEnabled, beep, vibrate, warmUpSpeech } from '../lib/speech';

type Phase = 'briefing' | 'tracking' | 'done' | 'timeup';

const TrailWalkPage: React.FC = () => {
  const nav = useNavigate();
  const { trailId } = useParams<{ trailId: string }>();
  const [sp] = useSearchParams();
  const playerName = sp.get('name') || '隊員';

  const trail: Trail | undefined = trailId ? getTrailById(trailId) : undefined;

  // ── 任務狀態 ──
  const [phase, setPhase] = useState<Phase>('briefing');
  const [step, setStep] = useState(0);                    // 第幾個順序符號
  const [answers, setAnswers] = useState<{ signId: number; correct: boolean }[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [finalMs, setFinalMs] = useState(0);

  // ── 符號發現 ──
  const [discovered, setDiscovered] = useState(false);    // 已行到當前符號
  const [selected, setSelected] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [quizOptions, setQuizOptions] = useState<{ text: string; isCorrect: boolean }[]>([]);
  const [trapHit, setTrapHit] = useState<TrailStep | null>(null);
  const triggeredTraps = useRef<Set<number>>(new Set());  // step index

  // ── GPS ──
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [gpsErr, setGpsErr] = useState('');
  const watchRef = useRef(-1);

  // ── 音效 ──
  const [soundOn, setSoundOn] = useState(true);
  const warned60 = useRef(false);
  const warned10 = useRef(-1);

  const isField = trail ? isFieldTrail(trail) : false;
  const seq = useMemo(() => (trail ? seqSteps(trail) : []), [trail]);
  const traps = useMemo(() => (trail ? trapSteps(trail) : []), [trail]);
  const triggerDistance = trail?.triggerDistance ?? DEFAULT_TRIGGER_DISTANCE;
  const quizMode = trail?.quizMode !== false;
  const isCountdown = (trail?.timerMode ?? 'stopwatch') === 'countdown' && (trail?.timeLimitMin ?? 0) > 0;
  const limitMs = isCountdown ? (trail?.timeLimitMin ?? 0) * 60000 : 0;
  const bestMs = trail ? getBestTimeMs(trail.id) : null;

  useEffect(() => { warmUpSpeech(); }, []);
  useEffect(() => { setVoiceEnabled(soundOn); }, [soundOn]);

  const elapsedMs = startedAt != null ? (phase === 'tracking' ? nowTick - startedAt : finalMs) : 0;
  const remainingMs = isCountdown ? Math.max(0, limitMs - elapsedMs) : null;

  const finishMission = (timeUp: boolean, usedMs: number) => {
    if (!trail) return;
    const c = answers.filter(a => a.correct).length;
    saveResult({
      playerName, trailId: trail.id, answers,
      totalSteps: seq.length, correctSteps: c,
      completedAt: Date.now(),
      elapsedMs: usedMs, timeUp, success: !timeUp,
    });
    setFinalMs(usedMs);
    setPhase(timeUp ? 'timeup' : 'done');
    if (timeUp) { beep('alarm'); vibrate([300, 150, 300, 150, 300]); speak('時間到！任務結束'); }
    else { beep('finish'); speak('恭喜！成功完成追蹤任務'); }
  };

  // 讓 interval 內永遠用到最新的 finishMission
  const finishRef = useRef(finishMission);
  useEffect(() => { finishRef.current = finishMission; });

  // ── 秒錶／倒計時：全部在 interval 回調內處理（含歸零判決及警告）──
  useEffect(() => {
    if (phase !== 'tracking' || startedAt == null) return;
    const tick = () => {
      const now = Date.now();
      setNowTick(now);
      if (!isCountdown) return;
      const rem = limitMs - (now - startedAt);
      if (rem <= 0) { finishRef.current(true, limitMs); return; }
      if (rem <= 60000 && !warned60.current) {
        warned60.current = true; beep('alarm'); speak('注意，剩餘一分鐘');
      }
      const sec = Math.ceil(rem / 1000);
      if (rem <= 10500 && sec !== warned10.current) { warned10.current = sec; beep('tick'); }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [phase, startedAt, isCountdown, limitMs]);

  // ── GPS 監察（實地模式）：接近偵測在定位回調內進行 ──
  const trackRef = useRef({ phase, discovered, trapHit, step, trail, triggerDistance });
  useEffect(() => {
    trackRef.current = { phase, discovered, trapHit, step, trail, triggerDistance };
  });

  useEffect(() => {
    if (phase !== 'tracking' || !isField) return;
    watchRef.current = watchPosition(
      (lat, lng, acc) => {
        setPos({ lat, lng, acc }); setGpsErr('');
        const st = trackRef.current;
        if (st.phase !== 'tracking' || st.discovered || st.trapHit || !st.trail) return;
        // 陷阱：自由觸發（取自 v5.2）
        st.trail.steps.forEach((t, i) => {
          if (!t.trap || t.lat == null || t.lng == null || triggeredTraps.current.has(i) || trackRef.current.trapHit || trackRef.current.discovered) return;
          if (getDist(lat, lng, t.lat, t.lng) <= st.triggerDistance) {
            triggeredTraps.current.add(i);
            setTrapHit(t);
            beep('wrong'); vibrate([250, 100, 250]);
            const s = getSignById(t.signId);
            speak(`注意！發現${s?.nameZh ?? '警告'}，${s?.action ?? ''}`);
          }
        });
        // 主路徑：行到下一個符號觸發距離內
        const cur = seqSteps(st.trail)[st.step];
        if (cur && cur.lat != null && cur.lng != null && !trackRef.current.discovered && !trackRef.current.trapHit) {
          if (getDist(lat, lng, cur.lat, cur.lng) <= st.triggerDistance) discoverRef.current(true);
        }
      },
      e => setGpsErr(e)
    );
    return () => { clearWatch(watchRef.current); };
  }, [phase, isField]);

  // 發現符號（行到觸發距離內／模擬模式手動）
  // 判斷題選項在此（事件處理器）生成，避免 render 內使用 Math.random
  const discover = (viaGps: boolean) => {
    if (discovered || phase !== 'tracking') return;
    setDiscovered(true); setSelected(null); setShowHidden(false);
    beep('found'); vibrate([120, 60, 120, 60, 240]);
    const cur = seq[step];
    const sign = getSignById(cur?.signId);
    speak(viaGps && sign ? `發現第${step + 1}站符號` : sign ? `第${step + 1}站，${sign.nameZh}` : '發現符號');
    if (quizMode && sign) {
      const correct = sign.action;
      const wrongs = trackingSigns.filter(s => s.id !== sign.id && s.action !== correct)
        .sort(() => Math.random() - 0.5).slice(0, 3).map(s => s.action);
      setQuizOptions([...wrongs, correct].sort(() => Math.random() - 0.5)
        .map(a => ({ text: a, isCorrect: a === correct })));
    }
  };

  const discoverRef = useRef(discover);
  useEffect(() => { discoverRef.current = discover; });

  // 與下一個符號的距離（只供雷達顯示訊號強弱）
  const distToNext = useMemo(() => {
    if (!isField || !pos) return null;
    const t = seq[step];
    if (!t || t.lat == null || t.lng == null) return null;
    return getDist(pos.lat, pos.lng, t.lat, t.lng);
  }, [isField, pos, seq, step]);

  // ── 開始任務 ──
  const startMission = () => {
    setStartedAt(Date.now()); setNowTick(Date.now());
    setPhase('tracking');
    warned60.current = false; warned10.current = -1;
    beep('found');
    speak(isCountdown
      ? `任務開始，限時${trail?.timeLimitMin}分鐘，請沿追蹤符號前進`
      : '任務開始，請沿追蹤符號前進');
  };

  // ── 選項（判斷題）：已於 discover() 內生成（quizOptions）──

  const handlePick = (action: string, correct: boolean) => {
    if (selected !== null) return;
    setSelected(action);
    setAnswers(prev => [...prev, { signId: seq[step].signId, correct }]);
    beep(correct ? 'correct' : 'wrong');
    vibrate(correct ? [60] : [200, 80, 200]);
    const sign = getSignById(seq[step].signId);
    if (correct && sign) speak(`正確！${sign.action}`);
    else if (sign) speak(`未正確。正確行動：${sign.action}`);
    if (correct && seq[step]?.hiddenContent) setTimeout(() => setShowHidden(true), 700);
  };

  const confirmWithoutQuiz = () => {
    if (selected !== null) return;
    setSelected('__ok__');
    setAnswers(prev => [...prev, { signId: seq[step].signId, correct: true }]);
    beep('correct');
    const sign = getSignById(seq[step].signId);
    if (sign) speak(sign.action);
    if (seq[step]?.hiddenContent) setTimeout(() => setShowHidden(true), 500);
  };

  const handleNext = () => {
    if (step + 1 >= seq.length) {
      finishMission(false, startedAt != null ? Date.now() - startedAt : 0);
    } else {
      setStep(prev => prev + 1);
      setDiscovered(false); setSelected(null); setShowHidden(false);
    }
  };

  // ── 找不到路線 ──
  if (!trail) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#02133E' }}>
      <div className="text-center p-6">
        <Footprints size={48} className="text-steel mx-auto mb-4 opacity-40" />
        <h1 className="text-xl font-heading font-bold text-ice mb-2">找不到路線</h1>
        <p className="text-steel text-sm mb-4">路線可能已過期或代碼無效</p>
        <button onClick={() => nav('/player')} className="px-6 py-3 bg-cyan/10 text-cyan border border-cyan/20 rounded-xl font-heading font-semibold">返回輸入代碼</button>
      </div>
    </div>
  );

  const curStep = seq[step];
  const sign = getSignById(curStep?.signId);
  const answered = selected !== null;
  const isCorrectPick = selected != null && selected !== '__ok__'
    ? quizOptions.find(o => o.text === selected)?.isCorrect ?? false
    : true;
  const correctCount = answers.filter(a => a.correct).length;

  // ══════════ 完成畫面 ══════════
  if (phase === 'done' || phase === 'timeup') {
    const allOk = correctCount === seq.length;
    const pct = seq.length > 0 ? Math.round((correctCount / seq.length) * 100) : 0;
    const newBest = bestMs != null && !phaseIsTimeup(phase) && finalMs > 0 && finalMs <= bestMs;
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#02133E' }}>
        {phase === 'done' && allOk && <Confetti pieces={60} />}
        <div className="text-center p-6 w-full max-w-sm">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
            {phase === 'timeup'
              ? <Hourglass size={60} className="text-red mx-auto mb-3" />
              : allOk ? <Trophy size={64} className="text-gold mx-auto mb-3" />
                : <Footprints size={52} className="text-cyan mx-auto mb-3" />}
          </motion.div>
          <h1 className={`text-2xl font-heading font-bold mb-1 ${phase === 'timeup' ? 'text-red' : allOk ? 'text-gold glow-gold' : 'text-ice'}`}>
            {phase === 'timeup' ? '⏳ 時間到！' : allOk ? '🏆 追蹤任務完成！' : '追蹤任務完成'}
          </h1>
          <p className="text-steel text-sm mb-3">
            {phase === 'timeup'
              ? `${playerName}，限時已到，任務未能在${trail.timeLimitMin}分鐘內完成`
              : `${playerName}，你已成功跟隨追蹤符號完成「${trail.name}」`}
          </p>

          {/* 時間成績 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-3 bg-navy-800/70 rounded-2xl border border-cyan/10">
              <div className="text-[10px] text-steel font-heading mb-0.5 flex items-center justify-center gap-1">
                <TimerIcon size={11} />{isCountdown ? '限時' : '計時模式'}
              </div>
              <div className={`font-mono font-bold text-lg ${phase === 'timeup' ? 'text-red' : 'text-cyan'}`}>
                {formatDuration(elapsedMs)}
              </div>
              {isCountdown && phase !== 'timeup' && (
                <div className="text-[9px] text-green mt-0.5">限時 {formatDuration(limitMs)} 內完成 ✓</div>
              )}
            </div>
            <div className="p-3 bg-navy-800/70 rounded-2xl border border-gold/10">
              <div className="text-[10px] text-steel font-heading mb-0.5">符號判斷</div>
              <div className={`font-mono font-bold text-lg ${allOk ? 'text-green' : pct >= 50 ? 'text-gold' : 'text-red'}`}>
                {correctCount}/{seq.length}
              </div>
              <div className="text-[9px] text-steel mt-0.5">{pct}%</div>
            </div>
          </div>

          {newBest && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
              className="mb-3 py-2 bg-gold/10 border border-gold/25 rounded-xl text-gold text-sm font-heading font-bold">
              🏅 新最佳時間！
            </motion.div>
          )}
          {!newBest && bestMs != null && (
            <p className="text-[10px] text-steel mb-3">🏅 此路線最佳時間：{formatDuration(bestMs)}</p>
          )}

          {phase === 'timeup' && (
            <p className="text-steel text-xs mb-3 leading-relaxed">
              別灰心！重温<a className="text-cyan" onClick={() => nav('/learn')} href="#learn">符號圖鑑</a>，
              再挑戰一次，下次在限時內完成吧。
            </p>
          )}

          <div className="space-y-2 w-full">
            <button onClick={() => window.location.reload()}
              className="w-full py-3.5 bg-cyan/10 text-cyan rounded-xl font-heading font-bold border border-cyan/20 flex items-center justify-center gap-2">
              <RotateCcw size={17} />再挑戰一次
            </button>
            <button onClick={() => nav('/')} className="w-full py-3 bg-navy-800 text-steel rounded-xl font-heading font-semibold border border-steel/10 flex items-center justify-center gap-2">
              <Home size={16} />返回首頁
            </button>
          </div>
          <p className="text-[9px] text-steel mt-5 tracking-widest">COPYRIGHT © 2026 SCOUT SYSTEM</p>
        </div>
      </div>
    );
  }

  // ══════════ 任務簡報 ══════════
  if (phase === 'briefing') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#02133E' }}>
        <div className="max-w-lg mx-auto w-full px-5 pt-6 pb-8 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => nav('/player')} className="text-steel text-xs hover:text-ice">← 返回</button>
            <button onClick={() => setSoundOn(!soundOn)}
              className={`px-3 py-1.5 rounded-full text-xs font-heading font-semibold flex items-center gap-1.5 border ${soundOn ? 'bg-cyan/10 text-cyan border-cyan/20' : 'bg-navy-800 text-steel border-steel/10'}`}>
              {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}{soundOn ? '語音開' : '語音關'}
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/10 border border-cyan/20 text-cyan text-[10px] font-heading font-bold tracking-widest mb-3">
                <RadioTower size={12} />追蹤任務簡報
              </div>
              <h1 className="text-2xl font-heading font-bold text-ice">{trail.name}</h1>
              <p className="text-steel text-xs mt-1">隊員：{playerName} · {trail.id}</p>
            </div>

            <div className="space-y-2.5 mb-5">
              <div className="flex items-center gap-3 p-3.5 bg-navy-800/70 rounded-2xl border border-cyan/10">
                <Footprints size={18} className="text-cyan shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-heading font-semibold text-ice">追蹤方式：{isField ? '實地追蹤（GPS）' : '模擬追蹤（課堂）'}</p>
                  <p className="text-[10px] text-steel mt-0.5">{isField
                    ? `行到符號 ${triggerDistance} 米內，追蹤儀會通知你 — 請同時用眼觀察地面符號`
                    : '一個符號接一個，模擬沿途觀察追蹤符號'}</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${isCountdown
                ? 'bg-red/5 border-red/20' : 'bg-navy-800/70 border-cyan/10'}`}>
                {isCountdown
                  ? <Hourglass size={18} className="text-red shrink-0" />
                  : <TimerIcon size={18} className="text-green shrink-0" />}
                <div className="flex-1">
                  <p className="text-xs font-heading font-semibold text-ice">
                    {isCountdown ? `⏳ 倒計時模式 — 限時 ${trail.timeLimitMin} 分鐘` : '⏱ 計時模式 — 挑戰最快時間'}
                  </p>
                  <p className="text-[10px] text-steel mt-0.5">{isCountdown
                    ? '時間歸零前未完成，任務失敗！最後 60 秒會有警告'
                    : '時間只作紀錄，完成後可挑戰最佳時間'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-navy-800/70 rounded-2xl border border-cyan/10">
                <ShieldCheck size={18} className="text-gold shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-heading font-semibold text-ice">
                    {seq.length} 個追蹤符號{traps.length > 0 && ` ＋ ${traps.length} 個陷阱`}
                  </p>
                  <p className="text-[10px] text-steel mt-0.5">{quizMode
                    ? '每發現符號要答對「應對行動」才算成功使用'
                    : '發現符號後按指示前進即可'}</p>
                </div>
              </div>

              {bestMs != null && (
                <div className="flex items-center gap-3 p-3 bg-gold/5 rounded-2xl border border-gold/15">
                  <Trophy size={18} className="text-gold shrink-0" />
                  <p className="text-xs font-heading font-semibold text-gold">
                    🏅 此路線最佳時間：{formatDuration(bestMs)}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-navy-800/40 rounded-xl p-3 border border-cyan/5 mb-5">
              <p className="text-[10px] text-steel leading-relaxed text-center">
                ⚠️ 這是<span className="text-steel-light">追蹤符號訓練</span>，不是看地圖尋寶 —
                全程沒有地圖，請靠觀察地面符號及追蹤儀訊號完成任務。
              </p>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} onClick={startMission}
              className="w-full py-4 bg-gradient-to-r from-green/25 to-cyan/15 text-cyan rounded-2xl font-heading font-bold text-lg border border-cyan/30 box-glow-cyan flex items-center justify-center gap-2">
              <Play size={20} />開始任務
            </motion.button>
          </motion.div>
          <p className="text-center text-[9px] text-steel pt-4 tracking-widest">COPYRIGHT © 2026 SCOUT SYSTEM</p>
        </div>
      </div>
    );
  }

  // ══════════ 追蹤中 ══════════
  const dangerTime = remainingMs != null && remainingMs <= 10500;
  const warnTime = remainingMs != null && remainingMs <= 60000 && !dangerTime;
  const curHasGps = curStep?.lat != null && curStep.lng != null;
  const strength: 0 | 1 | 2 | 3 | 4 = !isField || !pos ? 0
    : discovered ? 4
    : distToNext == null ? 0
    : distToNext <= triggerDistance ? 4
    : distToNext <= triggerDistance * 3 ? 3
    : distToNext <= 60 ? 2 : 1;
  const safetyDist = isField && pos && trail.safetyLat != null && trail.safetyLng != null
    ? getDist(pos.lat, pos.lng, trail.safetyLat, trail.safetyLng) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#02133E' }}>
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col px-4 pt-3 pb-6">
        {/* ── 頂欄：進度 + 音效 ── */}
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => { if (window.confirm('確定退出？任務進度不會保存。')) nav('/player'); }}
            className="text-steel text-xs hover:text-ice shrink-0 px-1 py-2">← 退出</button>
          <div className="flex-1 h-1 bg-navy-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-cyan to-green rounded-full"
              initial={{ width: 0 }} animate={{ width: `${(step / seq.length) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
          <span className="text-[10px] text-steel font-mono shrink-0">{step}/{seq.length}</span>
          <button onClick={() => setSoundOn(!soundOn)}
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${soundOn ? 'bg-cyan/10 text-cyan border-cyan/20' : 'bg-navy-800 text-steel border-steel/10'}`}>
            {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
        </div>

        {/* ── 計時器 HUD ── */}
        <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className={`mb-3 rounded-2xl border py-2.5 px-4 flex items-center justify-between ${
            dangerTime ? 'bg-red/10 border-red/40 timer-danger'
            : warnTime ? 'bg-gold/10 border-gold/30'
            : 'bg-navy-800/80 border-cyan/10'}`}>
          <span className="text-[10px] font-heading font-bold tracking-widest flex items-center gap-1.5"
            style={{ color: dangerTime ? '#ff3366' : warnTime ? '#ffd700' : '#3a5068' }}>
            {isCountdown ? <Hourglass size={13} /> : <TimerIcon size={13} />}
            {isCountdown ? '剩餘時間' : '已用時間'}
          </span>
          <span className={`font-mono font-bold text-2xl tabular-nums ${
            dangerTime ? 'text-red' : warnTime ? 'text-gold' : 'text-cyan'}`}>
            {isCountdown ? formatDuration(remainingMs ?? 0) : formatDuration(elapsedMs)}
          </span>
        </motion.div>

        {/* GPS 訊號警告（取自 v5.2） */}
        {isField && pos && pos.acc > 25 && (
          <div className="gps-warning text-white text-[10px] font-black text-center py-1.5 mb-2 rounded-full border border-red/40">
            ⚠️ GPS 訊號微弱（±{Math.round(pos.acc)}m）：請移到開闊位置
          </div>
        )}
        {isField && gpsErr && (
          <div className="text-red text-[10px] text-center py-1.5 mb-2 rounded-full bg-red/10 border border-red/20">
            ⚠️ {gpsErr} — 請檢查定位權限
          </div>
        )}

        {/* ── 追蹤儀（實地）／站點卡（模擬） ── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {isField ? (
            <>
              <SignRadar
                strength={strength}
                distanceM={discovered ? null : distToNext}
                accuracyM={pos?.acc ?? null}
                label={!pos
                  ? (gpsErr ? '⚠️ 定位中…請開啟GPS' : '📡 啟動追蹤儀…')
                  : discovered ? '📍 發現符號！'
                  : curHasGps ? ''
                  : '⏭ 此站無GPS錨點，可手動確認'}
              />
              {!discovered && (
                <button onClick={() => discover(false)}
                  className="px-6 py-3 rounded-2xl bg-navy-800/80 border border-cyan/15 text-ice text-xs font-heading font-semibold flex items-center gap-2 card-hover">
                  <MapPin size={14} className="text-cyan" />
                  我已找到此符號（手動確認）
                </button>
              )}
              {safetyDist != null && (
                <p className="text-[10px] text-steel flex items-center gap-1">
                  <ShieldCheck size={11} className="text-green" />
                  距安全集合點 {safetyDist < 1000 ? `${Math.round(safetyDist)}m` : `${(safetyDist / 1000).toFixed(1)}km`}
                  {trail.safetyNote ? ` · ${trail.safetyNote}` : ''}
                </p>
              )}
            </>
          ) : (
            /* 模擬模式：課堂／室內訓練 */
            !discovered && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-navy-800/70 border-2 border-cyan/20 flex items-center justify-center">
                  <span className="text-3xl font-heading font-bold text-cyan">{step + 1}</span>
                </div>
                <p className="text-steel text-sm">沿途觀察，尋找第 {step + 1} 個追蹤符號</p>
                <p className="text-[10px] text-steel mt-1">模擬追蹤：課堂訓練模式</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => discover(false)}
                  className="mt-5 px-8 py-4 bg-gradient-to-r from-cyan/20 to-green/10 text-cyan rounded-2xl font-heading font-bold border border-cyan/30 box-glow-cyan flex items-center gap-2 mx-auto">
                  <Footprints size={18} />找到符號了！
                </motion.button>
              </motion.div>
            )
          )}
        </div>
      </div>

      {/* ═══ 符號卡（發現後彈出）═══ */}
      <AnimatePresence>
        {discovered && sign && curStep && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative w-full max-w-md max-h-[88vh] overflow-y-auto bg-navy-900 rounded-t-3xl sm:rounded-3xl border-t-2 sm:border border-cyan/25 p-5 pb-8">
              {/* 發現徽章 */}
              <div className="text-center mb-3">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring' }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green/15 rounded-full text-green text-xs font-heading font-bold border border-green/25">
                  <MapPin size={13} />第 {step + 1} 站 · 發現追蹤符號
                </motion.span>
              </div>

              {/* 符號 */}
              <div className="mx-auto w-full max-w-[280px] bg-navy-950/60 rounded-3xl border border-cyan/10 p-4 mb-3">
                <motion.div initial={{ scale: 0.3, opacity: 0, filter: 'blur(14px)' }}
                  animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="flex justify-center animate-sign-reveal">
                  <SignSVG signId={sign.id} size={170} direction={curStep.direction} />
                </motion.div>
                {curStep.direction && (
                  <p className="text-center text-[11px] text-cyan font-heading font-semibold mt-1">
                    箭頭指向{curStep.direction === 'left' ? '左方' : curStep.direction === 'right' ? '右方' : '前方'}
                  </p>
                )}
                {curStep.paces != null && curStep.paces > 0 && (
                  <p className="text-center text-[11px] text-gold font-heading font-semibold mt-1">
                    👣 需走 {curStep.paces} 步
                  </p>
                )}
              </div>

              {/* 判斷題 or 直接確認 */}
              {quizMode ? (
                <>
                  <h2 className="text-ice font-heading font-bold text-base text-center mb-1">這個符號指示你…？</h2>
                  <p className="text-steel text-[11px] text-center mb-3">選擇正確的應對行動，才算成功使用符號</p>
                  <div className="w-full space-y-2">
                    {quizOptions.map((opt, i) => {
                      let cls = 'bg-navy-800/80 border-cyan/10 text-ice';
                      if (answered) {
                        if (opt.isCorrect) cls = 'bg-green/10 border-green/40 text-green';
                        else if (opt.text === selected) cls = 'bg-red/10 border-red/40 text-red';
                        else cls = 'bg-navy-800/30 border-steel/5 text-steel/40';
                      }
                      return (
                        <motion.button key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }} onClick={() => handlePick(opt.text, opt.isCorrect)} disabled={answered}
                          className={`w-full p-3.5 rounded-2xl border text-left font-heading font-semibold text-sm flex items-center gap-3 transition-all ${cls}`}>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                            answered && opt.isCorrect ? 'bg-green/20 text-green' : answered && opt.text === selected ? 'bg-red/20 text-red' : 'bg-cyan/10 text-cyan'}`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="flex-1 leading-snug">{opt.text}</span>
                          {answered && opt.isCorrect && <CheckCircle size={18} className="text-green shrink-0" />}
                          {answered && opt.text === selected && !opt.isCorrect && <XCircle size={18} className="text-red shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center mb-3">
                  <h2 className="text-ice font-heading font-bold text-base">{sign.nameZh}</h2>
                  <p className="text-cyan text-sm mt-1">{sign.action}</p>
                  {!answered && (
                    <button onClick={confirmWithoutQuiz}
                      className="w-full mt-4 py-4 bg-cyan/10 text-cyan rounded-2xl font-heading font-bold text-base border border-cyan/25 card-hover flex items-center justify-center gap-2">
                      <CheckCircle size={18} />確認跟隨此符號前進
                    </button>
                  )}
                </div>
              )}

              {/* 結果 + 信物 */}
              {answered && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="w-full mt-4">
                  <div className={`p-3.5 rounded-2xl text-center border ${quizMode
                    ? isCorrectPick ? 'bg-green/5 border-green/20' : 'bg-red/5 border-red/20' : 'bg-green/5 border-green/20'}`}>
                    <p className={`font-heading font-semibold text-sm flex items-center justify-center gap-1.5 ${quizMode && !isCorrectPick ? 'text-red' : 'text-green'}`}>
                      {quizMode && !isCorrectPick ? <><XCircle size={17} />未正確</> : <><CheckCircle size={17} />{quizMode ? '正確！' : '已確認'}</>}
                    </p>
                    <p className="text-steel text-xs mt-1">✓ 應對：{sign.action}</p>
                  </div>

                  <AnimatePresence>
                    {showHidden && curStep.hiddenContent && (
                      <motion.div initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="mt-3 p-4 bg-gold/5 border border-gold/20 rounded-2xl text-center">
                        <Gift size={22} className="text-gold mx-auto mb-1.5" />
                        <p className="text-gold font-heading text-xs font-semibold mb-1">📦 找到信物！</p>
                        <p className="text-ice text-sm leading-relaxed">{curStep.hiddenContent}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button onClick={handleNext}
                    className="w-full mt-4 py-4 bg-gradient-to-r from-green/25 to-cyan/15 text-cyan rounded-2xl font-heading font-bold text-base border border-cyan/25 card-hover flex items-center justify-center gap-2">
                    {step + 1 >= seq.length ? <>完成任務 <Trophy size={18} /></> : <>跟隨指示前進 <ArrowRight size={18} /></>}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 陷阱警告卡 ═══ */}
      <AnimatePresence>
        {trapHit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 18 }}
              className="relative w-full max-w-xs bg-navy-900 rounded-3xl border-2 border-red/40 p-5 text-center">
              <motion.div animate={{ rotate: [0, -12, 12, -8, 8, 0] }} transition={{ duration: 0.6 }}
                className="w-16 h-16 mx-auto mb-3 rounded-full bg-red/15 border border-red/30 flex items-center justify-center">
                <AlertTriangle size={30} className="text-red" />
              </motion.div>
              <h3 className="font-heading font-bold text-lg text-red mb-1">⚠️ 警告符號！</h3>
              <div className="mx-auto my-3 bg-navy-950/70 rounded-2xl p-3 border border-red/15 w-fit">
                <SignSVG signId={trapHit.signId} size={110} direction={trapHit.direction} />
              </div>
              <p className="text-ice text-sm font-heading font-semibold">{getSignById(trapHit.signId)?.nameZh}</p>
              <p className="text-steel text-xs mt-1.5 leading-relaxed">{getSignById(trapHit.signId)?.action}</p>
              <button onClick={() => { setTrapHit(null); beep('found'); }}
                className="w-full mt-4 py-3.5 bg-red/10 text-red rounded-xl font-heading font-bold border border-red/25 flex items-center justify-center gap-2">
                知道了，避開此路 <ChevronRight size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 載入中指示（GPS 首次定位） */}
      {phase === 'tracking' && isField && !pos && !gpsErr && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 bg-navy-800/90 rounded-full border border-cyan/20 text-cyan text-xs font-heading">
            <Loader2 size={13} className="animate-spin" />追蹤儀定位中…
          </div>
        </div>
      )}
    </div>
  );
};

function phaseIsTimeup(p: Phase): boolean { return p === 'timeup'; }

export default TrailWalkPage;
