import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";

// ─────────────────────────────────────────────────────────────────────────
// Age-aware, CDC-milestone-aligned lesson generator. Each session is a real,
// high-dosage early-learning activity scaled to the child's intake age, with
// the signature warm, musical EduPath teaching voice.
// ─────────────────────────────────────────────────────────────────────────

// Map a subject label to its developmental strand so the right pedagogical
// guide is used regardless of the age-band wording.
function strandFor(subject: string): string {
  const s = (subject || '').toLowerCase();
  if (s.includes('first word')) return 'language';
  if (s.includes('count') || s.includes('number') || s.includes('math')) return 'numeracy';
  if (s.includes('letter') || s.includes('reading') || s.includes('sound')) return 'literacy';
  if (s.includes('music') || s.includes('clap') || s.includes('beat')) return 'music';
  if (s.includes('sensory') || s.includes('sort')) return 'sensory';
  return 'movement';
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

const PERSONA = `You are a world-class pediatric speech-language pathologist (SLP) and the signature warm, musical teaching voice of EduPath AI. You are leading a real, evidence-based therapy session, scaled to the child's exact developmental level.

THERAPY FRAMEWORK (Van Riper traditional articulation + Hodson cycles + play-based therapy):
- AUDITORY BOMBARDMENT: Begin by flooding the child with the target sound or word — say it many times slowly so they hear it correctly before trying it themselves.
- PHONETIC PLACEMENT: Give a simple, child-friendly cue for where to put tongue, lips, or teeth (e.g. "put your tongue behind your teeth", "smile big and push the air out", "pop your lips together").
- IMITATION: "Watch my mouth... " (exaggerated, slow) then "your turn — copy me."
- PROMPTING HIERARCHY: independent -> model -> direct imitation -> phonetic placement cue -> tactile cue. Step up the hierarchy only as the child needs more help.
- PRODUCTION LEVELS: sound -> syllable -> word -> short phrase. Progress up only as the child succeeds at each level.
- REPETITION: Many clear, spaced repetitions of the target — at least 5-8 exposures per target.
- SPECIFIC PRAISE: Praise the exact attempt ("Great AH sound!", "You got the /b/ at the start of ball!"), not generic "good job".

VOICE & DELIVERY (warm, musical, human — never robotic):
- Soft, warm, friendly, with a smile in your voice. Musical sing-song rhythm.
- VERY SLOW pacing — far slower than normal conversation. Short phrases of only 2-4 words, each separated by "..." which means a LONG 2-3 second pause.
- Few words per breath. After EVERY model and EVERY "your turn", leave a long generous pause so the child has time to process and respond.
- Repeat the target many times with slow, spaced repetition.
- Gentle excitement while teaching; bright musical joy when celebrating.
- Use the child's name warmly and often.

RULES:
- Speak ONLY the exact words meant to be spoken aloud. Use "..." for pauses.
- No stage directions, no parentheses, no brackets, no notes, no spelling-out of symbols.
- Keep words tiny, sentences short, full of warmth.
- Always end with specific praise and a warm cheer.`;

// Evidence-based guides per developmental strand. The camera is never used for
// speech lessons (hardcoded off below), so these focus purely on pedagogy.
const STRAND_GUIDES: Record<string, string> = {
  numeracy: `Target: early numeracy using the counting principles (Gelman & Gallistel), scaled to the child's age and CDC milestones. Teach in order: (1) ROTE COUNTING — say the number sequence aloud; (2) ONE-TO-ONE CORRESPONDENCE — touch or tap one object for each number said; (3) CARDINALITY — after counting, the last number tells how many. Count slowly with the child using I-do/we-do/you-do, fingers or visible objects. Set letter/sound to "" and word to the key number or object.`,
  language: `Target: early SPOKEN LANGUAGE for a toddler — naming a familiar picture, animal sounds, and playful first-sound awareness (NOT formal letter articulation). Model naming the picture ("This is a dog! Dog says woof!"), invite the child to imitate. Use I-do/we-do/you-do with lots of repetition. Set letter/sound to "" and word to the named picture.`,
  literacy: `Target: the EXACT uppercase letter provided for today (do NOT pick a different letter). Pick ONE concrete, high-frequency picture word that begins with that letter's sound and where the sound is clear and isolated (A->apple, B->ball, C->cat, D->dog — avoid long or ambiguous words). Teach in order: letter NAME -> phoneme SOUND (e.g. "AH" for A) -> WORD. Use auditory bombardment (say the sound many times), then "say AH like apple" sound-isolation, then I-do/we-do/you-do production. Set word to the picture word.`,
  movement: `Target: gross-motor and body-awareness movement scaled to the child's age and CDC milestones. Use "watch me -> together -> your turn" with clear, slow modeling, one movement at a time. Name the body parts. For toddlers focus on fundamental locomotor skills (running, climbing, kicking a ball, stepping up). For preschool+ include balance, bilateral coordination, and crossing midline. Set letter/sound to "" and word to the key body part or object.`,
  music: `Target: steady beat and rhythm scaled to the child's age. Teach call-and-response clapping/tapping to a steady beat. Use I-do/we-do/you-do ("watch me clap... together... your turn!"). Emphasize keeping a steady beat and copying a simple rhythm pattern. Set letter/sound to "" and word to the key instrument or body part.`,
  sensory: `Target: cognitive/sensory play scaled to the child's age and CDC milestones — sorting by color/shape, stacking, matching, or simple puzzles. Use I-do/we-do/you-do with one clear concept. Name the attribute (color, shape, size). Set letter/sound to "" and word to the key object or attribute.`,
};

function ageBand(age: number): 'toddler' | 'preschool' | 'school' {
  const a = Number(age) || 4;
  if (a <= 3) return 'toddler';
  if (a <= 5) return 'preschool';
  return 'school';
}

// OT/PT best-practice guidance for the movement strand, per age band. Keeps
// generated movement activities developmentally and therapeutically on-target.
const OTPT_MOVEMENT: Record<string, string> = {
  toddler: `OT/PT best practice for a 2-3-year-old (DO NOT use static held stretches): use PLAY-BASED, short-burst movement. Target fundamental locomotor and stability skills — walking on varied surfaces, climbing stairs with a rail, running with control, kicking or rolling a ball, jumping off a low step, brief one-foot balance. Build core and proximal (shoulder) stability through animal walks, pushing/pulling, and crawling. Include proprioceptive "heavy work" (carry, push, crawl) and gentle vestibular input. Keep each move a few seconds, model slowly, and never hold a stretch — keep it dynamic and playful.`,
  preschool: `OT/PT best practice for a 4-5-year-old: target emerging locomotor and balance skills — hopping on one foot, jumping forward, catching a bounced ball, standing on one foot 5-10s, stair climbing with alternating feet, pedaling. Build bilateral coordination and crossing midline, postural control, and motor planning (praxis). Use I-do/we-do/you-do with slow models. Include proprioceptive (heavy work) and vestibular (balance, head-position changes) input for regulation. Avoid prolonged static holds; keep it dynamic.`,
  school: `OT/PT best practice for a 6-8-year-old: target complex motor coordination — skipping, galloping, hopping, sustained balance, sport-based ball skills, strength and endurance. Build sustained postural control, bilateral coordination, and praxis. Use yoga/balance poses with slow, controlled holds of a few seconds, proprioceptive heavy work, and vestibular challenge. Model form and control; emphasize quality of movement over speed.`,
};

const LESSON_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    script: { type: 'string' },
    letter: { type: 'string' },
    sound: { type: 'string' },
    word: { type: 'string' },
    counting_cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: { n: { type: 'number' }, word: { type: 'string' } },
        required: ['n', 'word'],
      },
    },
    phonetic_cue: { type: 'string' },
    bombardment_words: { type: 'array', items: { type: 'string' } },
    camera_recommended: { type: 'boolean' },
    assessment: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['camera', 'mic'] },
        target: { type: 'string' },
        why: { type: 'string' },
      },
      required: ['mode', 'target'],
    },
  },
  required: ['title', 'script', 'camera_recommended', 'assessment'],
};

