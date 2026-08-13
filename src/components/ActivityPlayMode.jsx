import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, RotateCw, Check, Volume2, Camera, Loader2 } from 'lucide-react';
import { playSparkle, playSuccess, playComplete, vibrate } from '@/lib/sensoryAudio';
import SparkleBurst from '@/components/SparkleBurst';
import SensoryButton from '@/components/SensoryButton';
import MusicToggle from '@/components/MusicToggle';
import RestartDemoButton from '@/components/RestartDemoButton';
import useAutoAmbientMusic from '@/hooks/useAutoAmbientMusic';
import { base44 } from '@/api/base44Client';

const GESTURE = {
  clap: { emoji: '👏' },
  wave: { emoji: '👋' },
  point: { emoji: '👉' },
  count: { emoji: '✋' },
};

const BG = {
  sparkles: 'from-[#FFE8F3] to-[#FFD9E6]',
  music: 'from-[#EDE6FF] to-[#D9CCFF]',
  hand: 'from-[#FFF6E6] to-[#FFE3B0]',
  count: 'from-[#E6F4FF] to-[#BFE0FF]',
  color: 'from-[#E6FFE6] to-[#BFF0BF]',
  shape: 'from-[#FFF0E6] to-[#FFD0B0]',
};

const STARS_TO_SUCCESS = 3;
const CONFETTI_COLORS = ['#FF9EC4', '#4969E1', '#FFE08A', '#4FAE5A', '#7B4FE0'];

