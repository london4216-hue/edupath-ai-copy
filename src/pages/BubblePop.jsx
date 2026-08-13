import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowLeft, Camera, Loader2, X } from 'lucide-react';
import Bubble from '@/components/Bubble';
import SparkleBurst from '@/components/SparkleBurst';
import SensoryBackground from '@/components/SensoryBackground';
import SensoryButton from '@/components/SensoryButton';
import MusicToggle from '@/components/MusicToggle';
import RestartDemoButton from '@/components/RestartDemoButton';
import useAutoAmbientMusic from '@/hooks/useAutoAmbientMusic';
import { playPop, playBubblePop, playSparkle, playSuccess, vibrate } from '@/lib/sensoryAudio';
import { base44 } from '@/api/base44Client';

const MAX_BUBBLES = 9;
const CONFETTI_COLORS = ['#FF9EC4', '#4969E1', '#FFE08A', '#4FAE5A', '#7B4FE0'];

// Each gesture maps to a target action the vision validator recognizes, and an
// effect applied on a successful validation.
const GESTURES = {
  clap:  { label: 'Clap',  emoji: '👏', action: 'clapping their hands together',    effect: 'pop3' },
  wave:  { label: 'Wave',  emoji: '👋', action: 'waving their hand',                 effect: 'pop1' },
  point: { label: 'Point', emoji: '👉', action: 'pointing with one finger',          effect: 'popNearest' },
  smile: { label: 'Smile', emoji: '😄', action: 'smiling big',                       effect: 'sparkle' },
  frown: { label: 'Frown', emoji: '☹️', action: 'making a silly frowny face',        effect: 'silly' },
  hands: { label: 'Hands', emoji: '🙌', action: 'showing both hands to the camera',  effect: 'popBig' },
  count: { label: 'Count', emoji: '✋', action: 'holding up some fingers to count',   effect: 'count', returnCount: true },
};

function randBubble(id) {
  const big = Math.random() < 0.18;
  return {
    id,
    x: 5 + Math.random() * 85,
    size: big ? 115 + Math.random() * 30 : 52 + Math.random() * 50,
    hue: Math.floor(Math.random() * 360),
    duration: 6 + Math.random() * 5,
    delay: Math.random() * 1.2,
    drift: 15 + Math.random() * 30,
    big,
    silly: Math.random() < 0.12,
  };
}