function buildLessonPrompt(kidName: string, age: number, subject: string, dayLabel: string, currentLetter: string, milestone: string, supportNeeds: string) {
  const strand = strandFor(subject);
  const guide = STRAND_GUIDES[strand] || STRAND_GUIDES.movement;
  const cdc = cdcForAge(age);
  const otpt = strand === 'movement' ? `\n\n${OTPT_MOVEMENT[ageBand(age)]}` : '';
  const letterDirective = strand === 'literacy' && currentLetter
    ? `The target letter for today is "${currentLetter}". Teach ONLY that letter — its name, its phoneme sound, and one picture word starting with that sound. `
    : '';
  const countingDirective = strand === 'numeracy'
    ? `Also return counting_cards: an array of exactly 3 objects, each {n, word} where n is 1, 2, 3 in order and word is a real, common, photogenic countable object. Each card MUST use a DIFFERENT object (e.g. 1 apple, 2 grapes, 3 bananas — never reuse the same object across cards). Use the singular form when n is 1 and the plural form when n is more than 1. These are shown one at a time, slowly, with real photos of that many objects — so the child counts real things, not just numbers. `
    : '';
  const assessmentDirective = `Also return "assessment": an expert-designed, DEVELOPMENTALLY APPROPRIATE way to check the child's participation at the end of the lesson. Choose mode "mic" ONLY for literacy/language (the child says the target sound or word) — a webcam cannot verify a young child's articulation, so never use the camera for speech. Choose mode "camera" for movement/music/sensory/numeracy (the child shows a visible gross-motor gesture). The camera is a FIXED front-facing INDOOR webcam, so the target action MUST be a single, clearly visible gesture doable standing or sitting in place — e.g. clap your hands, wave hello, reach both arms up high, tap your head, tap your tummy, march in place, blow a kiss. NEVER request actions needing space, equipment, or that the camera cannot see (kicking a ball, running, climbing, jumping far, throwing, pedaling). The action MUST be developmentally achievable for a ${age}-year-old per the CDC reference above — simpler and more fundamental for younger children (toddlers: clap, wave, reach; preschool+: also tap body parts, march, balance briefly). "target" is the short instruction shown to the child (e.g. "clap your hands", "say AH"). "why" is one sentence on why this action fits this child's exact age and today's skill. `;
  return PERSONA + '\n\n' +
    `Developmental reference — ${cdc}\n` +
    (milestone ? `Current milestone focus for this child: ${milestone}. Target this specific milestone where it fits today's theme.\n` : '') +
    (supportNeeds ? `Support needs for this child: ${supportNeeds}. Adapt the activity to these needs — e.g., seated or supported positioning, reduced movement demands, non-verbal or gesture-based responses, slower pacing, more repetition. Never push past the child's comfort or ability.\n` : '') +
    `\nWrite a short, high-dosage spoken script (about 60-120 words) for a ${age}-year-old child named ${kidName}. ` +
    `It MUST open by naming the child: "Hi ${kidName}! ..." ` +
    `Today's theme is "${subject}" (${dayLabel}). ${letterDirective}${guide}${otpt} ` +
    `Use the full I-do -> we-do -> you-do production hierarchy. Use specific praise. ` +
    `Keep it tiny-sentence, huge-warmth, sing-song, and developmentally on-target for a ${age}-year-old per the CDC reference above. ` +
    `${countingDirective}${assessmentDirective}Also return "phonetic_cue": a simple, caregiver-facing instruction for where to place the tongue, lips, or teeth to produce today's target sound (e.g. "Smile big and push a thin stream of air out for /s/" or "Pop your lips together for /b/"). Keep it to one short sentence a grown-up can follow. If the lesson has no speech target (e.g. movement or numeracy), return "". Also return "bombardment_words": an array of 3-5 simple, high-frequency words rich in today's target sound or theme, for auditory bombardment (e.g. for /b/: ball, baby, bubble, bird, banana). Return JSON with keys: title (2-5 word fun title), script (exact spoken words only), letter (target uppercase letter or ""), sound (target phoneme like "AH" or ""), word (the picture word or ""), phonetic_cue (string), bombardment_words (array of strings), counting_cards (array of {n, word} for numeracy only, else []), camera_recommended (true if a camera check would help verify the child's production or movement, false otherwise), and assessment ({mode, target, why}).`;
}

