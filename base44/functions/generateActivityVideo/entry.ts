import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Finds one REAL YouTube video that DEMONSTRATES how a teacher, therapist, or
// educator actually works on the child's specific milestone — the real-world
// classroom/therapy way it's done (not animated songs). Validates each
// candidate via YouTube's oEmbed endpoint.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const title = (body?.title || '').toString().trim();
    const description = (body?.description || '').toString().trim();
    const age = Number(body?.age) || 3;
    const milestone = (body?.milestone || '').toString().trim();
    const supportNeeds = (body?.supportNeeds || '').toString().trim();
    const subject = (body?.subject || '').toString().trim();
    const kidName = (body?.kidName || '').toString().trim();
    if (!title && !milestone && !subject) {
      return Response.json({ error: 'milestone or subject is required' }, { status: 400 });
    }

    const focus = milestone || subject || title;

    const buildPrompt = (avoidIds: string[]) => `You are an expert early-childhood educator and pediatric therapist.
A caregiver is teaching a ${age}-year-old child${kidName ? ` named ${kidName}` : ''}.
Today's focus: "${focus}".
${subject ? `Subject area: ${subject}.` : ''}
${supportNeeds ? `The child's support needs / adaptations: ${supportNeeds}. Pick a demonstration that respects these needs.` : ''}

Search the web for ONE real, high-quality YouTube video that DEMONSTRATES the real-world, classroom-or-therapy way this skill or milestone is actually taught to a child this age. The video MUST show a REAL HUMAN ADULT (an educator, speech-language pathologist, occupational or physical therapist, or teacher) modeling the activity — ideally with a real child.

ABSOLUTELY FORBIDDEN — do NOT return any of these, they are not real demonstrations:
- Animated videos, cartoons, nursery-rhyme compilations, or AI-generated content
- Super Simple Songs, Cocomelon, Pinkfong, Little Baby Bum, ChuChu TV, Dave & Ava, or any animated kids channel
- "Ms Rachel" / "MsRachelSpeakman" or any Ms Rachel channel

Good examples of what to look for:
- A speech therapist demonstrating how to elicit a target sound
- An occupational or physical therapist showing a fine-motor, sensory, or gross-motor activity
- A preschool teacher modeling a counting or letter-sound activity with real children
- A real classroom or therapy demonstration of this exact milestone

Return ONLY a real video you actually found on the web. Do NOT invent video IDs.
- title: the real video title as it appears on YouTube
- video_id: the actual 11-character YouTube video ID (the part after "v=") — only a real id you found
- channel: the channel name
- why: one short sentence on how this real demonstration helps the caregiver teach "${focus}" to a ${age}-year-old

Rules:
- The video MUST be publicly available and embeddable (not private, removed, or age-restricted).
- It MUST be a real-person demonstration, not an animation.
${avoidIds.length ? `- Do not return any of these ids, they were invalid: ${avoidIds.join(', ')}\n` : ''}- Return only the JSON.`;

    const isValid = async (vid: string): Promise<boolean> => {
      try {
        const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`;
        const res = await fetch(url, { method: 'GET' });
        return res.ok;
      } catch {
        return false;
      }
    };

    const triedIds: string[] = [];
    let chosen: any = null;

    // Try up to 3 times to find a real, embeddable demonstration video.
    for (let attempt = 0; attempt < 3 && !chosen; attempt++) {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: buildPrompt(triedIds),
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            video_id: { type: 'string' },
            title: { type: 'string' },
            channel: { type: 'string' },
            why: { type: 'string' },
          },
          required: ['video_id', 'title', 'channel', 'why'],
        },
      });

      const v = (result as any) || null;
      const candidateVid = v && v.video_id ? String(v.video_id).trim() : '';
      if (candidateVid && /^[A-Za-z0-9_-]{11}$/.test(candidateVid)) {
        triedIds.push(candidateVid);
        if (await isValid(candidateVid)) {
          chosen = v;
        }
      }
    }

    // No animated fallback — if we can't find a real demonstration, the UI shows
    // a graceful "no video right now" message rather than a cartoon.
    if (!chosen) {
      return Response.json({ video: null });
    }

    const vid = String(chosen.video_id).trim();
    return Response.json({
      video: {
        video_id: vid,
        title: chosen.title || '',
        channel: chosen.channel || '',
        why: chosen.why || '',
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}