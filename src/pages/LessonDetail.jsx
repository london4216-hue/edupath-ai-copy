import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import DrawingCanvas from '@/components/DrawingCanvas';
import StoryActivity from '@/components/StoryActivity';
import LessonFlow from '@/components/LessonFlow';
import ParentRecordingPrompt from '@/components/ParentRecordingPrompt';
import OptionalLessonVideo from '@/components/OptionalLessonVideo';
import LunchActivity from '@/components/LunchActivity';
import StretchGuide from '@/components/StretchGuide';
import DayGraphic from '@/components/DayGraphic';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import SensoryBackground from '@/components/SensoryBackground';
import SensoryButton from '@/components/SensoryButton';
import MusicToggle from '@/components/MusicToggle';
import useAutoAmbientMusic from '@/hooks/useAutoAmbientMusic';
import { getDayConfigForAgeAndKey } from '@/lib/lessonConfig';
import { ArrowLeft, Loader2, Pencil, Sparkles, Home } from 'lucide-react';

export default function LessonDetail() {
  const { kidId, weekStart, day } = useParams();
  const navigate = useNavigate();

  const [kid, setKid] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(false);
  const [lessonDone, setLessonDone] = useState(false);
  const [step, setStep] = useState('lesson'); // lesson | drawing | lunch | story
  useAutoAmbientMusic();
  const dayCfg = getDayConfigForAgeAndKey(kid?.age || 4, day);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const kids = await base44.entities.Kid.filter({ id: kidId });
        if (!cancelled && kids[0]) setKid(kids[0]);
        const lessons = await base44.entities.Lesson.filter({
          kid_id: kidId,
          week_start: weekStart,
          day,
        });
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

  useEffect(() => {
    setStep('lesson');
    setLessonDone(false);
  }, [kidId, weekStart, day]);

  const markComplete = async () => {
    if (!lesson) return;
    const updated = await base44.entities.Lesson.update(lesson.id, {
      completed: true,
      skipped: false,
      completed_date: new Date().toISOString(),
    });
    setLesson(updated);
    setCelebrating(true);
  };

  const skipAndHome = async () => {
    if (!lesson) { navigate('/'); return; }
    await base44.entities.Lesson.update(lesson.id, { skipped: true, completed: false, completed_date: null });
    navigate('/');
  };

  const saveDrawing = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = await base44.entities.Lesson.update(lesson.id, { drawing_url: file_url });
    setLesson(updated);
  };

  const saveStory = async (text) => {
    const updated = await base44.entities.Lesson.update(lesson.id, { story: text });
    setLesson(updated);
  };

  if (!dayCfg) {
    return (
      <Layout>
        <p className="text-center text-black/50">Lesson not found.</p>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-[#D96969]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SensoryBackground />
      <MusicToggle />
      <div className="relative z-10 flex flex-col h-[calc(100vh-9.5rem)]">
        {/* Compact top bar: back + subject banner */}
        <div className="flex items-center gap-2 mb-1">
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
            <DayGraphic type={dayCfg.graphic} />
            <div
              className="text-lg font-bold leading-tight"
              style={{
                color: dayCfg.titleColor,
                WebkitTextStroke: `1px ${dayCfg.titleStroke}`,
              }}
            >
              Learning {dayCfg.subject}
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-1 flex items-center justify-center gap-2">
          {['lesson', 'drawing', 'lunch', 'story'].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                step === s ? 'w-8 bg-[#D96969]' : 'w-2 bg-black/15'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center">
          {step === 'lesson' && (
            <div className="space-y-3">
              {dayCfg.stretchGuide && !lessonDone && (
                <StretchGuide kidName={kid?.name} age={kid?.age || 4} />
              )}
              {lessonDone ? (
                <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
                  <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#4FAE5A] text-white">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl font-bold text-black/80">Lesson complete!</h2>
                  <p className="mt-1 text-sm font-semibold text-black/50">
                    Nice work, {kid?.name}! Want to draw or tell a story?
                  </p>
                  {lesson?.ai_content?.[0] && (
                    <div className="mt-3">
                      <OptionalLessonVideo
                      video={lesson.ai_content[0]}
                      subject={dayCfg.subject}
                      kidName={kid?.name}
                    />
                    </div>
                  )}
                  <div className="mt-3 flex flex-col gap-2">
                    <SensoryButton
                      onClick={() => setStep('drawing')}
                      glow="#4FAE5A"
                      className="flex items-center justify-center gap-2 bg-[#4FAE5A] py-3 text-white"
                    >
                      <Pencil className="h-5 w-5" /> Draw it!
                    </SensoryButton>
                    <button
                      onClick={() => navigate('/')}
                      className="flex items-center justify-center gap-2 rounded-2xl border-2 border-black/10 bg-white py-3 font-bold text-black/60 active:scale-95"
                    >
                      <Home className="h-5 w-5" /> Back to home
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!kid?.parent_videos?.length && (
                    <ParentRecordingPrompt
                      kidName={kid?.name || 'the child'}
                      onRecorded={async (url) => {
                        try {
                          const updated = await base44.entities.Kid.update(kid.id, {
                            parent_videos: [...(kid.parent_videos || []), url],
                          });
                          setKid(updated);
                        } catch (e) { /* ignore */ }
                      }}
                    />
                  )}
                  <LessonFlow
                    kidName={kid?.name || 'the child'}
                  subject={dayCfg.subject}
                  strand={dayCfg.strand}
                  dayLabel={dayCfg.label}
                  age={kid?.age || 4}
                  lesson={lesson}
                  currentLetter={kid?.current_letter || 'A'}
                  milestone={kid?.developmental_milestone}
                  supportNeeds={kid?.support_needs}
                  onMastery={async (next) => {
                    try {
                      const updated = await base44.entities.Kid.update(kid.id, { current_letter: next });
                      setKid(updated);
                    } catch (e) { /* ignore */ }
                  }}
                  onUpdate={setLesson}
                  onComplete={markComplete}
                  onNotReady={skipAndHome}
                  />
                </>
              )}
            </div>
          )}

          {step === 'drawing' && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Pencil className="h-5 w-5 text-[#4FAE5A]" />
                  <h2 className="text-lg font-bold text-black/80">Draw it!</h2>
                </div>
                <DrawingCanvas onSave={saveDrawing} savedUrl={lesson?.drawing_url} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('lesson')}
                  className="flex-1 rounded-2xl border-2 border-black/10 bg-white py-3 font-bold text-black/60 active:scale-95 transition"
                >
                  Back
                </button>
                <SensoryButton
                  onClick={() => setStep('lunch')}
                  glow="#F2A03D"
                  className="flex-[2] bg-[#F2A03D] py-3 text-white"
                >
                  Next: Lunch time
                </SensoryButton>
              </div>
            </div>
          )}

          {step === 'lunch' && (
            <div className="space-y-3">
              <LunchActivity kidName={kid?.name} />
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('drawing')}
                  className="flex-1 rounded-2xl border-2 border-black/10 bg-white py-3 font-bold text-black/60 active:scale-95 transition"
                >
                  Back
                </button>
                <SensoryButton
                  onClick={() => setStep('story')}
                  glow="#7B4FE0"
                  className="flex-[2] bg-[#7B4FE0] py-3 text-white"
                >
                  Next: Story time
                </SensoryButton>
              </div>
            </div>
          )}

          {step === 'story' && (
            <div className="space-y-3">
              <StoryActivity
                kidName={kid?.name || 'the child'}
                subject={dayCfg.subject}
                age={kid?.age || 4}
                onSaved={saveStory}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('lunch')}
                  className="flex-1 rounded-2xl border-2 border-black/10 bg-white py-3 font-bold text-black/60 active:scale-95 transition"
                >
                  Back
                </button>
                <SensoryButton
                  onClick={() => navigate('/')}
                  glow="#4969E1"
                  className="flex-[2] bg-[#4969E1] py-3 text-white"
                >
                  <Home className="h-5 w-5" /> All done!
                </SensoryButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {celebrating && (
        <CelebrationOverlay
          kidName={kid?.name || 'the child'}
          subject={dayCfg.subject}
          parentVideos={kid?.parent_videos}
          cheerText={kid?.cheer_text}
          onClose={() => { setCelebrating(false); setLessonDone(true); }}
        />
      )}
    </Layout>
  );
}