function picturePromptFor(word: string) {
  return `A bright, friendly, simple photograph of a single ${word} centered on a clean pure-white background, soft even lighting, sharp focus, children's speech-therapy flashcard style, no text, no people.`;
}

// Real, photorealistic photo of a real human hand/child demonstrating the exact
// assessment gesture — shown to the child as the "watch the real way" model.
function gestureImagePrompt(target: string, age: number): string {
  return `A bright, realistic photograph of a young ${age}-year-old child's real hands and arms demonstrating this exact gesture: "${target}". Real human skin, real hands, clean light background, soft natural lighting, sharp focus, warm and friendly, educational demonstration photo, no text, no cartoon, no animation, no illustration.`;
}

// Photorealistic close-up of a mouth demonstrating the exact articulation
// position for the target sound — the "watch my mouth" visual model.
function mouthModelPrompt(sound: string, word: string): string {
  return `A photorealistic, extreme close-up photograph of a friendly young woman's mouth and lips clearly demonstrating the exact articulation position for the speech sound "${sound}" as in the word "${word}". Clean light background, soft natural lighting, sharp focus on lips teeth and tongue, warm and friendly, speech therapy articulation reference photo, no text, no cartoon, no animation, no full face — mouth and lips only.`;
}

function countingPicturePrompt(n: number, word: string) {
  return `A bright, friendly photograph of exactly ${n} ${word} grouped together on a clean pure-white background, soft even lighting, sharp focus, clearly separated so each one can be counted, children's counting flashcard style, no text, no people, no numerals.`;
}

