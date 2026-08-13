import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Loader2, Check, Square } from 'lucide-react';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { playPraiseJingle, playSparkle, vibrate } from '@/lib/sensoryAudio';
import DeviceConsent from '@/components/DeviceConsent';

const COLORS = ['#FF9EC4', '#4969E1', '#FFE08A', '#4FAE5A'];

// Records the child's voice (4s), uploads it, and asks validateSpeech whether
// the child produced the target sound/word. Reports success/fail + feedback.
export default function MicAssessment({ kidName, target, onResult }) {
  const [status, setStatus] = useState('idle'); // idle | recording | uploading | checking | success | fail
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [consentState, setConsentState] = useState('pending'); // pending | allowed | denied
  const [confidence, setConfidence] = useState(0);
  const [recSecs, setRecSecs] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const recRef = useRef(null);
  const timerRef = useRef(null);

  const cleanup = () => {
    if (mediaRef.current) {
      mediaRef.current.getTracks().forEach((t) => t.stop());
      mediaRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = async () => {
    setError(''); setFeedback(''); setRecSecs(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = evaluate;
      recRef.current = rec;
      rec.start();
      setStatus('recording');
      timerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
      setTimeout(() => {
        if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
      }, 4000);
    } catch (e) {
      setError(`We need the mic to listen to ${kidName}. You can still try without it!`);
      setStatus('idle');
    }
  };

  const stopEarly = () => {
    if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
  };

  const evaluate = async () => {
    cleanup();
    setStatus('uploading');
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const file = new File([blob], 'kid_voice.webm', { type: 'audio/webm' });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setStatus('checking');
      const res = await base44.functions.invoke('validateSpeech', { audio_url: file_url, target, kidName });
      const data = res?.data || {};
      const conf = Math.round(data.confidence || 0);
      setConfidence(conf);
      setFeedback(data.feedback || '');
      if (data.success && conf >= 70) {
        setStatus('success');
        playPraiseJingle(); playSparkle(); vibrate([30, 30, 60]);
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 }, colors: COLORS });
        onResult?.(true, data.feedback);
      } else if (data.success && conf < 70) {
        setStatus('confirm');
      } else {
        setStatus('fail');
        onResult?.(false, data.feedback);
      }
    } catch (e) {
      setStatus('fail');
      setFeedback("Let's try again!");
      onResult?.(false, "Let's try again!");
    }
  };

  useEffect(() => () => cleanup(), []);

  if (consentState === 'pending') {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-[#FFF6E6] p-4 text-center">
        <DeviceConsent type="mic" kidName={kidName} onAllow={() => setConsentState('allowed')} onDeny={() => setConsentState('denied')} />
      </div>
    );
  }

  if (consentState === 'denied') {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-[#FFF6E6] p-4 text-center">
        <p className="font-bold text-black/70">No mic? No problem!</p>
        <p className="mt-1 text-sm font-semibold text-black/50">Did {kidName} say "{target}"?</p>
        <button onClick={() => onResult?.(true, `Great job, ${kidName}!`)} className="mt-3 w-full rounded-2xl bg-[#4FAE5A] py-3 font-bold text-white active:scale-95 transition">
          Yes, {kidName} said it!
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-2xl bg-[#FFF6E6] p-4 text-center">
      <p className="font-bold text-black/70">Let's listen to {kidName}!</p>
      <p className="mt-1 text-sm font-semibold text-black/50">
        Say: <span className="text-[#D96969] font-bold">“{target}”</span>
      </p>

      {error && <p className="mt-3 text-sm font-semibold text-amber-600">{error}</p>}

      <div className="mt-4 flex h-20 w-20 items-center justify-center">
        {status === 'recording' ? (
          <motion.button
            onClick={stopEarly}
            whileTap={{ scale: 0.9 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white"
            style={{ boxShadow: '0 0 18px #ef444488' }}
            aria-label="Stop recording"
          >
            <Square className="h-8 w-8 fill-white" />
          </motion.button>
        ) : (status === 'success' || status === 'confirm') ? (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4FAE5A] text-white">
            <Check className="h-10 w-10" strokeWidth={3} />
          </div>
        ) : (status === 'uploading' || status === 'checking') ? (
          <Loader2 className="h-10 w-10 animate-spin text-[#4969E1]" />
        ) : (
          <motion.button
            onClick={start}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.06 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4969E1] text-white"
            style={{ boxShadow: '0 0 18px #4969E188' }}
            aria-label={`Record ${kidName} saying ${target}`}
          >
            <Mic className="h-10 w-10" />
          </motion.button>
        )}
      </div>

      <p className="mt-3 text-sm font-bold text-black/60">
        {status === 'recording' ? `Listening… ${recSecs}s` :
         status === 'uploading' ? 'Saving your voice…' :
         status === 'checking' ? 'Checking your sound…' :
         status === 'success' ? `Great job, ${kidName}!` :
         status === 'fail' ? `Let's try again!` :
         `Tap the mic and say “${target}”`}
      </p>

      {feedback && (
        <p className={`mt-2 rounded-2xl px-3 py-2 text-sm font-bold ${
          status === 'success' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {feedback}
        </p>
      )}

      {status === 'confirm' && (
        <div className="mt-3 w-full">
          <p className="text-sm font-bold text-amber-600">Not sure yet — did {kidName} say it?</p>
          <div className="mt-2 flex gap-2">
            <button onClick={start} className="flex-1 rounded-2xl border-2 border-black/10 bg-white py-2 text-sm font-bold text-black/50 active:scale-95">Try again</button>
            <button onClick={() => { setStatus('success'); playPraiseJingle(); onResult?.(true, `Great job, ${kidName}!`); }} className="flex-[2] rounded-2xl bg-[#4FAE5A] py-2 text-sm font-bold text-white active:scale-95">Yes, {kidName} said it!</button>
          </div>
        </div>
      )}

      {confidence > 0 && status !== 'idle' && (
        <p className="mt-1 text-xs font-bold text-black/30">Confidence: {confidence}%</p>
      )}
    </div>
  );
}