import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { Loader2, Play, RotateCcw, Sparkles, Volume2, Check } from 'lucide-react';
import { Image } from '@/components/ui/image';

// Orton-Gillingham style pure-sound approximations for browser TTS feedback.
const PHONEMES = {
  A: 'ah', B: 'buh', C: 'kuh', D: 'duh', E: 'eh', F: 'fuh', G: 'guh', H: 'huh',
  I: 'ih', J: 'juh', K: 'kuh', L: 'luh', M: 'muh', N: 'nuh', O: 'aw', P: 'puh',
  Q: 'kwuh', R: 'ruh', S: 'suh', T: 'tuh', U: 'uh', V: 'vuh', W: 'wuh', X: 'ks',
  Y: 'yuh', Z: 'zuh',
};

function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85;
  u.pitch = 1.15;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

// Evidence-based interactive phonics activity.
// Framework: Direct Instruction (I-do / we-do / you-do) → active responding →
// immediate specific feedback → mastery learning (advance only on success).
// Phase 1 "Learn" models the letter-sound (premium narration + flashcard).
// Phase 2 "Play" is independent practice: identify the letter by its sound,
// with immediate feedback and retry-until-correct (success is guaranteed).
// Phase 3 "Done" advances the child's current_letter (mastery gate).
export default function InteractivePhonicsActivity({
  kidName, subject, strand, dayLabel, age, lesson, currentLetter, milestone, supportNeeds, onMastery, onUpdate, onComplete, onPlay,
}) {
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('learn'); // learn | play | done
  const [round, setRound] = useState(0);
  const [options, setOptions] = useState([]);
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [wrongId, setWrongId] = useState(null);
  const audioRef = useRef(null);
  const letter = (strand === 'literacy' ? (currentLetter || 'A') : '').toUpperCase();
  const sound = PHONEMES[letter] || letter;

  // Reuse the SLP narration + flashcard image from the existing generator.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('generateLessonActivity', {
          subject, dayLabel, kidName, age, milestone, supportNeeds,
          currentLetter: strand === 'literacy' ? (currentLetter || 'A') : undefined,
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
    })();
    return () => { cancelled = true; };
  }, [subject, dayLabel, kidName, age, currentLetter]);

  const startRound = (r) => {
    const distractors = [];
    while (distractors.length < 2) {
      const L = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      if (L !== letter && !distractors.includes(L)) distractors.push(L);
    }
    setOptions([letter, ...distractors].sort(() => Math.random() - 0.5).map((L, i) => ({ id: i, letter: L })));
    setRound(r);
    setFeedback(null);
    setWrongId(null);
  };

  useEffect(() => {
    if (phase === 'play' && data) startRound(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, data]);

  const playNarration = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play();
    onPlay?.();
  };

  const handleTap = (opt) => {
    if (opt.letter === letter) {
      setFeedback('correct');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#4FAE5A', '#FF9EC4', '#FFD966', '#7B4FE0'] });
      speak(`Yes! ${letter} says ${sound}!`);
      setTimeout(() => {
        if (round + 1 >= 3) {
          setPhase('done');
          onComplete?.();
          const code = letter.charCodeAt(0);
          if (code < 90) onMastery?.(String.fromCharCode(code + 1));
        } else {
          startRound(round + 1);
        }
      }, 1150);
    } else {
      setFeedback('wrong');
      setWrongId(opt.id);
      speak(`That's ${opt.letter}. Find the one that says ${sound}.`);
      setTimeout(() => { setFeedback(null); setWrongId(null); }, 950);
    }
  };

  if (status === 'loading') {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#7B4FE0] mb-3" />
          <p className="text-black/50 font-semibold">Building {kidName}'s lesson…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-500 mb-3">{error}</p>
        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-2xl bg-[#7B4FE0] px-5 py-3 font-bold text-white">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <audio ref={audioRef} src={data?.audio_url} />

      {/* Phase progress */}
      <div className="mb-3 flex items-center justify-center gap-2">
        {['learn', 'play', 'done'].map((p, i) => (
          <div
            key={p}
            className={`h-2 rounded-full transition-all ${
              phase === p ? 'w-10 bg-[#7B4FE0]' : ['learn', 'play', 'done'].indexOf(phase) > i ? 'w-4 bg-[#4FAE5A]' : 'w-4 bg-black/10'
            }`}
          />
        ))}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#7B4FE0]" />
        <h2 className="text-base font-bold text-black/80">Letter {letter} — {kidName}</h2>
      </div>

      {/* LEARN — model + guided practice */}
      {phase === 'learn' && (
        <div className="flex flex-col items-center">
          <div className="my-2 flex w-full items-center justify-center gap-4 rounded-3xl bg-[#F3EEFF] p-5">
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white text-7xl font-bold text-[#7B4FE0] shadow-md">
              {letter}
            </div>
            {data?.picture_url && (
              <Image src={data.picture_url} alt={data.word || letter} fittingType="fill" className="h-28 w-28 rounded-3xl shadow-md" />
            )}
          </div>
          {data?.word && <div className="text-2xl font-bold text-black/75 mb-1">{data.word}</div>}
          <div className="text-sm font-semibold text-[#7B4FE0] mb-3">"{letter}" says {sound}</div>

          <button onClick={playNarration} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7B4FE0] py-3 text-lg font-bold text-white active:scale-95 transition">
            <Play className="h-5 w-5" /> Play the lesson
          </button>
          <button onClick={() => speak(`${letter} says ${sound}`)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-black/10 bg-white py-3 font-bold text-black/60 active:scale-95 transition">
            <Volume2 className="h-5 w-5" /> Hear the sound
          </button>
          <button onClick={() => setPhase('play')} className="mt-3 w-full rounded-2xl bg-[#4FAE5A] py-3 text-lg font-bold text-white active:scale-95 transition">
            I'm ready to play! 🎮
          </button>
        </div>
      )}

      {/* PLAY — independent practice with immediate feedback */}
      {phase === 'play' && (
        <div className="flex flex-col items-center">
          <p className="mb-1 text-center text-lg font-bold text-black/75">
            Tap the letter that says <span className="text-[#7B4FE0]">{sound}</span>
          </p>
          <div className="mb-3 flex gap-2">
            {[0, 1, 2].map((r) => (
              <div key={r} className={`h-2.5 w-2.5 rounded-full ${r < round ? 'bg-[#4FAE5A]' : r === round ? 'bg-[#7B4FE0]' : 'bg-black/10'}`} />
            ))}
          </div>
          <div className="grid w-full grid-cols-3 gap-3">
            {options.map((opt) => (
              <motion.button
                key={opt.id}
                onClick={() => handleTap(opt)}
                whileTap={{ scale: 0.92 }}
                animate={wrongId === opt.id ? { x: [0, -6, 6, -6, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={`flex h-28 items-center justify-center rounded-3xl text-6xl font-bold shadow-md transition ${
                  feedback === 'correct' && opt.letter === letter
                    ? 'bg-[#4FAE5A] text-white'
                    : wrongId === opt.id
                    ? 'bg-red-100 text-red-400'
                    : 'bg-white text-[#7B4FE0]'
                }`}
              >
                {opt.letter}
              </motion.button>
            ))}
          </div>
          <AnimatePresence>
            {feedback === 'correct' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 flex items-center gap-2 text-lg font-bold text-[#4FAE5A]">
                <Check className="h-6 w-6" /> Yes!
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => speak(`Tap the letter that says ${sound}`)} className="mt-4 flex items-center gap-2 text-sm font-bold text-black/50">
            <Volume2 className="h-4 w-4" /> Hear it again
          </button>
        </div>
      )}

      {/* DONE — mastery achieved */}
      {phase === 'done' && (
        <div className="flex flex-col items-center py-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-[#4FAE5A] text-white">
            <Check className="h-12 w-12" />
          </motion.div>
          <h3 className="text-xl font-bold text-black/80">You did it, {kidName}!</h3>
          <p className="mt-1 text-sm font-semibold text-black/50">You learned the letter {letter}.</p>
          {letter < 'Z' && (
            <p className="mt-1 text-sm font-bold text-[#7B4FE0]">Next time: letter {String.fromCharCode(letter.charCodeAt(0) + 1)}!</p>
          )}
        </div>
      )}
    </div>
  );
}