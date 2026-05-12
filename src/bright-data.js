/**
 * Bright Data SERP API client.
 * Same pattern as unfancy-search: POST to api.brightdata.com/request
 * with a Google search URL and get structured JSON back.
 */

const API_BASE = 'https://api.brightdata.com/request';

export async function fetchSerp({ query, country = 'us', apiToken, zone = 'serp_api1', fetchImpl = fetch }) {
  if (!apiToken) throw new Error('BRIGHT_DATA_API_TOKEN is not set');

  // brd_json=1 tells Bright Data to parse the HTML into structured JSON
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=${country}&hl=en&pws=0&brd_json=1`;

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  let res;
  try {
    res = await fetchImpl(API_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zone,
        url: searchUrl,
        format: 'raw', // brd_json=1 returns structured JSON directly
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const durationMs = Date.now() - started;
    const msg = err.name === 'AbortError' ? 'SERP request timed out (30s)' : err.message;
    return { ok: false, statusCode: 0, error: msg, durationMs, results: [], query };
  }
  clearTimeout(timeout);

  const durationMs = Date.now() - started;

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, statusCode: res.status, error: text, durationMs, results: [], query };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, statusCode: res.status, error: 'Invalid JSON response', durationMs, results: [], query };
  }

  const results = [];
  if (data.organic && Array.isArray(data.organic)) {
    for (const item of data.organic) {
      const url = item.url || item.link || '';
      if (!url) continue;
      results.push({
        title: item.title || '',
        url,
        description: item.description || item.snippet || '',
        position: item.position ?? item.rank ?? results.length + 1,
      });
    }
  }

  return { ok: true, statusCode: res.status, durationMs, results, query };
}

/**
 * Fan out multiple queries in parallel (like unfancy-search's fetchSerpFanOut).
 */
export async function fetchSerpFanOut(queries, options) {
  const settled = await Promise.allSettled(
    queries.map((query) => fetchSerp({ ...options, query })),
  );

  const trace = [];
  const allResults = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      trace.push({
        query: result.value.query,
        ok: result.value.ok,
        statusCode: result.value.statusCode,
        durationMs: result.value.durationMs,
        resultCount: result.value.results.length,
        error: result.value.error,
      });
      allResults.push(...result.value.results.map((r) => ({ ...r, sourceQuery: result.value.query })));
    } else {
      trace.push({ query: '?', ok: false, error: result.reason?.message || 'Request failed', resultCount: 0 });
    }
  }

  return { trace, results: allResults };
}
