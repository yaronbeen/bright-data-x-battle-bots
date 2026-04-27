/**
 * Sentiment scoring for BattleBots Reddit search results.
 * Scores titles + descriptions from SERP results.
 */

const POSITIVE = ['win', 'wins', 'won', 'strong', 'dominant', 'favorite', 'reliable', 'improved', 'durable', 'knockout', 'love', 'great', 'impressive', 'excited', 'amazing', 'beast', 'unstoppable', 'upgrade', 'champion'];
const NEGATIVE = ['loss', 'lost', 'damage', 'damaged', 'weak', 'struggle', 'struggled', 'unreliable', 'concern', 'controversy', 'hate', 'bad', 'boring', 'overrated', 'broke', 'broken', 'fail', 'failed', 'disappointing'];

export function scoreText(text) {
  const lower = text.toLowerCase();
  const pos = POSITIVE.reduce((n, t) => n + (lower.includes(t) ? 1 : 0), 0);
  const neg = NEGATIVE.reduce((n, t) => n + (lower.includes(t) ? 1 : 0), 0);
  return pos - neg;
}

export function analyzeResults(results, topic) {
  const topicTerms = topic.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const scored = results.map((r) => {
    const combined = `${r.title} ${r.description}`;
    const sentiment = scoreText(combined);
    const relevance = topicTerms.reduce((n, t) => n + (combined.toLowerCase().includes(t) ? 1 : 0), 0);
    return { ...r, sentiment, relevance, combined };
  });

  // Only keep results that mention at least one topic term
  const relevant = scored.filter((r) => r.relevance > 0);

  // Sort by relevance then sentiment strength
  relevant.sort((a, b) => (b.relevance + Math.abs(b.sentiment)) - (a.relevance + Math.abs(a.sentiment)));

  const positive = relevant.filter((r) => r.sentiment > 0);
  const negative = relevant.filter((r) => r.sentiment < 0);
  const neutral = relevant.filter((r) => r.sentiment === 0);

  const label = positive.length > negative.length + 1
    ? 'mostly positive'
    : negative.length > positive.length + 1
      ? 'mostly negative'
      : 'mixed';

  return {
    sentiment: { positive: positive.length, negative: negative.length, neutral: neutral.length, label },
    evidence: relevant.slice(0, 12).map((r) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      sentiment: r.sentiment,
      sourceQuery: r.sourceQuery,
    })),
    totalRelevant: relevant.length,
    totalResults: results.length,
  };
}
