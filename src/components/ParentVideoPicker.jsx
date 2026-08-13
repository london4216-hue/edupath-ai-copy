import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Check, Video, Square, Camera, Loader2 } from 'lucide-react';

// Records a cheer video straight from the device's front camera — no gallery
// or old-file selection. 3-2-1 countdown -> record -> preview -> keep.
// Calls onRecorded(File).
export default function ParentVideoPicker({ cheer, onRecorded }) {
  const [stream, setStream] = useState(null);
  const [camStatus, setCamStatus] = useState('asking'); // asking | ready | denied
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [file, setFile] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState(0);

  const liveRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const attachStream = (s) => {
    if (liveRef.current && s) {
      liveRef.current.srcObject = s;
      liveRef.current.play().catch(() => {});
    }
  };

  // Start the front camera as soon as the component mounts.
  const startCamera = async () => {
    setCamStatus('asking');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });
      setStream(s);
      setCamStatus('ready');
      // Defer to next frame so the <video> element is mounted before we attach.
      requestAnimationFrame(() => attachStream(s));
    } catch (e) {
      // Try video-only as a fallback (mic may be blocked).
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        setStream(s);
        setCamStatus('ready');
        requestAnimationFrame(() => attachStream(s));
      } catch (e2) {
        setCamStatus('denied');
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
  }, []);

  // Re-attach the live stream whenever the preview element re-mounts (e.g. after Redo).
  useEffect(() => {
    if (stream && liveRef.current && !videoUrl) {
      attachStream(stream);
    }
  }, [stream, videoUrl]);

  const startCountdown = () => {
    if (camStatus !== 'ready' || !stream || recording || videoUrl) return;
    setCountdown(3);
    let n = 3;
    const tick = () => {
      n -= 1;
      if (n <= 0) {
        setCountdown(0);
        startRecording();
      } else {
        setCountdown(n);
        setTimeout(tick, 1000);
      }
    };
    setTimeout(tick, 1000);
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    // Pick the first supported mime type; fall back to default if none match.
    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const mimeType = candidates.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    let rec;
    try {
      rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (e) {
      rec = new MediaRecorder(stream);
    }
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      const f = new File([blob], `cheer.${ext}`, { type });
      setFile(f);
      setVideoUrl(URL.createObjectURL(blob));
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const reset = () => {
    setVideoUrl('');
    setFile(null);
    setSeconds(0);
    requestAnimationFrame(() => attachStream(stream));
  };

  return (
    <div className="text-center">
      <div className="relative mx-auto aspect-video w-full max-w-sm overflow-hidden rounded-3xl bg-black shadow-inner">
        {videoUrl ? (
          <video src={videoUrl} controls autoPlay loop playsInline className="h-full w-full object-cover" />
        ) : (
          <>
            <video
              ref={liveRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover -scale-x-100"
            />
            {camStatus === 'asking' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white">
                <Loader2 className="h-7 w-7 animate-spin" />
                <span className="text-sm font-semibold">Starting camera…</span>
              </div>
            )}
            {camStatus === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 p-4 text-center text-white">
                <Camera className="h-7 w-7" />
                <span className="text-sm font-semibold">Camera is off.</span>
                <button
                  onClick={startCamera}
                  className="mt-1 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black active:scale-95"
                >
                  Try again
                </button>
              </div>
            )}
            {recording && (
              <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#D96969]" /> REC {seconds}s
              </div>
            )}
            {countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-7xl font-bold text-white drop-shadow-lg">{countdown}</span>
              </div>
            )}
          </>
        )}
      </div>

      <p className="mt-3 rounded-2xl bg-white/70 p-3 text-left">
        <span className="text-xs font-bold uppercase tracking-wide text-black/40">On the count of 3, say it with a big smile:</span>
        <span className="mt-1 block text-lg font-bold text-[#D96969]">“{cheer}”</span>
      </p>

      {!videoUrl ? (
        recording ? (
          <button
            onClick={stopRecording}
            className="mt-4 w-full rounded-2xl bg-[#D96969] py-4 text-lg font-bold text-white active:scale-95 transition"
          >
            <Square className="mr-1 inline h-5 w-5" /> Stop recording
          </button>
        ) : (
          <button
            onClick={startCountdown}
            disabled={camStatus !== 'ready'}
            className="mt-4 w-full rounded-2xl bg-[#D96969] py-4 text-lg font-bold text-white active:scale-95 transition hover:bg-[#c95a5a] disabled:opacity-60"
          >
            {camStatus === 'asking' ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Starting camera…</span>
            ) : camStatus === 'denied' ? (
              'Camera off — tap Try again'
            ) : (
              <><Video className="mr-1 inline h-5 w-5" /> Record your cheer</>
            )}
          </button>
        )
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={reset}
            className="flex-1 rounded-2xl border-2 border-black/10 bg-white py-3 font-bold text-black/60 active:scale-95 transition"
          >
            <RefreshCw className="mr-1 inline h-4 w-4" /> Redo
          </button>
          <button
            onClick={() => onRecorded(file)}
            className="flex-[2] rounded-2xl bg-[#4FAE5A] py-3 font-bold text-white active:scale-95 transition"
          >
            <Check className="mr-1 inline h-4 w-4" /> Keep & continue
          </button>
        </div>
      )}
    </div>
  );
}