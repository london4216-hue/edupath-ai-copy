import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BookOpen, Loader2, Volume2, Square, RotateCw } from 'lucide-react';

// AI-generated personalized story about the day's topic, read aloud by the
// learning buddy using the browser's built-in speech synthesis.
export default function StoryActivity({ kidName, subject, age, onSaved }) {
  const [story, setStory] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('generateStory', {
        kidName,
        subject,
        age,
      });
      const text = res?.data?.story || '';
      if (!text) throw new Error('No story came back');
      setStory(text);
      setAudioUrl(res?.data?.audio_url || '');
      onSaved?.(text);
    } catch (err) {
      setError(err?.message || 'Could not generate story');
    } finally {
      setLoading(false);
    }
  };

  const stopAudio = () => {
    const el = audioRef.current;
    if (el) { el.pause(); el.currentTime = 0; }
    setSpeaking(false);
  };

  const readAloud = () => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (speaking) { stopAudio(); return; }
    el.currentTime = 0;
    el.play().then(() => setSpeaking(true)).catch(() => setSpeaking(false));
  };

  useEffect(() => () => stopAudio(), []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#EDE6FF] p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#7B4FE0] mx-auto mb-2" />
        <p className="text-sm font-semibold text-black/50">Making up a story about {subject}…</p>
      </div>
    );
  }

  if (!story && !error) {
    return (
      <div className="rounded-2xl bg-[#EDE6FF] p-5 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
          <BookOpen className="h-6 w-6 text-[#7B4FE0]" />
        </div>
        <p className="font-bold text-black/70 mb-1">Story time with {kidName}!</p>
        <p className="text-sm text-black/50 mb-4">
          A short, personalized story about {subject} — read aloud by your learning buddy.
        </p>
        <button
          type="button"
          onClick={generate}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#7B4FE0] px-5 py-3 font-bold text-white active:scale-95 transition"
        >
          <BookOpen className="h-4 w-4" />
          Create my story
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-black/10 bg-white/60 p-5 text-center">
        <p className="text-sm font-semibold text-red-500 mb-3">{error}</p>
        <button
          type="button"
          onClick={generate}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#7B4FE0] px-4 py-2.5 text-sm font-bold text-white active:scale-95 transition"
        >
          <RotateCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#EDE6FF] p-5">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-5 w-5 text-[#7B4FE0]" />
        <h3 className="font-bold text-black/70">A {subject} story for {kidName}</h3>
      </div>
      <p className="text-[15px] leading-relaxed text-black/70 whitespace-pre-line">{story}</p>
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setSpeaking(false)}
        onPause={() => setSpeaking(false)}
        className="hidden"
      />
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={readAloud}
          className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white active:scale-95 transition ${
            speaking ? 'bg-[#E0524F]' : 'bg-[#7B4FE0]'
          }`}
        >
          {speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {speaking ? 'Stop' : 'Read to me'}
        </button>
        <button
          type="button"
          onClick={generate}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-white border-2 border-black/10 px-4 py-2.5 text-sm font-bold text-black/60 active:scale-95 transition"
        >
          <RotateCw className="h-4 w-4" />
          New story
        </button>
      </div>
    </div>
  );
}