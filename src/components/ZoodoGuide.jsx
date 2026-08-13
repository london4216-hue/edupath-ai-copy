import React from 'react';
import ZoodoMascot from '@/components/ZoodoMascot';

// ZoodoGuide — Zoodo reacts to the current lesson step and activity state,
// guiding the child with a mood-appropriate little message.
// step: 'activity' | 'drawing' | 'lunch' | 'story'
// activityStarted / activityDone: only meaningful for the 'activity' step.
export default function ZoodoGuide({ step, kidName, activityStarted, activityDone }) {
  const name = kidName ? `${kidName}, ` : '';

  let mood = 'idle';
  let bubble = '';

  if (step === 'activity') {
    if (activityDone) {
      mood = 'celebrating';
      bubble = `You did it, ${kidName || 'friend'}! High five!`;
    } else if (activityStarted) {
      mood = 'speaking';
      bubble = `${name}say it with me!`;
    } else {
      mood = 'curious';
      bubble = `${name}tap play and let's learn together!`;
    }
  } else if (step === 'drawing') {
    mood = 'happy';
    bubble = 'Can you draw what we learned?';
  } else if (step === 'lunch') {
    mood = 'happy';
    bubble = 'Yummy! Time for a snack!';
  } else if (step === 'story') {
    mood = 'curious';
    bubble = "Let's read a story together!";
  }

  return (
    <div className="flex items-end justify-center gap-2 py-1">
      <ZoodoMascot mood={mood} size={64} bubble={bubble} bubbleKey={step + String(activityStarted) + String(activityDone)} />
    </div>
  );
}