// Full-screen sensory activity. The camera stays ON the whole time so Zoodo can
// watch the kid move. A star is awarded ONLY when the vision validator confirms
// the child actually did the prompted movement (e.g. "wiggle in the air"). After
// STARS_TO_SUCCESS validated reps, the activity is complete.
export default function ActivityPlayMode({ activity, kidName, onComplete, onClose }) {
  useAutoAmbientMusic();
  const [promptIdx, setPromptIdx] = useState(0);
  const [stars, setStars] = useState(0);
  const [bursts, setBursts] = useState([]);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [camError, setCamError] = useState('');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const g = GESTURE[activity.gesture] || GESTURE.clap;
  const prompts = activity.movement_prompts?.length
    ? activity.movement_prompts
    : ['Wiggle all around!'];
  const succeeded = stars >= STARS_TO_SUCCESS;

  useEffect(() => {
    const t = setInterval(() => setPromptIdx((i) => (i + 1) % prompts.length), 3500);
    return () => clearInterval(t);
  }, [prompts.length]);

  // Keep the camera ON for the whole activity so each rep can be validated.
  useEffect(() => {
    let active = null;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        active = s;
        setStream(s);
      } catch (e) {
        setCamError(`We need camera permission to check on ${kidName}. You can still do the activity together!`);
      }
    })();
    return () => {
      if (active) active.getTracks().forEach((t) => t.stop());
    };
  }, [kidName]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.play().catch(() => {});
  }, []);

  const popBurst = () => {
    const id = Date.now() + Math.random();
    setBursts((b) => [...b, { id }]);
    setTimeout(() => setBursts((b) => b.filter((it) => it.id !== id)), 700);
  };

  // Capture a frame and ask the vision validator whether the kid is doing the
  // prompted movement. Only a confirmed "yes" awards a star.
  const check = async () => {
    if (!stream) {
      setCamError(`We need camera permission to check on ${kidName}.`);
      return;
    }
    setChecking(true);
    setFeedback('');
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
      const file = new File([blob], 'kid_frame.jpg', { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke('validateParticipation', {
        image_file_url: file_url,
        target_action: prompts[promptIdx],
        kidName,
      });
      const data = res?.data || {};
      setFeedback(data.feedback || '');
      if (data.success) {
        const next = stars + 1;
        setStars(next);
        popBurst();
        playSparkle();
        playSuccess();
        vibrate([30, 30, 60]);
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
      }
    } catch (e) {
      setFeedback("Hmm, let's try again!");
    } finally {
      setChecking(false);
    }
  };

  const handleComplete = () => {
    playComplete();
    vibrate([40, 40, 80]);
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    onComplete?.();
  };

  const replayVoice = () => {
    const el = audioRef.current;
    if (el) {
      el.currentTime = 0;
      el.play().catch(() => {});
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-gradient-to-b ${BG[activity.icon] || BG.sparkles}`}>
      <MusicToggle />
      <div className="relative z-10 flex justify-end px-4 pt-3">
        <RestartDemoButton />
      </div>
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-black/60 active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-black/70">{activity.title}</h2>
        <button
          onClick={replayVoice}
          aria-label="Replay voice"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-black/60 active:scale-95"
        >
          <RotateCw className="h-5 w-5" />
        </button>
      </div>

      {/* Caregiver instruction — stars only come from real, camera-validated movement */}
      <div className="px-4">
        <div className="rounded-2xl bg-white/80 px-3 py-2 text-left shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#D96969]">
            For the caregiver
          </p>
          <p className="text-xs font-semibold text-black/60">
            Help {kidName} do the movement shown. Keep the camera on and tap "Check on me!" — Zoodo only gives a star when the camera sees {kidName} really doing it. Get {STARS_TO_SUCCESS} stars to finish!
          </p>
        </div>
      </div>

      {/* Animated gesture character */}
      <div className="flex justify-center mt-2">
        <motion.div
          animate={
            activity.gesture === 'wave'
              ? { rotate: [0, 20, -10, 20, 0] }
              : { scale: [1, 1.15, 1] }
          }
          transition={{ duration: activity.gesture === 'wave' ? 1.2 : 0.8, repeat: Infinity }}
          className="text-[7rem] leading-none drop-shadow-sm"
        >
          {g.emoji}
        </motion.div>
      </div>

      {/* Cycling movement prompt */}
      <div className="px-6 mt-1 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={promptIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-2xl font-bold text-black/75"
          >
            {prompts[promptIdx]}
          </motion.p>
        </AnimatePresence>
        <p className="mt-1 text-sm font-semibold text-black/40">Your turn, {kidName}!</p>
      </div>

      {/* Live camera preview — stays ON so Zoodo can watch and validate */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center w-full max-w-sm">
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-black/10 shadow-inner">
            {camError ? (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm font-semibold text-black/50">
                {camError}
              </div>
            ) : (
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            )}
            {!camError && (
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{ boxShadow: '0 0 0 3px #FF9EC4, 0 0 22px 4px #FF9EC4aa' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            {/* Sparkle burst on a validated rep */}
            {bursts.map((b) => (
              <div key={b.id} className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <SparkleBurst />
              </div>
            ))}
            {succeeded && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-white/90 px-4 py-1 text-lg font-bold text-[#4FAE5A] shadow">
                  Great job!
                </span>
              </div>
            )}
          </div>

          {/* Stars — only fill from camera-validated reps */}
          <div className="mt-4 flex gap-2">
            {Array.from({ length: STARS_TO_SUCCESS }).map((_, i) => (
              <motion.span
                key={i}
                animate={i < stars ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                className={`text-3xl ${i < stars ? 'opacity-100' : 'opacity-25'}`}
              >
                ⭐
              </motion.span>
            ))}
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.p
                key={feedback + stars}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 rounded-2xl px-4 py-2 text-center text-sm font-bold ${
                  stars > 0 && feedback ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {feedback}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {activity.audio_url && <audio ref={audioRef} src={activity.audio_url} className="hidden" />}

      <div className="p-5">
        {succeeded ? (
          <SensoryButton
            onClick={handleComplete}
            glow="#4FAE5A"
            className="flex w-full items-center justify-center gap-2 bg-[#4FAE5A] py-4 text-lg text-white"
          >
            <Check className="h-5 w-5" strokeWidth={3} /> Mark complete
          </SensoryButton>
        ) : (
          <div className="space-y-2">
            <SensoryButton
              onClick={check}
              glow="#4969E1"
              disabled={checking || !stream}
              className="flex w-full items-center justify-center gap-2 bg-[#4969E1] py-4 text-lg text-white disabled:opacity-60"
            >
              {checking ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" /> Check on me!
                </>
              )}
            </SensoryButton>
            <SensoryButton
              onClick={replayVoice}
              glow="#FF9EC4"
              className="flex w-full items-center justify-center gap-2 bg-white/80 py-4 text-lg text-black/70"
            >
              <Volume2 className="h-5 w-5" /> Play voice again
            </SensoryButton>
          </div>
        )}
      </div>
    </div>
  );
}