// ─────────────────────────────────────────────────────────────────────────
// TTS — premium ElevenLabs voice with built-in fallback.
// ─────────────────────────────────────────────────────────────────────────
const ELEVEN_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — warm, friendly female
async function synthesizeSpeech(base44, text: string): Promise<string> {
  const clean = (text || "").slice(0, 4500);
  const key = secrets.get("ELEVENLABS_API_KEY");
  if (!key) return await builtinTTS(base44, text);
  const customVoice = secrets.get("ELEVENLABS_VOICE_ID");
  const voiceId = (customVoice && /^[A-Za-z0-9]{16,}$/.test(customVoice)) ? customVoice : ELEVEN_VOICE_ID;
  let resp;
  try {
    resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({
        text: clean,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true },
      }),
    });
  } catch (e) {
    console.warn('ElevenLabs fetch error — using built-in voice.', (e as Error)?.message);
    return await builtinTTS(base44, text);
  }
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.warn(`ElevenLabs TTS failed (${resp.status}): ${detail.slice(0, 200)} — using built-in voice.`);
    return await builtinTTS(base44, text);
  }
  const buf = await resp.arrayBuffer();
  const file = new File([buf], "edu_speech.mp3", { type: "audio/mpeg" });
  const up = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  if (!up || !up.file_url) throw new Error("UploadFile returned no file_url");
  return up.file_url;
}

async function builtinTTS(base44, text: string): Promise<string> {
  const res = await base44.asServiceRole.integrations.Core.GenerateSpeech({
    text: (text || '').slice(0, 5000),
    voice: 'honey',
  });
  if (!res || !res.url) throw new Error('Built-in TTS returned no audio url');
  return res.url;
}

