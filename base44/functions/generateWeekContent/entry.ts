import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ─────────────────────────────────────────────────────────────────────────
// Age-banded, CDC-milestone-aligned day themes + milestone context.
// Mirrors src/lib/lessonConfig.js so generated content matches the child's
// intake age. (Inlined because backend functions can't import outside their
// own directory.)
// ─────────────────────────────────────────────────────────────────────────
function ageBand(age: number): 'toddler' | 'preschool' | 'school' {
  const a = Number(age) || 4;
  if (a <= 3) return 'toddler';
  if (a <= 5) return 'preschool';
  return 'school';
}

const AGE_SUBJECTS: Record<string, Record<string, string>> = {
  toddler: {
    monday: 'Counting', tuesday: 'First Words', wednesday: 'Move & Play',
    thursday: 'Music & Clapping', friday: 'Sensory Play',
  },
  preschool: {
    monday: 'Counting 1-10', tuesday: 'Letter Sounds', wednesday: 'Stretch time',
    thursday: 'Music & Beat', friday: 'Move & Exercise',
  },
  school: {
    monday: 'Numbers & Math', tuesday: 'Letters & Reading', wednesday: 'Stretch time',
    thursday: 'Music', friday: 'Exercises',
  },
};

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

function subjectsForAge(age: number) {
  const band = AGE_SUBJECTS[ageBand(age)];
  return DAY_KEYS.map((day) => ({ day, subject: band[day] }));
}

const CDC_MILESTONES: Record<number, string> = {
  2: 'CDC milestones for a 2-year-old: says 2-4 word phrases; points to named things; follows 2-step instructions; sorts shapes/colors; stacks 4+ blocks; runs; kicks a ball; walks up/down stairs; points to body parts. Very short attention — keep activities to 1-2 minutes, one tiny goal, lots of repetition and sensory input.',
  3: 'CDC milestones for a 3-year-old: counts to 3; knows some colors; draws a circle; runs and climbs well; pedals a tricycle; copies a circle; simple conversations. 2-3 minute activities, one clear goal, lots of modeling and repetition.',
  4: 'CDC milestones for a 4-year-old: counts to 10; names some numbers/colors; draws a person with 2-4 body parts; catches a bounced ball; hops on one foot; knows beginning letter sounds. 3-5 minute activities, one target, I-do/we-do/you-do.',
  5: 'CDC milestones for a 5-year-old: counts to 10+; tells simple stories; skips; stands on one foot 10s; recognizes some letters and sounds; rhymes. 5-7 minute activities with clear goals.',
  6: 'CDC milestones for a 6-year-old: counts to 20+; adds/subtracts within 5; reads simple CVC words; hops, skips, balances; copies shapes; multi-step directions. 7-10 minute activities.',
  7: 'CDC milestones for a 7-year-old: reads sight words and simple sentences; adds/subtracts within 20; tells time; complex motor coordination. ~10 minute activities.',
  8: 'CDC milestones for an 8-year-old: reads fluently; multiplies; complex motor coordination; independent learning. 10-15 minute activities.',
};

function cdcForAge(age: number): string {
  const a = Math.max(2, Math.min(8, Number(age) || 4));
  return CDC_MILESTONES[a] || CDC_MILESTONES[4];
}

const videoItem = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    video_id: { type: 'string' },
    channel: { type: 'string' },
    description: { type: 'string' },
    why: { type: 'string' },
  },
  required: ['title', 'video_id', 'channel', 'description', 'why'],
};

// Generates all 5 days' YouTube picks (1 per day) in a SINGLE web-search call,
// age- and CDC-milestone-appropriate, so the whole week is ready by the time a
// day is tapped. Day themes adapt to the child's intake age.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const kidName = (body?.kidName || 'the child').toString().trim();
    const age = Number(body?.age) || 4;
    const lovedSubjects = Array.isArray(body?.lovedSubjects)
      ? body.lovedSubjects.filter(Boolean)
      : [];
    const milestone = String(body?.milestone || '');
    const supportNeeds = String(body?.supportNeeds || '');
    const progression = body?.progression || null;

    const personalization = lovedSubjects.length
      ? ` The child has especially loved these topics before: ${lovedSubjects.join(', ')}. Lean slightly toward those interests where natural, while still covering all five themes.`
      : '';

    const themes = subjectsForAge(age);
    const lines = themes.map((t) => `- ${t.day}: ${t.subject}`).join('\n');
    const cdc = cdcForAge(age);

    // Progression context: tells the AI what the child has already done, loved,
    // skipped, or been asked to repeat — so this week is the smart next step,
    // not a repeat, and scales difficulty to how far along the program they are.
    const progressionBlock = progression ? `\nProgression context — this is week ${progression.weekNumber} of a ${progression.programLength || '?'}-week program; the child has completed ${progression.weeksCompleted} week(s) so far.${(progression.completedSubjects && progression.completedSubjects.length) ? ` Completed activities: ${progression.completedSubjects.join(', ')}.` : ''}${(progression.lovedVideoTitles && progression.lovedVideoTitles.length) ? ` Videos they especially loved: ${progression.lovedVideoTitles.join('; ')}.` : ''}${(progression.skippedSubjects && progression.skippedSubjects.length) ? ` Activities skipped — offer gentler, simpler versions: ${progression.skippedSubjects.join(', ')}.` : ''}${(progression.repeatedRequests && progression.repeatedRequests.length) ? ` Caregiver asked to repeat: ${progression.repeatedRequests.join(', ')}.` : ''}${progression.currentLetter ? ` Current target letter for literacy: "${progression.currentLetter}".` : ''} Build on prior weeks — advance difficulty slightly where the child is succeeding, revisit skipped skills more gently, and lean into loved topics. Make this week the natural next step, not a repeat.` : '';

    const prompt = `You are a warm, expert early-childhood educator building a weekly lesson plan for a ${age}-year-old child named ${kidName}.${personalization}

Developmental reference — ${cdc}${milestone ? `\nCurrent milestone focus for this child: ${milestone}. Choose videos that help practice this specific milestone where it fits the day's theme.` : ''}${supportNeeds ? `\nSupport needs for this child: ${supportNeeds}. Choose videos that are accessible and adaptable to these needs (e.g., seated movement, sensory-friendly pacing, simple language).` : ''}${progressionBlock}

For each of the 5 weekdays below, search the web for 1 real, high-quality YouTube video that fits that day's theme for a ${age}-year-old and matches the developmental level above.
${lines}

For each video return:
- title: the real video title as it appears on YouTube
- video_id: the real 11-character YouTube video ID (only use a real id you found; never invent one)
- channel: the channel name that published it
- description: 1-2 sentences on what it teaches and why it's great for a ${age}-year-old at this developmental level
- why: one short sentence connecting it to the day's theme

Only return real videos you actually found on the web; never invent video IDs. Do NOT use any video from "Ms Rachel" / "MsRachelSpeakman" or any Ms Rachel channel — choose a different creator. Return only JSON keyed by day name, where each day is an array containing exactly one video.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          monday: { type: 'array', items: videoItem },
          tuesday: { type: 'array', items: videoItem },
          wednesday: { type: 'array', items: videoItem },
          thursday: { type: 'array', items: videoItem },
          friday: { type: 'array', items: videoItem },
        },
        required: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      },
    });

    return Response.json(result || {});
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}