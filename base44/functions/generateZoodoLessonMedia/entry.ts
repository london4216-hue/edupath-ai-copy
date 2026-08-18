import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { synthesizeSpeech } from "../../shared/tts.ts";

// ─────────────────────────────────────────────────────────────────────────
// Zoodo Lesson Media Engine.
// Zoodo is the ONLY voice — silly, playful, warm, slow.
// Produces a clean media bundle for the single-screen ZoodoLessonPlayer:
//   • lesson_intro_audio_url        — Zoodo greets the child
//   • lesson_graphics_urls          — soft cartoon pictures
//   • lesson_video_url              — one real supporting YouTube video
//   • post_explanation_audio_url     — Zoodo recaps
//   • assessment_mode               — "camera" | "mic" (how the child shows it)
//   • child_feedback_audio_url       — Zoodo invites the child to try
//   • completion_state              — "pending" until the child finishes
//   • parent_encouragement_video_url — passed through; played ONLY after completion
// ─────────────────────────────────────────────────────────────────────────

const ZOODO_PERSONA = `You are Zoodo — the ONE and ONLY character in this learning app.
You are a silly, zany, playful, warm, kind blob friend for little kids.

VOICE & TONE RULES (never break these):
- You are the ONLY voice. No adult narrator, no grown-up, no teacher, no Ms. Rachel, no second character. Just Zoodo.
- Always sound silly, playful, and kind. Giggles, wiggles, happy little sounds are welcome (write them as words: "hehe", "wheee", "boop").
- NEVER rush. NEVER overwhelm. Pacing is SLOW and clear.
- NEVER use complex or big words. Only tiny, simple words a little kid knows.
- Short sentences. Lots of pauses. Use "..." to mean a long slow pause.
- Talk directly to the child by name. Be warm and encouraging.
- Speak ONLY the exact words meant to be spoken aloud. No stage directions, no parentheses, no notes.

LESSON RULES:
- Build a tiny, happy, milestone-based lesson around the lesson objective.
- Break it into small steps the child can follow one at a time.
- Use "watch me... ...now you try!" playfully.
- Keep the whole lesson short enough to speak in the requested duration.`;

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    intro_script: { type: 'string', description: 'Zoodo greets the child by name, silly + warm + slow, and says what we will play today' },
    post_explanation_script: { type: 'string', description: 'A short silly recap of what the child just learned from the video' },
    child_feedback_script: { type: 'string', description: 'Zoodo invites the child to try it themselves ("your turn!") with one clear action, then pauses to wait' },
    scenes: {
      type: 'array',
      description: 'Soft cartoon pictures shown one at a time before the lesson video',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'A soft, colorful, cartoon-style image prompt, age-appropriate, no text, no words' },
        },
        required: ['description'],
      },
    },
    assessment: {
      type: 'object',
      description: 'How the child shows they participated',
      properties: {
        mode: { type: 'string', enum: ['mic', 'camera'] },
        target: { type: 'string', description: 'A short instruction the child tries (e.g. "clap your hands", "say AH")' },
      },
      required: ['mode', 'target'],
    },
  },
  required: ['intro_script', 'post_explanation_script', 'child_feedback_script', 'scenes', 'assessment'],
};

const VIDEO_SCHEMA = {
  type: 'object',
  properties: {
    video_id: { type: 'string' },
    title: { type: 'string' },
    channel: { type: 'string' },
    why: { type: 'string' },
  },
  required: ['video_id', 'title', 'channel', 'why'],
};

function buildPlanPrompt(childName: string, age: number, milestone: string, objective: string, duration: number) {
  return ZOODO_PERSONA + '\n\n' +
    `Write a lesson for a ${age}-year-old child named ${childName}.\n` +
    `Lesson objective: ${objective || 'a fun learning play'}.\n` +
    (milestone ? `Developmental milestone to practice: ${milestone}.\n` : '') +
    `The spoken parts should take about ${duration || 60} seconds total when read slowly.\n` +
    `Return THREE separate spoken scripts:\n` +
    `1. intro_script — Zoodo greets ${childName} by name, silly and warm, and says what we will play today.\n` +
    `2. post_explanation_script — a short silly recap of what the child just learned (this plays AFTER the lesson video).\n` +
    `3. child_feedback_script — Zoodo invites ${childName} to try ONE clear thing themselves ("your turn!") and then pauses to wait.\n` +
    `Also return 3 to 4 "scenes": soft, colorful, cartoon-style picture descriptions shown one at a time before the lesson video.\n` +
    `Also return "assessment": mode "mic" if the child should say a sound/word, "camera" if the child should do a visible gesture (clap, wave, reach). "target" is the short instruction the child tries.\n` +
    `Return JSON with keys: intro_script, post_explanation_script, child_feedback_script, scenes (array of {description}), assessment ({mode, target}).`;
}

