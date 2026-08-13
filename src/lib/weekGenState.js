// In-memory guard so the same week isn't generated twice (e.g. on re-renders
// or when navigating between Home and a lesson). Lives for the session.
const inflight = new Set();

export function isGenerating(weekStart) {
  return inflight.has(weekStart);
}

export function markGenerating(weekStart) {
  inflight.add(weekStart);
}

export function clearGenerating(weekStart) {
  inflight.delete(weekStart);
}