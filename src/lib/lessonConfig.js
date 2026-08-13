// Shared configuration for the weekly lesson plan days.
//
// The plan is age-banded to CDC "Learn the Signs. Act Early." milestones:
//   toddler  (2-3): language emergence, rote counting, gross-motor fundamentals,
//                   rhythm, and sensory/cognitive play — NO structured stretching.
//   preschool(4-5): counting to 10, letter-sound articulation, OT stretch/yoga,
//                   steady beat, gross-motor exercise.
//   school   (6-8): numbers/math, reading & letters, yoga stretch, music, exercise.
//
// Visual styling (colors) is stable per weekday slot; the subject, graphic,
// strand, and stretch-guide flag adapt to the child's intake age.

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const DAY_STYLE = {
  monday:    { label: 'Monday',    bg: '#EBE4DE', titleColor: '#D96969', titleStroke: '#F4B6B6' },
  tuesday:   { label: 'Tuesday',   bg: '#E0F5FF', titleColor: '#7B4FE0', titleStroke: '#C9B6F4' },
  wednesday: { label: 'Wednesday', bg: '#E0F5D5', titleColor: '#E0A800', titleStroke: '#3a3a3a' },
  thursday:  { label: 'Thursday',  bg: '#FEF5B0', titleColor: '#2B6FE0', titleStroke: '#ffffff' },
  friday:    { label: 'Friday',    bg: '#FAD7D7', titleColor: '#2B6FE0', titleStroke: '#ffffff' },
};

// strand drives which activity component + backend guide is used:
// numeracy | language | literacy | movement | music | sensory
const AGE_DAYS = {
  toddler: {
    monday:    { subject: 'Counting',         graphic: 'numbers',  strand: 'numeracy', stretchGuide: false },
    tuesday:   { subject: 'First Words',      graphic: 'letters',  strand: 'language', stretchGuide: false },
    wednesday: { subject: 'Move & Play',      graphic: 'exercise', strand: 'movement', stretchGuide: false },
    thursday:  { subject: 'Music & Clapping', graphic: 'music',    strand: 'music',    stretchGuide: false },
    friday:    { subject: 'Sensory Play',     graphic: 'sensory',  strand: 'sensory',  stretchGuide: false },
  },
  preschool: {
    monday:    { subject: 'Counting 1-10',     graphic: 'numbers',  strand: 'numeracy', stretchGuide: false },
    tuesday:   { subject: 'Letter Sounds',    graphic: 'letters',  strand: 'literacy', stretchGuide: false },
    wednesday: { subject: 'Stretch time',     graphic: 'stretch',  strand: 'movement', stretchGuide: true  },
    thursday:  { subject: 'Music & Beat',     graphic: 'music',    strand: 'music',    stretchGuide: false },
    friday:    { subject: 'Move & Exercise',  graphic: 'exercise', strand: 'movement', stretchGuide: true  },
  },
  school: {
    monday:    { subject: 'Numbers & Math',   graphic: 'numbers',  strand: 'numeracy', stretchGuide: false },
    tuesday:   { subject: 'Letters & Reading',graphic: 'letters',  strand: 'literacy', stretchGuide: false },
    wednesday: { subject: 'Stretch time',     graphic: 'stretch',  strand: 'movement', stretchGuide: true  },
    thursday:  { subject: 'Music',            graphic: 'music',    strand: 'music',    stretchGuide: false },
    friday:    { subject: 'Exercises',        graphic: 'exercise', strand: 'movement', stretchGuide: true  },
  },
};

export function ageBand(age) {
  const a = Number(age) || 4;
  if (a <= 3) return 'toddler';
  if (a <= 5) return 'preschool';
  return 'school';
}

// A concrete CDC milestone phrase for a given intake age — stored as the
// child's starting "current milestone" and editable from the dashboard.
export function defaultMilestoneForAge(age) {
  const a = Number(age) || 4;
  const map = {
    2: 'stacking 4+ blocks, 2-word phrases, and kicking a ball',
    3: 'counting to 3, naming colors, and pedaling a tricycle',
    4: 'counting to 10, hopping on one foot, and beginning letter sounds',
    5: 'skipping, recognizing letters, and rhyming',
    6: 'reading CVC words, adding within 5, and balancing',
    7: 'reading simple sentences and adding within 20',
    8: 'reading fluently and multiplying',
  };
  return map[a] || map[4];
}

// Full 5-day config for a child's age.
export function getDayConfigForAge(age) {
  const band = AGE_DAYS[ageBand(age)];
  return DAY_KEYS.map((key) => ({ key, ...DAY_STYLE[key], ...band[key] }));
}

// Single day config by key, age-aware. Falls back to preschool styling.
export function getDayConfigForAgeAndKey(age, dayKey) {
  const band = AGE_DAYS[ageBand(age)];
  if (!DAY_STYLE[dayKey] || !band[dayKey]) return undefined;
  return { key: dayKey, ...DAY_STYLE[dayKey], ...band[dayKey] };
}

// Default (preschool) arrays kept for backward compatibility.
export const DAYS = getDayConfigForAge(5);
export const DAY_MAP = DAYS.reduce((acc, d) => { acc[d.key] = d; return acc; }, {});

// Returns the ISO date (yyyy-mm-dd) of the Monday for the week containing the given date.
export function getMondayISO(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function addWeeksISO(mondayISO, weeks) {
  const d = new Date(mondayISO + 'T00:00:00');
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function formatWeekRange(mondayISO) {
  const start = new Date(mondayISO + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const opt = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, opt)} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}