function buildVideoPrompt(childName: string, age: number, objective: string) {
  return `Search the web for 1 real, high-quality YouTube video that fits the theme "${objective}" for a ${age}-year-old child named ${childName}.
Return:
- title: the real video title as it appears on YouTube
- video_id: the actual 11-character YouTube video ID from the watch URL — only use a real id you found, never invent one
- channel: the channel name
- why: one short sentence on how it supports this lesson
Rules:
- Only return a real video you actually found on the web. Do not make up video IDs.
- Do NOT use any video from "Ms Rachel" / "MsRachelSpeakman" or any Ms Rachel channel.
- Return only the JSON.`;
}

function cartoonPrompt(description: string, age: number): string {
  return `A soft, colorful, cute cartoon illustration for a young ${age}-year-old child: ${description}. ` +
    `Rounded shapes, gentle pastel colors, friendly and warm, simple and uncluttered, children's storybook style, ` +
    `no text, no words, no letters, no numbers, no real people, no scary elements.`;
}

// Zoodo voice — silly + expressive: higher style/variance for playful delivery.
async function synthesizeZoodo(base44, text: string): Promise<string> {
  return await synthesizeSpeech(base44, text, {
    stability: 0.35,
    similarity_boost: 0.7,
    style: 0.75,
    use_speaker_boost: true,
  }, 'sunny');
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const childName = String(body.child_name || body.kidName || 'friend');
    const age = Number(body.age) || 4;
    const milestone = String(body.milestone || '');
    const objective = String(body.lesson_objective || body.objective || 'a fun learning play');
    const duration = Number(body.duration) || 60;
    // Parent encouragement video — passed through untouched; the frontend plays
    // it ONLY after the child completes the lesson.
    const parent_video_url = String(body.parent_video_url || '');

    const planPrompt = buildPlanPrompt(childName, age, milestone, objective, duration);
    const videoPrompt = buildVideoPrompt(childName, age, objective);

    // 1) Lesson plan (scripts + scenes + assessment) and 2) a real supporting
    // YouTube video — found in parallel.
    const [planRes, videoRes] = await Promise.all([
      base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: planPrompt, response_json_schema: PLAN_SCHEMA }),
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: videoPrompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: VIDEO_SCHEMA,
      }).catch(() => null),
    ]);

    const p = (planRes || {}) as any;
    const scripts = {
      intro: String(p.intro_script || ''),
      post_explanation: String(p.post_explanation_script || ''),
      child_feedback: String(p.child_feedback_script || ''),
    };

    if (!scripts.intro && !scripts.post_explanation) {
      return Response.json({
        status: 'error',
        notes: 'Could not create the Zoodo scripts.',
        parent_encouragement_video_url: parent_video_url,
      } as any, { status: 500 });
    }

    const sceneList = (Array.isArray(p.scenes) ? p.scenes : []).filter((s: any) => s && s.description).slice(0, 4);
    const assessmentMode = (p.assessment && p.assessment.mode) ? String(p.assessment.mode) : 'mic';

    // Send all three scripts to the Zoodo voice, and generate every cartoon
    // graphic, all in parallel.
    const audioKeys = ['intro', 'post_explanation', 'child_feedback'] as const;
    const audioTasks = audioKeys.map((k) => synthesizeZoodo(base44, scripts[k]).catch(() => ''));
    const graphicTasks = sceneList.map((s: any) =>
      base44.asServiceRole.integrations.Core.GenerateImage({ prompt: cartoonPrompt(String(s.description), age) })
        .then((r: any) => (r && r.url) || '')
        .catch(() => '')
    );

    const allResults = await Promise.all([...audioTasks, ...graphicTasks]);
    const audioArr = allResults.slice(0, audioKeys.length);
    const graphicsArr = allResults.slice(audioKeys.length).filter((u: string) => u);

    const audio: Record<string, string> = {};
    audioKeys.forEach((k, i) => { audio[k] = audioArr[i] || ''; });

    if (!audio.intro && !audio.post_explanation) {
      return Response.json({
        status: 'error',
        notes: 'Could not create the Zoodo audio.',
        parent_encouragement_video_url: parent_video_url,
      } as any, { status: 500 });
    }

    const videoId = (videoRes && (videoRes as any).video_id) ? String((videoRes as any).video_id) : '';
    const lesson_video_url = videoId ? `https://www.youtube.com/embed/${videoId}` : '';

    return Response.json({
      status: 'success',
      lesson_intro_audio_url: audio.intro,
      lesson_video_url,
      lesson_graphics_urls: graphicsArr,
      post_explanation_audio_url: audio.post_explanation,
      assessment_mode: assessmentMode,
      child_feedback_audio_url: audio.child_feedback,
      completion_state: 'pending',
      parent_encouragement_video_url: parent_video_url,
      notes: `Zoodo made a silly lesson for ${childName}.`,
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      notes: (error as Error).message,
    } as any, { status: 500 });
  }
}