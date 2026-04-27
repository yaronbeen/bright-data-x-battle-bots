const botASelect = document.querySelector('#botA');
const botBSelect = document.querySelector('#botB');
const previewA = document.querySelector('#previewA');
const previewB = document.querySelector('#previewB');
const metaA = document.querySelector('#pickerMetaA');
const metaB = document.querySelector('#pickerMetaB');
const btn = document.querySelector('#btn');
const form = document.querySelector('#matchup');
const suggestionsEl = document.querySelector('#suggestions');
const statusBar = document.querySelector('#status-bar');
const statusText = document.querySelector('#status-text');
const verdictCard = document.querySelector('#verdict-card');
const allEvidenceEl = document.querySelector('#all-evidence');
const traceDetails = document.querySelector('#trace-details');

let roster = [];

// ── Load roster + render suggested matchups ──
fetch('/api/roster').then((r) => r.json()).then((data) => {
  if (!data.ok) return;
  roster = data.roster;
  const opts = roster.map((b) => `<option value="${b.id}">${b.name}</option>`);
  botASelect.innerHTML = '<option value="">Pick a bot…</option>' + opts.join('');
  botBSelect.innerHTML = '<option value="">Pick a bot…</option>' + opts.join('');
  botASelect.value = 'minotaur';
  botBSelect.value = 'tombstone';
  updatePreview('A'); updatePreview('B');

  // Suggested matchups
  if (data.suggested) {
    suggestionsEl.innerHTML = data.suggested.map((s) =>
      `<button type="button" class="suggestion" data-a="${s.a}" data-b="${s.b}">${s.label}</button>`
    ).join('');
    suggestionsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.suggestion');
      if (!btn) return;
      botASelect.value = btn.dataset.a;
      botBSelect.value = btn.dataset.b;
      updatePreview('A'); updatePreview('B');
      form.requestSubmit();
    });
  }
});

// ── Live photo previews on dropdown change ──
botASelect.addEventListener('change', () => updatePreview('A'));
botBSelect.addEventListener('change', () => updatePreview('B'));

function updatePreview(side) {
  const select = side === 'A' ? botASelect : botBSelect;
  const img = side === 'A' ? previewA : previewB;
  const meta = side === 'A' ? metaA : metaB;
  const bot = roster.find((b) => b.id === select.value);
  if (bot) {
    img.src = bot.image; img.alt = bot.name;
    meta.textContent = `${bot.weapon} · ${bot.team}`;
  } else {
    img.src = ''; img.alt = ''; meta.textContent = '';
  }
}

// ── Main submit → streaming prediction ──
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!botASelect.value || !botBSelect.value) return;

  btn.disabled = true; btn.textContent = 'Analyzing…';
  verdictCard.hidden = true; allEvidenceEl.hidden = true; traceDetails.hidden = true;
    statusBar.hidden = false; statusBar.style.display = ''; statusText.textContent = 'Querying Bright Data SERP API…';

  try {
    const res = await fetch('/api/predict-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botA: botASelect.value, botB: botBSelect.value }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Process complete NDJSON lines
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          handleStreamEvent(event);
        } catch { /* skip bad lines */ }
      }
    }
  } catch (err) {
    statusText.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false; btn.textContent = 'Who wins?';
  }
});

function handleStreamEvent(event) {
  switch (event.type) {
    case 'start':
      statusText.textContent = `Searching Reddit for ${event.botA.name} vs ${event.botB.name}…`;
      break;

    case 'serp_done':
      const total = [...event.traceA, ...event.traceB].reduce((n, t) => n + (t.resultCount || 0), 0);
      statusText.textContent = `Found ${total} Reddit results. Scoring sentiment…`;
      break;

    case 'sentiment':
      statusText.textContent = `Sentiment scored. Generating AI verdict…`;
      // Could show early sentiment bars here in the future
      break;

    case 'done':
      statusBar.hidden = true; statusBar.style.display = 'none';
      renderVerdict(event.result);
      renderAllEvidence(event.result.allEvidence);
      renderTrace(event.result.trace);
      break;

    case 'error':
      statusText.textContent = `Error: ${event.error}`;
      break;
  }
}