export default function BubblePop() {
  const navigate = useNavigate();
  useAutoAmbientMusic();
  const [bubbles, setBubbles] = useState([]);
  const [popped, setPopped] = useState(0);
  const [best, setBest] = useState(0);
  const [sparkles, setSparkles] = useState([]);
  const [stream, setStream] = useState(null);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState('');
  const [gesture, setGesture] = useState('clap');
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [areaH, setAreaH] = useState(600);
  const [countFlash, setCountFlash] = useState(null);
  const areaRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const idRef = useRef(1);
  const bubblesRef = useRef([]);
  bubblesRef.current = bubbles;

  // Speak any line aloud in the lady voice (ElevenLabs) via a backend function,
  // so every spoken line matches the rest of the app.
  const speak = useCallback(async (text) => {
    if (!text) return;
    try {
      const res = await base44.functions.invoke('generateSpeech', { text });
      const url = res?.data?.audio_url;
      if (!url) return;
      if (audioRef.current) { try { audioRef.current.pause(); } catch (e) { /* ignore */ } }
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play().catch(() => {});
    } catch (e) { /* ignore */ }
  }, []);

  // Intro voice guidance + start spawning bubbles.
  useEffect(() => {
    speak('Pop the bubbles! Tap them, or pick a move and Zoodo will check on you!');
    setBubbles(Array.from({ length: 5 }, () => randBubble(idRef.current++)));
    const t = setInterval(() => {
      setBubbles((b) => (b.length >= MAX_BUBBLES ? b : [...b, randBubble(idRef.current++)]));
    }, 1400);
    return () => clearInterval(t);
  }, [speak]);

  useEffect(() => {
    const measure = () => { if (areaRef.current) setAreaH(areaRef.current.offsetHeight); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const bumpScore = (n) =>
    setPopped((p) => {
      const nn = p + n;
      setBest((bb) => Math.max(bb, nn));
      return nn;
    });

  // Pop N bubbles (oldest first) — used by clap / wave / point / count.
  const popN = (n) => {
    const arr = bubblesRef.current;
    const count = Math.min(n, arr.length);
    if (count <= 0) return;
    setBubbles(arr.slice(count));
    for (let i = 0; i < count; i++) { playPop(); vibrate(18); }
    bumpScore(count);
    confetti({ particleCount: 25 * count, spread: 55, origin: { y: 0.55 }, colors: CONFETTI_COLORS });
  };

  // Pop the biggest bubble — "show hands".
  const popBig = () => {
    const arr = bubblesRef.current;
    if (!arr.length) return;
    let target = arr[0];
    for (const b of arr) if (b.size > target.size) target = b;
    setBubbles(arr.filter((b) => b.id !== target.id));
    playPop(); vibrate(30);
    bumpScore(1);
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
  };

  // Smile → full-screen sparkle burst (no pop).
  const sparkleBurst = () => {
    playSparkle(); vibrate(30);
    const id = Date.now();
    setSparkles((s) => [...s, id]);
    setTimeout(() => setSparkles((s) => s.filter((x) => x !== id)), 900);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    speak('Sparkles! Happy face!');
  };

  // Frown → spawn a silly bubble.
  const spawnSilly = () => {
    const b = randBubble(idRef.current++);
    b.silly = true; b.size = 95; b.hue = 285;
    setBubbles((arr) => (arr.length >= MAX_BUBBLES ? arr : [...arr, b]));
    playSparkle();
    speak('Ooh, a silly bubble! Pop it!');
  };

  // Tap/click a bubble directly.
  const popBubble = (id) => {
    setBubbles((b) => b.filter((x) => x.id !== id));
    playBubblePop(); vibrate(18);
    setPopped((p) => {
      const nn = p + 1;
      setBest((bb) => Math.max(bb, nn));
      if (nn % 10 === 0) {
        playSuccess();
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
        speak('Yay! Ten bubbles!');
      }
      return nn;
    });
  };

  // Camera handling.
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setStream(s); setCamOn(true); setCamError('');
    } catch (e) {
      setCamError('We need camera permission to check your moves.');
    }
  };
  const stopCamera = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null); setCamOn(false);
  };
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);
  useEffect(() => () => { if (stream) stream.getTracks().forEach((t) => t.stop()); }, [stream]);

  // Capture a frame and validate the selected gesture; on success apply its effect.
  const check = async () => {
    if (!stream) { setCamError('Turn on the camera first!'); return; }
    const g = GESTURES[gesture];
    setChecking(true); setFeedback('');
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
      const file = new File([blob], 'bubble_frame.jpg', { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke('validateParticipation', {
        image_file_url: file_url,
        target_action: g.action,
        kidName: 'friend',
        return_count: !!g.returnCount,
      });
      const data = res?.data || {};
      setFeedback(data.feedback || '');
      speak(data.feedback || '');
      if (data.success) {
        switch (g.effect) {
          case 'pop3': popN(3); break;
          case 'pop1': popN(1); break;
          case 'popNearest': popN(1); break;
          case 'sparkle': sparkleBurst(); break;
          case 'silly': spawnSilly(); break;
          case 'popBig': popBig(); break;
          case 'count': {
            const n = Math.max(1, Math.min(10, data.count || 1));
            setCountFlash(n);
            speak(`${n}!`);
            popN(n);
            setTimeout(() => setCountFlash(null), 1400);
            break;
          }
          default: break;
        }
      }
    } catch (e) {
      setFeedback("Let's try again!");
      speak("Let's try again!");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-gradient-to-b from-[#E6F4FF] to-[#FFE8F3]">
      <SensoryBackground />
      <MusicToggle />

      {/* Restart demo */}
      <div className="relative z-10 flex justify-end px-4 pt-3">
        <RestartDemoButton />
      </div>

      {/* Header + live counter */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <button
          onClick={() => navigate('/activities')}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-black/60 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-black/70">Zoodo 🫧</h2>
        <div className="flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 shadow">
          <span className="text-lg">🫧</span>
          <span className="text-lg font-bold text-[#7B4FE0]">{popped}</span>
          <span className="text-xs font-semibold text-black/40">/ best {best}</span>
        </div>
      </div>

      {/* Bubble play area */}
      <div ref={areaRef} className="relative z-10 flex-1 overflow-hidden">
        <AnimatePresence>
          {bubbles.map((b) => (
            <Bubble key={b.id} bubble={b} areaH={areaH} onPop={popBubble} />
          ))}
        </AnimatePresence>
        {sparkles.map((id) => (
          <div key={id} className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <SparkleBurst />
          </div>
        ))}

        {/* Big animated count when the kid holds up fingers */}
        <AnimatePresence>
          {countFlash !== null && (
            <motion.div
              key={countFlash}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.2, opacity: 0, rotate: -25 }}
              animate={{ scale: [0.2, 1.3, 1], opacity: 1, rotate: [ -25, 8, 0 ] }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div
                className="flex h-40 w-40 items-center justify-center rounded-full text-7xl font-extrabold text-white shadow-2xl"
                style={{ background: 'radial-gradient(circle at 32% 28%, #fff, #7B4FE0 75%)', boxShadow: '0 0 40px #7B4FE088' }}
              >
                {countFlash}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera + gesture panel */}
      <div className="relative z-10 rounded-t-3xl bg-white/70 p-4 shadow-[0_-6px_20px_rgba(0,0,0,0.05)] backdrop-blur">
        {!camOn ? (
          <SensoryButton
            onClick={startCamera}
            glow="#4969E1"
            className="flex w-full items-center justify-center gap-2 bg-[#4969E1] py-3 text-white"
          >
            <Camera className="h-5 w-5" /> Turn on camera to pop with moves
          </SensoryButton>
        ) : (
          <div className="flex gap-3">
            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-2xl bg-black/10">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <button
                onClick={stopCamera}
                aria-label="Turn off camera"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(GESTURES).map(([key, g]) => (
                  <button
                    key={key}
                    onClick={() => setGesture(key)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      gesture === key ? 'bg-[#7B4FE0] text-white' : 'bg-white text-black/60'
                    }`}
                  >
                    <span>{g.emoji}</span>{g.label}
                  </button>
                ))}
              </div>
              <SensoryButton
                onClick={check}
                glow="#D96969"
                disabled={checking}
                className="mt-2 flex w-full items-center justify-center gap-2 bg-[#D96969] py-2.5 text-white disabled:opacity-60"
              >
                {checking ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>
                ) : (
                  <><Camera className="h-4 w-4" /> Check on me!</>
                )}
              </SensoryButton>
            </div>
          </div>
        )}
        {camError && (
          <p className="mt-2 text-center text-xs font-semibold text-amber-700">{camError}</p>
        )}
        <AnimatePresence>
          {feedback && (
            <motion.p
              key={feedback}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 rounded-2xl bg-white px-3 py-2 text-center text-sm font-bold text-[#7B4FE0]"
            >
              {feedback}
            </motion.p>
          )}
        </AnimatePresence>
        <p className="mt-2 text-center text-[11px] font-semibold text-black/40">
          Tap bubbles to pop them — or use a camera move!
        </p>
      </div>
    </div>
  );
}