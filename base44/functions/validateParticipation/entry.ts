import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Vision-based participation validation. Given a single camera frame (uploaded
// to a public file_url) and a target action, asks a vision-capable LLM whether
// the child appears to be doing/attempting the action. Returns a warm, spoken-
// style feedback message. Be lenient — toddlers are wiggly and any genuine
// attempt counts. No secrets needed (uses the built-in InvokeLLM integration).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const imageUrl = String(body.image_file_url || '');
    const targetAction = String(body.target_action || 'participating in the activity');
    const kidName = String(body.kidName || 'friend');
    const returnCount = !!body.return_count;

    if (!imageUrl) return Response.json({ error: 'Missing image' }, { status: 400 });

    const prompt =
      `You are a warm, encouraging early-childhood teacher watching ONE live camera frame of a young child named ${kidName}. ` +
      `The target action for the activity is: "${targetAction}". ` +
      `Decide whether the child appears to be DOING or attempting the target action (for example: waving, clapping, smiling, showing hands, counting fingers, reaching up, tapping, wiggling, or holding up a color or shape). ` +
      `Be lenient and encouraging — any genuine attempt counts as success. If the frame is dark, blurry, or you cannot clearly see the child, return success=false with a gentle "let's try again" message. ` +
      (returnCount ? `Also count exactly how many fingers the child is holding up and return it as "count" (an integer 0-10, where 0 means none visible). ` : '') +
      `Return JSON: { "success": boolean, "observed": a very short description of what you see, "feedback": a warm 1-2 sentence message spoken directly to ${kidName} — celebrating with their name if success, or gently encouraging another try if not. Also return "confidence": an integer 0-100 for how confident you are the child is doing the action. No stage directions, just the words to say. }`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [imageUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          observed: { type: 'string' },
          feedback: { type: 'string' },
          count: { type: 'integer' },
          confidence: { type: 'number' },
        },
        required: ['success', 'observed', 'feedback'],
      },
    });

    const r: any = result || {};
    const resp: any = { success: !!r.success, observed: r.observed || '', feedback: r.feedback || '' };
    if (returnCount) resp.count = Math.max(0, Math.min(10, parseInt(r.count, 10) || 0));
    resp.confidence = Math.max(0, Math.min(100, Math.round(Number(r.confidence) || 0)));
    return Response.json(resp);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}