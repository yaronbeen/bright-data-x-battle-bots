import { predict } from '../../src/copilot.js';

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const { env } = context;

  const result = await predict(body.botA, body.botB, {
    apiToken: env.BRIGHT_DATA_API_TOKEN,
    zone: env.BRIGHT_DATA_SERP_ZONE || 'web_unlocker1',
    llmApiKey: env.LLM_API_KEY,
    llmModel: env.LLM_MODEL || 'anthropic/claude-3.5-haiku',
    llmBaseUrl: env.LLM_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
  });

  return Response.json(result, { status: result.statusCode || 200 });
}
