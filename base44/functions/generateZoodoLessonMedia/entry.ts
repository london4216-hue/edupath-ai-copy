import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { synthesizeSpeech } from "../../shared/tts.ts";

// ─────────────────────────────────────────────────────────────────────────
// Zoodo Lesson Media Engine.
// Zoodo is the ONLY voice in the system — silly, playful, warm, slow.
// Builds a milestone-based lesson as FIVE sequential Zoodo scripts, narrates
// each one in the Zoodo voice, generates soft cartoon graphics, finds one
// supporting YouTube video, and returns an assessment mode + the parent
// encouragement video (which the frontend plays ONLY after the lesson).
//
// Returns: { status, audio{intro,narration,post_explanation,child_feedback,
//          completion}, scripts{...}, graphics_urls, captions, video,
//          assessment, completion_state, parent_video_url, notes }
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
- End with a silly celebration and warm praise.
- Keep the whole lesson short enough to speak in the requested duration.`;

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    intro_script: { type: 'string', description: 'Zoodo greets the child by name, silly + warm + slow, and introduces today\'s play' },
    narration_script: { type: 'string', description: 'The main lesson narration — teaches the objective step by step, I-do/we-do/you-do' },
    post_explanation_script: { type: 'string', description: 'A short silly recap of what the child just learned' },
    child_feedback_script: { type: 'string', description: 'Zoodo invites the child to try it themselves ("your turn!") and waits' },
    completion_script: { type: 'string', description: 'A silly, super-excited celebration cheer for finishing' },
    scenes: {
      type: 'array',
      description: 'Soft cartoon pictures shown one at a time as Zoodo talks',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'A soft, colorful, cartoon-style image prompt, age-appropriate, no text, no words' },
          caption: { type: 'string', description: 'A tiny label shown under the picture (2-4 simple words)' },
        },
        required: ['description', 'caption'],
      },
    },
    assessment: {
      type: 'object',
      description: 'How to check the child participated at the end',
      properties: {
        mode: { type: 'string', enum: ['mic', 'camera'] },
        target: { type: 'string', description: 'A short instruction shown to the child (e.g. "clap your hands", "say AH")' },
        why: { type: 'string', description: 'One sentence on why this fits this child\'s age and today\'s skill' },
      },
      required: ['mode', 'target'],
    },
  },
  required: ['intro_script', 'narration_script', 'post_explanation_script', 'child_feedback_script', 'completion_script', 'scenes', 'assessment'],
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
    `The whole lesson should take about ${duration || 60} seconds when read slowly. Split the time across the five scripts.\n` +
    `Return FIVE separate spoken scripts:\n` +
    `1. intro_script — Zoodo greets ${childName} by name, silly and warm, and says what we will play today.\n` +
    `2. narration_script — the main teaching, step by step, with "watch me... now you try!".\n` +
    `3. post_explanation_script — a short silly recap of what we just did.\n` +
    `4. child_feedback_script — Zoodo invites ${childName} to try it themselves ("your turn!") and pauses to wait.\n` +
    `5. completion_script — a silly, super-excited celebration cheer for finishing.\n` +
    `Also return 3 to 5 "scenes": soft, colorful, cartoon-style picture descriptions shown one at a time while Zoodo talks. Each scene needs a tiny caption (2-4 simple words).\n` +
    `Also return "assessment": a developmentally appropriate way to check the child participated. mode "mic" if the child should say a sound/word, "camera" if the child should do a visible gesture (clap, wave, reach). "target" is the short instruction shown to the child.\n` +
    `Return JSON with keys: intro_script, narration_script, post_explanation_script, child_feedback_script, completion_script, scenes (array of {description, caption}), assessment ({mode, target, why}).`;
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
      narration: String(p.narration_script || ''),
      post_explanation: String(p.post_explanation_script || ''),
      child_feedback: String(p.child_feedback_script || ''),
      completion: String(p.completion_script || ''),
    };

    if (!scripts.intro && !scripts.narration) {
      return Response.json({
        status: 'error',
        notes: 'Could not create the Zoodo scripts.',
        parent_video_url,
      } as any, { status: 500 });
    }

    const sceneList = (Array.isArray(p.scenes) ? p.scenes : []).filter((s: any) => s && s.description).slice(0, 5);
    const assessment = (p.assessment && p.assessment.mode) ? p.assessment : null;

    // Send all five scripts to the Zoodo voice, and generate every cartoon
    // graphic, all in parallel.
    const audioKeys = ['intro', 'narration', 'post_explanation', 'child_feedback', 'completion'] as const;
    const audioTasks = audioKeys.map((k) =>
      synthesizeZoodo(base44, scripts[k]).catch(() => '')
    );
    const graphicTasks = sceneList.map((s: any) =>
      base44.asServiceRole.integrations.Core.GenerateImage({ prompt: cartoonPrompt(String(s.description), age) })
        .then((r: any) => ({ url: (r && r.url) || '', caption: String(s.caption || '') }))
        .catch(() => ({ url: '', caption: String(s.caption || '') }))
    );

    const allResults = await Promise.all([...audioTasks, ...graphicTasks]);
    const audioArr = allResults.slice(0, audioKeys.length);
    const graphicResults = allResults.slice(audioKeys.length);

    const audio: Record<string, string> = {};
    audioKeys.forEach((k, i) => { audio[k] = audioArr[i] || ''; });
    const graphics_urls = graphicResults.filter((g: any) => g && g.url);
    const captions = graphics_urls.map((g: any) => g.caption);

    if (!audio.intro && !audio.narration) {
      return Response.json({
        status: 'error',
        notes: 'Could not create the Zoodo audio.',
        parent_video_url,
      } as any, { status: 500 });
    }

    const video = (videoRes && (videoRes as any).video_id) ? {
      video_id: String((videoRes as any).video_id),
      title: String((videoRes as any).title || ''),
      channel: String((videoRes as any).channel || ''),
      why: String((videoRes as any).why || ''),
    } : null;

    return Response.json({
      status: 'success',
      audio,
      scripts,
      graphics_urls: graphics_urls.map((g: any) => g.url),
      captions,
      video,
      assessment,
      completion_state: 'pending',
      parent_video_url,
      notes: `Zoodo made a ${duration}s silly lesson for ${childName}.`,
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      notes: (error as Error).message,
    } as any, { status: 500 });
  }
}