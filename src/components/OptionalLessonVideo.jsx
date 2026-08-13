import React, { useState } from 'react';
import { Youtube, Play, ChevronDown } from 'lucide-react';

// An optional, collapsed-by-default YouTube video shown after a lesson is
// complete. Uses the pre-generated video pick stored on the lesson so no extra
// API call is needed. Tapping "Watch" reveals the embedded player.
export default function OptionalLessonVideo({ video, subject, kidName }) {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);

  if (!video || !video.video_id) return null;

  const thumb = `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-[#D96969]" />
          <span className="text-sm font-bold text-black/70">
            Watch a fun {subject} video
          </span>
        </div>
        <ChevronDown className={`h-5 w-5 text-black/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            {!started ? (
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="relative h-full w-full"
                aria-label="Play the video"
              >
                <img src={thumb} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                    <Play className="h-7 w-7 fill-[#D96969] text-[#D96969]" />
                  </span>
                </span>
              </button>
            ) : (
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${video.video_id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={video.title || `${subject} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
          {video.title && <p className="mt-2 text-sm font-bold text-black/70">{video.title}</p>}
          {video.channel && <p className="text-xs font-semibold text-black/40">{video.channel}</p>}
          {video.why && <p className="mt-1 text-xs font-medium text-black/50">{video.why}</p>}
        </div>
      )}
    </div>
  );
}