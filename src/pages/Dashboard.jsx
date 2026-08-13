import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import { DAYS, getMondayISO, formatWeekRange } from '@/lib/lessonConfig';
import { Check, ChevronRight, Heart, TrendingUp, MessageCircle, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [kid, setKid] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cheerText, setCheerText] = useState('');
  const [savingCheer, setSavingCheer] = useState(false);
  const [milestone, setMilestone] = useState('');
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [supportNeeds, setSupportNeeds] = useState('');
  const [savingSupportNeeds, setSavingSupportNeeds] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const kids = await base44.entities.Kid.list();
        if (kids[0]) {
          setKid(kids[0]);
          setCheerText(kids[0].cheer_text || '');
          setMilestone(kids[0].developmental_milestone || '');
          setSupportNeeds(kids[0].support_needs || '');
        }
        const all = await base44.entities.Lesson.filter({ kid_id: kids[0]?.id });
        setLessons(all || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Group lessons by week_start
  const weeks = useMemo(() => {
    const map = {};
    lessons.forEach((l) => {
      if (!map[l.week_start]) map[l.week_start] = [];
      map[l.week_start].push(l);
    });
    return Object.keys(map)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((ws) => {
        const dayLessons = map[ws];
        const completed = dayLessons.filter((l) => l.completed).length;
        return {
          weekStart: ws,
          lessons: dayLessons,
          completed,
          total: 5,
          percent: Math.round((completed / 5) * 100),
        };
      });
  }, [lessons]);

  const totalCompleted = lessons.filter((l) => l.completed).length;
  const totalLessons = lessons.length;
  const overallPercent = totalLessons ? Math.round((totalCompleted / totalLessons) * 100) : 0;
  const thisWeek = getMondayISO();

  // Kid-driven favorites: subjects ranked by how many videos the kid loved.
  const lovedBySubject = useMemo(() => {
    const map = {};
    lessons.forEach((l) => {
      if (l.loved && l.loved.length && l.subject) {
        map[l.subject] = (map[l.subject] || 0) + l.loved.length;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [lessons]);
  const totalLoved = lovedBySubject.reduce((s, [, c]) => s + c, 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#FAD7D7] border-t-[#D96969] rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="mb-5">
        <h1 className="text-3xl font-bold" style={{ color: '#D96969' }}>
          Learning Dashboard
        </h1>
        <p className="mt-1 text-black/50 font-medium">
          {kid?.name ? `${kid.name}'s progress over the weeks` : 'Progress over the weeks'}
        </p>
      </header>

      {/* Overall progress card */}
      <div className="rounded-[28px] bg-gradient-to-br from-[#4969E1] to-[#7B4FE0] p-5 text-white mb-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5" />
          <span className="font-semibold">Overall completion</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold">{overallPercent}%</span>
          <span className="text-sm font-medium opacity-80 mb-1">
            {totalCompleted} of {totalLessons} lessons
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full rounded-full bg-white/25 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      {/* Kid's favorites — driven by the videos the kid loved */}
      {lovedBySubject.length > 0 && (
        <div className="rounded-[28px] bg-white p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-5 w-5 text-pink-500" fill="currentColor" />
            <h2 className="font-bold text-black/80">{kid?.name ? `${kid.name}'s` : 'Kid\'s'} favorites</h2>
            <span className="ml-auto text-xs font-semibold text-black/40">{totalLoved} loved</span>
          </div>
          <div className="space-y-2">
            {lovedBySubject.map(([subject, count]) => {
              const pct = Math.round((count / lovedBySubject[0][1]) * 100);
              return (
                <div key={subject}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold text-black/70">{subject}</span>
                    <span className="font-bold text-pink-500">{count} ♥</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-pink-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-black/40">
            Future weeks lean toward these loved topics.
          </p>
        </div>
      )}

      {/* Editable encouragement saying — grown-up can change the cheer anytime */}
      {kid && (
        <div className="rounded-[28px] bg-white p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="h-5 w-5 text-[#D96969]" />
            <h2 className="font-bold text-black/80">Encouragement saying</h2>
          </div>
          <p className="text-xs text-black/40 mb-2">
            This is what the grown-up says (and records) for the child. It plays back at the end of every lesson.
          </p>
          <div className="flex gap-2">
            <input
              value={cheerText}
              onChange={(e) => setCheerText(e.target.value)}
              placeholder="You did it!"
              className="flex-1 rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-base font-semibold text-black focus:border-[#D96969] focus:outline-none transition-colors"
            />
            <button
              onClick={async () => {
                if (!kid) return;
                setSavingCheer(true);
                try {
                  const updated = await base44.entities.Kid.update(kid.id, { cheer_text: cheerText });
                  setKid(updated);
                } catch (e) { /* ignore */ }
                setSavingCheer(false);
              }}
              disabled={savingCheer || !cheerText.trim()}
              className="rounded-2xl bg-[#D96969] px-5 py-3 font-bold text-white active:scale-95 transition disabled:opacity-60"
            >
              {savingCheer ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Editable current milestone focus — drives age- and milestone-aligned content */}
      {kid && (
        <div className="rounded-[28px] bg-white p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-[#4969E1]" />
            <h2 className="font-bold text-black/80">Current milestone focus</h2>
          </div>
          <p className="text-xs text-black/40 mb-2">
            The developmental milestone {kid?.name ? `${kid.name}'s` : "your child's"} activities target right now. Update it anytime as they grow.
          </p>
          <div className="flex gap-2">
            <input
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              placeholder="e.g. hopping on one foot, counting to 10"
              className="flex-1 rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-base font-semibold text-black focus:border-[#4969E1] focus:outline-none transition-colors"
            />
            <button
              onClick={async () => {
                if (!kid) return;
                setSavingMilestone(true);
                try {
                  const updated = await base44.entities.Kid.update(kid.id, { developmental_milestone: milestone });
                  setKid(updated);
                } catch (e) { /* ignore */ }
                setSavingMilestone(false);
              }}
              disabled={savingMilestone || !milestone.trim()}
              className="rounded-2xl bg-[#4969E1] px-5 py-3 font-bold text-white active:scale-95 transition disabled:opacity-60"
            >
              {savingMilestone ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Support needs — adapts content for special-needs children */}
      {kid && (
        <div className="rounded-[28px] bg-white p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-5 w-5 text-pink-500" />
            <h2 className="font-bold text-black/80">Support needs</h2>
          </div>
          <p className="text-xs text-black/40 mb-2">
            Any diagnoses, conditions, or adaptations (e.g., “cerebral palsy, non-verbal, uses a wheelchair”). Activities adapt to these needs so a nanny or caregiver can lead them.
          </p>
          <div className="flex gap-2">
            <input
              value={supportNeeds}
              onChange={(e) => setSupportNeeds(e.target.value)}
              placeholder="e.g. cerebral palsy, limited verbal, wheelchair"
              className="flex-1 rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-base font-semibold text-black focus:border-pink-500 focus:outline-none transition-colors"
            />
            <button
              onClick={async () => {
                if (!kid) return;
                setSavingSupportNeeds(true);
                try {
                  const updated = await base44.entities.Kid.update(kid.id, { support_needs: supportNeeds });
                  setKid(updated);
                } catch (e) { /* ignore */ }
                setSavingSupportNeeds(false);
              }}
              disabled={savingSupportNeeds || !supportNeeds.trim()}
              className="rounded-2xl bg-pink-500 px-5 py-3 font-bold text-white active:scale-95 transition disabled:opacity-60"
            >
              {savingSupportNeeds ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
            </button>
          </div>
          <p className="mt-3 text-xs text-black/40">
            EduPath is a fun, caregiver-led companion that complements — it does not replace — professional therapy.
          </p>
        </div>
      )}

      {/* Weeks list */}
      <h2 className="text-sm font-bold uppercase tracking-wide text-black/40 mb-3 px-1">
        Weeks
      </h2>

      {weeks.length === 0 ? (
        <p className="text-center text-black/40 font-medium py-10">
          No lessons yet. Start with this week's plan.
        </p>
      ) : (
        <div className="space-y-3">
          {weeks.map((w) => {
            const isCurrent = w.weekStart === thisWeek;
            return (
              <Link
                key={w.weekStart}
                to="/"
                className="block rounded-2xl bg-white p-4 shadow-sm hover:shadow-md active:scale-[0.99] transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-black/80">
                        {formatWeekRange(w.weekStart)}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-[#E0F5FF] px-2 py-0.5 text-xs font-bold text-[#2B6FE0]">
                          This week
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {DAYS.map((d) => {
                        const l = w.lessons.find((x) => x.day === d.key);
                        return (
                          <span
                            key={d.key}
                            title={d.label}
                            className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                              l?.completed
                                ? 'bg-green-100 text-green-600'
                                : 'bg-black/5 text-black/30'
                            }`}
                          >
                            {d.label[0]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold" style={{ color: '#D96969' }}>
                      {w.completed}<span className="text-base text-black/30">/5</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs font-semibold text-black/40">
                      {w.percent}% <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Layout>
  );
}