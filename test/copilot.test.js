import assert from 'node:assert/strict';
import test from 'node:test';
import { predict, validateMatchup, ROSTER, SUGGESTED_MATCHUPS } from '../src/copilot.js';
import { analyzeResults, scoreText } from '../src/sentiment.js';
import { getBot } from '../src/roster.js';
import { synthesizeVerdict } from '../src/llm.js';

// ── Roster ──

test('roster has 10 bots with images', () => {
  assert.equal(ROSTER.length, 10);
  for (const bot of ROSTER) {
    assert.ok(bot.image.startsWith('/img/'), `${bot.name} missing image`);
    assert.ok(bot.weapon, `${bot.name} missing weapon`);
  }
});

test('getBot returns known bot', () => {
  assert.equal(getBot('minotaur').name, 'Minotaur');
});

test('suggested matchups reference valid bots', () => {
  for (const m of SUGGESTED_MATCHUPS) {
    assert.ok(getBot(m.a), `Unknown bot: ${m.a}`);
    assert.ok(getBot(m.b), `Unknown bot: ${m.b}`);
  }
});

// ── Validation ──

test('rejects same bot', () => assert.match(validateMatchup('minotaur', 'minotaur'), /different/));
test('rejects unknown bot', () => assert.match(validateMatchup('minotaur', 'fake'), /Unknown/));
test('accepts valid matchup', () => assert.equal(validateMatchup('minotaur', 'tombstone'), null));

// ── Sentiment ──

test('positive text scores > 0', () => assert.ok(scoreText('Great knockout, love this bot, wins!') > 0));
test('negative text scores < 0', () => assert.ok(scoreText('Lost badly, weapon broke, boring') < 0));

// ── LLM structured output ──

test('synthesizeVerdict returns structured JSON from LLM', async () => {
  const botA = { name: 'Minotaur', weapon: 'Drum spinner', team: 'RioBotz' };
  const botB = { name: 'Tombstone', weapon: 'Horizontal spinner', team: 'Hardcore Robotics' };
  const analysisA = { sentiment: { positive: 5, negative: 2, neutral: 3 } };
  const analysisB = { sentiment: { positive: 2, negative: 4, neutral: 4 } };
  const evidence = [
    { bot: 'Minotaur', title: 'Minotaur is durable', description: 'Fans love it', url: 'https://reddit.com/1', sentiment: 2 },
    { bot: 'Tombstone', title: 'Tombstone broke', description: 'Lost badly', url: 'https://reddit.com/2', sentiment: -2 },
  ];

  const result = await synthesizeVerdict(botA, botB, analysisA, analysisB, evidence, {
    llmApiKey: 'test',
    llmModel: 'test-model',
    llmBaseUrl: 'https://test.llm/chat',
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        winner: 'Minotaur',
        confidence: 'strong',
        narrative: 'Reddit favors Minotaur for durability.',
        curated_evidence: [
          { quote: 'Fans love it', source_title: 'Minotaur is durable', source_url: 'https://reddit.com/1', bot: 'Minotaur', why: 'Durability is key' },
        ],
      }) } }],
    }), { status: 200 }),
  });

  assert.equal(result.winner, 'Minotaur');
  assert.equal(result.confidence, 'strong');
  assert.ok(result.narrative.includes('Minotaur'));
  assert.equal(result.curated_evidence.length, 1);
  assert.equal(result.curated_evidence[0].why, 'Durability is key');
});

test('synthesizeVerdict returns null without API key', async () => {
  assert.equal(await synthesizeVerdict({}, {}, {}, {}, [{ bot: 'x' }], {}), null);
});

// ── Full pipeline ──

test('predict returns structured result with streaming events', async () => {
  const events = [];
  const mockSerp = async () => new Response(JSON.stringify({
    organic: [
      { title: 'Minotaur wins', url: 'https://reddit.com/1', description: 'Love the knockout power and great durability' },
      { title: 'Tombstone broke down', url: 'https://reddit.com/2', description: 'Tombstone lost badly, weapon failed again' },
    ],
  }), { status: 200 });

  const result = await predict('minotaur', 'tombstone', {
    apiToken: 'test', zone: 'test', fetchImpl: mockSerp,
  }, (e) => events.push(e));

  assert.equal(result.ok, true);
  assert.ok(result.narrative.length > 10);
  assert.ok(result.allEvidence.length > 0);
  assert.equal(result.trace.length, 6);
  // Streaming events
  assert.ok(events.some((e) => e.type === 'start'));
  assert.ok(events.some((e) => e.type === 'serp_done'));
  assert.ok(events.some((e) => e.type === 'sentiment'));
  assert.ok(events.some((e) => e.type === 'done'));
});

test('predict rejects invalid matchup', async () => {
  const result = await predict('minotaur', 'minotaur', {});
  assert.equal(result.ok, false);
});
