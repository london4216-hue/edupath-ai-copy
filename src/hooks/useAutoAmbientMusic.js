import { useEffect } from 'react';
import { startAmbientMusic, isMusicPlaying } from '@/lib/sensoryAudio';

// Starts a gentle ambient music loop on the first user interaction (tap/click)
// anywhere on the page — browsers block audio until a gesture occurs. The
// MusicToggle remains available to turn it off. Drop into any student page.
export default function useAutoAmbientMusic() {
  useEffect(() => {
    const start = () => {
      if (!isMusicPlaying()) startAmbientMusic();
      window.removeEventListener('pointerdown', start);
    };
    window.addEventListener('pointerdown', start, { once: true });
    return () => window.removeEventListener('pointerdown', start);
  }, []);
}