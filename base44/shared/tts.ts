// Shared ElevenLabs TTS helper used by all voice functions in the app.
// Zoodo is the ONLY voice — the configured ELEVENLABS_VOICE_ID secret, with a
// warm-friendly fallback. Returns a stored file_url, or "" on failure.

import { secrets } from "base44:runtime";

const FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — warm, friendly female

export interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

// Default warm delivery. Pass `settings` to override (e.g. sillier Zoodo).
export async function synthesizeSpeech(
  base44: any,
  text: string,
  settings: VoiceSettings = {},
  fallbackVoice: string = "honey",
): Promise<string> {
  const clean = (text || "").slice(0, 4500);
  const key = secrets.get("ELEVENLABS_API_KEY");
  const voiceSettings = {
    stability: settings.stability ?? 0.45,
    similarity_boost: settings.similarity_boost ?? 0.75,
    style: settings.style ?? 0.45,
    use_speaker_boost: settings.use_speaker_boost ?? true,
  };

  if (key) {
    const customVoice = secrets.get("ELEVENLABS_VOICE_ID");
    const voiceId = (customVoice && /^[A-Za-z0-9]{16,}$/.test(customVoice)) ? customVoice : FALLBACK_VOICE_ID;
    try {
      const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
        body: JSON.stringify({
          text: clean,
          model_id: "eleven_turbo_v2_5",
          voice_settings: voiceSettings,
        }),
      });
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        const file = new File([buf], "edu_speech.mp3", { type: "audio/mpeg" });
        const up = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        if (up && up.file_url) return up.file_url;
      } else {
        console.warn(`ElevenLabs TTS failed (${resp.status}) — using built-in voice.`);
      }
    } catch (e) {
      console.warn("ElevenLabs TTS error — using built-in voice.", (e as Error)?.message);
    }
  }

  // Built-in fallback so a missing/unreachable ElevenLabs key never breaks the flow.
  try {
    const res = await base44.asServiceRole.integrations.Core.GenerateSpeech({
      text: clean.slice(0, 5000),
      voice: fallbackVoice,
    });
    if (res && res.url) return res.url;
  } catch (e) { /* ignore */ }
  return "";
}