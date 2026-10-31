import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Crosshair, Loader2, MapPin, AlertTriangle, SkipForward,
  ScanLine, Compass, ShieldCheck,
} from 'lucide-react';
import SignSVG from '../components/SignSVG';
import CameraStage from '../components/CameraStage';
import ArSign from '../components/ArSign';
import { getSignById } from '../data/trackingSigns';
import { useCamera } from '../lib/camera';
import { usePose } from '../lib/pose';
import { compassLabel, pad3 } from '../lib/geo';
import { getTrailById, saveTrail, Trail } from '../lib/trailStore';
import { beep, vibrate } from '../lib/speech';
import { Btn, Card, Note, PageHeader } from '../components/ui';

/**
 * 現場放置模式
 * 領袖行一次路線，逐站將標準追蹤符號「放」喺地面：
 * 企定 → 開相機（HUD 顯示 GPS 精度同方位）→ 按「喺呢度放低」→ 下一站
 */
const LeaderPlacePage: React.FC = () => {
  const nav = useNavigate();
  const { trailId } = useParams<{ trailId: string }>();

  const [trail, setTrail] = useState<Trail | undefined>(() => (trailId ? getTrailById(trailId) : undefined));
  const [idx, setIdx] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [flash, setFlash] = useState(false);

  const cam = useCamera();
  const pose = usePose(true);

  const steps = trail?.steps ?? [];
  const step = steps[idx];
  const sign = step ? getSignById(step.signId) : undefined;
  const placedCount = steps.filter(s => s.lat != null && s.lng != null).length;
  const done = steps.length > 0 && idx >= steps.length;

  const next = useCallback(() => {
    cam.stop();
    setCameraOpen(false);
    setIdx(i => Math.min(steps.length, i + 1));
  }, [cam, steps.length]);

  const place = () => {
    if (!trail || !step) return;
    if (pose.lat == null || pose.lng == null) return;

    const updated: Trail = {
      ...trail,
      steps: trail.steps.map((s, i) =>
        i === idx
          ? {
              ...s,
              lat: pose.lat!,
              lng: pose.lng!,
              ...(pose.heading != null ? { bearing: Math.round(pose.heading) } : {}),
            }
          : s
      ),
    };
    saveTrail(updated);
    setTrail(updated);
    beep('correct');
    vibrate([30, 40, 30]);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1000);
    window.setTimeout(() => next(), 780);
  };

  if (!trail) {
    return (
      <div className="min-h-screen paper-grain flex flex-col items-center justify-center px-6 text-center">
        <AlertTriangle size={32} className="text-clay mb-3" />
        <h1 className="text-[18px] text-ink">搵唔到呢條路線</h1>
        <Btn className="mt-5 max-w-[220px]" onClick={() => nav('/leader')}>返去路線列表</Btn>
      </div>
    );
  }

  /* ── 完成 ── */
  if (done) {
    const all = steps.length;
    return (
      <div className="min-h-screen paper-grain">
        <div className="h-safe-top" />
        <div className="mx-auto max-w-[520px] px-5 pt-8 pb-10 space-y-4 text-center">
          <div className="mx-auto w-20 h-20 rounded-full border-2 border-forest/40 bg-forest/10 flex items-center justify-center text-forest">
            <Check size={36} />
          </div>
          <div>
            <p className="stamp text-clay inline-block">PLACEMENT COMPLETE</p>
            <h1 className="text-[24px] text-ink mt-2">現場放置完成</h1>
            <p className="text-[12px] text-ink-3 mt-1">{trail.name}</p>
          </div>

          <Card className="p-4">
            <p className="font-mono text-[24px] font-bold text-forest">{placedCount}/{all}</p>
            <p className="text-[10px] text-ink-4 mt-1">個符號已錨定喺地面</p>
          </Card>

          <Note>
            隊員行到每個錨點嘅觸發半徑內、舉機望住地面，先會見到符號。
            下載或分享 JSON 俾隊員就可以開始。
          </Note>

          <div className="space-y-2 pt-1">
            <Btn onClick={() => nav('/leader')} icon={<ShieldCheck size={15} />}>返去分享路線</Btn>
            <Btn variant="secondary" onClick={() => setIdx(0)} icon={<Crosshair size={15} />}>由第一站重新檢查</Btn>
          </div>
        </div>
      </div>
    );
  }

  /* ── 逐站放置 ── */
  return (
    <div className="space-y-3.5 pb-6">
      <PageHeader
        kicker="FIELD PLACEMENT"
        title="現場放置"
        sub="行到每一站，企定，開相機，將符號放喺地面。"
        back={() => nav('/leader')}
        right={
          <span className="shrink-0 mt-1 font-mono text-[10px] text-ink-3 border border-ink/15 rounded-full px-2 py-1">
            {Math.min(idx + 1, steps.length)}/{steps.length}
          </span>
        }
      />

      {/* 進度 */}
      <div className="flex gap-1">
        {steps.map((s, i) => {
          const anchored = s.lat != null && s.lng != null;
          return (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i === idx ? 'bg-clay' : anchored ? 'bg-forest/60' : 'bg-ink/12'
              }`}
            />
          );
        })}
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-clay/10 border border-clay/25 text-clay-2 font-mono text-[11px] flex items-center justify-center shrink-0">
            {idx + 1}
          </span>
          <SignSVG signId={step.signId} size={64} glow={false} direction={step.direction} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-heading text-ink">{sign?.nameZh}</p>
            <p className="text-[9px] text-ink-4 font-mono tracking-wide">{sign?.nameEn}</p>
            <p className="text-[10px] text-ink-3 mt-1 leading-snug">{sign?.action}</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-forest/20 bg-forest/5 px-3 py-2.5">
          <p className="stamp text-forest mb-1">實物畫法（童軍標準）</p>
          <p className="text-[11px] text-forest-2 leading-relaxed">{sign?.layout}</p>
        </div>

        {step.lat != null && step.lng != null ? (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-forest font-mono">
            <Check size={12} /> 已放低 · {step.lat.toFixed(5)}, {step.lng!.toFixed(5)}
            {step.bearing != null && <span className="text-ink-4">· {pad3(step.bearing)}°</span>}
          </div>
        ) : (
          <p className="mt-2 text-[10px] text-ink-4">尚未放置 — 行到呢個位置再開相機。</p>
        )}
      </Card>

      <div className="flex items-center gap-2 rounded-xl border border-ink/12 bg-paper-2/50 px-3 py-2">
        <MapPin size={12} className={pose.gpsState === 'live' ? 'text-forest' : 'text-clay'} />
        <span className="font-mono text-[10px] text-ink-3 flex-1 truncate">
          {pose.lat != null ? `${pose.lat.toFixed(5)}, ${pose.lng!.toFixed(5)}` : '定位中…'}
        </span>
        <span className={`font-mono text-[10px] ${pose.accuracy != null && pose.accuracy > 25 ? 'text-clay-2' : 'text-forest'}`}>
          ±{pose.accuracy != null ? Math.round(pose.accuracy) : '—'}m
        </span>
      </div>

      <Btn onClick={() => setCameraOpen(true)} icon={<ScanLine size={16} />}>
        {step.lat != null ? '重新放置呢一站' : '開相機放置呢一站'}
      </Btn>

      <div className="flex gap-2">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="press flex-1 h-10 rounded-xl border border-ink/15 text-[11px] text-ink-3 disabled:opacity-35 flex items-center justify-center gap-1"
        >
          <ArrowLeft size={12} /> 上一站
        </button>
        <button
          onClick={() => setIdx(i => Math.min(steps.length, i + 1))}
          className="press flex-1 h-10 rounded-xl border border-ink/15 text-[11px] text-ink-3 flex items-center justify-center gap-1"
        >
          <SkipForward size={12} /> 跳過
        </button>
        <button
          onClick={() => setIdx(steps.length)}
          className="press flex-1 h-10 rounded-xl border border-forest/25 bg-forest/5 text-[11px] text-forest flex items-center justify-center gap-1"
        >
          完成 <ArrowRight size={12} />
        </button>
      </div>

      {pose.gpsError && (
        <div className="flex items-start gap-2 rounded-xl border border-clay/30 bg-clay/8 px-3 py-2 text-[10px] text-clay-2">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />{pose.gpsError}
        </div>
      )}

      <Note>
        提示：企喺符號正上方，手機指向<strong className="text-ink-2">隊員行過嚟嘅方向</strong>，然後按「喺呢度放低」。
        方位會一齊存入 JSON，隊員要對準先見到。
      </Note>

      {/* 相機 */}
      {cameraOpen && step && (
        <CameraStage
          cam={cam}
          heading={pose.heading}
          pitch={pose.pitch}
          roll={pose.roll}
          compass={pose.compass}
          accuracy={pose.accuracy}
          title={`放低「${sign?.nameZh ?? ''}」`}
          subtitle={`第 ${idx + 1} / ${steps.length} 站`}
          onExit={() => { cam.stop(); setCameraOpen(false); }}
          onEngage={() => { void pose.requestCompass(); }}
          guide={{
            title: '現場放置 · 三步',
            body: '你需要企喺符號位置，將佢錨定落地面。',
            steps: [
              '企定喺要放符號嘅位置（樹腳、路邊、轉彎位）',
              '手機指向隊員行過嚟嘅方向，微微向下',
              '按「喺呢度放低符號」，GPS 同方位會一齊記錄',
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
                onClick={place}
                disabled={pose.lat == null}
                className="press w-full h-12 rounded-2xl bg-hud-amber text-hud font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {pose.gpsState === 'locating'
                  ? <><Loader2 size={16} className="animate-spin" /> 等 GPS…</>
                  : <><Crosshair size={16} /> 喺呢度放低符號</>}
              </button>
              <div className="flex items-center justify-between text-[9px] text-hud-dim">
                <span className="flex items-center gap-1">
                  <Compass size={10} /> 方位 {pad3(pose.heading ?? 0)}° {compassLabel(pose.heading)}
                </span>
                <button onClick={next} className="underline underline-offset-2">跳過呢站</button>
              </div>
            </div>
          }
        >
          <div className="absolute inset-0 pointer-events-none">
            <ArSign
              signId={step.signId}
              xPct={50}
              yPct={63}
              scale={1}
              dist={2.2}
              reveal={0.85}
              label="預覽 · 未放置"
            />
          </div>
        </CameraStage>
      )}

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none bg-[#f2c14e]/20"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="px-5 py-3 rounded-2xl bg-hud/90 border border-hud-green/50 text-hud-green font-mono text-[11px] tracking-widest">
                ✓ 已放低
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaderPlacePage;
