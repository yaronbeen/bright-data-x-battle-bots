const botASelect = document.querySelector('#botA');
const botBSelect = document.querySelector('#botB');
const btn = document.querySelector('#btn');
const form = document.querySelector('#matchup');
const vsScreen = document.querySelector('#vs-screen');
const vsStatus = document.querySelector('#vs-status');
const verdictCard = document.querySelector('#verdict-card');
const verdictTitle = document.querySelector('#verdict-title');
const verdictConfidence = document.querySelector('#verdict-confidence');
const verdictSummary = document.querySelector('#verdict-summary');
const winnerImg = document.querySelector('#winner-img');
const llmNote = document.querySelector('#llm-note');
const comparison = document.querySelector('#comparison');
const evidenceCard = document.querySelector('#evidence-card');
const evidenceEl = document.querySelector('#evidence');
const traceDetails = document.querySelector('#trace-details');
const traceBody = document.querySelector('#trace-body');

let roster = [];

// Load roster
fetch('/api/roster').then((r) => r.json()).then((data) => {
  if (!data.ok) return;
  roster = data.roster;
  const options = roster.map((b) => `<option value="${b.id}">${b.name}</option>`);
  botASelect.innerHTML = '<option value="">Select bot…</option>' + options.join('');
  botBSelect.innerHTML = '<option value="">Select bot…</option>' + options.join('');
  botASelect.value = 'minotaur';
  botBSelect.value = 'tombstone';
});

function findBot(id) { return roster.find((b) => b.id === id); }

// Progress steps shown during loading
const STEPS = [
  { text: 'Building Reddit search queries…', delay: 0 },
  { text: 'Hitting Bright Data SERP API (6 parallel queries)…', delay: 1200 },
  { text: 'Extracting Reddit mentions for Bot A…', delay: 4000 },
  { text: 'Extracting Reddit mentions for Bot B…', delay: 6000 },
  { text: 'Scoring sentiment across all results…', delay: 9000 },
  { text: 'Generating AI verdict from evidence…', delay: 12000 },
  { text: 'Almost there — LLM writing the analysis…', delay: 20000 },
];

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const botAId = botASelect.value;
  const botBId = botBSelect.value;
  if (!botAId || !botBId) return;

  const botA = findBot(botAId);
  const botB = findBot(botBId);

  // Hide previous results
  btn.disabled = true;
  btn.textContent = 'Analyzing…';
  verdictCard.hidden = true;
  comparison.hidden = true;
  comparison.style.display = 'none';
  evidenceCard.hidden = true;
  traceDetails.hidden = true;

  // Show VS screen with progress
  showVsScreen(botA, botB);
  const stepTimers = startProgressSteps();

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botA: botAId, botB: botBId }),
    });
    const data = await res.json();

    // Stop progress timers
    stepTimers.forEach(clearTimeout);

    // Brief pause so the VS screen feels intentional
    await delay(600);
    vsScreen.hidden = true;

    if (!data.ok) {
      verdictCard.hidden = false;
      verdictTitle.textContent = data.error;
      verdictSummary.innerHTML = '';
      return;
    }

    // Reveal results with staggered timing
    renderVerdict(data);
    await delay(300);
    renderComparison(data);
    await delay(200);
    renderEvidence(data.evidence);
    renderTrace(data.trace);
  } catch (err) {
    stepTimers.forEach(clearTimeout);
    vsScreen.hidden = true;
    verdictCard.hidden = false;
    verdictTitle.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Who wins?';
  }
});

function showVsScreen(botA, botB) {
  vsScreen.hidden = false;
  document.querySelector('#vs-imgA').src = botA.image;
  document.querySelector('#vs-imgA').alt = botA.name;
  document.querySelector('#vs-nameA').textContent = botA.name;
  document.querySelector('#vs-weaponA').textContent = botA.weapon;
  document.querySelector('#vs-imgB').src = botB.image;
  document.querySelector('#vs-imgB').alt = botB.name;
  document.querySelector('#vs-nameB').textContent = botB.name;
  document.querySelector('#vs-weaponB').textContent = botB.weapon;
  vsStatus.textContent = STEPS[0].text;
}

