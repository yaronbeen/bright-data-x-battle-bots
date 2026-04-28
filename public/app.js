const botASelect = document.querySelector('#botA');
const botBSelect = document.querySelector('#botB');
const previewA = document.querySelector('#previewA');
const previewB = document.querySelector('#previewB');
const metaA = document.querySelector('#pickerMetaA');
const metaB = document.querySelector('#pickerMetaB');
const btn = document.querySelector('#btn');
const form = document.querySelector('#matchup');
const vsBadge = document.querySelector('#vs-badge');
const suggestionsEl = document.querySelector('#suggestions');
const statusBar = document.querySelector('#status-bar');
const statusText = document.querySelector('#status-text');
const earlySentiment = document.querySelector('#early-sentiment');
const verdictCard = document.querySelector('#verdict-card');
const allEvidenceEl = document.querySelector('#all-evidence');
const traceDetails = document.querySelector('#trace-details');

let roster = [];
let pendingResult = null; // holds full result while drumroll plays

// ── Load roster ──
fetch('/api/roster').then((r) => r.json()).then((data) => {
  if (!data.ok) return;
  roster = data.roster;
  const opts = roster.map((b) => `<option value="${b.id}">${b.name}</option>`);
  botASelect.innerHTML = '<option value="">Pick a bot…</option>' + opts.join('');
  botBSelect.innerHTML = '<option value="">Pick a bot…</option>' + opts.join('');
  botASelect.value = 'minotaur';
  botBSelect.value = 'tombstone';
  updatePreview('A'); updatePreview('B');

  if (data.suggested) {
    suggestionsEl.innerHTML = '<span class="suggestions-label">Try a matchup</span>' +
      data.suggested.map((s) =>
        `<button type="button" class="suggestion" data-a="${s.a}" data-b="${s.b}">${s.label}</button>`
      ).join('');
    suggestionsEl.addEventListener('click', (e) => {
      const b = e.target.closest('.suggestion');
      if (!b) return;
      botASelect.value = b.dataset.a;
      botBSelect.value = b.dataset.b;
      updatePreview('A'); updatePreview('B');
      form.requestSubmit();
    });
  }
});

// ── Crossfade bot previews on dropdown change ──
botASelect.addEventListener('change', () => updatePreview('A'));
botBSelect.addEventListener('change', () => updatePreview('B'));

function updatePreview(side) {
  const select = side === 'A' ? botASelect : botBSelect;
  const img = side === 'A' ? previewA : previewB;
  const meta = side === 'A' ? metaA : metaB;
  const bot = roster.find((b) => b.id === select.value);
  if (!bot) { img.src = ''; meta.textContent = ''; return; }

  // Crossfade: fade out, swap, fade in
  img.classList.add('swapping');
  setTimeout(() => {
    img.src = botImg(bot); img.alt = bot.name;
    meta.textContent = `${bot.weapon} · ${bot.team}`;
    img.classList.remove('swapping');
  }, 200);
}

// ── Submit → streaming ──
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const a = botASelect.value, b = botBSelect.value;
  if (!a || !b) return;
  if (a === b) { alert('Pick two different bots!'); return; }

  // Reset everything
  btn.disabled = true; btn.textContent = 'Analyzing…';
  verdictCard.hidden = true; verdictCard.classList.remove('reveal');
  allEvidenceEl.hidden = true; traceDetails.hidden = true;
  earlySentiment.hidden = true; earlySentiment.style.display = 'none';
  statusBar.hidden = false; statusBar.style.display = '';
  statusText.textContent = 'Querying Bright Data SERP API…';
  vsBadge.classList.add('active');
  pendingResult = null;

  try {
    const res = await fetch('/api/predict-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botA: a, botB: b }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try { handleEvent(JSON.parse(line)); } catch {}
      }
    }
  } catch (err) {
    statusText.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false; btn.textContent = 'Who wins?';
    vsBadge.classList.remove('active');
  }
});

// ── Stream event handler ──
function handleEvent(ev) {
  switch (ev.type) {
    case 'start':
      statusText.textContent = `Searching Reddit for ${ev.botA.name} vs ${ev.botB.name}…`;
      break;

    case 'serp_done': {
      const total = [...ev.traceA, ...ev.traceB].reduce((n, t) => n + (t.resultCount || 0), 0);
      statusText.textContent = `Found ${total} Reddit results. Scoring sentiment…`;
      break;
    }

    case 'sentiment':
      statusText.textContent = 'Sentiment scored. Generating AI verdict…';
      showEarlySentiment(ev);
      break;

    case 'done':
      statusBar.hidden = true; statusBar.style.display = 'none';
      revealVerdict(ev.result);
      break;

    case 'error':
      statusText.textContent = `Error: ${ev.error}`;
      break;
  }
}

