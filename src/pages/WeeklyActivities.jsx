import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import ActivityPlayMode from '@/components/ActivityPlayMode';
import ActivityVideo from '@/components/ActivityVideo';
import SensoryBackground from '@/components/SensoryBackground';
import SensoryButton from '@/components/SensoryButton';
import MusicToggle from '@/components/MusicToggle';
import useAutoAmbientMusic from '@/hooks/useAutoAmbientMusic';
import { getMondayISO, addWeeksISO, formatWeekRange } from '@/lib/lessonConfig';
import { ChevronLeft, ChevronRight, Loader2, Play, SkipForward, Check, ArrowLeft } from 'lucide-react';

const ICON_EMOJI = {
  sparkles: '✨', music: '🎵', hand: '👋', count: '🔢', color: '🎨', shape: '🔷',
};
const STATUS_STYLE = {
  not_started: { label: 'Not Started', cls: 'bg-black/5 text-black/40' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  skipped: { label: 'Skipped', cls: 'bg-black/5 text-black/40' },
};
const CONFETTI_COLORS = ['#FF9EC4', '#4969E1', '#FFE08A', '#4FAE5A', '#7B4FE0'];

export default function WeeklyActivities() {
  const navigate = useNavigate();
  const [kid, setKid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [weekStart, setWeekStart] = useState(getMondayISO());
  const [activities, setActivities] = useState([]);
  const [playing, setPlaying] = useState(null);
  useAutoAmbientMusic();

  useEffect(() => {
    (async () => {
      try {
        const kids = await base44.entities.Kid.list();
        if (!kids || kids.length === 0) {
          navigate('/onboarding');
          return;
        }
        setKid(kids[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (!kid) return;
    let cancelled = false;
    (async () => {
      setPreparing(true);
      try {
        let acts = await base44.entities.SensoryActivity.filter({
          kid_id: kid.id,
          week_start: weekStart,
        });
        if ((!acts || acts.length === 0) && !cancelled) {
          const res = await base44.functions.invoke('generateWeeklyActivities', {
            kidId: kid.id,
            kidName: kid.name,
            age: kid.age,
            weekStart,
          });
          acts = res?.data?.activities || [];
        }
        if (!cancelled) setActivities(acts);
      } catch (e) {
        console.error(e);
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [kid, weekStart]);

  const merge = (id, patch) =>
    setActivities((arr) => arr.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const onVideo = (id, video) => merge(id, { video });

  const play = async (a) => {
    const updated = await base44.entities.SensoryActivity.update(a.id, {
      status: 'in_progress',
    });
    merge(a.id, updated);
    setPlaying(updated);
  };

  const skip = async (a) => {
    const updated = await base44.entities.SensoryActivity.update(a.id, {
      status: 'skipped',
    });
    merge(a.id, updated);
  };

  const complete = async (a) => {
    const updated = await base44.entities.SensoryActivity.update(a.id, {
      status: 'completed',
    });
    merge(a.id, updated);
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: CONFETTI_COLORS });
  };

  const onCompleteFromPlay = async () => {
    if (!playing) return;
    const updated = await base44.entities.SensoryActivity.update(playing.id, {
      status: 'completed',
    });
    merge(playing.id, updated);
    setPlaying(null);
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

  const isPast = weekStart < getMondayISO();

  return (
    <Layout>
      <SensoryBackground />
      <MusicToggle />
      <div className="relative z-10">
      <button
        onClick={() => navigate('/')}
        className="mb-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-black/60 shadow-sm active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </button>
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={() => setWeekStart(addWeeksISO(weekStart, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm text-black/60 active:scale-95"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-black/40">
            Weekly Activities
          </div>
          <div className="text-sm font-bold text-black/80">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="text-xs font-semibold text-black/45">{formatWeekRange(weekStart)}</div>
          {isPast && (
            <span className="text-[10px] font-bold text-black/30">Archived week</span>
          )}
        </div>
        <button
          onClick={() => setWeekStart(addWeeksISO(weekStart, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm text-black/60 active:scale-95"
          aria-label="Next week"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <Link
        to="/bubble-pop"
        className="mb-4 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-[#FFE8F3] to-[#EDE6FF] p-4 shadow-[0_0_20px_rgba(255,180,200,0.4)] active:scale-[0.99] transition"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl">🫧</div>
        <div className="flex-1 text-left">
          <h3 className="font-bold text-black/80">Zoodo</h3>
          <p className="text-sm text-black/50">Tap or use camera moves to pop bubbles</p>
        </div>
        <span className="text-sm font-bold text-[#7B4FE0]">Play →</span>
      </Link>

      {preparing ? (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-[#D96969] mb-3" />
          <p className="font-semibold text-black/50">Making this week's activities…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => {
            const st = STATUS_STYLE[a.status] || STATUS_STYLE.not_started;
            const done = a.status === 'completed';
            return (
              <motion.div
                key={a.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.99 }}
                className={`relative rounded-3xl bg-white p-4 shadow-[0_0_20px_rgba(255,180,200,0.35)] ${
                  done ? 'ring-2 ring-green-300' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF6E6] text-2xl">
                    {ICON_EMOJI[a.icon] || '✨'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-black/80">{a.title}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm text-black/50">{a.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <SensoryButton
                    onClick={() => play(a)}
                    glow="#4969E1"
                    className="flex flex-1 items-center justify-center gap-1.5 bg-[#4969E1] py-2.5 text-sm text-white"
                  >
                    <Play className="h-4 w-4" />
                    {a.status === 'in_progress' ? 'Resume' : 'Play'}
                  </SensoryButton>
                  <button
                    onClick={() => skip(a)}
                    className="flex items-center gap-1 rounded-2xl border-2 border-black/10 px-3 py-2.5 text-sm font-bold text-black/50 active:scale-95"
                    aria-label="Skip"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                  <SensoryButton
                    onClick={() => complete(a)}
                    glow="#4FAE5A"
                    className="flex items-center gap-1 bg-green-500 px-3 py-2.5 text-sm text-white"
                    aria-label="Mark complete"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </SensoryButton>
                </div>

                <ActivityVideo activity={a} age={kid?.age || 3} onVideo={onVideo} />
              </motion.div>
            );
          })}
        </div>
      )}

      </div>

      {playing && (
        <ActivityPlayMode
          activity={playing}
          kidName={kid?.name || 'friend'}
          onComplete={onCompleteFromPlay}
          onClose={() => setPlaying(null)}
        />
      )}
    </Layout>
  );
}