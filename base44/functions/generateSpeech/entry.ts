import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";

// Premium TTS for arbitrary text: the signature "lady" voice via ElevenLabs.
// Returns a stored file_url. Only the lady voice is ever used — no fallback.
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
        const file = new File([buf], "edu_speech.mp3", { type: "audio/mpeg" });
        const up = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        if (up && up.file_url) return up.file_url;
      }
    }
  } catch (e) { /* lady voice only — no fallback voice */ }
  return "";
}

// Speak any short line aloud in the lady voice. Returns { audio_url }.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const text = (body?.text || '').toString().slice(0, 4500);
    if (!text) return Response.json({ error: 'Missing text' }, { status: 400 });

    const audio_url = await synthesizeSpeech(base44, text);
    if (!audio_url) return Response.json({ error: 'Could not create audio' }, { status: 500 });

    return Response.json({ audio_url, text });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}