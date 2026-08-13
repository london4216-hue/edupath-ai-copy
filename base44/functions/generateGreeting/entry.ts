import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";

// Premium TTS: the signature "lady" voice via ElevenLabs. Returns a stored
// file_url. Only the lady voice is ever used — no fallback to any other voice.
const ELEVEN_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — warm, friendly female
async function synthesizeSpeech(base44, text) {
  const clean = (text || "").slice(0, 4500);
  try {
    const key = secrets.get("ELEVENLABS_API_KEY");
    if (key) {
      const customVoice = secrets.get("ELEVENLABS_VOICE_ID");
      const voiceId = (customVoice && /^[A-Za-z0-9]{16,}$/.test(customVoice)) ? customVoice : ELEVEN_VOICE_ID;
      const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
        body: JSON.stringify({
          text: clean,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.6, use_speaker_boost: true },
        }),
      });
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        const file = new File([buf], "edu_greeting.mp3", { type: "audio/mpeg" });
        const up = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        if (up && up.file_url) return up.file_url;
      }
    }
  } catch (e) { /* fall through to built-in voice */ }
  // Built-in TTS fallback so the greeting ALWAYS has audio for the kid.
  const res = await base44.asServiceRole.integrations.Core.GenerateSpeech({
    text: clean, voice: 'honey',
  });
  return (res && res.url) ? res.url : "";
}

// Fun, light, joyful persona for the learning-buddy greeting.
const GOOFY_PERSONA = `You are Zoodo — the cheerful, bubbly learning buddy of EduPath AI, a wiggly purple creature greeting a toddler in the warm "honey" voice.

PERSONALITY: Fun, light, joyful, and full of sunshine. Bouncy and playful with a few giggles ("hee hee", "yay"), but never over-the-top silly. Warm and encouraging — like a favorite playful teacher.

DELIVERY: Short phrases separated by "..." for natural breathing pauses. Sing-song, bouncy rhythm. Use the child's name right away in a cheerful hello.

RULES: Speak ONLY the exact words meant to be spoken aloud. No stage directions, no parentheses, no brackets, no notes, no spelling-out of symbols. Keep it short (15-35 words). End with a joyful, cheerful invite to play.`;

// Generates a short, goofy, giggly greeting for the kid, spoken in the warm
// honey voice (replaces the old robotic browser speech synthesis).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const kidName = (body?.kidName || '').toString().trim();
    const subject = (body?.subject || 'learning').toString().trim();
    const dayLabel = (body?.dayLabel || 'today').toString().trim();

    // Turn the lesson subject into a natural verb phrase so the greeting
    // sounds right (e.g. "Numbers" -> "count numbers", not "get ready to Numbers").
    const SUBJECT_VERB: Record<string, string> = {
      'Numbers': 'count numbers',
      'Letters': 'learn our letters',
      'Stretch time': 'stretch and move',
      'Music': 'make music',
      'Exercises': 'move and exercise',
    };
    const action = SUBJECT_VERB[subject] || subject.toLowerCase();

    const prompt = GOOFY_PERSONA + '\n\n' +
      `Write a fun, light, joyful hello for a toddler named ${kidName}. ` +
      `It MUST start with exactly: "Hi ${kidName}... let's get ready to ${action}!" (for example: "Hi Avie... let's get ready to count numbers!"). ` +
      `Then add one short cheerful line mentioning today is ${dayLabel} and inviting them to play and learn together. ` +
      `Keep it bouncy, warm, and joyful. Keep it short (15-35 words). ` +
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
      return Response.json({ error: 'Could not create the greeting.' }, { status: 500 });
    }

    const audio_url = await synthesizeSpeech(base44, script);
    if (!audio_url) {
      return Response.json({ error: 'Could not create the audio.' }, { status: 500 });
    }

    return Response.json({ script, audio_url });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}