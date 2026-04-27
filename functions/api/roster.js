import { ROSTER, SUGGESTED_MATCHUPS } from '../../src/copilot.js';

export async function onRequestGet() {
  return Response.json({ ok: true, roster: ROSTER, suggested: SUGGESTED_MATCHUPS });
}
