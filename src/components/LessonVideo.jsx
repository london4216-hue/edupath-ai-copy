import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Youtube, AlertCircle, Play, RotateCw } from 'lucide-react';

// Bug-free lesson video: fetches a real demonstration video, shows a loading
// animation, then a "Tap to play" thumbnail (fresh user gesture → guaranteed
// autoplay WITH audio). Falls back gracefully if no video is found.
export default function LessonVideo({ kidName, age, milestone, supportNeeds, subject, onReady }) {
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await base44.functions.invoke('generateActivityVideo', {
          title: `${subject} for ${age}-year-olds`,
          description: `${subject} demonstration for ${age}-year-olds`,
          age, milestone, supportNeeds, subject, kidName,
        });
        if (cancelled) return;
        if (res?.data?.error) throw new Error(res.data.error);
        const v = res?.data?.video;
        if (!v) throw new Error('No video');
        setVideo(v);
        onReady?.();
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Could not find a video.');
          try { base44.analytics.track({ eventName: 'lesson_video_error', properties: { subject: String(subject) } }); } catch (_) {}
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, age, milestone, reloadKey]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
        <Loader2 className="h-7 w-7 animate-spin text-[#D96969]" />
        <p className="mt-2 text-sm font-semibold text-black/50">
          Finding a real demonstration for {kidName || 'you'}…
        </p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-sm">
        <AlertCircle className="h-6 w-6 text-black/30" />
        <p className="mt-2 text-sm font-semibold text-black/40">
          No video right now — you can still do the activity!
        </p>
        <button onClick={() => setReloadKey((k) => k + 1)} className="mt-3 flex items-center gap-1 rounded-2xl border-2 border-black/10 bg-white px-4 py-2 text-sm font-bold text-black/60 active:scale-95">
          <RotateCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  const thumb = `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Youtube className="h-4 w-4 text-[#D96969]" />
        <span className="text-xs font-bold uppercase tracking-wide text-black/40">
          How it's really done · real demonstration
        </span>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        {!started ? (
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="relative h-full w-full"
            aria-label="Play the demonstration video"
          >
            <img src={thumb} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/25">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Play className="h-8 w-8 fill-[#D96969] text-[#D96969]" />
              </span>
            </span>
          </button>
        ) : (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video.video_id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={video.title || 'Demonstration video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      <p className="mt-2 text-sm font-bold text-black/70">{video.title || 'Demonstration video'}</p>
      {video.channel && <p className="text-xs font-semibold text-black/40">{video.channel}</p>}
      {video.why && <p className="mt-1 text-xs font-medium text-black/50">{video.why}</p>}
    </div>
  );
}