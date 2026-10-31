// Bunyi notifikasi pesanan baru (FR-008) dengan Web Audio API — tanpa file audio.
// Browser hanya mengizinkan audio setelah interaksi pengguna, jadi `unlock()` dipanggil saat kasir
// pertama kali menyentuh halaman; sebelum itu `play()` diam saja.

const PREF_KEY = 'matwona-cashier-sound';

let context: AudioContext | null = null;

export function unlockSound() {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
}

/** Dua nada pendek "ding-dong". */
export function playNewOrderSound() {
  if (!context || context.state !== 'running') return;
  const start = context.currentTime;
  for (const [i, freq] of [880, 660].entries()) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start + i * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.4, start + i * 0.25 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.25 + 0.3);
    osc.connect(gain).connect(context.destination);
    osc.start(start + i * 0.25);
    osc.stop(start + i * 0.25 + 0.32);
  }
}

export function readSoundPreference(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function writeSoundPreference(enabled: boolean) {
  try {
    localStorage.setItem(PREF_KEY, enabled ? 'on' : 'off');
  } catch {
    // Mode privat: preferensi hanya berlaku sampai tab ditutup.
  }
}
