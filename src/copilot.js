/**
 * Head-to-head pipeline:
 *   Two bots → Reddit SERP fan-out → sentiment → LLM curated verdict.
 *
 * Supports a streaming callback for progressive UI updates.
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

/**
 * Run the full prediction pipeline.
 * @param {string} botAId
 * @param {string} botBId
 * @param {object} options - apiToken, zone, llmApiKey, llmModel, llmBaseUrl, fetchImpl
 * @param {(event: object) => void} [onProgress] - streaming callback
 */
export async function predict(botAId, botBId, options = {}, onProgress) {
  const error = validateMatchup(botAId, botBId);
  if (error) return { ok: false, error, statusCode: 400 };

  const emit = onProgress || (() => {});
  const botA = getBot(botAId);
  const botB = getBot(botBId);

  emit({ type: 'start', botA, botB });

  // --- SERP fan-out (parallel, both bots) ---
  const queriesA = buildQueries(botA, botB);
  const queriesB = buildQueries(botB, botA);

  const [serpA, serpB] = await Promise.all([
    fetchSerpFanOut(queriesA, options),
    fetchSerpFanOut(queriesB, options),
  ]);

  emit({ type: 'serp_done', traceA: serpA.trace, traceB: serpB.trace });

  // --- Sentiment scoring ---
  const analysisA = analyzeResults(serpA.results, botA.name);
  const analysisB = analyzeResults(serpB.results, botB.name);

  // Deterministic verdict from sentiment counts
  const scoreA = analysisA.sentiment.positive - analysisA.sentiment.negative;
  const scoreB = analysisB.sentiment.positive - analysisB.sentiment.negative;
  const diff = scoreA - scoreB;

  let deterministicVerdict;
  if (diff > 1) {
    deterministicVerdict = { winner: botA.name, winnerId: botA.id, confidence: diff > 3 ? 'strong' : 'lean' };
  } else if (diff < -1) {
    deterministicVerdict = { winner: botB.name, winnerId: botB.id, confidence: diff < -3 ? 'strong' : 'lean' };
  } else {
    deterministicVerdict = { winner: 'Too close to call', winnerId: null, confidence: 'toss-up' };
  }

  const allEvidence = [
    ...analysisA.evidence.map((e) => ({ ...e, bot: botA.name })),
    ...analysisB.evidence.map((e) => ({ ...e, bot: botB.name })),
  ];

  emit({
    type: 'sentiment',
    botA: { ...botA, sentiment: analysisA.sentiment, totalRelevant: analysisA.totalRelevant },
    botB: { ...botB, sentiment: analysisB.sentiment, totalRelevant: analysisB.totalRelevant },
    verdict: deterministicVerdict,
  });

  // --- LLM curated verdict ---
  let llm = { enabled: Boolean(options.llmApiKey), used: false };
  let verdict = deterministicVerdict;
  let narrative = `Reddit ${verdict.winner === 'Too close to call' ? 'is split' : `leans toward ${verdict.winner}`}. ${botA.name}: ${analysisA.sentiment.positive} positive / ${analysisA.sentiment.negative} negative. ${botB.name}: ${analysisB.sentiment.positive} positive / ${analysisB.sentiment.negative} negative.`;
  let curatedEvidence = [];

  if (options.llmApiKey && allEvidence.length > 0) {
    try {
      const llmResult = await synthesizeVerdict(botA, botB, analysisA, analysisB, allEvidence, options);
      if (llmResult) {
        // LLM may override the winner call
        const llmWinnerBot = [botA, botB].find((b) => b.name === llmResult.winner);
        verdict = {
          winner: llmResult.winner,
          winnerId: llmWinnerBot?.id || null,
          confidence: llmResult.confidence || verdict.confidence,
        };
        narrative = llmResult.narrative;
        curatedEvidence = llmResult.curated_evidence || [];
        llm = { ...llm, used: true, model: options.llmModel || 'anthropic/claude-3.5-haiku' };
      }
    } catch (err) {
      llm = { ...llm, error: err.message };
    }
  }

  const result = {
    ok: true,
    botA: { ...botA, sentiment: analysisA.sentiment, totalRelevant: analysisA.totalRelevant },
    botB: { ...botB, sentiment: analysisB.sentiment, totalRelevant: analysisB.totalRelevant },
    verdict,
    narrative,
    curatedEvidence,
    allEvidence: allEvidence.slice(0, 15),
    trace: [...serpA.trace, ...serpB.trace],
    llm,
  };

  emit({ type: 'done', result });
  return result;
}

/** Suggested matchups for the landing page */
export const SUGGESTED_MATCHUPS = [
  { a: 'minotaur', b: 'tombstone', label: 'Minotaur vs Tombstone' },
  { a: 'hydra', b: 'tantrum', label: 'Hydra vs Tantrum' },
  { a: 'end-game', b: 'riptide', label: 'End Game vs Riptide' },
  { a: 'witch-doctor', b: 'copperhead', label: 'Witch Doctor vs Copperhead' },
  { a: 'sawblaze', b: 'whiplash', label: 'SawBlaze vs Whiplash' },
  { a: 'cobalt', b: 'uppercut', label: 'Cobalt vs Uppercut' },
];

export { ROSTER };
