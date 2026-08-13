import { secrets } from "base44:runtime";

// Shared EduPath TTS helper. Premium ElevenLabs "Rachel" voice with an optional
// built-in honey-voice fallback so audio is never silent for the kid.
// Extracted here so every backend function uses one identical voice path.

const ELEVEN_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — warm, friendly female

export async function synthesizeSpeech(
  base44,
  text: string,
  opts: { fallback?: boolean; filename?: string; stability?: number; style?: number } = {}
): Promise<string> {
  const clean = (text || "").slice(0, 4500);
  const fallback = opts.fallback !== false;
  const filename = opts.filename || "edu_speech.mp3";
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
          voice_settings: {
            stability: opts.stability ?? 0.45,
            similarity_boost: 0.75,
            style: opts.style ?? 0.5,
            use_speaker_boost: true,
          },
        }),
      });
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        const file = new File([buf], filename, { type: "audio/mpeg" });
        const up = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        if (up && up.file_url) return up.file_url;
      }
    }
  } catch (e) { /* fall through */ }
  if (!fallback) return "";
  const res = await base44.asServiceRole.integrations.Core.GenerateSpeech({
    text: clean, voice: 'honey',
  });
  return (res && res.url) ? res.url : "";
}