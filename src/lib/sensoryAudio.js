// Lightweight sensory sound effects synthesized with the Web Audio API — no
// audio assets needed. Used across the Weekly Activities play experience for
// sparkles, success bursts, completion jingles, and gentle mobile vibration.

let ctx = null;

const getCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

const tone = (freq, start, dur, type = 'sine', gain = 0.18) => {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.05);
};

export const playSparkle = () => {
  tone(1200, 0, 0.12, 'sine', 0.1);
  tone(1600, 0.06, 0.12, 'sine', 0.08);
};

export const playSuccess = () => {
  tone(523, 0, 0.16, 'triangle', 0.16);
  tone(659, 0.12, 0.16, 'triangle', 0.16);
  tone(784, 0.24, 0.22, 'triangle', 0.18);
};

export const playComplete = () => {
  tone(523, 0, 0.18, 'triangle', 0.18);
  tone(659, 0.14, 0.18, 'triangle', 0.18);
  tone(784, 0.28, 0.18, 'triangle', 0.18);
  tone(1047, 0.42, 0.34, 'triangle', 0.2);
};

export const vibrate = (pattern) => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  }
};

// Fun, bubbly "POP!" for popping a bubble — pitchy slide + a short noise click.
export const playBubblePop = () => {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(900, now);
  o.frequency.exponentialRampToValueAtTime(170, now + 0.12);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  o.connect(g);
  g.connect(c.destination);
  o.start(now);
  o.stop(now + 0.18);
  const bufferSize = 2048;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.2, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  noise.connect(filter);
  filter.connect(ng);
  ng.connect(c.destination);
  noise.start(now);
  noise.stop(now + 0.1);
};

// Soft pop for tap feedback on sensory buttons.
export const playPop = () => {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(660, now);
  o.frequency.exponentialRampToValueAtTime(990, now + 0.08);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  o.connect(g);
  g.connect(c.destination);
  o.start(now);
  o.stop(now + 0.2);
};

// Fun, motivating ambient groove — a bouncy dance beat (kick + hi-hat + snare),
// a walking bass line, and a catchy melody. Each session picks a different
// groove (key, tempo, vibe) so it always feels fresh and energizing.
const GROOVES = [
  { name: 'C major pop', root: 130.81, scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25], bass: [130.81, 196.0, 174.61, 196.0], bpm: 116, wave: 'square' },
  { name: 'G major bouncy', root: 98.0, scale: [392.0, 440.0, 493.88, 587.33, 659.25, 783.99], bass: [98.0, 146.83, 130.81, 146.83], bpm: 124, wave: 'square' },
  { name: 'F major happy', root: 87.31, scale: [349.23, 392.0, 440.0, 523.25, 587.33, 698.46], bass: [87.31, 130.81, 110.0, 130.81], bpm: 120, wave: 'triangle' },
  { name: 'D dorian funky', root: 73.42, scale: [293.66, 329.63, 392.0, 440.0, 493.88, 587.33], bass: [73.42, 110.0, 98.0, 110.0], bpm: 128, wave: 'sawtooth' },
  { name: 'A minor groovy', root: 110.0, scale: [440.0, 523.25, 587.33, 659.25, 783.99, 880.0], bass: [110.0, 164.81, 146.83, 164.81], bpm: 122, wave: 'square' },
  { name: 'Pentatonic bright', root: 98.0, scale: [392.0, 440.0, 523.25, 587.33, 659.25, 783.99], bass: [98.0, 130.81, 110.0, 130.81], bpm: 126, wave: 'triangle' },
];

let music = { playing: false, timer: null, master: null, nodes: [], lastSongIdx: -1 };

