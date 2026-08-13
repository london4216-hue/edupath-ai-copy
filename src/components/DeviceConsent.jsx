import React from 'react';
import { Camera, Mic, ShieldCheck } from 'lucide-react';
import SensoryButton from '@/components/SensoryButton';

// Reusable consent card shown before accessing camera or microphone.
// Explains what's being accessed and why, with Allow / Skip buttons.
export default function DeviceConsent({ type, kidName, onAllow, onDeny }) {
  const isCamera = type === 'camera';
  const Icon = isCamera ? Camera : Mic;

  return (
    <div className="flex flex-col items-center rounded-2xl bg-white p-5 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF2FF]">
        <Icon className="h-7 w-7 text-[#4969E1]" />
      </div>
      <h3 className="mt-3 text-lg font-bold text-black/80">
        {isCamera ? 'Camera check' : 'Voice check'}
      </h3>
      <p className="mt-1 text-sm font-semibold text-black/50">
        We use the {isCamera ? 'camera' : 'microphone'} for just a moment to see if {kidName} is joining in. Nothing is saved — we check once and it's gone right after.
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#F0FDF4] px-3 py-2">
        <ShieldCheck className="h-4 w-4 text-[#4FAE5A]" />
        <span className="text-xs font-bold text-[#4FAE5A]">Private &amp; temporary</span>
      </div>
      <div className="mt-4 flex w-full gap-2">
        <button
          onClick={onDeny}
          className="flex-1 rounded-2xl border-2 border-black/10 bg-white py-3 font-bold text-black/50 active:scale-95 transition"
        >
          Skip
        </button>
        <SensoryButton
          onClick={onAllow}
          glow="#4969E1"
          className="flex-[2] bg-[#4969E1] py-3 text-white"
        >
          Allow {isCamera ? 'camera' : 'mic'}
        </SensoryButton>
      </div>
    </div>
  );
}