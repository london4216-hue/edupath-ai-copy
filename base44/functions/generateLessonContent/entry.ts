import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const subject = (body?.subject || '').toString().trim();
    const day = (body?.day || '').toString().trim();
    const kidName = (body?.kidName || 'the child').toString().trim();
    const age = Number(body?.age) || 4;

    if (!subject || !day) {
      return Response.json({ error: 'subject and day are required' }, { status: 400 });
    }

    const prompt = `You are a warm, expert early-childhood educator building a lesson plan for a ${age}-year-old child named ${kidName}.

Today is ${day} and the theme is "${subject}".

Search the web for 1 real, high-quality YouTube video that fits this theme for a ${age}-year-old. Return:
- title: the real video title as it appears on YouTube
- video_id: the actual YouTube video ID (the 11-character id from the watch URL, e.g. "dQw4w9WgXcQ") — only use a real id you found, never invent one
- channel: the channel name that published it
- description: 1-2 sentences describing what the video teaches and why it's great for a ${age}-year-old
- why: one short sentence on how it connects to the "${subject}" theme

Rules:
- Only return a real video you actually found on the web. Do not make up video IDs.
- Do NOT use any video from "Ms Rachel" / "MsRachelSpeakman" or any Ms Rachel channel — choose a different creator.
- Keep language simple, warm, and encouraging.
- Return only the JSON.`;

    // Web search is required to find real YouTube videos; only gemini_3_flash / gemini_3_1_pro support it.
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          videos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                video_id: { type: 'string' },
                channel: { type: 'string' },
                description: { type: 'string' },
                why: { type: 'string' },
              },
              required: ['title', 'video_id', 'channel', 'description', 'why'],
            },
          },
        },
        required: ['videos'],
      },
    });

    const videos = (result && (result as any).videos) ? (result as any).videos : (result as any);

    return Response.json({ videos });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}