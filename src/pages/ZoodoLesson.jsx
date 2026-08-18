import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import ZoodoCharacter from '@/components/ZoodoCharacter';
import SensoryButton from '@/components/SensoryButton';
import MusicToggle from '@/components/MusicToggle';
import useAutoAmbientMusic from '@/hooks/useAutoAmbientMusic';
import { getDayConfigForAgeAndKey } from '@/lib/lessonConfig';
import { ArrowLeft, Loader2, Play, Pause, Check, Camera, Mic, Sparkles, ArrowRight } from 'lucide-react';
import { Image } from '@/components/ui/image';

const COLORS = ['#FF9EC4', '#4969E1', '#FFE08A', '#4FAE5A', '#7B4FE0'];

// Single-screen, clean Zoodo lesson player. Top → bottom, no tabs:
// lesson video (Zoodo narration + cartoon graphics) → recap → child assessment →
// completion → THEN the parent encouragement video.
const STEPS = ['lesson', 'recap', 'assessment', 'done', 'parent'];

export default function ZoodoLesson() {
  const { kidId, weekStart, day } = useParams();
  const navigate = useNavigate();
  useAutoAmbientMusic();

  const [kid, setKid] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [dayCfg, setDayCfg] = useState(null);
  const [loading, setLoading] = useState(true);

  const [media, setMedia] = useState(null);
  const [mediaStatus, setMediaStatus] = useState('generating');
  const [error, setError] = useState('');

  const [step, setStep] = useState(0);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [narrationDone, setNarrationDone] = useState(false);
  const [finished, setFinished] = useState(false);

  const audioRef = useRef(null);
  const sceneTimerRef = useRef(null);

  // Load kid + lesson + day config.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const kids = await base44.entities.Kid.filter({ id: kidId });
        if (cancelled) return;
        if (kids[0]) {
          setKid(kids[0]);
          setDayCfg(getDayConfigForAgeAndKey(kids[0].age || 4, day));
        }
        const lessons = await base44.entities.Lesson.filter({ kid_id: kidId, week_start: weekStart, day });
        if (cancelled) return;
        if (lessons[0]) setLesson(lessons[0]);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [kidId, weekStart, day]);

  // Generate Zoodo media once kid + day config are ready.
  useEffect(() => {
    if (!kid || !dayCfg) return;
    let cancelled = false;
    (async () => {
      setMediaStatus('generating');
      setError('');
      try {
        const res = await base44.functions.invoke('generateZoodoLessonMedia', {
          child_name: kid.name,
          age: kid.age || 4,
          milestone: kid.developmental_milestone || '',
          lesson_objective: dayCfg.subject,
          duration: 60,
          parent_video_url: (kid.parent_videos && kid.parent_videos[0]) || '',
        });
        if (cancelled) return;
        if (res?.data?.status === 'error' || res?.data?.error) {
          throw new Error(res.data.notes || res.data.error || 'Could not create the lesson.');
        }
        setMedia(res.data);
        setMediaStatus('ready');
        setStep(0);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Could not create the Zoodo lesson.');
        setMediaStatus('error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kid?.id, dayCfg?.key]);

  // Reset slideshow state when entering the lesson step.
  useEffect(() => {
    if (step === 0) { setSceneIdx(0); setNarrationDone(false); }
  }, [step]);

  // Play the audio for the current step when it has one.
  useEffect(() => {
    if (mediaStatus !== 'ready' || !media) return;
    const a = audioRef.current;
    if (!a) return;
    const url =
      step === 0 ? media.lesson_intro_audio_url :
      step === 1 ? media.post_explanation_audio_url :
      step === 2 ? media.child_feedback_audio_url : '';
    if (!url) { setPlaying(false); return; }
    a.src = url;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaStatus, media, step]);

  // Auto-advance the cartoon graphics during the lesson video step.
  useEffect(() => {
    if (step !== 0 || !media) return;
    const scenes = media.lesson_graphics_urls || [];
    if (scenes.length <= 1) return;
    clearInterval(sceneTimerRef.current);
    sceneTimerRef.current = setInterval(() => {
      setSceneIdx((i) => (i < scenes.length - 1 ? i + 1 : i));
    }, 6000);
    return () => clearInterval(sceneTimerRef.current);
  }, [step, media]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };

  const onAudioEnded = () => {
    setPlaying(false);
    if (step === 0) setNarrationDone(true);   // lesson video → show Continue
    else if (step === 1) setStep(2);           // recap → assessment
    // step 2 (assessment) waits for the "I did it!" button
  };

  const completeLesson = async () => {
    if (lesson) {
      try {
        const updated = await base44.entities.Lesson.update(lesson.id, {
          completed: true,
          skipped: false,
          completed_date: new Date().toISOString(),
        });
        setLesson(updated);
      } catch (e) { /* ignore */ }
    }
    confetti({ particleCount: 140, spread: 110, origin: { y: 0.5 }, colors: COLORS });
    setFinished(true);
    setStep(4);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-[#D96969]" />
        </div>
      </Layout>
    );
  }

  if (!dayCfg) {
    return (
      <Layout>
        <p className="text-center text-black/50">Lesson not found.</p>
      </Layout>
    );
  }

  const hasAudio = step === 0 || step === 1 || step === 2;
  const scenes = media?.lesson_graphics_urls || [];

  return (
    <Layout>
      <MusicToggle />

      {/* Top bar */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => navigate('/')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm text-black/60 hover:text-black active:scale-95 transition"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div
          className="flex flex-1 items-center gap-2 rounded-2xl px-3 py-1.5"
          style={{ backgroundColor: dayCfg.bg }}
        >
          <ZoodoCharacter size={28} />
          <div
            className="text-lg font-bold leading-tight"
            style={{ color: dayCfg.titleColor, WebkitTextStroke: `1px ${dayCfg.titleStroke}` }}
          >
            {dayCfg.subject}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-all ${
              i <= step ? 'bg-[#D96969]' : 'bg-black/10'
            }`}
          />
        ))}
      </div>

      {/* Single-screen stage */}
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <ZoodoCharacter size={80} bounce={playing} />

          {mediaStatus === 'generating' && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-[#D96969]" />
              <p className="mt-2 text-sm font-semibold text-black/50">Zoodo is getting ready…</p>
            </div>
          )}

          {mediaStatus === 'error' && (
            <p className="py-6 text-sm font-semibold text-red-500">{error}</p>
          )}

          {mediaStatus === 'ready' && media && (
            <AnimatePresence mode="wait">
              {/* 1. Lesson video = Zoodo narration + cartoon graphics */}
              {step === 0 && (
                <motion.div key="lesson" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                  <h2 className="mt-2 text-xl font-bold text-black/80">Let's learn with Zoodo!</h2>
                  {scenes.length > 0 && (
                    <Image
                      src={scenes[sceneIdx]}
                      alt="Zoodo picture"
                      fittingType="fill"
                      className="mt-3 h-44 w-full max-w-xs rounded-2xl shadow-md"
                    />
                  )}
                  {scenes.length > 1 && (
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                      {scenes.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full ${i === sceneIdx ? 'w-6 bg-[#D96969]' : 'w-2 bg-black/15'}`} />
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-sm font-semibold text-black/50">Listen to Zoodo tell the story…</p>
                </motion.div>
              )}

              {/* 2. Recap */}
              {step === 1 && (
                <motion.div key="recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                  <h2 className="mt-2 text-xl font-bold text-black/80">Let's remember!</h2>
                  <p className="mt-1 text-sm font-semibold text-black/50">Zoodo is recapping the lesson…</p>
                </motion.div>
              )}

              {/* 3. Child assessment */}
              {step === 2 && (
                <motion.div key="assessment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                  <h2 className="mt-2 text-xl font-bold text-black/80">Your turn, {kid?.name}!</h2>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#E8F0FF] px-4 py-2">
                    {media.assessment_mode === 'camera' ? <Camera className="h-4 w-4 text-[#4969E1]" /> : <Mic className="h-4 w-4 text-[#4969E1]" />}
                    <span className="text-sm font-bold text-[#4969E1]">
                      {media.assessment_mode === 'camera' ? 'Show Zoodo with your body!' : 'Say it out loud!'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-black/50">Listen to Zoodo, then try it!</p>
                </motion.div>
              )}

              {/* 4. Completion */}
              {step === 3 && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full">
                  <h2 className="mt-2 text-2xl font-bold text-[#4FAE5A]">You did it, {kid?.name}!</h2>
                  <p className="mt-1 text-sm font-semibold text-black/50">Zoodo is so proud of you.</p>
                </motion.div>
              )}

              {/* 5. Parent encouragement video */}
              {step === 4 && (
                <motion.div key="parent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                  <h2 className="mt-2 text-lg font-bold text-black/80">A special message for you!</h2>
                  {media.parent_encouragement_video_url ? (
                    <div className="mt-3 w-full max-w-xs overflow-hidden rounded-2xl shadow-md">
                      <video
                        src={media.parent_encouragement_video_url}
                        controls
                        autoPlay
                        className="w-full rounded-2xl"
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-black/40">No parent video yet — you did great anyway!</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Single clear action per step — no clutter */}
      <div className="mt-4">
        {mediaStatus === 'ready' && media && (
          <>
            {/* Audio control for audio steps */}
            {hasAudio && (
              <button
                onClick={togglePlay}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4969E1] py-2.5 text-base font-bold text-white active:scale-[0.98] transition hover:bg-[#3b54c9]"
              >
                {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                {playing ? 'Pause Zoodo' : 'Hear Zoodo'}
              </button>
            )}

            {/* Step 0: lesson video → recap (after narration ends) */}
            {step === 0 && narrationDone && (
              <SensoryButton onClick={() => setStep(1)} glow="#4969E1" className="flex w-full items-center justify-center gap-2 bg-[#4969E1] py-3 text-base text-white">
                Continue <ArrowRight className="h-5 w-5" />
              </SensoryButton>
            )}

            {/* Step 2: assessment — I did it */}
            {step === 2 && (
              <SensoryButton onClick={() => setStep(3)} glow="#4FAE5A" className="flex w-full items-center justify-center gap-2 bg-[#4FAE5A] py-3 text-base text-white">
                <Check className="h-5 w-5" /> I did it!
              </SensoryButton>
            )}

            {/* Step 3: completion → parent video */}
            {step === 3 && !finished && (
              <SensoryButton onClick={completeLesson} glow="#4FAE5A" className="flex w-full items-center justify-center gap-2 bg-[#4FAE5A] py-3 text-base text-white">
                <Sparkles className="h-5 w-5" /> See my surprise!
              </SensoryButton>
            )}

            {/* Step 4: parent video done → home */}
            {step === 4 && (
              <button
                onClick={() => navigate('/')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4969E1] py-3 text-base font-bold text-white active:scale-95 transition"
              >
                Back to home
              </button>
            )}
          </>
        )}
      </div>

      <audio ref={audioRef} onEnded={onAudioEnded} />
    </Layout>
  );
}