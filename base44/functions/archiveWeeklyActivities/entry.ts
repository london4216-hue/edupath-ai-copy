import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Weekly reset: marks all sensory activities from previous weeks as archived.
// Runs from the scheduled Monday workflow (no user context), so it uses the
// service role. New activities for the new week are generated on-demand when
// the kid opens the Weekly Activities page.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Current Monday (ISO date) in UTC — good enough for week bucketing.
    const now = new Date();
    const day = now.getUTCDay(); // 0 Sun .. 6 Sat
    const diff = (day + 6) % 7; // days since Monday
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - diff);
    const mondayISO = monday.toISOString().slice(0, 10);

    const result = await base44.asServiceRole.entities.SensoryActivity.updateMany(
      { archived: false, week_start: { $lt: mondayISO } },
      { $set: { archived: true } },
    );

    return Response.json({ archived: true, week_start: mondayISO, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}