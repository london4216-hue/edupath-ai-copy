import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, Camera, Loader2, Sparkles, RotateCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { playPraiseJingle, vibrate } from '@/lib/sensoryAudio';
import SensoryButton from '@/components/SensoryButton';

const CONFETTI_COLORS = ['#FF9EC4', '#4969E1', '#FFE08A', '#4FAE5A', '#7B4FE0'];

// Optional camera-based participation validator. Requests camera permission,
// shows a live preview, and on tap captures a frame and asks a vision model
// whether the child is doing the target action. On success: confetti, a warm
// voice praise (via generateCelebration), and onSuccess(). Always closeable.
export default function CameraValidator({ targetAction, kidName, onSuccess, onClose, onFail, inline }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | checking | success | fail
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [consentState, setConsentState] = useState('allowed'); // skip custom consent — go straight to browser permission prompt
  const [confidence, setConfidence] = useState(0);
  const [praiseUrl, setPraiseUrl] = useState('');
  const praiseRef = useRef(null);

  // Request camera access after consent.
  useEffect(() => {
    if (consentState !== 'allowed') return;
    let active = null;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        active = s;
        setStream(s);
      } catch (e) {
        setError(`We need camera permission to check on ${kidName}. You can still do the activity without it!`);
      }
    })();
    return () => {
      if (active) active.getTracks().forEach((t) => t.stop());
    };
  }, [consentState, kidName]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    if (praiseRef.current && praiseUrl) praiseRef.current.play().catch(() => {});
  }, [praiseUrl]);

  // Auto-run the check shortly after the camera is ready — no need to tap.
  useEffect(() => {
    if (!stream) return;
    const t = setTimeout(() => { check(); }, inline ? 9000 : 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  // If the system can't confirm the kid is participating, don't block — just
  // move on after 2 seconds so the lesson keeps flowing.
  useEffect(() => {
    if (status !== 'fail') return;
    if (inline) return; // let the child practice and retry manually
    const t = setTimeout(() => {
      onSuccess?.();
      onClose?.();
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const check = async () => {
    if (!stream) {
      setError(`We need camera permission to check on ${kidName}.`);
      return;
    }
    setStatus('checking');
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
        target_action: targetAction,
        kidName,
      });
      const data = res?.data || {};
      const conf = Math.round(data.confidence || 0);
      setConfidence(conf);
      setFeedback(data.feedback || '');
      if (data.success && conf >= 70) {
        setStatus('success');
        playPraiseJingle();
        vibrate([30, 30, 60]);
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
        try {
          const cel = await base44.functions.invoke('generateCelebration', { kidName, subject: targetAction });
          if (cel?.data?.audio_url) setPraiseUrl(cel.data.audio_url);
        } catch (e) {}
        onSuccess?.();
      } else if (data.success && conf < 70) {
        setStatus('confirm');
      } else {
        setStatus('fail');
        onFail?.(data.feedback || "Let's try again!");
      }
    } catch (e) {
      setStatus('fail');
      setFeedback("Hmm, let's try again!");
      onFail?.("Hmm, let's try again!");
    }
  };

  if (consentState === 'denied') {
    return (
      <div className={inline ? "mt-3" : "fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/40 p-5 backdrop-blur-sm"}>
        <div className={inline ? "relative w-full rounded-3xl bg-white p-4 shadow-sm" : "relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"}>
          {!inline && (
            <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-black/60 active:scale-95">
              <X className="h-5 w-5" />
            </button>
          )}
          <div className="flex flex-col items-center py-2 text-center">
            <p className="text-sm font-bold text-black/70">No camera? No problem!</p>
            <p className="mt-1 text-xs font-semibold text-black/40">Did {kidName} show you: {targetAction}?</p>
            <SensoryButton onClick={() => { onSuccess?.(); onClose?.(); }} glow="#4FAE5A" className="mt-3 w-full bg-[#4FAE5A] py-3 text-white">
              Yes, {kidName} did it!
            </SensoryButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={inline ? "mt-3" : "fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/40 p-5 backdrop-blur-sm"}>
      <div className={inline ? "relative w-full rounded-3xl bg-white p-4 shadow-sm" : "relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"}>
        {!inline && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-black/60 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <h3 className="text-center text-lg font-bold text-black/80">Let's check on {kidName}!</h3>
        <p className="mt-1 text-center text-sm font-semibold text-black/50">
          Can you show me: <span className="text-[#D96969]">{targetAction}</span>?
        </p>

        {/* Live camera preview with glowing border */}
        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-black/10 shadow-inner">
          {error ? (
            <div className="flex h-full items-center justify-center p-4 text-center text-sm font-semibold text-black/50">
              {error}
            </div>
          ) : (
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          )}
          {!error && (
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{ boxShadow: '0 0 0 3px #FF9EC4, 0 0 22px 4px #FF9EC4aa' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.p
              key={feedback}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 rounded-2xl px-4 py-3 text-center text-sm font-bold ${
                status === 'success'
                  ? 'bg-green-100 text-green-700'
                  : status === 'fail'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-black/5 text-black/60'
              }`}
            >
              {feedback}
            </motion.p>
          )}
        </AnimatePresence>

        {confidence > 0 && status !== 'idle' && (
          <p className="mt-1 text-center text-xs font-bold text-black/30">Confidence: {confidence}%</p>
        )}

        {/* Action */}
        <div className="mt-4">
          {status === 'success' ? (
            <SensoryButton
              onClick={onClose}
              glow="#4FAE5A"
              className="flex w-full items-center justify-center gap-2 bg-[#4FAE5A] py-3 text-white"
            >
              <Sparkles className="h-5 w-5" /> Yay! Done
            </SensoryButton>
          ) : status === 'confirm' ? (
            <div className="space-y-2">
              <p className="text-center text-sm font-bold text-amber-600">Not sure yet — did {kidName} do it?</p>
              <div className="flex gap-2">
                <button onClick={check} className="flex-1 rounded-2xl border-2 border-black/10 bg-white py-3 font-bold text-black/50 active:scale-95">Try again</button>
                <SensoryButton onClick={() => { setStatus('success'); playPraiseJingle(); onSuccess?.(); }} glow="#4FAE5A" className="flex-[2] bg-[#4FAE5A] py-3 text-white">Yes, {kidName} did it!</SensoryButton>
              </div>
            </div>
          ) : (
            <SensoryButton
              onClick={check}
              glow="#4969E1"
              className="flex w-full items-center justify-center gap-2 bg-[#4969E1] py-3 text-white"
            >
              {status === 'checking' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Checking…
                </>
              ) : status === 'fail' ? (
                <>
                  <RotateCw className="h-5 w-5" /> Try again
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" /> Check on me!
                </>
              )}
            </SensoryButton>
          )}
        </div>

        {praiseUrl && <audio ref={praiseRef} src={praiseUrl} className="hidden" />}
      </div>
    </div>
  );
}