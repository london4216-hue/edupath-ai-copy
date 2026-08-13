import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { Loader2, X, Mic } from 'lucide-react';

// Full-screen celebration that fires when a lesson is marked complete:
// confetti + a bouncing party character + an encouraging voice cheer.
export default function CelebrationOverlay({ kidName, subject, parentVideos, cheerText, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const [videoIdx, setVideoIdx] = useState(0);
  const [videosDone, setVideosDone] = useState(false);
  const videos = Array.isArray(parentVideos) ? parentVideos.filter(Boolean) : [];
  const colors = ['#FF9EC4', '#4969E1', '#FFE08A', '#4FAE5A', '#FFD9E6', '#7B4FE0'];

  // Fire confetti outward from around the video + a little firework pop sound.
  const fireworksAroundVideo = () => {
    const el = videoRef.current;
    let cx = 0.5, cy = 0.5;
    if (el) {
      const r = el.getBoundingClientRect();
      cx = (r.left + r.width / 2) / window.innerWidth;
      cy = (r.top + r.height / 2) / window.innerHeight;
    }
    confetti({ particleCount: 80, spread: 100, startVelocity: 35, origin: { x: cx, y: cy }, colors });
    setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 70, origin: { x: Math.max(0.05, cx - 0.12), y: cy }, colors }), 120);
    setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 70, origin: { x: Math.min(0.95, cx + 0.12), y: cy }, colors }), 240);
    playPop();
  };

  // Tiny WebAudio "firework pop" — no asset file needed.
  const playPop = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.25);
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.3);
      o.onended = () => ctx.close();
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    let cancelled = false;
    const burst = () => {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 180);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 360);
    };
    burst();

    // Play the parent cheer video(s) with sound right away — the lesson
    // "We finished!" tap counts as the user gesture autoplay needs.
    if (videos.length > 0) {
      setVideoIdx(0);
      setVideosDone(false);
      requestAnimationFrame(() => {
        videoRef.current?.play().catch(() => {
          // If autoplay-with-sound is blocked, fall back to muted so it still plays.
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      });
    }

    (async () => {
      try {
        const res = await base44.functions.invoke('generateCelebration', { kidName, subject });
        if (cancelled) return;
        setData(res?.data || null);
        setLoading(false);
        setTimeout(() => audioRef.current?.play().catch(() => {}), 250);
        setTimeout(burst, 1100);
      } catch (e) {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [kidName, subject]);

  // When we advance to the next parent's clip, make sure it actually plays.
  useEffect(() => {
    if (videoIdx === 0) return;
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
  }, [videoIdx]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="relative w-full max-w-sm rounded-[32px] bg-gradient-to-b from-[#FFF6E6] to-[#FFD9E6] p-6 text-center shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-black/50 hover:text-black/80 active:scale-95 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Bouncing party character */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, -6, 6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto h-32 w-32"
        >
          <svg viewBox="0 0 120 120" className="h-full w-full">
            <defs>
              <radialGradient id="celebBody" cx="50%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#FFD9E6" />
                <stop offset="100%" stopColor="#FF9EC4" />
              </radialGradient>
            </defs>
            {/* party hat */}
            <path d="M60 6 L78 40 L42 40 Z" fill="#4969E1" stroke="#3b54c9" strokeWidth="2" />
            <circle cx="60" cy="6" r="4" fill="#FFE08A" stroke="#E0A800" strokeWidth="1.5" />
            {/* body */}
            <circle cx="60" cy="66" r="48" fill="url(#celebBody)" stroke="#E07A9F" strokeWidth="3" />
            <circle cx="32" cy="76" r="8" fill="#FF8FA8" opacity="0.7" />
            <circle cx="88" cy="76" r="8" fill="#FF8FA8" opacity="0.7" />
            {/* happy eyes (closed smile arcs) */}
            <path d="M38 58 Q44 52 50 58" stroke="#3a2a3a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M70 58 Q76 52 82 58" stroke="#3a2a3a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            {/* big smile */}
            <path d="M42 80 Q60 96 78 80" stroke="#3a2a3a" strokeWidth="4" fill="none" strokeLinecap="round" />
          </svg>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="h-7 w-7 animate-spin text-[#D96969] mb-2" />
            <p className="font-semibold text-black/50">Getting your cheer ready…</p>
          </div>
        ) : (
          <>
            <h2 className="text-4xl font-bold text-[#D96969] leading-tight uppercase tracking-wide">
              {cheerText || `You did it, ${kidName}!`}
            </h2>
            <p className="mt-1 font-semibold text-black/60">
              Great job with {subject}, {kidName}!
            </p>
            <audio ref={audioRef} src={data?.audio_url} />
            {/* Parent cheer video(s) — each grown-up's clip plays in order, with sound */}
            {videos.length > 0 && (
              <div className="mt-4">
                <div className="relative mx-auto aspect-video w-full max-w-xs overflow-hidden rounded-3xl border-4 border-[#D96969] bg-black shadow-lg">
                  <video
                    ref={videoRef}
                    key={videoIdx}
                    src={videos[videoIdx]}
                    autoPlay
                    playsInline
                    controls={videosDone}
                    className="h-full w-full object-cover"
                    onPlay={fireworksAroundVideo}
                    onEnded={() => {
                      if (videoIdx < videos.length - 1) {
                        setVideoIdx((i) => i + 1);
                      } else {
                        setVideosDone(true);
                      }
                    }}
                  />
                  {videos.length > 1 && (
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {videos.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 rounded-full transition-all ${
                            i === videoIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {videosDone && (
                  <button
                    onClick={() => {
                      setVideoIdx(0);
                      setVideosDone(false);
                      requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
                    }}
                    className="mt-2 text-sm font-semibold text-[#D96969] underline underline-offset-2"
                  >
                    Replay cheers
                  </button>
                )}
              </div>
            )}
            {/* Parent affirmation prompt — say it out loud so the praise feels real */}
            <div className="mt-3 rounded-2xl bg-white/70 p-3">
              <div className="flex items-center gap-1.5">
                <Mic className="h-4 w-4 text-[#D96969]" />
                <p className="text-xs font-bold uppercase tracking-wide text-black/40">For the grown-up</p>
              </div>
              <p className="mt-1 text-sm font-semibold text-black/70">
                Say it out loud with a big smile:
              </p>
              <p className="mt-1 text-lg font-bold text-[#D96969]">
                “{cheerText || `You did it, ${kidName}!`}”
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-2xl bg-[#4969E1] py-4 text-lg font-bold text-white active:scale-95 transition hover:bg-[#3b54c9]"
            >
              <Mic className="mr-1 inline h-5 w-5" /> I said it! 🎉
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}