// ─────────────────────────────────────────────────────────────────────────
// Main: builds an age-appropriate activity (target + I-do/we-do/you-do script),
// narrates it, and — when the plan has a picture word — generates a clean photo
// of the target object so the child sees the real thing.
// ─────────────────────────────────────────────────────────────────────────
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const subject = String(body.subject || 'Numbers');
    const dayLabel = String(body.dayLabel || 'today');
    const kidName = String(body.kidName || '');
    const age = Number(body.age) || 4;
    const currentLetter = (String(body.currentLetter || 'A').toUpperCase().match(/[A-Z]/) || ['A'])[0];
    const milestone = String(body.milestone || '');
    const supportNeeds = String(body.supportNeeds || '');

    const prompt = buildLessonPrompt(kidName, age, subject, dayLabel, currentLetter, milestone, supportNeeds);

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: LESSON_PLAN_SCHEMA,
    });

    const title = (llmRes && llmRes.title) || `${subject} time with ${kidName}`;
    const script = (llmRes && llmRes.script) || '';
    const letter = (llmRes && llmRes.letter) || '';
    const sound = (llmRes && llmRes.sound) || '';
    const word = (llmRes && llmRes.word) || '';
    const phonetic_cue = (llmRes && llmRes.phonetic_cue) || '';
    const bombardment_words = (llmRes && Array.isArray(llmRes.bombardment_words))
      ? llmRes.bombardment_words.filter((w) => w).slice(0, 6)
      : [];
    // A webcam cannot reliably verify a toddler's articulation, so the camera
    // is never used for speech lessons. (Gross-movement activities elsewhere
    // in the app still use the camera, where it does make sense.)
    const camera_recommended = false;

    if (!script) {
      return Response.json({ error: 'Could not create the activity. Please try again.' }, { status: 500 });
    }

    // Narrate the script. For numeracy, generate a slow one-at-a-time counting
    // sequence of REAL object photos (1 apple, 2 grapes, 3 bananas…) instead
    // of a single flashcard, so the child counts real things, not just numbers.
    // For other strands, generate one clean photo of the target object.
    const strand = strandFor(subject);
    const rawCards = strand === 'numeracy' && Array.isArray(llmRes?.counting_cards)
      ? llmRes.counting_cards.filter((c) => c && Number(c.n) > 0 && c.word).slice(0, 4)
      : [];
    const useCounting = rawCards.length >= 2;

    const singleImageTask = (word && !useCounting)
      ? base44.asServiceRole.integrations.Core.GenerateImage({ prompt: picturePromptFor(word) })
          .then((r) => (r && r.url) || '').catch(() => '')
      : Promise.resolve('');

    const assessMode = llmRes?.assessment?.mode;
    const assessTarget = llmRes?.assessment?.target || '';
    const gestureImageTask = (assessMode === 'camera' && assessTarget)
      ? base44.asServiceRole.integrations.Core.GenerateImage({ prompt: gestureImagePrompt(assessTarget, age) })
          .then((r) => (r && r.url) || '').catch(() => '')
      : Promise.resolve('');

    const hasSpeechTarget = (strand === 'literacy' || strand === 'language') && !!(sound || word);
    const mouthModelTask = hasSpeechTarget
      ? base44.asServiceRole.integrations.Core.GenerateImage({ prompt: mouthModelPrompt(sound || letter, word || letter) })
          .then((r) => (r && r.url) || '').catch(() => '')
      : Promise.resolve('');

    const cardImageTasks = useCounting
      ? rawCards.map((c) =>
          base44.asServiceRole.integrations.Core.GenerateImage({ prompt: countingPicturePrompt(Number(c.n), String(c.word)) })
            .then((r) => ({ n: Number(c.n), word: String(c.word), picture_url: (r && r.url) || '' }))
            .catch(() => ({ n: Number(c.n), word: String(c.word), picture_url: '' }))
        )
      : [];

    const [audio_url, picture_url, gesture_url, mouth_model_url, ...cardResults] = await Promise.all([
      synthesizeSpeech(base44, script),
      singleImageTask,
      gestureImageTask,
      mouthModelTask,
      ...cardImageTasks,
    ]);

    const counting_cards = useCounting ? cardResults : undefined;

    if (!audio_url) {
      return Response.json({ error: 'Could not create the audio. Please try again.' }, { status: 500 });
    }

    return Response.json({
      title, script, audio_url,
      letter, sound, word,
      phonetic_cue, bombardment_words,
      picture_url,
      gesture_url,
      mouth_model_url,
      counting_cards,
      camera_recommended,
      assessment: (llmRes && llmRes.assessment) || null,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}