import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image } from '@/components/ui/image';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { playCountNote } from '@/lib/sensoryAudio';

// Slow, one-at-a-time counting sequence with REAL object photos:
// "1 apple" ... "2 grapes" ... "3 bananas" — paced gently so the child counts
// real things, not just numbers. Auto-advances; caregiver/child can tap through.
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const STEP_MS = 6500;

export default function CountingCards({ cards }) {
  const total = cards.length;
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(true);
  const timer = useRef(null);

  const go = (i) => setIdx(((i % total) + total) % total);

  useEffect(() => {
    if (!auto || total < 2) return;
    timer.current = setTimeout(() => setIdx((i) => (i + 1) % total), STEP_MS);
    return () => clearTimeout(timer.current);
  }, [idx, auto, total]);

  // Play a gentle rising chime for each counted object — counting is musical.
  useEffect(() => {
    if (total < 2) return;
    playCountNote(cards[idx].n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, total]);

  const card = cards[idx];
  const numberWord = NUMBER_WORDS[card.n] || String(card.n);
  const label = `${numberWord} ${card.word}`;

  return (
    <div className="my-2 rounded-2xl bg-[#FFF6E6] p-4">
      <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-black/40">
        Count with me — nice and slow
      </div>

      <div className="relative flex flex-col items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: STEP_MS / 1000 - 0.5 }}
              className="text-6xl font-bold leading-none text-[#D96969]"
            >
              {card.n}
            </motion.div>
            {card.picture_url ? (
              <Image
                src={card.picture_url}
                alt={card.word}
                fittingType="fill"
                className="mt-2 h-28 w-28 rounded-2xl shadow-sm"
              />
            ) : (
              <div className="mt-2 h-28 w-28 rounded-2xl bg-white shadow-sm" />
            )}
            <div className="mt-2 text-xl font-bold capitalize text-black/70">{label}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => { setAuto(false); go(i); }}
            className={`h-2 rounded-full transition-all ${i === idx ? 'w-5 bg-[#D96969]' : 'w-2 bg-black/15'}`}
            aria-label={`Count ${i + 1}`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          onClick={() => { setAuto(false); go(idx - 1); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black/60 shadow-sm active:scale-95 transition"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => { setAuto(true); go(0); }}
          className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-bold text-black/60 shadow-sm active:scale-95 transition"
        >
          <RotateCcw className="h-4 w-4" /> Replay
        </button>
        <button
          onClick={() => { setAuto(false); go(idx + 1); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black/60 shadow-sm active:scale-95 transition"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}