import { getMatchupHistory, getPopularMatchups } from '../../src/db.js';

export async function onRequestGet(context) {
  const { env } = context;
  const uri = env.MONGODB_URI;

  if (!uri) {
    return Response.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const url = new URL(context.request.url);
  const type = url.searchParams.get('type') || 'recent';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);

  if (type === 'popular') {
    const popular = await getPopularMatchups(uri, { limit });
    return Response.json({ ok: true, popular });
  }

  const history = await getMatchupHistory(uri, { limit });
  return Response.json({ ok: true, history });
}
