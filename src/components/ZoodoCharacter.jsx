import React from 'react';
import { motion } from 'framer-motion';

// Zoodo — the ONE silly, playful, warm character for the whole app.
// A bouncy pink blob with a little antenna. Pass `bounce` to wiggle while talking.
export default function ZoodoCharacter({ size = 96, bounce = false }) {
  return (
    <motion.div
      animate={bounce ? { y: [0, -10, 0], rotate: [0, -4, 4, 0] } : { y: 0, rotate: 0 }}
      transition={bounce ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <defs>
          <radialGradient id="zoodoBody" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FFD9E6" />
            <stop offset="100%" stopColor="#FF9EC4" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="62" r="50" fill="url(#zoodoBody)" stroke="#E07A9F" strokeWidth="3" />
        <circle cx="32" cy="72" r="8" fill="#FF8FA8" opacity="0.7" />
        <circle cx="88" cy="72" r="8" fill="#FF8FA8" opacity="0.7" />
        <circle cx="44" cy="56" r="6" fill="#3a2a3a" />
        <circle cx="76" cy="56" r="6" fill="#3a2a3a" />
        <circle cx="46" cy="54" r="2" fill="#fff" />
        <circle cx="78" cy="54" r="2" fill="#fff" />
        <path d="M44 74 Q60 88 76 74" stroke="#3a2a3a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M60 12 Q60 22 60 26" stroke="#E07A9F" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="10" r="4" fill="#FFE08A" stroke="#E0A800" strokeWidth="2" />
      </svg>
    </motion.div>
  );
}