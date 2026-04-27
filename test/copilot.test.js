import assert from 'node:assert/strict';
import test from 'node:test';
import { predict, validateMatchup, ROSTER } from '../src/copilot.js';
import { analyzeResults, scoreText } from '../src/sentiment.js';
import { getBot } from '../src/roster.js';
import { synthesizeVerdict } from '../src/llm.js';

// --- Roster ---

test('roster has 10 bots', () => {
  assert.equal(ROSTER.length, 10);
});

test('getBot returns known bot', () => {
  const bot = getBot('minotaur');
  assert.equal(bot.name, 'Minotaur');
  assert.equal(bot.weapon, 'Drum spinner');
});

test('getBot returns null for unknown', () => {
  assert.equal(getBot('nonexistent'), null);
});

// --- Validation ---

test('rejects same bot twice', () => {
  assert.match(validateMatchup('minotaur', 'minotaur'), /different/);
});

test('rejects unknown bot', () => {
  assert.match(validateMatchup('minotaur', 'fake'), /Unknown/);
});

test('accepts valid matchup', () => {
  assert.equal(validateMatchup('minotaur', 'tombstone'), null);
});

// --- Sentiment ---

test('scores positive text', () => {
  assert.ok(scoreText('Minotaur wins again, what a great knockout!') > 0);
});

test('scores negative text', () => {
  assert.ok(scoreText('That loss was bad, the bot broke and failed') < 0);
});

// --- Full pipeline ---

test('predict returns verdict + comparison from mocked SERP', async () => {
  const mockSerp = async () => new Response(JSON.stringify({
    organic: [
      { title: 'Minotaur is a beast - r/battlebots', url: 'https://reddit.com/1', description: 'Love the wins and knockout power' },
      { title: 'Tombstone broke down again', url: 'https://reddit.com/2', description: 'Tombstone lost badly, weapon failed' },
    ],
  }), { status: 200 });

  const result = await predict('minotaur', 'tombstone', {
    apiToken: 'test',
    zone: 'test',
    fetchImpl: mockSerp,
  });

  assert.equal(result.ok, true);
  assert.ok(result.botA.name === 'Minotaur');
  assert.ok(result.botB.name === 'Tombstone');
  assert.ok(result.verdict.winner);
  assert.ok(result.trace.length === 6); // 3 queries per bot
  assert.ok(result.summary.length > 10);
});

test('predict rejects invalid matchup without calling SERP', async () => {
  const result = await predict('minotaur', 'minotaur', {});
  assert.equal(result.ok, false);
  assert.match(result.error, /different/);
});

// --- LLM ---

test('roster bots have local image paths', () => {
  for (const bot of ROSTER) {
    assert.ok(bot.image.startsWith('/img/'), `${bot.name} missing image`);
  }
});

test('synthesizeVerdict sends deep prompt to LLM', async () => {
  const calls = [];
  const botA = { name: 'Minotaur', weapon: 'Drum spinner', team: 'RioBotz' };
  const botB = { name: 'Tombstone', weapon: 'Horizontal spinner', team: 'Hardcore Robotics' };
  const analysisA = { sentiment: { positive: 5, negative: 2, neutral: 3 } };
  const analysisB = { sentiment: { positive: 2, negative: 4, neutral: 4 } };
  const verdict = { winner: 'Minotaur', confidence: 'strong' };
  const evidence = [
    { bot: 'Minotaur', title: 'Great bot', description: 'Fans love it', sentiment: 2, sourceQuery: 'q' },
    { bot: 'Tombstone', title: 'Broke down', description: 'Lost badly', sentiment: -2, sourceQuery: 'q' },
  ];

  const result = await synthesizeVerdict(botA, botB, analysisA, analysisB, verdict, evidence, {
    llmApiKey: 'test-key',
    llmModel: 'test-model',
    llmBaseUrl: 'https://llm.test/chat',
    fetchImpl: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({
        choices: [{ message: { content: '**Reddit favors Minotaur.** The evidence [1] shows fan love while Tombstone [2] drew criticism.' } }],
      }), { status: 200 });
    },
  });

  assert.ok(result.includes('Minotaur'));
  assert.equal(calls[0].body.model, 'test-model');
  assert.ok(calls[0].body.messages[1].content.includes('Minotaur'));
  assert.ok(calls[0].body.messages[1].content.includes('Tombstone'));
});
