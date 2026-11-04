import type { SoundType } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playKeySound(type: SoundType, volume: number = 0.5, key: string = 'a') {
  if (type === 'off' || volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const isSpecial = key === 'Enter' || key === 'Backspace' || key === ' ';

  switch (type) {
    case 'mech-click': {
      const baseFreq = isSpecial ? 600 : 800 + Math.random() * 200;
      
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(baseFreq * 2, now);
      clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.03);
      clickGain.gain.setValueAtTime(volume * 0.4, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.035);

      const thockOsc = ctx.createOscillator();
      const thockGain = ctx.createGain();
      thockOsc.type = 'sine';
      thockOsc.frequency.setValueAtTime(isSpecial ? 120 : 160 + Math.random() * 30, now + 0.01);
      thockOsc.frequency.exponentialRampToValueAtTime(40, now + 0.06);
      thockGain.gain.setValueAtTime(volume * 0.5, now + 0.01);
      thockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      thockOsc.connect(thockGain);
      thockGain.connect(ctx.destination);
      thockOsc.start(now + 0.01);
      thockOsc.stop(now + 0.065);
      break;
    }

    case 'thock': {
      const freq = isSpecial ? 140 : 180 + Math.random() * 40;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.07);
      gain.gain.setValueAtTime(volume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);
      break;
    }

    case 'typewriter': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
      break;
    }

    case 'beep': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isSpecial ? 659.25 : 880, now);
      gain.gain.setValueAtTime(volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
      break;
    }
  }
}

export function playErrorSound(volume: number = 0.5) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);

  gain.gain.setValueAtTime(volume * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.11);
}
