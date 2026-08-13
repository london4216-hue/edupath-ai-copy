import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPop, playSuccess } from '@/lib/sensoryAudio';
import { Check, Hand, Mic } from 'lucide-react';

// A full-width animated stretch guide. For each stretch, the buddy DEMONSTRATES
// the move 4 times ("Watch me! 1, 2, 3, 4"), then invites the kid to try
// ("Your turn!"). The kid taps "I did it!" to move to the next stretch.
// OT-aligned sequence (Ayres SI + praxis): each move names a body part
// (proprioceptive/body-schema input) and gives a clear, modelable action.
// Includes crossing midline (bilateral coordination) and a vestibular
// head-down pose. Order is calm → big → calm for arousal regulation.
// OT/PT-aligned (Ayres SI + praxis) sequences, age-adaptive. Preschool keeps
// it dynamic and play-based; school adds controlled holds and balance work.
const PRESCHOOL_STRETCHES = [
  { label: 'Reach up high!', cue: 'Lift both arms to the sky — feel the stretch in your arms', pose: 'up', body: 'arms' },
  { label: 'Touch your toes', cue: 'Bend your head down and reach for your feet', pose: 'down', body: 'head & legs' },
  { label: 'Cross the middle', cue: 'Reach one hand across to the other side', pose: 'cross', body: 'arms crossing midline' },
  { label: 'Big star', cue: 'Stretch your arms and legs out wide', pose: 'star', body: 'arms & legs' },
  { label: 'Big hug squeeze', cue: 'Wrap both arms around yourself and squeeze', pose: 'hug', body: 'deep pressure hug' },
];

const SCHOOL_STRETCHES = [
  { label: 'Reach up high!', cue: 'Lift both arms to the sky and hold — feel the stretch', pose: 'up', body: 'arms' },
  { label: 'Touch your toes', cue: 'Bend your head down, reach for your feet, and hold', pose: 'down', body: 'head & legs' },
  { label: 'Cross the middle', cue: 'Reach one hand across — now switch hands', pose: 'cross', body: 'arms crossing midline' },
  { label: 'Balance on one foot', cue: 'Stand tall and lift one foot off the ground — hold it', pose: 'star', body: 'balance & core' },
  { label: 'Big hug squeeze', cue: 'Wrap both arms around yourself, squeeze, and take a big breath', pose: 'hug', body: 'deep pressure hug' },
];

function stretchesForAge(age) {
  return Number(age) >= 6 ? SCHOOL_STRETCHES : PRESCHOOL_STRETCHES;
}

const REPS = 4;
const REP_MS = 1500;