export const startAmbientMusic = () => {
  if (music.playing) return;
  const c = getCtx();
  if (!c) return;
  music.playing = true;
  const master = c.createGain();
  master.gain.value = 0;
  master.connect(c.destination);
  master.gain.setTargetAtTime(0.16, c.currentTime, 0.8);
  music.master = master;

  let idx = Math.floor(Math.random() * GROOVES.length);
  if (GROOVES.length > 1 && idx === music.lastSongIdx) idx = (idx + 1) % GROOVES.length;
  music.lastSongIdx = idx;
  const groove = GROOVES[idx];
  const beat = 60 / groove.bpm; // seconds per beat
  const step16 = beat / 4;      // sixteenth-note spacing

  // --- Drum helpers ---
  const kick = (t) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, c.currentTime + t);
    o.frequency.exponentialRampToValueAtTime(50, c.currentTime + t + 0.12);
    g.gain.setValueAtTime(0.0001, c.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.5, c.currentTime + t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.2);
    o.connect(g); g.connect(master);
    o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.22);
  };
  const hat = (t, open = false) => {
    const len = 1024;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, open ? 2 : 3);
    const n = c.createBufferSource(); n.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(open ? 0.1 : 0.14, c.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + (open ? 0.12 : 0.04));
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    n.connect(f); f.connect(g); g.connect(master);
    n.start(c.currentTime + t); n.stop(c.currentTime + t + 0.14);
  };
  const snare = (t) => {
    const len = 2048;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const n = c.createBufferSource(); n.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(0.22, c.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.14);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
    n.connect(f); f.connect(g); g.connect(master);
    n.start(c.currentTime + t); n.stop(c.currentTime + t + 0.16);
  };

  // --- Bass + melody helpers ---
  const bassNote = (t, freq, dur) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; f.Q.value = 4;
    o.connect(f); f.connect(g); g.connect(master);
    const start = c.currentTime + t;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.26, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.start(start); o.stop(start + dur + 0.05);
  };
  const melodyNote = (t, freq, dur) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = groove.wave;
    o.frequency.value = freq;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3000;
    o.connect(f); f.connect(g); g.connect(master);
    const start = c.currentTime + t;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.start(start); o.stop(start + dur + 0.05);
  };

  // --- One-bar loop scheduler (16 sixteenth-steps) ---
  // Kick on 1 and 3 (steps 0, 8), snare on 2 and 4 (steps 4, 12),
  // hats on every step, bass on the root pattern, melody dances around the scale.
  const playBar = (bar) => {
    if (!music.playing) return;
    const offset = bar * beat * 4;
    for (let s = 0; s < 16; s++) {
      const t = offset + s * step16;
      if (s % 4 === 0) kick(t);
      if (s === 4 || s === 12) snare(t);
      hat(t, s % 4 === 2);
    }
    // Walking bass — one note per beat, cycling the bass pattern
    for (let b = 0; b < 4; b++) {
      bassNote(offset + b * beat, groove.bass[b % groove.bass.length], beat * 0.8);
    }
    // Catchy melody — a bouncy motif that changes every other bar
    const motif = bar % 2 === 0
      ? [0, 2, 4, 2, 3, 4, 5, 4]
      : [5, 4, 2, 4, 3, 2, 0, 2];
    motif.forEach((deg, i) => {
      const f = groove.scale[deg % groove.scale.length] * (deg >= groove.scale.length ? 2 : 1);
      melodyNote(offset + i * (beat / 2), f, beat * 0.45);
    });
  };

  let bar = 0;
  playBar(bar);
  music.timer = setInterval(() => {
    bar += 1;
    playBar(bar);
  }, beat * 4 * 1000);
};

export const stopAmbientMusic = () => {
  if (!music.playing) return;
  const c = getCtx();
  music.playing = false;
  if (music.timer) { clearInterval(music.timer); music.timer = null; }
  if (c && music.master) {
    music.master.gain.setTargetAtTime(0, c.currentTime, 0.4);
  }
  const master = music.master;
  setTimeout(() => {
    try { master && master.disconnect(); } catch (e) {}
  }, 800);
  music.nodes = [];
  music.master = null;
};

// Fun, zany, LOUD, dancey jingle — a punchy bass-beat + a bouncy synth melody
// that makes you want to wiggle. Played after Zoodo finishes talking.
export const playZanyJingle = () => {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // Punchy dance "kick" beat — four-on-the-floor
  const kick = (t) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, c.currentTime + t);
    o.frequency.exponentialRampToValueAtTime(50, c.currentTime + t + 0.12);
    g.gain.setValueAtTime(0.0001, c.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.5, c.currentTime + t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.22);
    o.connect(g);
    g.connect(c.destination);
    o.start(c.currentTime + t);
    o.stop(c.currentTime + t + 0.25);
  };
  // Hi-hat tick
  const hat = (t) => {
    const bufferSize = 1024;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const g = c.createGain();
    g.gain.setValueAtTime(0.18, c.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.05);
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    noise.connect(f);
    f.connect(g);
    g.connect(c.destination);
    noise.start(c.currentTime + t);
    noise.stop(c.currentTime + t + 0.06);
  };

  const beat = 0.16;
  for (let i = 0; i < 8; i++) {
    kick(i * beat);
    hat(i * beat + beat / 2);
  }

  // Bouncy synth melody — bright, jumping, dancey
  const melody = [
    [523.25, 0], [659.25, 0.08], [783.99, 0.16], [1046.5, 0.24],
    [783.99, 0.32], [1046.5, 0.4], [1318.5, 0.48], [1046.5, 0.56],
    [880.0, 0.64], [1046.5, 0.72], [1318.5, 0.8], [1567.98, 0.88],
  ];
  melody.forEach(([f, t]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.value = f;
    const start = now + t;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 2600;
    o.connect(flt);
    flt.connect(g);
    g.connect(c.destination);
    o.start(start);
    o.stop(start + 0.16);
  });

  // Wobbly zany glissando on top for the silly factor
  const wobble = c.createOscillator();
  const wg = c.createGain();
  wobble.type = 'sawtooth';
  wobble.frequency.setValueAtTime(400, now);
  wobble.frequency.exponentialRampToValueAtTime(1600, now + 1.2);
  wg.gain.setValueAtTime(0.0001, now);
  wg.gain.exponentialRampToValueAtTime(0.16, now + 0.05);
  wg.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
  const wfilter = c.createBiquadFilter();
  wfilter.type = 'lowpass';
  wfilter.frequency.value = 2200;
  wobble.connect(wfilter);
  wfilter.connect(wg);
  wg.connect(c.destination);
  wobble.start(now);
  wobble.stop(now + 1.35);
};

