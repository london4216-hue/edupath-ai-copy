import React, { useRef, useState } from 'react';
import { Play, Video, ArrowRight } from 'lucide-react';
import SensoryButton from '@/components/SensoryButton';
import ParentMessageRecorder from '@/components/ParentMessageRecorder';

// Preflight modal shown before every lesson. Displays lesson title, child
// name, one-line objective, and the parent recording thumbnail with the
// option to use the existing message or record a new one.
export default function LessonPreflight({ kidName, lessonTitle, objective, parentVideos, onStart, onRecorded }) {
  const [showRecorder, setShowRecorder] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const videoRef = useRef(null);
  const parentVideo = parentVideos && parentVideos[0];

  if (showRecorder) {
    return (
      <ParentMessageRecorder
        kidName={kidName}
        onSaved={(url) => { onRecorded?.(url); setShowRecorder(false); }}
        onCancel={() => setShowRecorder(false)}
      />
    );
  }

  const togglePreview = () => {
    const v = videoRef.current;
    if (!v) return;
    if (previewing) { v.pause(); setPreviewing(false); }
    else { v.play().then(() => setPreviewing(true)).catch(() => {}); }
  };

  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-[#D96969]">Today's lesson</div>
      <h2 className="mt-1 text-xl font-bold text-black/80">{lessonTitle}</h2>
      <p className="mt-1 text-sm font-semibold text-black/50">
        {kidName} will practice {objective || "today's skill"} — and we'll cheer {kidName} on at the end!
      </p>

      {parentVideo ? (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-wide text-black/40">Parent message</div>
          <div className="mt-1 aspect-video w-full overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} src={parentVideo} className="h-full w-full object-cover" playsInline onEnded={() => setPreviewing(false)} />
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={togglePreview} className="flex-1 rounded-2xl border-2 border-black/10 bg-white py-2 text-sm font-bold text-black/60 active:scale-95 flex items-center justify-center gap-1 transition">
              <Play className="h-4 w-4" /> {previewing ? 'Pause' : 'Preview'}
            </button>
            <button onClick={() => setShowRecorder(true)} className="flex-1 rounded-2xl border-2 border-black/10 bg-white py-2 text-sm font-bold text-black/60 active:scale-95 flex items-center justify-center gap-1 transition">
              <Video className="h-4 w-4" /> Record new
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowRecorder(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D96969]/30 bg-[#FFF6E6] py-4 text-sm font-bold text-[#D96969] active:scale-95 transition"
        >
          <Video className="h-5 w-5" /> Record a cheer for {kidName}
        </button>
      )}

      <SensoryButton
        onClick={onStart}
        glow="#4FAE5A"
        className="mt-4 flex w-full items-center justify-center gap-2 bg-[#4FAE5A] py-4 text-lg text-white"
      >
        Start {kidName}'s lesson <ArrowRight className="h-5 w-5" />
      </SensoryButton>
    </div>
  );
}