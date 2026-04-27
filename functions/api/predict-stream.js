import { predict } from '../../src/copilot.js';

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const { env } = context;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const emit = (event) => {
    writer.write(encoder.encode(JSON.stringify(event) + '\n'));
  };

  // Run prediction in background, stream events
  context.waitUntil((async () => {
    try {
      await predict(body.botA, body.botB, {
        apiToken: env.BRIGHT_DATA_API_TOKEN,
        zone: env.BRIGHT_DATA_SERP_ZONE || 'web_unlocker1',
        llmApiKey: env.LLM_API_KEY,
        llmModel: env.LLM_MODEL || 'anthropic/claude-3.5-haiku',
        llmBaseUrl: env.LLM_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
      }, emit);
    } catch (err) {
      emit({ type: 'error', error: err.message });
    } finally {
      writer.close();
    }
  })());

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
