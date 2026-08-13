import React from 'react';
import { motion } from 'framer-motion';

// A short burst of sparkle particles radiating outward from a point. Render it
// absolutely positioned at the interaction point; it self-fades and the parent
// removes it after the animation.
export default function SparkleBurst() {
  const particles = Array.from({ length: 8 });
  return (
    <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const dist = 36 + (i % 3) * 12;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              opacity: 0,
              scale: 0.3,
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute left-0 top-0 text-xl"
          >
            ✨
          </motion.span>
        );
      })}
    </div>
  );
}