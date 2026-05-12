/**
 * LLM verdict synthesis via OpenRouter (Claude Haiku).
 *
 * Single call: the LLM analyzes all raw evidence, picks the 3-5 best
 * Reddit quotes, explains why each matters, and writes the verdict.
 * Returns structured JSON — we control the rendering.
 */

/**
 * @typedef {{ quote: string, source_title: string, source_url: string, bot: string, why: string }} CuratedEvidence
 * @typedef {{ winner: string, confidence: string, narrative: string, curated_evidence: CuratedEvidence[] }} VerdictResult
 */

export async function synthesizeVerdict(botA, botB, analysisA, analysisB, allEvidence, options = {}) {
  const apiKey = options.llmApiKey;
  if (!apiKey || allEvidence.length === 0) return null;

  const model = options.llmModel || 'anthropic/claude-haiku-4.5';
  const baseUrl = options.llmBaseUrl || 'https://openrouter.ai/api/v1/chat/completions';
  const fetchImpl = options.fetchImpl || fetch;

  const evidenceBlock = allEvidence.slice(0, 15).map((e, i) =>
    `[${i + 1}] Bot: ${e.bot} | "${e.title}" | ${e.description.slice(0, 250)} | URL: ${e.url}`
  ).join('\n');

  const prompt = `You are a BattleBots analyst. Analyze the Reddit evidence below and produce a JSON verdict.

MATCHUP: ${botA.name} (${botA.weapon}, ${botA.team}) vs ${botB.name} (${botB.weapon}, ${botB.team})

SENTIMENT COUNTS:
- ${botA.name}: ${analysisA.sentiment.positive} positive, ${analysisA.sentiment.negative} negative, ${analysisA.sentiment.neutral} neutral
- ${botB.name}: ${analysisB.sentiment.positive} positive, ${analysisB.sentiment.negative} negative, ${analysisB.sentiment.neutral} neutral

RAW REDDIT EVIDENCE:
${evidenceBlock}

Return ONLY a JSON object with this exact schema:
{
  "winner": "${botA.name}" or "${botB.name}" or "Too close to call",
  "confidence": "strong" or "lean" or "toss-up",
  "narrative": "2-3 sentence analytical verdict. Write like a sports analyst. Mention both bots by name. Reference the curated evidence naturally (e.g. 'fans consistently cite...'). Under 80 words.",
  "curated_evidence": [
    {
      "quote": "The most relevant sentence from the Reddit evidence",
      "source_title": "The Reddit post title",
      "source_url": "The URL",
      "bot": "Which bot this is about",
      "why": "One sentence: why this quote matters for the verdict"
    }
  ]
}

Pick 3-5 of the MOST relevant quotes — ones that directly support or contradict the winner call. Skip generic or off-topic mentions. Each "why" should connect the quote to the verdict.

Only use facts from the evidence. Never invent match results or opinions.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout

  let res;
  try {
    res = await fetchImpl(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          { role: 'system', content: 'You are a BattleBots analyst. Always respond with valid JSON only. No markdown fences, no explanation outside the JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(err.name === 'AbortError' ? 'LLM request timed out (45s)' : err.message);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = (data?.choices?.[0]?.message?.content || '').trim();
  if (!raw) return null;

  // Parse JSON — strip markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const result = JSON.parse(cleaned);
    if (result.winner && result.narrative && Array.isArray(result.curated_evidence)) {
      return result;
    }
  } catch { /* fall through */ }

  return null;
}
