/**
 * LLM verdict synthesis via OpenRouter / OpenAI-compatible API.
 * Asks for JSON with p1/p2/p3 keys, parses them into paragraphs.
 */

export async function synthesizeVerdict(botA, botB, analysisA, analysisB, verdict, evidence, options = {}) {
  const apiKey = options.llmApiKey;
  if (!apiKey || evidence.length === 0) return null;

  const model = options.llmModel || 'moonshotai/kimi-k2.6';
  const baseUrl = options.llmBaseUrl || 'https://api.openai.com/v1/chat/completions';
  const fetchImpl = options.fetchImpl || fetch;

  const citedEvidence = evidence.slice(0, 12).map((item, i) => ({
    id: i + 1,
    bot: item.bot,
    title: item.title,
    sentiment: item.sentiment > 0 ? 'positive' : item.sentiment < 0 ? 'negative' : 'neutral',
    snippet: item.description.slice(0, 300),
  }));

  const prompt = `${botA.name} (${botA.weapon}) vs ${botB.name} (${botB.weapon}) BattleBots matchup.

${botA.name}: ${analysisA.sentiment.positive} positive, ${analysisA.sentiment.negative} negative, ${analysisA.sentiment.neutral} neutral Reddit mentions.
${botB.name}: ${analysisB.sentiment.positive} positive, ${analysisB.sentiment.negative} negative, ${analysisB.sentiment.neutral} neutral Reddit mentions.

Evidence:
${citedEvidence.map((e) => `[${e.id}] ${e.bot} (${e.sentiment}): "${e.title}" — ${e.snippet}`).join('\n')}

Respond with ONLY a JSON object:
{"p1":"1-2 sentences: who Reddit favors and how strong the consensus is","p2":"3-4 sentences: strengths and concerns for EACH bot, citing evidence as [1], [2], etc. Cover both bots.","p3":"1-2 sentences: final verdict — who wins this matchup according to Reddit and why"}

Rules: only use facts from the evidence above. Never invent match results. Write like a sports analyst.`;

  const res = await fetchImpl(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: 'You are a BattleBots analyst. Respond with ONLY a valid JSON object. No markdown, no explanation.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  // Some models (Kimi K2.6) put reasoning in `reasoning` and content in `content`
  // If content is null, the model may have used all tokens on reasoning
  const message = data?.choices?.[0]?.message;
  const raw = (message?.content || '').trim();
  if (!raw) return null;

  // Parse JSON response
  const jsonStr = extractJson(raw);
  if (jsonStr) {
    try {
      const obj = JSON.parse(jsonStr);
      if (obj.p1 && obj.p2 && obj.p3) {
        return `${obj.p1}\n\n${obj.p2}\n\n${obj.p3}`;
      }
    } catch { /* fall through */ }
  }

  // If JSON parsing fails but we got text, return it cleaned
  if (raw.length > 60) return raw;
  return null;
}

/**
 * Extract JSON from a response that may have text around it.
 */
function extractJson(text) {
  // JSON inside markdown code block
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenced) return fenced[1];

  // Find { ... } blocks containing our keys
  let depth = 0;
  let start = -1;
  const candidates = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const block = text.slice(start, i + 1);
        if (block.includes('"p1"') && block.includes('"p3"')) candidates.push(block);
        start = -1;
      }
    }
  }

  // Return last valid candidate
  for (let i = candidates.length - 1; i >= 0; i--) {
    try { JSON.parse(candidates[i]); return candidates[i]; } catch { /* next */ }
  }
  return null;
}
