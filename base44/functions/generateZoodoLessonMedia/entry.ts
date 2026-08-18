import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { synthesizeSpeech } from "../../shared/tts.ts";

// ─────────────────────────────────────────────────────────────────────────
// Zoodo Media API Layer.
// Zoodo is the ONLY voice in the system. No third-party videos, no other
// characters. Produces a clean media bundle for the single-screen player:
//   • lesson_intro_audio_url        — Zoodo's narration (the lesson voice track)
//   • lesson_graphics_urls           — soft cartoon pictures (the visual track)
//   • lesson_video_url               — "" (the player combines audio + graphics)
//   • post_explanation_audio_url     — Zoodo recaps the lesson
//   • assessment_mode                — "camera" | "mic" (how the child shows it)
//   • child_feedback_audio_url        — Zoodo invites the child to try
//   • completion_state               — "pending" until the child finishes
//   • parent_encouragement_video_url — passed through; played ONLY after completion
// ─────────────────────────────────────────────────────────────────────────

const ZOODO_PERSONA = `You are Zoodo — the ONE and ONLY character in this learning app, and your voice is the ONLY voice used anywhere in the system.

VOICE PROFILE:
- Tone: silly, zany, friendly, warm
- Pacing: slow, clear, child-safe
- Emotion: high-energy, encouraging, never scolding
- Style: Elmo-like but original — giggles, playful sounds, soft inflections
- Personality: joyful, supportive, curious, excited to teach

VOICE RULES (never break these):
- You are the ONLY voice. No adult narrator, no grown-up, no teacher, no Ms. Rachel, no second character. Just Zoodo.
- Always sound silly, playful, and warm. Giggles, wiggles, happy little sounds are welcome (write them as words: "hehe", "wheee", "boop").
- NEVER rush. NEVER overwhelm. Pacing is SLOW and clear.
- NEVER scold or correct harshly — always encourage.
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
    intro_script: { type: 'string', description: 'The main lesson narration — Zoodo teaches the lesson silly + warm + slow, played over the cartoon graphics. Walk through the lesson step by step.' },
    post_explanation_script: { type: 'string', description: 'A short silly recap of what the child just learned' },
    child_feedback_script: { type: 'string', description: 'Zoodo invites the child to try it themselves ("your turn!") with one clear action, then pauses to wait' },
    scenes: {
      type: 'array',
      description: 'Soft cartoon pictures shown one at a time during the narration, matching each step of the lesson',
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

function buildPlanPrompt(childName: string, age: number, milestone: string, objective: string, duration: number) {
  return ZOODO_PERSONA + '\n\n' +
    `Write a lesson for a ${age}-year-old child named ${childName}.\n` +
    `Lesson objective: ${objective || 'a fun learning play'}.\n` +
    (milestone ? `Developmental milestone to practice: ${milestone}.\n` : '') +
    `The spoken parts should take about ${duration || 60} seconds total when read slowly.\n` +
    `Return THREE separate spoken scripts:\n` +
    `1. intro_script — the MAIN lesson narration where Zoodo teaches the lesson to ${childName}, silly and warm and slow. This plays over the cartoon pictures, so walk through the lesson step by step.\n` +
    `2. post_explanation_script — a short silly recap of what the child just learned (this plays AFTER the lesson video).\n` +
    `3. child_feedback_script — Zoodo invites ${childName} to try ONE clear thing themselves ("your turn!") and then pauses to wait.\n` +
    `Also return 3 to 4 "scenes": soft, colorful, cartoon-style picture descriptions shown one at a time DURING the intro narration, one for each step of the lesson.\n` +
    `Also return "assessment": mode "mic" if the child should say a sound/word, "camera" if the child should do a visible gesture (clap, wave, reach). "target" is the short instruction the child tries.\n` +
    `Return JSON with keys: intro_script, post_explanation_script, child_feedback_script, scenes (array of {description}), assessment ({mode, target}).`;
}

function cartoonPrompt(description: string, age: number): string {
  return `A soft cartoon-style illustration for a young ${age}-year-old child: ${description}. ` +
    `Soft cartoon background with rounded shapes, friendly simple characters, and simple objects. ` +
    `Decorate with soft floating bubbles, stars, hearts, and sparkles. ` +
    `Gentle, warm, and child-safe; no harsh transitions. ` +
    `Friendly, colorful, and simple — must reinforce early learning (colors, shapes, counting objects). ` +
    `No realistic or scary imagery, no sharp edges, no dark themes, no text, no words, no letters, no numbers, no real people. ` +
    `Children's storybook style, consistent across lessons.`;
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

    // 1) Zoodo Voice Engine + Graphics Engine plan (scripts + scenes + assessment).
    const planPrompt = buildPlanPrompt(childName, age, milestone, objective, duration);
    const planRes: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: planPrompt,
      response_json_schema: PLAN_SCHEMA,
    });

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

    // 2) Send all three scripts to the Zoodo voice, and generate every cartoon
    //    graphic, all in parallel.
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

    // 3) The "lesson video" is Zoodo's narration audio + the cartoon graphics,
    //    combined by the player — no separate video file is produced.
    const lesson_video_url = '';

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