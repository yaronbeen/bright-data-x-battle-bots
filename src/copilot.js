/**
 * Head-to-head pipeline:
 *   Two bots -> Reddit SERP fan-out -> sentiment -> deep LLM verdict.
 */

import { fetchSerpFanOut } from './bright-data.js';
import { analyzeResults } from './sentiment.js';
import { synthesizeVerdict } from './llm.js';
import { getBot, ROSTER } from './roster.js';

function buildQueries(bot, opponent) {
  return [
    `site:reddit.com/r/battlebots ${bot.name} vs ${opponent.name}`,
    `site:reddit.com/r/battlebots ${bot.name} ${bot.weapon}`,
    `site:reddit.com battlebots ${bot.name} opinion`,
  ];
}

export function validateMatchup(botAId, botBId) {
  if (!botAId || !botBId) return 'Select two bots.';
  if (botAId === botBId) return 'Pick two different bots.';
  if (!getBot(botAId)) return `Unknown bot: ${botAId}`;
  if (!getBot(botBId)) return `Unknown bot: ${botBId}`;
  return null;
}

export async function predict(botAId, botBId, options = {}) {
  const error = validateMatchup(botAId, botBId);
  if (error) return { ok: false, error, statusCode: 400 };

  const botA = getBot(botAId);
  const botB = getBot(botBId);

  const [serpA, serpB] = await Promise.all([
    fetchSerpFanOut(buildQueries(botA, botB), options),
    fetchSerpFanOut(buildQueries(botB, botA), options),
  ]);

  const analysisA = analyzeResults(serpA.results, botA.name);
  const analysisB = analyzeResults(serpB.results, botB.name);

  const scoreA = analysisA.sentiment.positive - analysisA.sentiment.negative;
  const scoreB = analysisB.sentiment.positive - analysisB.sentiment.negative;
  const diff = scoreA - scoreB;

  let verdict;
  if (diff > 1) {
    verdict = { winner: botA.name, winnerId: botA.id, loserId: botB.id, confidence: diff > 3 ? 'strong' : 'lean' };
  } else if (diff < -1) {
    verdict = { winner: botB.name, winnerId: botB.id, loserId: botA.id, confidence: diff < -3 ? 'strong' : 'lean' };
  } else {
    verdict = { winner: 'Too close to call', winnerId: null, loserId: null, confidence: 'toss-up' };
  }

  // Build all evidence tagged by bot
  const allEvidence = [
    ...analysisA.evidence.map((e) => ({ ...e, bot: botA.name })),
    ...analysisB.evidence.map((e) => ({ ...e, bot: botB.name })),
  ];

  // Deterministic fallback summary
  let summary = verdict.winner === 'Too close to call'
    ? `Reddit is split on ${botA.name} vs ${botB.name}. Evidence is roughly even with ${analysisA.sentiment.positive} positive for ${botA.name} and ${analysisB.sentiment.positive} positive for ${botB.name}.`
    : `Reddit leans toward ${verdict.winner}. ${botA.name}: ${analysisA.sentiment.positive} positive / ${analysisA.sentiment.negative} negative. ${botB.name}: ${analysisB.sentiment.positive} positive / ${analysisB.sentiment.negative} negative.`;

  // Deep LLM verdict
  let llm = { enabled: Boolean(options.llmApiKey), used: false };
  if (options.llmApiKey && allEvidence.length > 0) {
    try {
      const narrative = await synthesizeVerdict(botA, botB, analysisA, analysisB, verdict, allEvidence, options);
      if (narrative) {
        summary = narrative;
        llm = { ...llm, used: true, model: options.llmModel || 'gpt-4o-mini' };
      }
    } catch (err) {
      llm = { ...llm, error: err.message };
    }
  }

  return {
    ok: true,
    botA: { ...botA, sentiment: analysisA.sentiment, totalRelevant: analysisA.totalRelevant },
    botB: { ...botB, sentiment: analysisB.sentiment, totalRelevant: analysisB.totalRelevant },
    verdict,
    summary,
    evidence: allEvidence.slice(0, 12),
    trace: [...serpA.trace, ...serpB.trace],
    llm,
  };
}

export { ROSTER };
