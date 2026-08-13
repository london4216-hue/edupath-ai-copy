import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { playPop } from '@/lib/sensoryAudio';
import SparkleBurst from '@/components/SparkleBurst';

// A glowing, gently-pulsing button that plays a soft pop + a sparkle burst at
// the tap point. Pass `glow` (a hex color) to tint the glow.
export default function SensoryButton({ children, onClick, glow = '#FF9EC4', className = '', ...props }) {
  const ref = useRef(null);
  const [bursts, setBursts] = useState([]);

  const handleTap = (e) => {
    playPop();
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now() + Math.random();
      setBursts((b) => [...b, { id, x, y }]);
      setTimeout(() => setBursts((b) => b.filter((it) => it.id !== id)), 700);
    }
    onClick?.(e);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={handleTap}
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.03 }}
      className={`relative rounded-2xl font-bold ${className}`}
      style={{ boxShadow: `0 0 16px ${glow}88` }}
      {...props}
    >
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-2xl"
        animate={{ boxShadow: [`0 0 8px ${glow}33`, `0 0 22px 6px ${glow}66`, `0 0 8px ${glow}33`] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="relative z-10 flex w-full items-center justify-center gap-2">
        {children}
      </span>
      {bursts.map((b) => (
        <span key={b.id} className="absolute" style={{ left: b.x, top: b.y }}>
          <SparkleBurst />
        </span>
      ))}
    </motion.button>
  );
}