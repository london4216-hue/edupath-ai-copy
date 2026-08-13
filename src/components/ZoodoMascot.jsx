import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSillyGiggle, playSuccess, playSparkle } from '@/lib/sensoryAudio';

// Zoodo — GOZOBO's one-of-a-kind learning buddy.
// A fully animated, mood-driven creature that reacts, giggles, and guides
// the child through every step of the lesson.
//
// moods: 'idle' | 'happy' | 'thinking' | 'celebrating' | 'listening' | 'speaking' | 'curious' | 'sleepy'
export default function ZoodoMascot({
  mood = 'idle',
  size = 120,
  bubble,
  bubbleKey,           // change this to re-pop the bubble
  onTap,
  autoBlink = true,
  className = '',
}) {
  const [pokeMood, setPokeMood] = useState(null);
  const [bursts, setBursts] = useState([]);
  const ref = useRef(null);
  const activeMood = pokeMood || mood;

  // Clear a transient poke mood after a moment.
  useEffect(() => {
    if (!pokeMood) return;
    const t = setTimeout(() => setPokeMood(null), 1400);
    return () => clearTimeout(t);
  }, [pokeMood]);

  const handleTap = (e) => {
    playSillyGiggle();
    setPokeMood('happy');
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const id = Date.now() + Math.random();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setBursts((b) => [...b, { id, x, y }]);
      setTimeout(() => setBursts((b) => b.filter((it) => it.id !== id)), 800);
    }
    onTap?.(e);
  };

  // Mood → body color + animation config
  const MOOD_CFG = {
    idle:        { float: [0, -7, 0],   floatDur: 2.6, tilt: [-2, 2, -2], body: '#7B4FE0', belly: '#9B7FED' },
    happy:       { float: [0, -14, 0],  floatDur: 0.9, tilt: [-4, 4, -4], body: '#7B4FE0', belly: '#9B7FED' },
    thinking:    { float: [0, -4, 0],    floatDur: 3.2, tilt: [0, 6, 0],  body: '#6A3FD0', belly: '#8F77E8' },
    celebrating: { float: [0, -22, 0],  floatDur: 0.7, tilt: [-8, 8, -8],body: '#8B5FF0', belly: '#B49BF5' },
    listening:   { float: [0, -3, 0],   floatDur: 3.6, tilt: [0, 0, 0],  body: '#7B4FE0', belly: '#9B7FED' },
    speaking:    { float: [0, -8, 0],   floatDur: 1.4, tilt: [-3, 3, -3],body: '#7B4FE0', belly: '#9B7FED' },
    curious:     { float: [0, -10, 0],  floatDur: 1.8, tilt: [0, 10, 0],body: '#7B4FE0', belly: '#9B7FED' },
    sleepy:      { float: [0, -3, 0],   floatDur: 4.2, tilt: [2, -2, 2], body: '#6A3FD0', belly: '#8F77E8' },
  };
  const cfg = MOOD_CFG[activeMood] || MOOD_CFG.idle;

  // Celebrating plays a success chime once when entering that mood.
  const prevMood = useRef(activeMood);
  useEffect(() => {
    if (activeMood === 'celebrating' && prevMood.current !== 'celebrating') {
      playSuccess();
    }
    if (activeMood === 'curious' && prevMood.current !== 'curious') {
      playSparkle();
    }
    prevMood.current = activeMood;
  }, [activeMood]);

  const speaking = activeMood === 'speaking';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        {bubble && (
          <motion.div
            key={bubbleKey || bubble}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="relative mb-2 max-w-[15rem] rounded-3xl bg-white px-4 py-2.5 shadow-lg text-center"
          >
            <p className="text-sm font-bold text-black/80 leading-snug">{bubble}</p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-4 bg-white rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={ref}
        style={{ width: size, height: size, position: 'relative' }}
        initial={{ scale: 0, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 11 }}
      >
        <motion.button
          type="button"
          onClick={handleTap}
          className="relative block w-full h-full"
          animate={{ y: cfg.float, rotate: cfg.tilt }}
          transition={{ duration: cfg.floatDur, repeat: Infinity, ease: 'easeInOut' }}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          aria-label="Zoodo — tap to giggle"
        >
          <svg viewBox="0 0 240 220" className="w-full h-full overflow-visible">
            <defs>
              <radialGradient id="zoodoBody" cx="42%" cy="34%" r="72%">
                <stop offset="0%" stopColor={cfg.body} stopOpacity="1" />
                <stop offset="100%" stopColor="#5B2FC4" stopOpacity="1" />
              </radialGradient>
              <radialGradient id="zoodoBelly" cx="50%" cy="40%" r="70%">
                <stop offset="0%" stopColor="#C9B6FF" />
                <stop offset="100%" stopColor={cfg.belly} />
              </radialGradient>
              <radialGradient id="cheekGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FF8FA3" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FF8FA3" stopOpacity="0" />
              </radialGradient>
              <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#3A1A6E" floodOpacity="0.28" />
              </filter>
            </defs>

            {/* Celebrating sparkle aura */}
            {activeMood === 'celebrating' && (
              <g>
                {[
                  [30, 40, 0], [210, 50, 0.2], [40, 180, 0.4], [200, 170, 0.6], [120, 20, 0.3],
                ].map(([cx, cy, d], i) => (
                  <motion.g
                    key={i}
                    animate={{ scale: [0, 1.3, 0], rotate: [0, 180, 360], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: d, ease: 'easeInOut' }}
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  >
                    <path
                      d={`M${cx} ${cy - 10} L${cx + 3} ${cy - 3} L${cx + 10} ${cy} L${cx + 3} ${cy + 3} L${cx} ${cy + 10} L${cx - 3} ${cy + 3} L${cx - 10} ${cy} L${cx - 3} ${cy - 3} Z`}
                      fill="#F2C200"
                    />
                  </motion.g>
                ))}
              </g>
            )}

            {/* Antennae — wiggle, glow brighter when curious/celebrating */}
            <motion.g
              animate={{ rotate: [-7, 7, -7] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '86px 58px' }}
            >
              <line x1="90" y1="58" x2="72" y2="18" stroke="#5B3FD6" strokeWidth="5" strokeLinecap="round" />
              <motion.circle
                cx="70" cy="13" r="11" fill="#F2C200"
                animate={{ scale: activeMood === 'curious' ? [1, 1.4, 1] : [1, 1.12, 1] }}
                transition={{ duration: activeMood === 'curious' ? 0.6 : 1.7, repeat: Infinity }}
                style={{ transformOrigin: '70px 13px' }}
              />
              <circle cx="67" cy="10" r="3.5" fill="#fff" opacity="0.75" />
            </motion.g>
            <motion.g
              animate={{ rotate: [7, -7, 7] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}
              style={{ transformOrigin: '154px 58px' }}
            >
              <line x1="150" y1="58" x2="168" y2="18" stroke="#5B3FD6" strokeWidth="5" strokeLinecap="round" />
              <motion.circle
                cx="170" cy="13" r="11" fill="#E0524F"
                animate={{ scale: activeMood === 'curious' ? [1, 1.4, 1] : [1, 1.12, 1] }}
                transition={{ duration: activeMood === 'curious' ? 0.6 : 1.7, repeat: Infinity, delay: 0.3 }}
                style={{ transformOrigin: '170px 13px' }}
              />
              <circle cx="167" cy="10" r="3.5" fill="#fff" opacity="0.75" />
            </motion.g>

            {/* Arms — wave when happy/celebrating */}
            <motion.ellipse
              cx="38" cy="132" rx="14" ry="19" fill="#6A3FD0"
              animate={activeMood === 'happy' || activeMood === 'celebrating'
                ? { rotate: [-10, 25, -10], y: [0, -8, 0] }
                : { y: [0, 6, 0] }}
              transition={{ duration: activeMood === 'happy' || activeMood === 'celebrating' ? 0.6 : 1.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '38px 150px' }}
            />
            <motion.ellipse
              cx="202" cy="132" rx="14" ry="19" fill="#6A3FD0"
              animate={activeMood === 'happy' || activeMood === 'celebrating'
                ? { rotate: [10, -25, 10], y: [0, -8, 0] }
                : { y: [0, 6, 0] }}
              transition={{ duration: activeMood === 'happy' || activeMood === 'celebrating' ? 0.6 : 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              style={{ transformOrigin: '202px 150px' }}
            />

            {/* Body */}
            <ellipse cx="120" cy="128" rx="80" ry="76" fill="url(#zoodoBody)" filter="url(#softShadow)" />
            <ellipse cx="120" cy="138" rx="48" ry="44" fill="url(#zoodoBelly)" />

            {/* Cheeks */}
            <circle cx="74" cy="134" r="13" fill="url(#cheekGlow)" />
            <circle cx="166" cy="134" r="13" fill="url(#cheekGlow)" />

            {/* Eyebrows — mood-driven */}
            {(activeMood === 'thinking' || activeMood === 'curious') && (
              <motion.g
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <path d="M78 78 Q88 74 98 78" stroke="#3A1A6E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M142 76 Q152 72 162 78" stroke="#3A1A6E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              </motion.g>
            )}
            {activeMood === 'sleepy' && (
              <g>
                <path d="M80 82 L100 86" stroke="#3A1A6E" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M140 86 L160 82" stroke="#3A1A6E" strokeWidth="3.5" strokeLinecap="round" />
              </g>
            )}

            {/* Eyes — mood-driven shapes */}
            {renderEyes(activeMood, speaking, autoBlink)}

            {/* Mouth — mood-driven */}
            {renderMouth(activeMood, speaking)}
          </svg>
        </motion.button>

        {/* Tap sparkle bursts */}
        {bursts.map((b) => (
          <span key={b.id} className="absolute pointer-events-none" style={{ left: b.x, top: b.y }}>
            <SparklePop />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Eyes per mood ──────────────────────────────────────────────
function renderEyes(mood, speaking, autoBlink) {
  // Happy / celebrating → upward arcs (^ ^)
  if (mood === 'happy' || mood === 'celebrating') {
    return (
      <g>
        {mood === 'celebrating' ? (
          <>
            {[100, 140].map((cx, i) => (
              <motion.g key={i}
                animate={{ scale: [1, 1.25, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                style={{ transformOrigin: `${cx}px 104px` }}
              >
                <path d={`M${cx} 92 L${cx + 5} 104 L${cx} 116 L${cx - 5} 104 Z`} fill="#F2C200" />
                <circle cx={cx} cy="104" r="3" fill="#fff" />
              </motion.g>
            ))}
          </>
        ) : (
          <>
            <path d="M86 104 Q98 90 110 104" stroke="#2a1a2a" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M130 104 Q142 90 154 104" stroke="#2a1a2a" strokeWidth="6" fill="none" strokeLinecap="round" />
          </>
        )}
      </g>
    );
  }
  // Sleepy → half-closed
  if (mood === 'sleepy') {
    return (
      <g>
        <path d="M84 106 Q98 112 112 106" stroke="#2a1a2a" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M128 106 Q142 112 156 106" stroke="#2a1a2a" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  // Curious / listening → big wide eyes
  const big = (mood === 'curious' || mood === 'listening');
  const r = big ? 22 : 19;
  return (
    <motion.g
      animate={autoBlink ? { scaleY: [1, 1, 0.1, 1, 1] } : {}}
      transition={{ duration: 4.4, repeat: Infinity, times: [0, 0.46, 0.5, 0.54, 1] }}
      style={{ transformOrigin: '120px 104px' }}
    >
      <circle cx="98" cy="104" r={r} fill="white" />
      <circle cx="142" cy="104" r={r} fill="white" />
      <motion.circle
        cx="98" cy="106" r="9" fill="#2a1a2a"
        animate={mood === 'curious'
          ? { cx: [95, 101, 95], cy: [106, 100, 106] }
          : { cx: [95, 101, 95], cy: [106, 108, 106] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="142" cy="106" r="9" fill="#2a1a2a"
        animate={mood === 'curious'
          ? { cx: [139, 145, 139], cy: [106, 100, 106] }
          : { cx: [139, 145, 139], cy: [106, 108, 106] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <circle cx="101" cy="101" r="3.4" fill="white" />
      <circle cx="145" cy="101" r="3.4" fill="white" />
    </motion.g>
  );
}

// ── Mouth per mood ─────────────────────────────────────────────
function renderMouth(mood, speaking) {
  if (mood === 'speaking' || speaking) {
    return (
      <motion.g
        style={{ transformOrigin: '120px 142px' }}
        animate={{ scaleY: [1, 1.8, 0.7, 1.5, 1] }}
        transition={{ duration: 0.3, repeat: Infinity }}
      >
        <path d="M98 138 Q120 162 142 138 Z" fill="#3a1a2a" stroke="#2a1a2a" strokeWidth="3" strokeLinejoin="round" />
        <path d="M108 150 Q120 158 132 150" fill="#FF6B8A" />
      </motion.g>
    );
  }
  if (mood === 'happy' || mood === 'celebrating') {
    return (
      <g>
        <path d="M92 136 Q120 168 148 136 Q120 152 92 136 Z" fill="#3a1a2a" stroke="#2a1a2a" strokeWidth="3" strokeLinejoin="round" />
        <path d="M104 152 Q120 162 136 152" fill="#FF6B8A" />
      </g>
    );
  }
  if (mood === 'curious') {
    return (
      <motion.g
        animate={{ scaleY: [1, 1.15, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        style={{ transformOrigin: '120px 142px' }}
      >
        <ellipse cx="120" cy="144" rx="10" ry="12" fill="#3a1a2a" stroke="#2a1a2a" strokeWidth="3" />
      </motion.g>
    );
  }
  if (mood === 'thinking') {
    return (
      <g>
        <path d="M104 146 Q120 140 136 146" stroke="#2a1a2a" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (mood === 'sleepy') {
    return (
      <g>
        <ellipse cx="120" cy="146" rx="9" ry="5" fill="#3a1a2a" />
      </g>
    );
  }
  if (mood === 'listening') {
    return (
      <g>
        <circle cx="120" cy="144" r="8" fill="#3a1a2a" />
      </g>
    );
  }
  // idle — gentle smile
  return (
    <g>
      <path d="M100 140 Q120 152 140 140" stroke="#2a1a2a" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  );
}

// A little sparkle burst at the tap point.
function SparklePop() {
  return (
    <motion.svg
      width="40" height="40" viewBox="0 0 40 40"
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: [0, 1.4, 0], opacity: [1, 1, 0] }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      style={{ position: 'absolute', left: -20, top: -20 }}
    >
      <path d="M20 4 L23 17 L36 20 L23 23 L20 36 L17 23 L4 20 L17 17 Z" fill="#F2C200" />
    </motion.svg>
  );
}