export default function StretchGuide({ kidName, age }) {
  const STRETCHES = stretchesForAge(age);
  const [index, setIndex] = useState(0);
  const [rep, setRep] = useState(0);       // 0..REPS during demo
  const [phase, setPhase] = useState('demo'); // demo | yourturn | done
  const [counting, setCounting] = useState(false);
  const stretch = STRETCHES[index];

  // Demo loop: count 4 reps, then hand off to the kid.
  useEffect(() => {
    if (phase !== 'demo') return;
    if (rep >= REPS) {
      setPhase('yourturn');
      return;
    }
    setCounting(true);
    const t = setTimeout(() => {
      setRep((r) => r + 1);
      setCounting(false);
    }, REP_MS);
    return () => clearTimeout(t);
  }, [phase, rep]);

  const kidDone = () => {
    playSuccess();
    if (index + 1 >= STRETCHES.length) {
      setPhase('done');
    } else {
      setIndex((i) => i + 1);
      setRep(0);
      setPhase('demo');
    }
  };

  const restart = () => {
    playPop();
    setIndex(0);
    setRep(0);
    setPhase('demo');
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#E0F5D5] to-white p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-bold text-black/80">
          {kidName ? `${kidName}, let’s stretch!` : 'Let’s stretch!'}
        </h2>
        <span className="text-xs font-bold text-black/40">
          {phase === 'done' ? 'All done!' : `${index + 1} / ${STRETCHES.length}`}
        </span>
      </div>

      {/* Progress dots per stretch */}
      <div className="mb-2 flex justify-center gap-1.5">
        {STRETCHES.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-6 bg-[#4FAE5A]' : i < index ? 'w-1.5 bg-[#4FAE5A]/60' : 'w-1.5 bg-black/15'
            }`}
          />
        ))}
      </div>

      {/* Full-bleed character stage */}
      <div className="relative flex h-[26rem] items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#E8F8FF] to-[#E0F5D5]">
        {/* Decorative sky elements */}
        <div className="pointer-events-none absolute top-4 right-6 h-14 w-14 rounded-full bg-[#FFE08A]/70 blur-[1px]" />
        <div className="pointer-events-none absolute top-10 left-6 text-3xl opacity-70">☁️</div>
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 h-10 bg-[#9CDA5B]/40" />

        <AnimatePresence mode="wait">
          {phase !== 'done' ? (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <StretchCharacter pose={stretch.pose} animate={phase === 'demo' && counting} />
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, 0], y: [0, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-7xl"
              >
                🎉
              </motion.div>
              <p className="mt-3 text-2xl font-bold text-[#4FAE5A]">Great stretching!</p>
              <div className="mt-3 rounded-2xl bg-white/70 px-4 py-2">
                <div className="flex items-center gap-1.5 justify-center">
                  <Mic className="h-4 w-4 text-[#4FAE5A]" />
                  <p className="text-xs font-bold uppercase tracking-wide text-black/40">For the grown-up</p>
                </div>
                <p className="mt-1 text-lg font-bold text-[#4FAE5A]">
                  Say it out loud: “You did it, {kidName || 'friend'}!”
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase badge */}
        {phase !== 'done' && (
          <div className="absolute left-2 top-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                phase === 'demo' ? 'bg-[#FFE08A] text-[#9a6b00]' : 'bg-[#FFD9E6] text-[#c44a7a]'
              }`}
            >
              {phase === 'demo' ? 'Watch me!' : 'Your turn!'}
            </span>
          </div>
        )}
      </div>

      {/* Cue + rep counter */}
      {phase !== 'done' && (
        <div className="mt-2 text-center">
          <p className="text-lg font-bold text-[#E0A800]">{stretch.label}</p>
          <p className="text-xs font-semibold text-black/50">{stretch.cue}</p>
          {phase === 'demo' && (
            <div className="mt-1 flex items-center justify-center gap-1.5">
              {Array.from({ length: REPS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    i < rep ? 'bg-[#4FAE5A]' : 'bg-black/15'
                  }`}
                />
              ))}
              <span className="ml-1 text-xs font-bold text-black/40">{Math.min(rep, REPS)}/{REPS}</span>
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {phase === 'yourturn' && (
        <motion.button
          onClick={kidDone}
          whileTap={{ scale: 0.95 }}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4FAE5A] py-3 text-lg font-bold text-white active:scale-95 transition"
        >
          <Check className="h-5 w-5" strokeWidth={3} />
          I did it!
        </motion.button>
      )}
      {phase === 'done' && (
        <button
          onClick={restart}
          className="mt-2 w-full rounded-2xl border-2 border-black/10 bg-white py-2.5 font-bold text-black/60 active:scale-95 transition"
        >
          Stretch again
        </button>
      )}
      {phase === 'demo' && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-black/40">
          <Hand className="h-3.5 w-3.5" />
          Copy the buddy… breathe in and out
        </div>
      )}
    </div>
  );
}

// A cute, rounder stretch buddy with clear pose changes.
function StretchCharacter({ pose, animate }) {
  // Arm angles (deg from vertical) + body offset per pose.
  const POSES = {
    up:    { lArm: 175, rArm: 185, bodyY: 0,  headY: 0,  legSpread: 0 },
    down:  { lArm: 250, rArm: 70,  bodyY: 20, headY: 16, legSpread: 0 },
    cross: { lArm: 295, rArm: 65,  bodyY: 6,  headY: 0,  legSpread: 0 },
    star:  { lArm: 215, rArm: 145, bodyY: -2, headY: 0,  legSpread: 14 },
    hug:   { lArm: 255, rArm: 75,  bodyY: 4,  headY: 0,  legSpread: 0 },
  };
  const p = POSES[pose] || POSES.up;

  return (
    <motion.svg
      viewBox="0 0 180 200"
      className="h-[24rem] w-[24rem]"
      animate={animate ? { y: [0, -4, 0] } : {}}
      transition={animate ? { duration: REP_MS / 1000, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      {/* ground shadow */}
      <motion.ellipse
        cx="90" cy="190" rx="36" ry="6" fill="#00000018"
        animate={animate ? { rx: [36, 30, 36] } : {}}
        transition={animate ? { duration: REP_MS / 1000, repeat: Infinity, ease: 'easeInOut' } : {}}
      />
      {/* legs */}
      <motion.rect
        x="78" y="132" width="11" height="48" rx="5.5" fill="#5B3FD6"
        animate={{ x: 78 - p.legSpread / 2 }}
        transition={{ duration: 0.4 }}
      />
      <motion.rect
        x="91" y="132" width="11" height="48" rx="5.5" fill="#5B3FD6"
        animate={{ x: 91 + p.legSpread / 2 }}
        transition={{ duration: 0.4 }}
      />
      {/* feet */}
      <motion.ellipse cx="83" cy="182" rx="8" ry="4" fill="#4A2FBF"
        animate={{ cx: 83 - p.legSpread / 2 }} transition={{ duration: 0.4 }} />
      <motion.ellipse cx="97" cy="182" rx="8" ry="4" fill="#4A2FBF"
        animate={{ cx: 97 + p.legSpread / 2 }} transition={{ duration: 0.4 }} />
      {/* body */}
      <motion.rect
        x="68" y="80" width="44" height="58" rx="20" fill="#7B4FE0"
        animate={{ y: 80 + (p.bodyY || 0) }}
        transition={{ duration: 0.4 }}
      />
      {/* belly highlight */}
      <motion.ellipse cx="90" cy="108" rx="13" ry="15" fill="#9B7FED" opacity="0.6"
        animate={{ cy: 108 + (p.bodyY || 0) }} transition={{ duration: 0.4 }} />
      {/* head */}
      <motion.circle
        cx="90" cy="58" r="22" fill="#9B7FED"
        animate={{ cy: 58 + (p.headY || 0) }}
        transition={{ duration: 0.4 }}
      />
      {/* cheeks */}
      <motion.circle cx="76" cy="64" r="5" fill="#FF9EC4" opacity="0.7"
        animate={{ cy: 64 + (p.headY || 0) }} transition={{ duration: 0.4 }} />
      <motion.circle cx="104" cy="64" r="5" fill="#FF9EC4" opacity="0.7"
        animate={{ cy: 64 + (p.headY || 0) }} transition={{ duration: 0.4 }} />
      {/* eyes */}
      <motion.circle cx="82" cy="56" r="3.2" fill="#2a1a2a"
        animate={{ cy: 56 + (p.headY || 0) }} transition={{ duration: 0.4 }} />
      <motion.circle cx="98" cy="56" r="3.2" fill="#2a1a2a"
        animate={{ cy: 56 + (p.headY || 0) }} transition={{ duration: 0.4 }} />
      <motion.circle cx="83" cy="55" r="1.1" fill="#fff"
        animate={{ cy: 55 + (p.headY || 0) }} transition={{ duration: 0.4 }} />
      <motion.circle cx="99" cy="55" r="1.1" fill="#fff"
        animate={{ cy: 55 + (p.headY || 0) }} transition={{ duration: 0.4 }} />
      {/* smile */}
      <motion.path
        d="M82 66 Q90 73 98 66" stroke="#2a1a2a" strokeWidth="2.5" fill="none" strokeLinecap="round"
        animate={{}} style={{ transform: `translateY(${p.headY || 0}px)` }}
      />
      {/* arms — rotated around shoulders */}
      <motion.g
        style={{ transformOrigin: '78px 92px' }}
        animate={{ rotate: p.lArm }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
      >
        <rect x="73" y="62" width="9" height="34" rx="4.5" fill="#5B3FD6" />
        <circle cx="77.5" cy="60" r="7" fill="#FFD9E6" />
      </motion.g>
      <motion.g
        style={{ transformOrigin: '102px 92px' }}
        animate={{ rotate: p.rArm }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
      >
        <rect x="98" y="62" width="9" height="34" rx="4.5" fill="#5B3FD6" />
        <circle cx="102.5" cy="60" r="7" fill="#FFD9E6" />
      </motion.g>
    </motion.svg>
  );
}