import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import ZoodoCharacter from '@/components/ZoodoCharacter';
import SensoryButton from '@/components/SensoryButton';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import MusicToggle from '@/components/MusicToggle';
import useAutoAmbientMusic from '@/hooks/useAutoAmbientMusic';
import { getDayConfigForAgeAndKey } from '@/lib/lessonConfig';
import { ArrowLeft, Loader2, Play, Pause, ArrowRight, Sparkles } from 'lucide-react';
import { Image } from '@/components/ui/image';

const COLORS = ['#FF9EC4', '#4969E1', '#FFE08A', '#4FAE5A', '#7B4FE0'];

// Zoodo Lesson Engine player — milestone-based, slow pacing, warm tone, music,
// soft cartoon visuals, and child-safe single-button interaction.
// The parent encouragement video is NEVER shown during the lesson — it only
// appears in the CelebrationOverlay AFTER the lesson is fully completed.
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

  const [sceneIdx, setSceneIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioDone, setAudioDone] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [finished, setFinished] = useState(false);

  const audioRef = useRef(null);

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
          visual_style: 'soft cartoon',
          voice_style: 'Zoodo silly voice',
          duration: 60,
        });
        if (cancelled) return;
        if (res?.data?.status === 'error' || res?.data?.error) {
          throw new Error(res.data.notes || res.data.error || 'Could not create the lesson.');
        }
        setMedia(res.data);
        setMediaStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Could not create the Zoodo lesson.');
        setMediaStatus('error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kid?.id, dayCfg?.key]);

  // Auto-play Zoodo voice once media is ready.
  useEffect(() => {
    if (mediaStatus === 'ready' && media?.audio_url && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [mediaStatus, media]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };

  const scenes = (media?.graphics_urls || []);
  const captions = media?.captions || [];
  const atLastScene = sceneIdx >= scenes.length - 1;
  const canFinish = mediaStatus === 'ready' && (audioDone || scenes.length === 0) && (atLastScene || scenes.length === 0);

  const nextScene = () => {
    if (!atLastScene) setSceneIdx((i) => i + 1);
  };

  const finish = async () => {
    if (!lesson) { setFinished(true); return; }
    try {
      const updated = await base44.entities.Lesson.update(lesson.id, {
        completed: true,
        skipped: false,
        completed_date: new Date().toISOString(),
      });
      setLesson(updated);
    } catch (e) { /* ignore */ }
    confetti({ particleCount: 140, spread: 110, origin: { y: 0.5 }, colors: COLORS });
    setCelebrating(true);
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
            Zoodo time: {dayCfg.subject}
          </div>
        </div>
      </div>

      {/* Zoodo + scene stage */}
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <ZoodoCharacter size={88} bounce={playing} />

          <h2 className="mt-1 text-base font-bold text-black/80">
            Hi {kid?.name}! Zoodo is so happy to play!
          </h2>

          {mediaStatus === 'generating' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-7 w-7 animate-spin text-[#D96969]" />
              <p className="mt-2 text-sm font-semibold text-black/50">Zoodo is getting ready…</p>
            </div>
          )}

          {mediaStatus === 'error' && (
            <p className="py-6 text-sm font-semibold text-red-500">{error}</p>
          )}

          {mediaStatus === 'ready' && media && (
            <>
              {scenes.length > 0 && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={sceneIdx}
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -8 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="mt-3 flex w-full flex-col items-center rounded-2xl bg-[#FFF6E6] p-4"
                  >
                    <Image
                      src={scenes[sceneIdx]}
                      alt={captions[sceneIdx] || 'Zoodo scene'}
                      fittingType="fill"
                      className="h-40 w-full max-w-xs rounded-2xl shadow-md"
                    />
                    {captions[sceneIdx] && (
                      <div className="mt-2 text-sm font-bold text-black/70">{captions[sceneIdx]}</div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Scene dots */}
              {scenes.length > 1 && (
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  {scenes.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all ${
                        i === sceneIdx ? 'w-6 bg-[#D96969]' : 'w-2 bg-black/15'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Play / pause Zoodo voice */}
              {media.audio_url && (
                <button
                  onClick={togglePlay}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4969E1] py-2.5 text-base font-bold text-white active:scale-[0.98] transition hover:bg-[#3b54c9]"
                >
                  {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  {playing ? 'Pause Zoodo' : 'Hear Zoodo again'}
                </button>
              )}

              {/* Next scene or Finish */}
              {!atLastScene ? (
                <SensoryButton
                  onClick={nextScene}
                  glow="#F2A03D"
                  className="mt-2 flex w-full items-center justify-center gap-2 bg-[#F2A03D] py-3 text-base text-white"
                >
                  Next picture <ArrowRight className="h-5 w-5" />
                </SensoryButton>
              ) : canFinish ? (
                <SensoryButton
                  onClick={finish}
                  glow="#4FAE5A"
                  className="mt-2 flex w-full items-center justify-center gap-2 bg-[#4FAE5A] py-3 text-base text-white"
                >
                  <Sparkles className="h-5 w-5" /> All done!
                </SensoryButton>
              ) : (
                <div className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 bg-[#FFF6E6] py-3 text-sm font-semibold text-black/50">
                  <Loader2 className="h-4 w-4 animate-spin" /> Listen to Zoodo finish…
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs font-semibold text-black/40">
        Zoodo is the only voice — just listen and play along!
      </p>

      {media?.audio_url && (
        <audio
          ref={audioRef}
          src={media.audio_url}
          onEnded={() => { setPlaying(false); setAudioDone(true); }}
        />
      )}

      {celebrating && (
        <CelebrationOverlay
          kidName={kid?.name || 'the child'}
          subject={dayCfg.subject}
          parentVideos={kid?.parent_videos}
          cheerText={kid?.cheer_text}
          onClose={() => { setCelebrating(false); setFinished(true); }}
        />
      )}

      {finished && (
        <div className="mt-4 rounded-2xl bg-white p-5 text-center shadow-sm">
          <h2 className="text-xl font-bold text-black/80">Great playing with Zoodo!</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-3 w-full rounded-2xl bg-[#4969E1] py-3 font-bold text-white active:scale-95 transition"
          >
            Back to home
          </button>
        </div>
      )}
    </Layout>
  );
}