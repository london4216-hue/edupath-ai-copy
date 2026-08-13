import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Youtube, AlertCircle } from 'lucide-react';

// Optional supporting YouTube video for a lesson activity. Finds a kid-friendly
// video based on the activity title + script. Marked optional — failures are
// shown quietly and never block the activity.
export default function LessonSupportVideo({ title, description, age, milestone, supportNeeds, subject, kidName }) {
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!title && !milestone && !subject) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await base44.functions.invoke('generateActivityVideo', {
          title,
          description: description || title,
          age,
          milestone,
          supportNeeds,
          subject,
          kidName,
        });
        if (cancelled) return;
        if (res?.data?.error) throw new Error(res.data.error);
        const v = res?.data?.video;
        if (!v) throw new Error('No video came back');
        setVideo(v);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Could not find a video.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, milestone, subject]);

  return (
    <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Youtube className="h-4 w-4 text-[#D96969]" />
        <span className="text-xs font-bold uppercase tracking-wide text-black/40">
          How it's really done · real demonstration
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[#D96969]" />
          <span className="ml-2 text-sm font-semibold text-black/50">
            Finding a real demonstration for {kidName || 'your child'}…
          </span>
        </div>
      )}

      {!loading && error && (
        <p className="flex items-center justify-center gap-1.5 py-3 text-center text-xs font-semibold text-black/40">
          <AlertCircle className="h-3.5 w-3.5" />
          No video right now — you can still play the activity!
        </p>
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
        </>
      )}
    </div>
  );
}