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
          voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true },
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

// The signature EduPath AI teaching voice — warm, musical, sensory-rich, Ms-Rachel-inspired.
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

// Generates 3 unique, sensory-rich activities for a kid's week, each narrated
// with the signature EduPath voice. Idempotent per kid+week.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const kidId = String(body.kidId || '');
    const kidName = String(body.kidName || 'friend');
    const age = Number(body.age) || 3;
    const weekStart = String(body.weekStart || '');
    if (!kidId || !weekStart) {
      return Response.json({ error: 'kidId and weekStart are required' }, { status: 400 });
    }

    // Idempotent: return existing activities for this kid+week if already generated.
    const existing = await base44.entities.SensoryActivity.filter({ kid_id: kidId, week_start: weekStart });
    if (existing && existing.length > 0) {
      return Response.json({ activities: existing });
    }

    const prompt = EDU_VOICE_PERSONA + '\n\n' +
      `Create 3 unique, developmentally-appropriate, sensory-rich learning activities for a ${age}-year-old named ${kidName} for the week of ${weekStart}. ` +
      `Each activity must target ONE foundational developmental domain, choosing a DIFFERENT domain per activity from: (a) fine motor / visual-motor, (b) gross motor / bilateral coordination, (c) receptive & expressive language, (d) early numeracy (one-to-one correspondence, sorting, patterns), (e) self-regulation / body awareness. ` +
      `Keep every action age-appropriate and achievable for a ${age}-year-old, with clear modeling. Across the 3 activities, include a mix of: counting with fingers, color matching, shape sorting, sing-along moments, and gesture participation (clapping, waving, pointing). ` +
      `For each activity return: a fun 2-4 word title, a one-sentence description, an icon (one of: sparkles, music, hand, count, color, shape), a main gesture (one of: clap, wave, point, count), 3-4 short movement prompts (action lines like "Show me your hands!" or "Tap the glowing button!" or "Reach up high!"), and a voice script (60-100 words) narrating the activity with modeling, call-and-response, sensory cues, and a musical celebration at the end. ` +
      `Return JSON { activities: [ {title, description, icon, gesture, movement_prompts, script}, ...exactly 3 items ] }.`;

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          activities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string', enum: ['sparkles', 'music', 'hand', 'count', 'color', 'shape'] },
                gesture: { type: 'string', enum: ['clap', 'wave', 'point', 'count'] },
                movement_prompts: { type: 'array', items: { type: 'string' } },
                script: { type: 'string' },
              },
              required: ['title', 'description', 'icon', 'gesture', 'movement_prompts', 'script'],
            },
          },
        },
        required: ['activities'],
      },
    });

    const acts = (llmRes && llmRes.activities) || [];
    if (!Array.isArray(acts) || acts.length === 0) {
      return Response.json({ error: 'Could not create activities. Please try again.' }, { status: 500 });
    }

    // Generate signature-voice narration for each activity.
    const enriched = [];
    for (const a of acts) {
      let audio_url = '';
      try {
        audio_url = await synthesizeSpeech(base44, a.script || '');
      } catch (e) { /* keep going even if one audio fails */ }
      enriched.push({ ...a, audio_url });
    }

    const records = enriched.map((a, i) => ({
      kid_id: kidId,
      week_start: weekStart,
      index: i + 1,
      title: a.title || `Activity ${i + 1}`,
      description: a.description || '',
      icon: a.icon || 'sparkles',
      gesture: a.gesture || 'clap',
      movement_prompts: Array.isArray(a.movement_prompts) ? a.movement_prompts : [],
      script: a.script || '',
      audio_url: a.audio_url || '',
      status: 'not_started',
      archived: false,
    }));

    const created = await base44.entities.SensoryActivity.bulkCreate(records);
    return Response.json({ activities: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}