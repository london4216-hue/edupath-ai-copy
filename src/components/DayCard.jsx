import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import DayGraphic from './DayGraphic';

// One day row in the weekly plan. Clicking opens the lesson detail.
export default function DayCard({ day, lesson, kidId, weekStart }) {
  const to = `/lesson/${kidId}/${weekStart}/${day.key}`;
  const completed = !!lesson?.completed;

  return (
    <Link
      to={to}
      className="block w-full rounded-[28px] px-5 py-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
      style={{ backgroundColor: day.bg }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <div className="shrink-0">
            <DayGraphic type={day.graphic} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-black/80">{day.label}</div>
            <div
              className="text-2xl font-bold leading-tight"
              style={{
                color: day.titleColor,
                WebkitTextStroke: `1.5px ${day.titleStroke}`,
              }}
            >
              {day.subject}
            </div>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {completed && (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-green-600"
              title="Completed"
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
          )}
          <span className="text-black/30 text-xl">›</span>
        </div>
      </div>
    </Link>
  );
}