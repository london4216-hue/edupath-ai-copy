import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Camera, Check, Loader2, ArrowRight, Heart } from 'lucide-react';
import KidAvatar from '@/components/KidAvatar';
import ParentVideoPicker from '@/components/ParentVideoPicker';
import { defaultMilestoneForAge } from '@/lib/lessonConfig';

const START_AGES = [2, 3, 4, 5, 6, 7, 8];

// First-run intake: a cute Zoodo intro, then a short questionnaire (name, age,
// program length, developmental milestone), then camera permission — all before
// the home page launches. Activities are generated based on the child's age.
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState('intro'); // intro | form | camera
  const [name, setName] = useState('');
  const [startAge, setStartAge] = useState(4);
  const [programLength, setProgramLength] = useState(8);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [camStream, setCamStream] = useState(null);
  const [camStatus, setCamStatus] = useState('asking');
  const [introAudio, setIntroAudio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [kidId, setKidId] = useState(null);
  const [kid, setKid] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [parentStep, setParentStep] = useState('count'); // count | video
  const [parentCount, setParentCount] = useState(1);
  const [parentVideos, setParentVideos] = useState([]);
  const [currentParent, setCurrentParent] = useState(0);
  const [camConsent, setCamConsent] = useState(false);
  const videoRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const kid = await base44.entities.Kid.create({
        name: name.trim(),
        age: Number(startAge),
        developmental_milestone: defaultMilestoneForAge(startAge),
        program_length: programLength,
        cheer_text: 'You did it!',
      });
      setKidId(kid.id);
      setKid(kid);
      setStep('parent');
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Auto-request camera (+ mic) permission before the home page launches.
  useEffect(() => {
    if (step !== 'camera') return;
    let active = null;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
        active = s; setCamStream(s); setCamStatus('ready');
      } catch (e) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
          active = s; setCamStream(s); setCamStatus('ready');
        } catch (e2) { setCamStatus('denied'); }
      }
    })();
    return () => { if (active) active.getTracks().forEach((t) => t.stop()); };
  }, [step]);

  useEffect(() => {
    if (videoRef.current && camStream) {
      videoRef.current.srcObject = camStream;
      videoRef.current.play().catch(() => {});
    }
  }, [camStream]);

  // Fetch the lady-voice intro line so Zoodo speaks in the same voice as the app.
  useEffect(() => {
    if (step !== 'intro') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('generateSpeech', {
          text: "Hi! I'm Zoodo! Let's learn and play together!",
        });
        if (!cancelled && res?.data?.audio_url) setIntroAudio(res.data.audio_url);
      } catch (e) { /* ignore — Zoodo stays silent rather than use another voice */ }
    })();
    return () => { cancelled = true; };
  }, [step]);

  const saveParentVideo = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const next = [...parentVideos, file_url];
      setParentVideos(next);
      const done = next.length >= parentCount;
      if (done && kidId) {
        await base44.entities.Kid.update(kidId, { parent_videos: next });
        setUploading(false);
        setStep('camera');
      } else {
        setUploading(false);
        setCurrentParent(currentParent + 1);
      }
    } catch (e) {
      setUploading(false);
    }
  };

  const startCountdown = () => {
    let n = 3;
    setCountdown(n);
    const tick = () => {
      n -= 1;
      if (n > 0) {
        setCountdown(n);
        setTimeout(tick, 800);
      } else {
        setCountdown(0);
        navigate('/');
      }
    };
    setTimeout(tick, 800);
  };

  const finish = () => navigate('/');

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF8] to-[#FDE9F0] flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
          <Sparkles className="h-6 w-6 text-[#D96969]" />
        </div>
        <KidAvatar greeting="Hi! I'm Zoodo! Let's learn and play together!" audioUrl={introAudio} size={180} />
        <h1 className="mt-6 text-4xl font-bold" style={{ color: '#7B4FE0' }}>
          Meet Zoodo!
        </h1>
        <p className="mt-3 max-w-sm text-black/60 font-medium">
          I'm your silly, giggly learning buddy! I'll make a fun plan just for your
          little one — full of music, movement, and bubbles!
        </p>
        <Button
          onClick={() => setStep('form')}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#7B4FE0] px-8 py-6 text-lg font-bold text-white hover:bg-[#6a3fd0]"
        >
          Let's go! <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  if (step === 'parent') {
    return (
      <div className="min-h-screen bg-[#FFFDF8] flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAD7D7]">
            <Heart className="h-8 w-8 text-[#D96969]" />
          </div>
          {parentStep === 'count' ? (
            <>
              <h1 className="text-3xl font-bold" style={{ color: '#D96969' }}>How many grown-ups?</h1>
              <p className="mt-2 text-black/60 font-medium">
                Each grown-up will add their own cheer video. {name || 'Your child'} will hear it from every one of you at the end of each lesson!
              </p>
              <div className="mt-6 flex gap-3">
                {[1, 2].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setParentCount(n); setParentVideos([]); setCurrentParent(0); setParentStep('video'); }}
                    className={`flex-1 rounded-2xl border-2 py-8 text-2xl font-bold transition active:scale-95 ${
                      parentCount === n
                        ? 'border-[#D96969] bg-[#D96969] text-white shadow'
                        : 'border-black/10 bg-white text-black/70 hover:border-[#D96969]/50'
                    }`}
                  >
                    {n} {n === 1 ? 'grown-up' : 'grown-ups'}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold" style={{ color: '#D96969' }}>
                Grown-up {currentParent + 1} of {parentCount}
              </h1>
              <p className="mt-2 text-black/60 font-medium">
                Get ready to say it on the count of 3! At the end of every lesson
                this plays back so {name || 'your child'} hears it from you.
              </p>
              <div className="mt-5">
                {uploading ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-black/50 font-semibold">
                    <Loader2 className="h-7 w-7 animate-spin text-[#D96969]" /> Saving cheer {currentParent + 1}…
                  </div>
                ) : (
                  <ParentVideoPicker
                    cheer={kid?.cheer_text ? `${kid.cheer_text}` : `You did it, ${name}!`}
                    onRecorded={saveParentVideo}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (step === 'camera') {
    return (
      <div className="min-h-screen bg-[#FFFDF8] flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#EDE6FF]">
            <Camera className="h-8 w-8 text-[#7B4FE0]" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#7B4FE0' }}>Turn on the camera</h1>
          <p className="mt-2 text-black/60 font-medium">
            Zoodo uses the camera to cheer your child on during activities. Let's allow it now!
          </p>
          <div className="relative mx-auto mt-6 aspect-video w-full max-w-sm overflow-hidden rounded-3xl bg-black/10 shadow-inner">
            {camStatus === 'denied' ? (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm font-semibold text-black/50">
                Camera is off — that's okay, you can still play! You can enable it later.
              </div>
            ) : (
              <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
            )}
            {camStatus === 'ready' && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-xs font-bold text-white shadow">
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Ready
              </span>
            )}
          </div>
          <label className="mt-5 flex items-start gap-2 rounded-2xl bg-white/70 p-3 text-left text-sm font-medium text-black/70">
            <input
              type="checkbox"
              checked={camConsent}
              onChange={(e) => setCamConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#7B4FE0]"
            />
            <span>
              I consent to Zoodo using the camera to cheer my child on during activities.
            </span>
          </label>
          <Button
            onClick={startCountdown}
            disabled={camStatus === 'asking' || countdown > 0 || !camConsent}
            className="mt-4 w-full rounded-2xl bg-[#7B4FE0] py-6 text-lg font-bold text-white hover:bg-[#6a3fd0] disabled:opacity-60"
          >
            {camStatus === 'asking' ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Asking for permission…</span>
            ) : 'Start the plan'}
          </Button>
          <button
            onClick={finish}
            className="mt-3 w-full text-sm font-semibold text-black/40 underline underline-offset-2 hover:text-black/60"
          >
            Skip for now — we can do this later
          </button>
          {countdown > 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <span className="text-8xl font-bold text-white animate-ping-slow">{countdown}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAD7D7]">
          <Sparkles className="h-8 w-8 text-[#D96969]" />
        </div>
        <h1
          className="text-4xl font-bold leading-tight"
          style={{ color: '#D96969' }}
        >
          Making this plan fun<br />for {name.trim() || 'your child'}
        </h1>
        <p className="mt-3 text-black/60 font-medium">
          A few quick questions so Zoodo can tailor the fun to {name.trim() || 'your child'}.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5 text-left">
          <div>
            <label className="block text-sm font-semibold text-black/70 mb-2">
              What's your child's first name?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Avi"
              maxLength={30}
              className="w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-4 text-xl font-bold text-black/80 placeholder:text-black/30 focus:border-[#7B4FE0] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black/70 mb-2">
              What age, based on their milestones, would you like to begin lesson plans?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {START_AGES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setStartAge(a)}
                  className={`rounded-2xl border-2 py-5 text-center text-2xl font-bold transition active:scale-95 ${
                    startAge === a
                      ? 'bg-[#7B4FE0] text-white border-[#7B4FE0] shadow'
                      : 'bg-white text-black/70 border-black/10 hover:border-[#7B4FE0]/50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-black/70 mb-2">
              Weeks in this plan <span className="text-black/40 font-normal">— how long it runs</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[4, 6, 8, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setProgramLength(n)}
                  className={`rounded-2xl border-2 py-4 text-center text-lg font-bold transition active:scale-95 ${
                    programLength === n
                      ? 'bg-[#7B4FE0] text-white border-[#7B4FE0] shadow'
                      : 'bg-white text-black/70 border-black/10 hover:border-[#7B4FE0]/50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm font-semibold text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-2xl bg-[#4969E1] py-6 text-lg font-bold text-white hover:bg-[#3b54c9] disabled:opacity-60"
          >
            {saving ? 'Setting up…' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}