// A big, silly giggle-and-laugh — a cascade of pitchy "ha ha ha" syllables that
// gets higher and wobblier, then collapses into a goofy belly-laugh. Played
// right after Zoodo finishes a voiceover.
export const playSillyGiggle = () => {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // One "ha" syllable: a short vocal-ish "ah" with a quick pitch wobble + vibrato.
  const ha = (t, baseFreq, gain = 0.3) => {
    const o = c.createOscillator();
    const g = c.createGain();
    const vib = c.createOscillator();
    const vibGain = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(baseFreq, c.currentTime + t);
    o.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, c.currentTime + t + 0.12);
    // vibrato for a silly wobbly voice
    vib.type = 'sine';
    vib.frequency.value = 18;
    vibGain.gain.value = baseFreq * 0.06;
    vib.connect(vibGain);
    vibGain.connect(o.frequency);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = baseFreq * 2.2;
    f.Q.value = 1.2;
    o.connect(f);
    f.connect(g);
    g.connect(c.destination);
    const start = c.currentTime + t;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    o.start(start);
    o.stop(start + 0.18);
    vib.start(start);
    vib.stop(start + 0.18);
  };

  // Rising cascade of "ha ha ha ha ha" — each one higher and sillier
  const syllables = 7;
  const step = 0.1;
  for (let i = 0; i < syllables; i++) {
    const freq = 320 * Math.pow(1.09, i);
    ha(i * step, freq, 0.3 - i * 0.01);
  }

  // Goofy belly-laugh wobble tail — a big descending warble
  const tailStart = syllables * step + 0.05;
  const wobble = c.createOscillator();
  const wg = c.createGain();
  const vib = c.createOscillator();
  const vibGain = c.createGain();
  wobble.type = 'sawtooth';
  wobble.frequency.setValueAtTime(520, c.currentTime + tailStart);
  wobble.frequency.exponentialRampToValueAtTime(180, c.currentTime + tailStart + 0.7);
  vib.type = 'sine';
  vib.frequency.value = 22;
  vibGain.gain.value = 40;
  vib.connect(vibGain);
  vibGain.connect(wobble.frequency);
  const wf = c.createBiquadFilter();
  wf.type = 'bandpass';
  wf.frequency.value = 900;
  wf.Q.value = 1.5;
  wobble.connect(wf);
  wf.connect(wg);
  wg.connect(c.destination);
  wg.gain.setValueAtTime(0.0001, c.currentTime + tailStart);
  wg.gain.exponentialRampToValueAtTime(0.34, c.currentTime + tailStart + 0.05);
  wg.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + tailStart + 0.75);
  wobble.start(c.currentTime + tailStart);
  wobble.stop(c.currentTime + tailStart + 0.8);
  vib.start(c.currentTime + tailStart);
  vib.stop(c.currentTime + tailStart + 0.8);
};

// Gentle ascending chime for each counted object — one note per number, rising
// up a pentatonic scale so counting feels musical (do-re-mi-fa…). Soft sine bell.
const COUNT_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1396.91, 1567.98];
export const playCountNote = (n) => {
  const idx = Math.max(0, Math.min(COUNT_SCALE.length - 1, (Number(n) || 1) - 1));
  const f = COUNT_SCALE[idx];
  tone(f, 0, 0.5, 'sine', 0.14);
  tone(f * 2, 0.02, 0.4, 'sine', 0.05);
};

// Warm "Great job!" praise jingle — a bright rising C-E-G-C phrase with a
// sparkle on top. Played when a child's participation is validated.
export const playPraiseJingle = () => {
  tone(523.25, 0, 0.18, 'triangle', 0.16);
  tone(659.25, 0.14, 0.18, 'triangle', 0.16);
  tone(783.99, 0.28, 0.18, 'triangle', 0.16);
  tone(1046.5, 0.42, 0.4, 'triangle', 0.2);
  tone(1318.5, 0.44, 0.3, 'sine', 0.07);
};

// Gentle musical outro — a soft descending chime to close an activity warmly.
export const playOutro = () => {
  tone(783.99, 0, 0.3, 'sine', 0.12);
  tone(659.25, 0.18, 0.3, 'sine', 0.12);
  tone(523.25, 0.36, 0.5, 'sine', 0.14);
};

export const isMusicPlaying = () => music.playing;