import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { playZanyJingle, playSillyGiggle } from '@/lib/sensoryAudio';

// Zoodo — the funny, silly creature "learning buddy" that greets the kid by name
// and speaks the greeting aloud using the browser's built-in speech synthesis.
export default function KidAvatar({ greeting, audioUrl, size = 150, autoSpeak = true, showBubble = true }) {
  const [speaking, setSpeaking] = useState(false);
  const spokenRef = useRef(false);
  const audioRef = useRef(null);

  const speak = () => {
    // Only the lady voice is ever used — no browser speech synthesis fallback.
    if (audioUrl && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => setSpeaking(true)).catch(() => setSpeaking(false));
      } catch (e) { /* ignore */ }
    }
  };

  useEffect(() => {
    if (autoSpeak && audioUrl && !spokenRef.current) {
      spokenRef.current = true;
      const t = setTimeout(() => speak(), 500);
      return () => clearTimeout(t);
    }
  }, [autoSpeak, audioUrl]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setSpeaking(true)}
          onPause={() => setSpeaking(false)}
          onEnded={() => {
            setSpeaking(false);
            playSillyGiggle();
            setTimeout(() => playZanyJingle(), 900);
          }}
          className="hidden"
        />
      )}
      {showBubble && greeting && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.2 }}
          className="relative mb-3 max-w-[90%] rounded-3xl bg-white px-5 py-3 shadow-md text-center"
        >
          <p className="text-base font-bold text-black/80 leading-snug">{greeting}</p>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-4 bg-white rotate-45" />
        </motion.div>
      )}

      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.1 }}
        style={{ width: size, height: size }}
      >
        <motion.button
          type="button"
          onClick={() => speak()}
          className="relative block w-full h-full"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          aria-label="Zoodo — play greeting"
        >
          <svg viewBox="0 0 220 200" className="w-full h-full overflow-visible">
            {/* Antennae */}
            <motion.g
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '78px 52px' }}
            >
              <line x1="82" y1="52" x2="66" y2="18" stroke="#5B3FD6" strokeWidth="5" strokeLinecap="round" />
              <circle cx="64" cy="14" r="10" fill="#F2C200" />
              <circle cx="61" cy="11" r="3.5" fill="#fff" opacity="0.7" />
            </motion.g>
            <motion.g
              animate={{ rotate: [6, -6, 6] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              style={{ transformOrigin: '142px 52px' }}
            >
              <line x1="138" y1="52" x2="154" y2="18" stroke="#5B3FD6" strokeWidth="5" strokeLinecap="round" />
              <circle cx="156" cy="14" r="10" fill="#E0524F" />
              <circle cx="153" cy="11" r="3.5" fill="#fff" opacity="0.7" />
            </motion.g>

            {/* Arms */}
            <motion.ellipse
              cx="34" cy="122" rx="13" ry="17" fill="#6A3FD0"
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.ellipse
              cx="186" cy="122" rx="13" ry="17" fill="#6A3FD0"
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
            />

            {/* Body */}
            <ellipse cx="110" cy="118" rx="74" ry="70" fill="#7B4FE0" />
            <ellipse cx="110" cy="128" rx="44" ry="40" fill="#9B7FED" />

            {/* Cheeks */}
            <circle cx="70" cy="124" r="10" fill="#FF8FA3" opacity="0.75" />
            <circle cx="150" cy="124" r="10" fill="#FF8FA3" opacity="0.75" />

            {/* Eyes (blink) */}
            <motion.g
              animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
              transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.46, 0.5, 0.54, 1] }}
              style={{ transformOrigin: '110px 96px' }}
            >
              <circle cx="88" cy="96" r="19" fill="white" />
              <circle cx="132" cy="96" r="19" fill="white" />
              <motion.circle
                cx="88" cy="98" r="8.5" fill="#2a2a2a"
                animate={{ cx: [85, 91, 85], cy: [98, 100, 98] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="132" cy="98" r="8.5" fill="#2a2a2a"
                animate={{ cx: [129, 135, 129], cy: [98, 100, 98] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <circle cx="91" cy="94" r="3.2" fill="white" />
              <circle cx="135" cy="94" r="3.2" fill="white" />
            </motion.g>

            {/* Mouth (talks) */}
            <motion.g
              style={{ transformOrigin: '110px 132px' }}
              animate={speaking ? { scaleY: [1, 1.7, 0.7, 1.4, 1] } : { scaleY: 1 }}
              transition={speaking ? { duration: 0.32, repeat: Infinity } : { duration: 0.2 }}
            >
              <path
                d="M 90 128 Q 110 148 130 128 Z"
                fill="#3a1a2a"
                stroke="#2a2a2a"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path d="M 100 138 Q 110 144 120 138" fill="#FF6B8A" />
            </motion.g>
          </svg>
        </motion.button>
      </motion.div>

    </div>
  );
}