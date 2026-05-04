let soundEnabled = localStorage.getItem('dragon-sound') === 'true';

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(bool) {
  soundEnabled = bool;
  localStorage.setItem('dragon-sound', String(bool));
}

export function playSound(type) {
  if (!soundEnabled) return;
  const ctx = new AudioContext();

  const play = (freq, waveform, startTime, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveform || 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const now = ctx.currentTime;
  if (type === 'correct') {
    play(440, 'sine', now, 0.08);
    play(660, 'sine', now + 0.09, 0.08);
  } else if (type === 'wrong') {
    play(220, 'sawtooth', now, 0.1);
  } else if (type === 'complete') {
    play(261.63, 'sine', now, 0.1);
    play(329.63, 'sine', now + 0.12, 0.1);
    play(392, 'sine', now + 0.24, 0.15);
  }
}
