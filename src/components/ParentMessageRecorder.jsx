import React, { useRef, useState, useEffect } from 'react';
import { Video, Square, RotateCw, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SensoryButton from '@/components/SensoryButton';

// Records a 10–20 second parent cheer video and uploads it. Preview,
// retake, and save. No raw frames are stored beyond the uploaded file.
export default function ParentMessageRecorder({ kidName, onSaved, onCancel }) {
  const [status, setStatus] = useState('idle'); // idle | recording | preview | uploading
  const [error, setError] = useState('');
  const [recSecs, setRecSecs] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const liveRef = useRef(null);
  const videoRef = useRef(null);

  const stop = () => {
    if (recRef.current && recRef.current.state === 'recording') recRef.current.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  };

  const start = async () => {
    setError(''); setRecSecs(0); setVideoUrl('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      if (liveRef.current) { liveRef.current.srcObject = stream; liveRef.current.play().catch(() => {}); }
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoUrl(URL.createObjectURL(blob));
        setStatus('preview');
      };
      recRef.current = rec;
      rec.start();
      setStatus('recording');
      timerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
      setTimeout(() => {
        if (recRef.current && recRef.current.state === 'recording') stop();
      }, 20000);
    } catch (e) {
      setError('We need camera and mic permission to record. You can skip this!');
      setStatus('idle');
    }
  };

  const save = async () => {
    setStatus('uploading');
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const file = new File([blob], 'parent_message.webm', { type: 'video/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onSaved?.(file_url);
    } catch (e) {
      setError('Could not save the recording. Please try again.');
      setStatus('preview');
    }
  };

  const retake = () => { setVideoUrl(''); setStatus('idle'); setRecSecs(0); };

  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-black/80">Record a cheer for {kidName}</h3>
      <p className="mt-1 text-sm font-semibold text-black/50">
        A short, happy message — 10 to 20 seconds. We'll play it at the end of the lesson!
      </p>

      {error && <p className="mt-3 text-sm font-semibold text-amber-600">{error}</p>}

      <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-black">
        {status === 'recording' ? (
          <video ref={liveRef} muted playsInline className="h-full w-full object-cover" />
        ) : status === 'preview' || status === 'uploading' ? (
          <video ref={videoRef} src={videoUrl} controls playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-white/40">
            <Video className="h-10 w-10" />
          </div>
        )}
      </div>

      {status === 'recording' && (
        <p className="mt-2 text-center text-sm font-bold text-red-500">
          ● Recording… {recSecs}s / 20s
        </p>
      )}

      <div className="mt-4">
        {status === 'idle' && (
          <SensoryButton onClick={start} glow="#D96969" className="flex w-full items-center justify-center gap-2 bg-[#D96969] py-3 text-white">
            <Video className="h-5 w-5" /> Start recording
          </SensoryButton>
        )}
        {status === 'recording' && (
          <button onClick={stop} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 py-3 font-bold text-white active:scale-95">
            <Square className="h-5 w-5 fill-white" /> Stop
          </button>
        )}
        {status === 'preview' && (
          <div className="flex gap-2">
            <button onClick={retake} className="flex-1 rounded-2xl border-2 border-black/10 bg-white py-3 font-bold text-black/60 active:scale-95 flex items-center justify-center gap-1">
              <RotateCw className="h-4 w-4" /> Retake
            </button>
            <SensoryButton onClick={save} glow="#4FAE5A" className="flex-[2] bg-[#4FAE5A] py-3 text-white flex items-center justify-center gap-1">
              <Check className="h-5 w-5" /> Save message
            </SensoryButton>
          </div>
        )}
        {status === 'uploading' && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-[#4969E1]">
            <Loader2 className="h-5 w-5 animate-spin" /> Saving…
          </div>
        )}
      </div>

      {onCancel && status !== 'uploading' && (
        <button onClick={onCancel} className="mt-2 text-sm font-semibold text-black/40 underline underline-offset-2">
          Cancel
        </button>
      )}
    </div>
  );
}