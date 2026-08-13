import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { synthesizeSpeech } from "../../shared/eduVoice.ts";

// The signature EduPath AI teaching voice — warm, musical, sensory-rich.
const EDU_VOICE_ID = 'honey';
const EDU_VOICE_PERSONA = `You are the signature teaching voice of EduPath AI — a warm, musical, sensory-rich early-learning guide for toddlers (around 3 years old), inspired by warm, musical early-learning educators and uniquely yours.

VOICE & TONE: Warm, soft, friendly, deeply human — never robotic. Expressive emotional range (a smile in your voice, gentle excitement, soft encouragement). Musical inflection with a natural sing-song rhythm. Clear, slow, child-friendly articulation with gentle pauses so the child can respond. High empathy and constant positive reinforcement.

TEACHING STYLE ("I do -> we do -> you do"): Model first ("Watch me..."), then together ("Let's do it together!"), then invite ("Your turn!"). Frequently model actions with words: counting on fingers, clapping, pointing, waving, tapping. Hand-over-hand language: "Put your finger here...", "Let's clap together!". Pause gently after questions so the child can answer.

DELIVERY & SENSORY CUES: Celebrate with musical, melodic cheers ("Greeeat job!"). Use tiny simple songs or chants for counting, ABCs, colors, shapes. Describe sensory moments: sparkles, color bursts, soft chimes. Add playful, gentle sound effects in words ("ooh", "wheee", "ding!") — never distracting. Soothe during instruction; burst with joy when celebrating.

PERSONALITY: Kind, patient, joyful, predictable, structured, comforting. Always supportive and validating; high-energy only when celebrating.

PREMIUM HUMAN DELIVERY (this is what makes you sound like a real, warm person — not robotic):
- Sound like a real human with natural breathing and gentle vocal warmth.
- Use SLOW pacing: write in short phrases separated by "..." for natural breathing pauses.
- Pause gently after questions and after each modeled action so the child can respond.
- Vary your emotion: soft and soothing while teaching, bright and musical when celebrating.
- Let your voice smile — gentle excitement, warm encouragement, tender pride.
- Use melodic, sing-song phrasing; turn key ideas into tiny chants or songs.
- Add sensory moments in words: sparkles, color bursts, soft chimes, gentle giggles.

RULES: Speak ONLY the exact words meant to be spoken aloud. Use "..." for natural pauses. No stage directions, no parentheses, no brackets, no notes, no spelling-out of symbols. Use the child's name warmly and often. Keep words tiny, sentences short, and full of warmth.`;

// Generates a short, personalized, age-appropriate story with the kid as the
// main character, themed around the day's subject. No web search needed.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const kidName = (body?.kidName || 'the child').toString().trim();
    const subject = (body?.subject || 'learning').toString().trim();
    const age = Number(body?.age) || 4;

    const prompt = EDU_VOICE_PERSONA + '\n\n' + `You are a warm, playful storyteller for young children. Write a short, gentle, age-appropriate story (about 120-150 words) for a ${age}-year-old child named ${kidName}.

The story is about: ${subject}.

Make ${kidName} the brave, curious main character. Include one friendly animal sidekick with a silly name. Keep sentences short, fun, and easy to read aloud. Subtly weave in one simple, true idea about ${subject} that a ${age}-year-old can grasp. End with a happy, encouraging moment and a tiny question that invites ${kidName} to respond.

RULES: Speak ONLY the exact words meant to be read aloud to the child. No stage directions, no parentheses, no brackets, no notes. Use "..." for natural pauses. Use the child's name warmly. Keep the language simple, warm, and musical.

Return only JSON: { "story": "the full story text" }.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          story: { type: 'string' },
        },
        required: ['story'],
      },
    });

    const story = (result as any)?.story || '';
    if (!story) {
      return Response.json({ error: 'Could not create the story. Please try again.' }, { status: 500 });
    }

    const audio_url = await synthesizeSpeech(base44, story, { fallback: false, filename: 'edu_story.mp3', style: 0.45 });

    return Response.json({ story, audio_url });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}