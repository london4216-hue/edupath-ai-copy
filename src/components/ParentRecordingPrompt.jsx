import React, { useState } from 'react';
import { Video, X, MessageCircle } from 'lucide-react';
import SensoryButton from '@/components/SensoryButton';
import ParentMessageRecorder from '@/components/ParentMessageRecorder';

// Non-blocking prompt shown when a lesson has no parent cheer video yet.
// Suggests what to say and lets the caregiver record or skip — the lesson
// flow continues regardless.
export default function ParentRecordingPrompt({ kidName, onRecorded, onSkip }) {
  const [recording, setRecording] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (recording) {
    return (
      <ParentMessageRecorder
        kidName={kidName}
        onSaved={(url) => { onRecorded?.(url); setRecording(false); setDismissed(true); }}
        onCancel={() => setRecording(false)}
      />
    );
  }

  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-[#FFF6E6] to-white p-4 shadow-sm ring-1 ring-[#D96969]/10">
      <button
        onClick={() => { setDismissed(true); onSkip?.(); }}
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-black/40 active:scale-90"
        aria-label="Skip"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D96969]/10">
          <Video className="h-5 w-5 text-[#D96969]" />
        </div>
        <div>
          <h3 className="font-bold text-black/80">Record a cheer for {kidName}!</h3>
          <p className="text-xs font-semibold text-black/50">We'll play it at the end of every lesson</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-white/60 p-3">
        <div className="flex items-start gap-2">
          <MessageCircle className="h-4 w-4 shrink-0 text-[#4969E1] mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-black/40">What to say</p>
            <p className="mt-0.5 text-sm font-semibold text-black/70">
              &ldquo;Great job, {kidName}! I&apos;m so proud of you! You did it!&rdquo;
            </p>
          </div>
        </div>
      </div>

      <SensoryButton
        onClick={() => setRecording(true)}
        glow="#D96969"
        className="mt-3 flex w-full items-center justify-center gap-2 bg-[#D96969] py-3 text-white"
      >
        <Video className="h-5 w-5" /> Record now
      </SensoryButton>
      <button
        onClick={() => { setDismissed(true); onSkip?.(); }}
        className="mt-2 w-full text-center text-xs font-semibold text-black/40 underline underline-offset-2"
      >
        Skip for now
      </button>
    </div>
  );
}