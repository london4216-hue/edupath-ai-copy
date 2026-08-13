import React from 'react';
import { motion } from 'framer-motion';

// A single floating bubble. Rises from the bottom of the play area to the top
// with a gentle horizontal drift, looping until popped. Tap/click pops it.
export default function Bubble({ bubble, areaH, onPop }) {
  const start = (areaH || 600) + bubble.size;
  return (
    <motion.button
      type="button"
      onClick={() => onPop(bubble.id)}
      initial={{ y: start, opacity: 0 }}
      animate={{
        y: -bubble.size - 30,
        opacity: [0, 1, 1, 1, 0],
        x: [0, bubble.drift, -bubble.drift, 0],
      }}
      exit={{ scale: 1.8, opacity: 0 }}
      transition={{ duration: bubble.duration, repeat: Infinity, delay: bubble.delay, ease: 'linear' }}
      style={{
        position: 'absolute',
        left: `${bubble.x}%`,
        bottom: 0,
        width: bubble.size,
        height: bubble.size,
        borderRadius: '9999px',
        background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), hsl(${bubble.hue} 90% 72%) 70%)`,
        boxShadow: `inset -4px -6px 12px rgba(0,0,0,0.08), 0 0 14px hsl(${bubble.hue} 90% 75% / 0.5)`,
      }}
      className="pointer-events-auto flex items-center justify-center"
      aria-label={bubble.silly ? 'Silly bubble' : 'Bubble'}
    >
      {bubble.silly && <span className="text-3xl">😜</span>}
    </motion.button>
  );
}