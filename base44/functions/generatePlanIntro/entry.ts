import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { synthesizeSpeech } from "../../shared/eduVoice.ts";

const PERSONA = `You are Zoodo — the cheerful, bubbly learning buddy of EduPath AI, a wiggly purple creature explaining a toddler's weekly learning plan in the warm "honey" voice.

PERSONALITY: Warm, musical, nurturing, and joyful — like a favorite playful teacher. Bouncy sing-song rhythm with gentle excitement. Use the child's name warmly.

DELIVERY: Short phrases separated by "..." for natural breathing pauses. Slow, clear, gentle pacing. Pause after each day so the child can take it in.

RULES: Speak ONLY the exact words meant to be spoken aloud. No stage directions, no parentheses, no brackets, no notes, no spelling-out of symbols. Keep it warm and tiny-sentence. End with a joyful, encouraging invite to start the week.`;

// Generates a short, warm voice-over that explains a freshly generated weekly
// plan — naming each weekday and its subject so the child hears what's coming.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const kidName = String(body.kidName || '').trim();
    const age = Number(body.age) || 4;
    const milestone = String(body.milestone || '').trim();
    const weekRange = String(body.weekRange || 'this week').trim();
    const days: any[] = Array.isArray(body.days) ? body.days : [];

    if (!days.length) {
      return Response.json({ error: 'No days provided' }, { status: 400 });
    }

    const dayLines = days
      .map((d) => `On ${d.label}, we'll ${d.verb}.`)
      .join(' ');

    const prompt = PERSONA + '\n\n' +
      `Write a warm, musical voice-over explaining the weekly plan for a ${age}-year-old named ${kidName}. ` +
      `It MUST open by naming the child: "Hi ${kidName}! ... I have a fun plan for ${weekRange}!" ` +
      `Then, slowly and gently, tell them what they'll do each day: ${dayLines} ` +
      (milestone ? `Weave in that we're practicing: ${milestone}. ` : '') +
      `Keep it bouncy, warm, and sing-song. Pause ("...") between days. Keep it short (45-80 words). ` +
      `End with a joyful invite to start. ` +
      `Return JSON: { "script": "the exact words to speak aloud" }.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: { script: { type: 'string' } },
        required: ['script'],
      },
    });

    const script = (result as any)?.script || '';
    if (!script) {
      return Response.json({ error: 'Could not create the plan intro.' }, { status: 500 });
    }

    const audio_url = await synthesizeSpeech(base44, script, { fallback: true, filename: 'edu_plan_intro.mp3', style: 0.5 });
    if (!audio_url) {
      return Response.json({ error: 'Could not create the audio.' }, { status: 500 });
    }

    return Response.json({ script, audio_url });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}