// ── Render verdict card ──
function renderVerdict(data) {
  verdictCard.hidden = false;

  // Top section: both bots + winner
  document.querySelector('#v-imgA').src = data.botA.image;
  document.querySelector('#v-nameA').textContent = data.botA.name;
  document.querySelector('#v-imgB').src = data.botB.image;
  document.querySelector('#v-nameB').textContent = data.botB.name;

  document.querySelector('#verdict-winner').textContent = data.verdict.winner;
  document.querySelector('#verdict-confidence').textContent = data.verdict.confidence;

  // Mini sentiment bars
  renderMiniBars('#v-barsA', data.botA.sentiment);
  renderMiniBars('#v-barsB', data.botB.sentiment);

  // Narrative
  document.querySelector('#verdict-narrative').innerHTML = esc(data.narrative).replace(/\n/g, '<br>');

  // Curated evidence
  const cel = document.querySelector('#curated-evidence');
  if (data.curatedEvidence && data.curatedEvidence.length) {
    cel.innerHTML = data.curatedEvidence.map((e) => `
      <div class="curated-item">
        <p class="cq">${esc(e.quote)}</p>
        <p class="cwhy">${esc(e.why)}</p>
        <p class="csrc"><a href="${esc(e.source_url)}" target="_blank" rel="noreferrer">${esc(e.source_title)}</a> · ${esc(e.bot)}</p>
      </div>
    `).join('');
  } else {
    cel.innerHTML = '';
  }

  // LLM note
  const note = document.querySelector('#llm-note');
  note.textContent = data.llm?.used
    ? `Analysis by ${data.llm.model} · based on ${data.botA.totalRelevant + data.botB.totalRelevant} Reddit mentions`
    : data.llm?.error ? `AI unavailable: ${data.llm.error}` : '';
}

function renderMiniBars(selector, s) {
  const total = Math.max(1, s.positive + s.negative);
  document.querySelector(selector).innerHTML = `
    <div class="mini-bar"><div class="mini-fill pos" style="width:${(s.positive / total) * 60}px"></div><span>${s.positive} pos</span></div>
    <div class="mini-bar"><div class="mini-fill neg" style="width:${(s.negative / total) * 60}px"></div><span>${s.negative} neg</span></div>
  `;
}

// ── All evidence (collapsible) ──
function renderAllEvidence(evidence) {
  if (!evidence || !evidence.length) { allEvidenceEl.hidden = true; return; }
  allEvidenceEl.hidden = false;
  document.querySelector('#evidence-count').textContent = evidence.length;
  document.querySelector('#evidence-list').innerHTML = evidence.map((e) => {
    const cls = e.sentiment > 0 ? 'pos' : e.sentiment < 0 ? 'neg' : 'neu';
    const label = e.sentiment > 0 ? '+' + e.sentiment : e.sentiment < 0 ? String(e.sentiment) : '0';
    return `<div class="ev-row">
      <span class="ev-badge ${cls}">${label}</span>
      <div><a href="${esc(e.url)}" target="_blank" rel="noreferrer">${esc(e.title)}</a><br><span class="ev-desc">${esc(e.description?.slice(0, 150))}</span></div>
    </div>`;
  }).join('');
}

// ── Trace ──
function renderTrace(trace) {
  if (!trace || !trace.length) return;
  traceDetails.hidden = false;
  document.querySelector('#trace-body').innerHTML = trace.map((t) => `
    <tr><td>${esc(t.query)}</td><td class="${t.ok ? 'ok' : 'fail'}">${t.ok ? t.statusCode : 'FAIL'}</td><td>${t.resultCount}</td><td>${t.durationMs ? t.durationMs + 'ms' : '—'}</td></tr>
  `).join('');
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