function startProgressSteps() {
  return STEPS.slice(1).map((step) =>
    setTimeout(() => { vsStatus.textContent = step.text; }, step.delay)
  );
}

function renderVerdict(data) {
  verdictCard.hidden = false;

  const isTossUp = data.verdict.winner === 'Too close to call';
  verdictTitle.textContent = isTossUp
    ? `${data.botA.name} vs ${data.botB.name} — Too close to call`
    : `Reddit says: ${data.verdict.winner}`;
  verdictConfidence.textContent = data.verdict.confidence;

  if (!isTossUp) {
    const winner = data.verdict.winnerId === data.botA.id ? data.botA : data.botB;
    winnerImg.src = winner.image;
    winnerImg.alt = winner.name;
    winnerImg.parentElement.style.display = '';
  } else {
    winnerImg.parentElement.style.display = 'none';
  }

  verdictSummary.innerHTML = formatSummary(data.summary);

  llmNote.textContent = data.llm?.used
    ? `Analysis by ${data.llm.model}`
    : data.llm?.error
      ? `LLM error: ${data.llm.error}`
      : '';
}

function formatSummary(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function renderComparison(data) {
  comparison.hidden = false;
  comparison.style.display = '';
  fillBotCard('A', data.botA);
  fillBotCard('B', data.botB);
}

function fillBotCard(side, bot) {
  document.querySelector(`#name${side}`).textContent = bot.name;
  document.querySelector(`#meta${side}`).textContent = `${bot.weapon} · ${bot.team}`;
  document.querySelector(`#img${side}`).src = bot.image;
  document.querySelector(`#img${side}`).alt = bot.name;
  document.querySelector(`#relevant${side}`).textContent = `${bot.totalRelevant} relevant Reddit mentions found`;

  const s = bot.sentiment;
  const total = Math.max(1, s.positive + s.negative + s.neutral);
  document.querySelector(`#bars${side}`).innerHTML = [
    bar('Positive', s.positive, total, 'pos'),
    bar('Negative', s.negative, total, 'neg'),
    bar('Neutral', s.neutral, total, 'neu'),
  ].join('');
}

function bar(label, count, total, cls) {
  return `<div class="bar-row"><span>${label}</span><strong>${count}</strong><div class="bar-fill ${cls}" style="width:${(count / total) * 100}%"></div></div>`;
}

function renderEvidence(evidence) {
  if (!evidence.length) { evidenceCard.hidden = true; return; }
  evidenceCard.hidden = false;
  evidenceEl.innerHTML = evidence.map((e, i) => {
    const cls = e.sentiment > 0 ? 'pos' : e.sentiment < 0 ? 'neg' : 'neu';
    const label = e.sentiment > 0 ? '+' + e.sentiment : e.sentiment < 0 ? String(e.sentiment) : '0';
    return `
      <div class="evidence-item">
        <div class="meta">
          <span class="badge ${cls}">${label}</span>
          <span><strong>${esc(e.bot)}</strong> · [${i + 1}]</span>
        </div>
        <h3><a href="${esc(e.url)}" target="_blank" rel="noreferrer">${esc(e.title)}</a></h3>
        <p>${esc(e.description)}</p>
      </div>`;
  }).join('');
}

function renderTrace(trace) {
  traceDetails.hidden = false;
  traceBody.innerHTML = trace.map((t) => `
    <tr>
      <td>${esc(t.query)}</td>
      <td class="${t.ok ? 'ok' : 'fail'}">${t.ok ? t.statusCode : 'FAIL'}</td>
      <td>${t.resultCount}</td>
      <td>${t.durationMs ? `${t.durationMs}ms` : '—'}</td>
    </tr>`).join('');
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