// ── Progressive: show sentiment BEFORE LLM finishes ──
function showEarlySentiment(ev) {
  earlySentiment.hidden = false;
  earlySentiment.style.display = '';
  earlySentiment.innerHTML = `
    <div class="early-bot">
      <img src="${ev.botA.image || PLACEHOLDER_IMG}" alt="${esc(ev.botA.name)}" width="80" height="80" />
      <strong>${esc(ev.botA.name)}</strong>
      ${miniBar(ev.botA.sentiment)}
    </div>
    <div class="early-divider">
      <div class="vs-text">VS</div>
      <div class="waiting">AI analyzing…</div>
    </div>
    <div class="early-bot">
      <img src="${ev.botB.image || PLACEHOLDER_IMG}" alt="${esc(ev.botB.name)}" width="80" height="80" />
      <strong>${esc(ev.botB.name)}</strong>
      ${miniBar(ev.botB.sentiment)}
    </div>
  `;
}

function miniBar(s) {
  const t = Math.max(1, s.positive + s.negative);
  return `<div class="mini-bars">
    <div class="mini-bar"><div class="mini-fill pos" style="width:${(s.positive/t)*50}px"></div><span>${s.positive} pos</span></div>
    <div class="mini-bar"><div class="mini-fill neg" style="width:${(s.negative/t)*50}px"></div><span>${s.negative} neg</span></div>
  </div>`;
}

// ── Dramatic verdict reveal ──
async function revealVerdict(data) {
  // Hide early sentiment with a brief overlap
  earlySentiment.hidden = true; earlySentiment.style.display = 'none';

  // Build the card content (hidden)
  buildVerdictCard(data);
  verdictCard.hidden = false;
  verdictCard.classList.add('reveal');

  // Staggered reveal sequence
  await delay(400);  // card slides in

  // Winner name pop
  const winnerEl = document.querySelector('#verdict-winner');
  winnerEl.classList.add('show');
  await delay(500);

  // Confidence badge
  document.querySelector('#verdict-confidence').classList.add('show');
  await delay(300);

  // Narrative fade in
  document.querySelector('#verdict-narrative').classList.add('show');
  await delay(400);

  // Curated evidence staggered
  const items = document.querySelectorAll('.curated-item');
  for (let i = 0; i < items.length; i++) {
    items[i].classList.add('show');
    await delay(150);
  }

  // Below the fold
  renderAllEvidence(data.allEvidence);
  renderTrace(data.trace);
}

function buildVerdictCard(data) {
  // Reset animation classes
  document.querySelector('#verdict-winner').classList.remove('show');
  document.querySelector('#verdict-confidence').classList.remove('show');
  document.querySelector('#verdict-narrative').classList.remove('show');

  // Bot images + names
  const imgA = document.querySelector('#v-imgA');
  const imgB = document.querySelector('#v-imgB');
  imgA.src = data.botA.image || PLACEHOLDER_IMG; imgA.alt = data.botA.name;
  imgB.src = data.botB.image || PLACEHOLDER_IMG; imgB.alt = data.botB.name;
  document.querySelector('#v-nameA').textContent = data.botA.name;
  document.querySelector('#v-nameB').textContent = data.botB.name;

  // Highlight winner bot
  const botAEl = document.querySelector('#vbot-a');
  const botBEl = document.querySelector('#vbot-b');
  botAEl.classList.toggle('winner', data.verdict.winnerId === data.botA.id);
  botBEl.classList.toggle('winner', data.verdict.winnerId === data.botB.id);

  // Winner text
  document.querySelector('#verdict-winner').textContent = data.verdict.winner;
  document.querySelector('#verdict-confidence').textContent = data.verdict.confidence;

  // Sentiment bars
  renderMiniBars('#v-barsA', data.botA.sentiment);
  renderMiniBars('#v-barsB', data.botB.sentiment);

  // Narrative
  document.querySelector('#verdict-narrative').innerHTML = esc(data.narrative).replace(/\n/g, '<br>');

  // Curated evidence
  const cel = document.querySelector('#curated-evidence');
  if (data.curatedEvidence?.length) {
    cel.innerHTML = data.curatedEvidence.map((e) => `
      <div class="curated-item">
        <p class="cq">${esc(e.quote)}</p>
        <p class="cwhy">${esc(e.why)}</p>
        <p class="csrc"><a href="${sanitizeUrl(e.source_url)}" target="_blank" rel="noreferrer">${esc(e.source_title)}</a> · ${esc(e.bot)}</p>
      </div>`).join('');
  } else {
    cel.innerHTML = '';
  }

  // LLM note
  document.querySelector('#llm-note').textContent = data.llm?.used
    ? `Analysis by ${data.llm.model} · based on ${data.botA.totalRelevant + data.botB.totalRelevant} Reddit mentions`
    : data.llm?.error ? `AI unavailable: ${data.llm.error}` : '';
}

