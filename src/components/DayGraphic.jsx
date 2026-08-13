import React from 'react';

// Playful graphic for each day's card, matching the home-page design reference.
export default function DayGraphic({ type }) {
  if (type === 'numbers') {
    return (
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold leading-none" style={{ color: '#F2C200' }}>1</span>
        <span className="text-5xl font-bold leading-none" style={{ color: '#E0524F' }}>2</span>
        <span className="text-4xl font-bold leading-none" style={{ color: '#4FAE5A' }}>3</span>
      </div>
    );
  }
  if (type === 'letters') {
    return (
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold leading-none" style={{ color: '#2B6FE0' }}>A</span>
        <span className="text-5xl font-bold leading-none" style={{ color: '#7B4FE0' }}>B</span>
        <span className="text-4xl font-bold leading-none" style={{ color: '#E0529C' }}>C</span>
      </div>
    );
  }
  if (type === 'stretch') {
    return (
      <div className="flex items-center gap-1">
        <span className="text-4xl">🤸</span>
        <span className="text-3xl">🧘</span>
        <span className="text-3xl">🙆</span>
      </div>
    );
  }
  if (type === 'music') {
    return (
      <div className="flex items-center gap-1">
        <span className="text-3xl" style={{ color: '#F2C200' }}>♪</span>
        <span className="text-4xl">🥁</span>
        <span className="text-3xl" style={{ color: '#E0524F' }}>♫</span>
      </div>
    );
  }
  if (type === 'exercise') {
    return (
      <div className="flex items-center gap-1">
        <span className="text-4xl">🤸</span>
        <span className="text-3xl">💪</span>
        <span className="text-4xl">🧘</span>
      </div>
    );
  }
  if (type === 'sensory') {
    return (
      <div className="flex items-center gap-1">
        <span className="text-3xl">🧩</span>
        <span className="text-4xl">🟦</span>
        <span className="text-3xl">🎨</span>
      </div>
    );
  }
  return null;
}