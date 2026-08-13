import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Validates a child's recorded voice against a target sound/word. Transcribes
// the upload via Whisper, then asks an LLM to judge whether the child produced
// the target. Returns { success, feedback, transcript }.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const audioUrl = String(body?.audio_url || '');
    const target = String(body?.target || '');
    const kidName = String(body?.kidName || 'the child');
    if (!audioUrl || !target) {
      return Response.json({ error: 'audio_url and target are required' }, { status: 400 });
    }

    const tr = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url: audioUrl });
    const transcript = String(tr || '').toLowerCase().trim();

    const judge = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a warm, encouraging speech-language assistant for young children.
A young child${kidName ? ` named ${kidName}` : ''} was asked to say: "${target}".
Their recording was transcribed as: "${transcript}".

Decide if the child attempted and reasonably produced the target sound or word. Young children's speech is imperfect — accept a good, close attempt. Empty or unrelated audio counts as not yet.

Return JSON:
- success: boolean (true if the child produced a reasonable attempt of the target)
- feedback: one short, warm sentence spoken to the child. If success, celebrate the specific attempt. If not, gently encourage another try. Never harsh.
- confidence: integer 0-100 for how confident you are the child produced the target.`,
      response_json_schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          feedback: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['success', 'feedback'],
      },
    });

    return Response.json({
      success: !!(judge as any)?.success,
      feedback: (judge as any)?.feedback || '',
      confidence: Math.max(0, Math.min(100, Math.round(Number((judge as any)?.confidence) || 0))),
      transcript,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}