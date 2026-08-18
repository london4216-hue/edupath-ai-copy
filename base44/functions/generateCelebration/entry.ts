import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ZOODO_PERSONA, synthesizeZoodo } from "../../shared/zoodoVoice.ts";

// Zoodo is the only voice. This generates a short, super-excited, silly Zoodo
// celebration cheer for a kid who just finished their activity.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const kidName = String(body.kidName || '');
    const subject = String(body.subject || 'today');

    const prompt =
      ZOODO_PERSONA + '\n\n' +
      `You are cheering for ${kidName} who just finished their "${subject}" activity. ` +
      `Write a short, super excited, silly Zoodo celebration cheer (about 20-45 words). ` +
      `Use tiny sentences, HUGE happy energy, playful sounds like "Yay!", "Wheee!", and "Boop!", and say ${kidName}'s name at least twice. ` +
      `Make it warm and genuine, not over-the-top. ` +
      `Write ONLY the exact words to be spoken out loud — no stage directions, no parentheses, no notes. Use "..." for natural pauses. ` +
      `Return JSON with keys "message" (a 2-6 word cheer, like "You did it, Avi!") and "script" (the spoken words).`;

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          script: { type: 'string' },
        },
        required: ['message', 'script'],
      },
    });

    const script = (llmRes && llmRes.script) || `Yay ${kidName}! You did it! Wheee! Boop-boop-hooray!`;
    const message = (llmRes && llmRes.message) || `You did it, ${kidName}!`;

    const audio_url = await synthesizeZoodo(base44, script);
    if (!audio_url) return Response.json({ error: 'Could not create audio.' }, { status: 500 });

    return Response.json({ message, script, audio_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}