function renderMiniBars(sel, s) {
  const t = Math.max(1, s.positive + s.negative);
  document.querySelector(sel).innerHTML = `
    <div class="mini-bar"><div class="mini-fill pos" style="width:${(s.positive/t)*60}px"></div><span>${s.positive} pos</span></div>
    <div class="mini-bar"><div class="mini-fill neg" style="width:${(s.negative/t)*60}px"></div><span>${s.negative} neg</span></div>`;
}

// ── All evidence (collapsible) ──
function renderAllEvidence(evidence) {
  if (!evidence?.length) { allEvidenceEl.hidden = true; return; }
  allEvidenceEl.hidden = false;
  document.querySelector('#evidence-count').textContent = evidence.length;
  document.querySelector('#evidence-list').innerHTML = evidence.map((e) => {
    const cls = e.sentiment > 0 ? 'pos' : e.sentiment < 0 ? 'neg' : 'neu';
    const label = e.sentiment > 0 ? '+' + e.sentiment : e.sentiment < 0 ? String(e.sentiment) : '0';
    return `<div class="ev-row">
      <span class="ev-badge ${cls}">${label}</span>
      <div><a href="${sanitizeUrl(e.url)}" target="_blank" rel="noreferrer">${esc(e.title)}</a><br><span class="ev-desc">${esc(cleanDesc(e.description?.slice(0,150)))}</span></div>
    </div>`;
  }).join('');
}

// ── Trace ──
function renderTrace(trace) {
  if (!trace?.length) return;
  traceDetails.hidden = false;
  document.querySelector('#trace-body').innerHTML = trace.map((t) =>
    `<tr><td>${esc(t.query)}</td><td class="${t.ok?'ok':'fail'}">${t.ok?t.statusCode:'FAIL'}</td><td>${t.resultCount}</td><td>${t.durationMs?t.durationMs+'ms':'—'}</td></tr>`
  ).join('');
}

// ── Helpers ──
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Strip SERP "Read more" / "...Read mor" artifacts from descriptions */
function cleanDesc(s) {
  return String(s || '')
    .replace(/\.?Read more$/i, '')
    .replace(/\.?Read mor$/i, '')
    .replace(/\.?Read mo$/i, '')
    .replace(/\.?Read m$/i, '')
    .replace(/\.?Re$/, '')
    .replace(/\.?Rea$/, '')
    .trim();
}

function sanitizeUrl(url) {
  const s = esc(url || '');
  return s.startsWith('http') ? s : '#';
}

/** Fallback for bots without images — inline data URI since server doesn't serve SVG mime type */
const PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="12" fill="%231a1a1a"/><circle cx="60" cy="45" r="18" stroke="%23555" stroke-width="2.5" fill="none"/><rect x="38" y="68" width="44" height="28" rx="6" stroke="%23555" stroke-width="2.5" fill="none"/><circle cx="50" cy="40" r="3" fill="%23555"/><circle cx="70" cy="40" r="3" fill="%23555"/><line x1="52" y1="52" x2="68" y2="52" stroke="%23555" stroke-width="2" stroke-linecap="round"/><text x="60" y="110" text-anchor="middle" fill="%23444" font-family="sans-serif" font-size="9" font-weight="700">NO IMAGE</text></svg>')}`;

function botImg(bot) {
  return bot.image || PLACEHOLDER_IMG;
}

// ── Share button ──
document.querySelector('#share-btn').addEventListener('click', async () => {
  const a = botASelect.value, b = botBSelect.value;
  const url = `${location.origin}${location.pathname}?a=${a}&b=${b}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied!');
  } catch {
    showToast('Could not copy link');
  }
});

function showToast(msg) {
  const el = document.querySelector('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}
