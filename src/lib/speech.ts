// 語音導航（廣東話）＋ 音效提示
// 取材自 skw_tracking_signs（語音導航）及 skw-tracking-signs2（音效）
// COPYRIGHT © 2026 SCOUT SYSTEM

let voiceEnabled = true;

export function setVoiceEnabled(on: boolean): void {
  voiceEnabled = on;
  if (!on && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
  }
}

export function isVoiceEnabled(): boolean {
  return voiceEnabled;
}

// 廣東話語音導航：讀出符號指示、警告及任務狀態
export function speak(text: string): void {
  if (!voiceEnabled || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-HK';
    u.rate = 1;
    const voices = window.speechSynthesis.getVoices();
    const zhHk = voices.find(v => /zh[-_]HK/i.test(v.lang)) ||
      voices.find(v => /Cantonese|粵語|廣東話/i.test(v.name)) ||
      voices.find(v => /^zh(-|_)?(TW|Hant|HK)/i.test(v.lang)) ||
      voices.find(v => /^zh/i.test(v.lang));
    if (zhHk) u.voice = zhHk;
    window.speechSynthesis.speak(u);
  } catch { /* noop */ }
}

// 預載語音清單（部分手機要觸發過一次先載入到 zh-HK 語音）
export function warmUpSpeech(): void {
  try {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  } catch { /* noop */ }
}

type ToneType = 'found' | 'correct' | 'wrong' | 'tick' | 'alarm' | 'finish';

let audioCtx: AudioContext | null = null;

// 短音效（Web Audio，無需檔案）
export function beep(type: ToneType): void {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const now = audioCtx.currentTime;

    const tone = (freq: number, start: number, dur: number, vol = 0.12) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.connect(gain); gain.connect(audioCtx!.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.start(now + start); osc.stop(now + start + dur);
    };

    switch (type) {
      case 'found':   tone(660, 0, 0.12); tone(990, 0.12, 0.18); break;
      case 'correct': tone(880, 0, 0.1); tone(1320, 0.1, 0.14); break;
      case 'wrong':   tone(220, 0, 0.18); tone(180, 0.15, 0.22); break;
      case 'tick':    tone(1200, 0, 0.05, 0.08); break;
      case 'alarm':   tone(880, 0, 0.15); tone(880, 0.2, 0.15); tone(880, 0.4, 0.15); break;
      case 'finish':  tone(523, 0, 0.12); tone(659, 0.12, 0.12); tone(784, 0.24, 0.12); tone(1047, 0.36, 0.3); break;
    }
  } catch { /* noop */ }
}

export function vibrate(pattern: number | number[] = [100, 50, 100]): void {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* noop */ }
}
