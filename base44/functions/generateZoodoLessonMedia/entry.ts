import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { synthesizeSpeech } from "../../shared/tts.ts";

// ─────────────────────────────────────────────────────────────────────────
// Zoodo Lesson Media Engine.
// Zoodo is the ONLY voice in the system — silly, playful, warm, slow.
// Generates one Zoodo voice track + soft cartoon graphics for a lesson.
// Returns: { status, audio_url, graphics_urls, notes }
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
- Keep the whole script short enough to speak in the requested duration.`;

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    script: { type: 'string', description: 'The exact words Zoodo speaks aloud, with ... for slow pauses' },
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
  },
  required: ['script', 'scenes'],
};

function buildPrompt(childName: string, age: number, milestone: string, objective: string, duration: number) {
  return ZOODO_PERSONA + '\n\n' +
    `Write a lesson for a ${age}-year-old child named ${childName}.\n` +
    `Lesson objective: ${objective || 'a fun learning play'}.\n` +
    (milestone ? `Developmental milestone to practice: ${milestone}.\n` : '') +
    `Keep the spoken script about ${duration || 60} seconds when read slowly.\n` +
    `Also return 3 to 5 "scenes": soft, colorful, cartoon-style picture descriptions shown one at a time while Zoodo talks. Each scene needs a tiny caption (2-4 simple words).\n` +
    `Return JSON with "script" (the exact spoken words) and "scenes" (array of {description, caption}).`;
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

    const prompt = buildPrompt(childName, age, milestone, objective, duration);

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: PLAN_SCHEMA,
    });

    const script = (llmRes && (llmRes as any).script) || '';
    const scenes = (llmRes && Array.isArray((llmRes as any).scenes)) ? (llmRes as any).scenes : [];

    if (!script) {
      return Response.json({
        status: 'error',
        audio_url: '',
        graphics_urls: [],
        notes: 'Could not create the Zoodo script.',
      } as any, { status: 500 });
    }

    // Generate the Zoodo voice track and all cartoon graphics in parallel.
    const sceneList = scenes.filter((s: any) => s && s.description).slice(0, 5);

    const audioTask = synthesizeZoodo(base44, script);
    const graphicTasks = sceneList.map((s: any) =>
      base44.asServiceRole.integrations.Core.GenerateImage({ prompt: cartoonPrompt(String(s.description), age) })
        .then((r: any) => ({ url: (r && r.url) || '', caption: String(s.caption || '') }))
        .catch(() => ({ url: '', caption: String(s.caption || '') }))
    );

    const [audio_url, ...graphicResults] = await Promise.all([audioTask, ...graphicTasks]);
    const graphics_urls = graphicResults.filter((g: any) => g && g.url);

    if (!audio_url) {
      return Response.json({
        status: 'error',
        audio_url: '',
        graphics_urls: graphics_urls.map((g: any) => g.url),
        notes: 'Could not create the Zoodo audio.',
      } as any, { status: 500 });
    }

    return Response.json({
      status: 'success',
      audio_url,
      graphics_urls: graphics_urls.map((g: any) => g.url),
      captions: graphics_urls.map((g: any) => g.caption),
      script,
      notes: `Zoodo made a ${duration}s silly lesson for ${childName}.`,
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      audio_url: '',
      graphics_urls: [],
      notes: (error as Error).message,
    } as any, { status: 500 });
  }
}