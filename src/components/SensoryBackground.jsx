import React from 'react';
import { motion } from 'framer-motion';

const SHAPES = [
  { emoji: '⭐', left: '8%', size: 30, delay: 0, dur: 8 },
  { emoji: '🌈', left: '78%', size: 36, delay: 1.4, dur: 9 },
  { emoji: '🫧', left: '22%', size: 26, delay: 0.8, dur: 7 },
  { emoji: '✨', left: '62%', size: 24, delay: 2.2, dur: 8.5 },
  { emoji: '🎵', left: '42%', size: 28, delay: 0.4, dur: 10 },
  { emoji: '🩷', left: '88%', size: 24, delay: 1.8, dur: 7.5 },
  { emoji: '🟣', left: '52%', size: 22, delay: 2.8, dur: 9.5 },
];

// Warm, sensory background: a soft gradient with gently floating shapes.
// Rendered fixed behind page content (z-0); page content should sit in a
// relative z-10 wrapper so it paints above this layer.
export default function SensoryBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#FFF6F9] via-[#FFF3E6] to-[#EDE6FF]">
      {SHAPES.map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: s.left, bottom: -50, fontSize: s.size }}
          animate={{
            y: [0, -760],
            x: [0, 24, -12, 0],
            rotate: [0, 35, -25, 0],
            opacity: [0, 0.45, 0.45, 0],
          }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {s.emoji}
        </motion.div>
      ))}
    </div>
  );
}