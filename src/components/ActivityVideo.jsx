import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Youtube } from 'lucide-react';

// A "supporting video" section for a weekly sensory activity.
// Automatically finds a kid-friendly YouTube video for the skill on mount and
// embeds it. The found video is persisted on the activity.
export default function ActivityVideo({ activity, age, onVideo }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [video, setVideo] = useState(activity.video || null);

  useEffect(() => {
    if (video) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await base44.functions.invoke('generateActivityVideo', {
          title: activity.title,
          description: activity.description,
          age,
        });
        if (res?.data?.error) throw new Error(res.data.error);
        const v = res?.data?.video;
        if (!v) throw new Error('No video came back');
        if (cancelled) return;
        setVideo(v);
        onVideo?.(activity.id, v);
        try {
          await base44.entities.SensoryActivity.update(activity.id, { video: v });
        } catch (e) { /* state already updated; persist failure is non-fatal */ }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Could not find a video.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  return (
    <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Youtube className="h-4 w-4 text-[#D96969]" />
        <span className="text-xs font-bold uppercase tracking-wide text-black/40">
          Supporting video
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#D96969]" />
          <span className="ml-2 text-sm font-semibold text-black/50">
            Finding a good video…
          </span>
        </div>
      )}

      {!loading && error && (
        <p className="py-4 text-center text-sm font-semibold text-red-500">{error}</p>
      )}

      {!loading && video && (
        <>
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${video.video_id}?rel=0&modestbranding=1`}
              title={video.title || 'Supporting video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="mt-2 text-sm font-bold text-black/70">
            {video.title || 'Supporting video'}
          </p>
          {video.channel && (
            <p className="text-xs font-semibold text-black/40">{video.channel}</p>
          )}
          {video.why && (
            <p className="mt-1 text-xs text-black/50">{video.why}</p>
          )}
        </>
      )}
    </div>
  );
}