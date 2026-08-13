import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, Play, Pause, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import LessonSupportVideo from '@/components/LessonSupportVideo';
import CountingCards from '@/components/CountingCards';
import { playOutro } from '@/lib/sensoryAudio';
import MicParticipation from '@/components/MicParticipation';
import { Image } from '@/components/ui/image';

// AI-generated interactive audio activity: a cute character narrates a fun,
// Ms-Rachel-style lesson that invites the kid to join in. Includes a replay
// button and a caregiver "repeat next week?" prompt at the end.
export default function AiLessonActivity({ kidName, subject, strand, dayLabel, age, lesson, currentLetter, milestone, supportNeeds, onMastery, onUpdate, onComplete, onPlay }) {
  const [status, setStatus] = useState('generating'); // generating | ready | error
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [savedRepeat, setSavedRepeat] = useState(
    typeof lesson?.repeat_next_week === 'boolean' ? lesson.repeat_next_week : null
  );
  const audioRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setStatus('generating');
      setError('');
      try {
        const res = await base44.functions.invoke('generateLessonActivity', {
          subject, dayLabel, kidName, age, milestone, supportNeeds, currentLetter: strand === 'literacy' ? (currentLetter || 'A') : undefined,
        });
        if (cancelled) return;
        if (res?.data?.error) throw new Error(res.data.error);
        setData(res.data);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Could not create the activity.');
        setStatus('error');
      }
    };
    run();
    return () => { cancelled = true; };
  }, [subject, dayLabel, kidName, age]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const replay = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play();
    setPlaying(true);
    setShowRepeat(false);
  };

  const onEnded = () => {
    setPlaying(false);
    setShowRepeat(true);
    playOutro();
    onComplete?.();
  };

  // Tier-one mastery gating: only advance to the next letter once the child
  // actually produces the current one (confirmed by the camera or mic check).
  const handleMastery = () => {
    if (strand !== 'literacy' || !currentLetter) return;
    const code = currentLetter.charCodeAt(0);
    if (code >= 90) return; // already at Z — stay
    const next = String.fromCharCode(code + 1);
    onMastery?.(next);
  };

  const chooseRepeat = async (value) => {
    try {
      const updated = await base44.entities.Lesson.update(lesson.id, { repeat_next_week: value });
      setSavedRepeat(value);
      onUpdate?.(updated);
    } catch (e) {
      /* ignore */
    }
  };

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-[#D96969]" />
        <h2 className="text-base font-bold text-black/80">Today's activity for {kidName}</h2>
      </div>

      {status === 'generating' && (
        <div className="flex flex-col items-center py-6">
          <Loader2 className="h-7 w-7 animate-spin text-[#D96969] mb-2" />
          <p className="text-black/50 font-medium">Making something fun for {kidName}…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-6">
          <p className="text-sm font-semibold text-red-500 mb-3">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#4969E1] px-5 py-3 font-bold text-white active:scale-95 transition"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && data && (
        <>
          <audio
            ref={audioRef}
            src={data.audio_url}
            onEnded={onEnded}
            onPlay={() => { setPlaying(true); onPlay?.(); }}
            onPause={() => setPlaying(false)}
          />

          {/* Cute bouncing character */}
          <div className="flex flex-col items-center py-1">
            <motion.div
              animate={playing ? { y: [0, -10, 0], rotate: [0, -4, 4, 0] } : { y: 0, rotate: 0 }}
              transition={playing ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
              className="relative h-20 w-20"
            >
              <svg viewBox="0 0 120 120" className="h-full w-full">
                <defs>
                  <radialGradient id="bodyG" cx="50%" cy="40%" r="65%">
                    <stop offset="0%" stopColor="#FFD9E6" />
                    <stop offset="100%" stopColor="#FF9EC4" />
                  </radialGradient>
                </defs>
                <circle cx="60" cy="62" r="50" fill="url(#bodyG)" stroke="#E07A9F" strokeWidth="3" />
                {/* cheeks */}
                <circle cx="32" cy="72" r="8" fill="#FF8FA8" opacity="0.7" />
                <circle cx="88" cy="72" r="8" fill="#FF8FA8" opacity="0.7" />
                {/* eyes */}
                <circle cx="44" cy="56" r="6" fill="#3a2a3a" />
                <circle cx="76" cy="56" r="6" fill="#3a2a3a" />
                <circle cx="46" cy="54" r="2" fill="#fff" />
                <circle cx="78" cy="54" r="2" fill="#fff" />
                {/* smile */}
                <path d="M44 74 Q60 88 76 74" stroke="#3a2a3a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                {/* little antenna tuft */}
                <path d="M60 12 Q60 22 60 26" stroke="#E07A9F" strokeWidth="3" strokeLinecap="round" />
                <circle cx="60" cy="10" r="4" fill="#FFE08A" stroke="#E0A800" strokeWidth="2" />
              </svg>
            </motion.div>
            <h3 className="mt-2 text-center font-bold text-black/80">{data.title}</h3>
            <p className="mt-0.5 text-xs font-semibold text-black/40 flex items-center gap-1">
              <Volume2 className="h-3 w-3" /> Cute voice activity
            </p>
          </div>

          {/* Speech-therapy flashcard: letter + real picture + word + sound cue */}
          {(data.letter || data.picture_url) && (
            <div className="my-2 rounded-2xl bg-[#FFF6E6] p-3">
              <div className="flex items-center justify-center gap-3">
                {data.letter && (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-5xl font-bold text-[#D96969] shadow-sm">
                    {data.letter}
                  </div>
                )}
                {data.picture_url && (
                  <Image
                    src={data.picture_url}
                    alt={data.word || data.title}
                    fittingType="fill"
                    className="h-20 w-20 shrink-0 rounded-2xl shadow-sm"
                  />
                )}
                {data.word && (
                  <div className="text-xl font-bold text-black/70">{data.word}</div>
                )}
              </div>
              {data.sound && (
                <div className="mt-2 text-center text-sm font-bold text-[#D96969]">
                  Say “{data.sound}” like {data.word}
                </div>
              )}
            </div>
          )}

          {/* Slow real-object counting sequence for numeracy (1 apple, 2 grapes…) */}
          {data.counting_cards && data.counting_cards.length >= 2 && (
            <CountingCards cards={data.counting_cards} />
          )}

          {/* Play / pause button */}
          <button
            onClick={togglePlay}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4969E1] py-3 text-lg font-bold text-white active:scale-[0.98] transition hover:bg-[#3b54c9]"
          >
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            {playing ? 'Pause' : 'Play'}
          </button>

          {/* Replay button (always available, emphasized after first play) */}
          <button
            onClick={replay}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-black/10 bg-white py-3 font-bold text-black/60 active:scale-[0.98] transition hover:text-[#D96969]"
          >
            <RotateCcw className="h-5 w-5" />
            Play again
          </button>

          {/* Participation check — a simple mic tap. A webcam can't reliably
              verify a toddler's mouth articulation, so the camera is never used
              for speech lessons; the caregiver/kid tap the mic to confirm. */}
          <MicParticipation
            kidName={kidName}
            targetLabel={data.sound ? `Say “${data.sound}”` : (data.title || subject)}
            onDone={() => { handleMastery(); onComplete?.(); }}
          />

          {/* Caregiver prompt after playback */}
          {showRepeat && (
            <div className="mt-4 rounded-2xl bg-[#FFF6E6] p-4 text-center">
              <p className="font-bold text-black/70 mb-1">For the caregiver</p>
              <p className="text-sm font-semibold text-black/60 mb-3">
                Do you want to repeat this activity again next week?
              </p>
              {savedRepeat === null ? (
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => chooseRepeat(true)}
                    className="rounded-2xl bg-green-500 px-6 py-2.5 font-bold text-white active:scale-95 transition"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => chooseRepeat(false)}
                    className="rounded-2xl border-2 border-black/10 bg-white px-6 py-2.5 font-bold text-black/60 active:scale-95 transition"
                  >
                    No
                  </button>
                </div>
              ) : (
                <p className="text-sm font-bold text-green-600">
                  Saved — {savedRepeat ? "we'll repeat it next week!" : "we'll try something new next week!"}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Real demonstration video for the child's exact milestone */}
      <LessonSupportVideo
        title={`${subject} for ${age}-year-olds`}
        description={`${subject} activity for ${age}-year-olds`}
        age={age}
        milestone={milestone}
        supportNeeds={supportNeeds}
        subject={subject}
        kidName={kidName}
      />
    </div>
  );
}