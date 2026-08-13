import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { RotateCcw } from 'lucide-react';

// Resets the demo (clears all kids, lessons, and activities) and restarts the
// app from the very first intake question. Drop at the top of any screen.
export default function RestartDemoButton({ className = '' }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const restart = async () => {
    if (!window.confirm('Restart the demo? This clears everything and starts over from the intro.')) return;
    setBusy(true);
    try {
      await base44.entities.SensoryActivity.deleteMany({});
      await base44.entities.Lesson.deleteMany({});
      await base44.entities.Kid.deleteMany({});
      navigate('/onboarding');
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={restart}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black/40 shadow-sm hover:text-[#D96969] active:scale-95 transition disabled:opacity-50 ${className}`}
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Restart demo
    </button>
  );
}