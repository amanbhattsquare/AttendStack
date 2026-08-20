// Professional Chat Audio Chime Synthesizer using Web Audio API (Zero external assets needed)

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

export const isChatSoundMuted = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('attendstack_chat_sound_muted') === 'true';
};

export const setChatSoundMuted = (muted: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('attendstack_chat_sound_muted', muted ? 'true' : 'false');
};

/**
 * Plays a pleasant, modern Slack/Apple-style harmonic dual-tone chime
 */
export const playMessageChime = (): void => {
  try {
    if (isChatSoundMuted()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First Tone (Soft high note: 587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Second Tone (Harmonic resolution: 880 Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.001, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.38);
  } catch (err) {
    // Non-fatal if audio context blocked by browser autoplay policy
    console.debug('Audio chime unable to play:', err);
  }
};
