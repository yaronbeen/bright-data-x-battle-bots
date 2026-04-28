let allBots = [];
const grid = document.querySelector('#grid');
const search = document.querySelector('#search');
const weaponFilter = document.querySelector('#weapon-filter');
const statusFilter = document.querySelector('#status-filter');
const sort = document.querySelector('#sort');
const resultCount = document.querySelector('#result-count');
const modal = document.querySelector('#modal');

// Load bot data
fetch('/api/bots').then(r => r.json()).then(bots => {
  allBots = bots;
  render();
});

// Filters
search.addEventListener('input', render);
weaponFilter.addEventListener('change', render);
statusFilter.addEventListener('change', render);
sort.addEventListener('change', render);

function render() {
  const q = search.value.toLowerCase();
  const wf = weaponFilter.value;
  const sf = statusFilter.value;
  const sortBy = sort.value;

  let filtered = allBots.filter(b => {
    if (q && !`${b.name} ${b.team} ${b.weapon}`.toLowerCase().includes(q)) return false;
    if (wf && b.weaponType !== wf) return false;
    if (sf && b.status !== sf) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'wins') return b.wins - a.wins;
    if (sortBy === 'ko') return b.ko - a.ko;
    if (sortBy === 'winrate') return (b.wins / (b.wins + b.losses)) - (a.wins / (a.wins + a.losses));
    return a.name.localeCompare(b.name);
  });

  resultCount.textContent = `${filtered.length} bot${filtered.length !== 1 ? 's' : ''} found`;

  grid.innerHTML = filtered.map(b => `
    <div class="bot-card" data-name="${esc(b.name)}">
      ${b.image
        ? `<img class="bot-card-img" src="${esc(b.image)}" alt="${esc(b.name)}" loading="lazy" />`
        : `<div class="bot-card-placeholder">${esc(b.name[0])}</div>`
      }
      <h3>${esc(b.name)}</h3>
      <p class="card-meta">${esc(b.weapon)} · ${esc(b.team)}</p>
      <div class="card-stats">
        <span class="stat-w">${b.wins}W</span>
        <span class="stat-l">${b.losses}L</span>
        <span class="stat-ko">${b.ko} KO</span>
      </div>
      <span class="card-status ${b.status}">${b.status}</span>
    </div>
  `).join('');
}

// Card click → modal
grid.addEventListener('click', e => {
  const card = e.target.closest('.bot-card');
  if (!card) return;
  const bot = allBots.find(b => b.name === card.dataset.name);
  if (!bot) return;
  openModal(bot);
});

function openModal(b) {
  document.querySelector('#modal-img').src = b.image || '';
  document.querySelector('#modal-img').alt = b.name;
  document.querySelector('#modal-name').textContent = b.name;
  document.querySelector('#modal-team').textContent = `${b.team} · ${b.country}`;
  document.querySelector('#modal-weapon').textContent = b.weapon;

  const wr = ((b.wins / (b.wins + b.losses)) * 100).toFixed(0);
  document.querySelector('#modal-stats').innerHTML = `
    <div class="modal-stat"><span class="stat-val" style="color:#16a34a">${b.wins}</span><span class="stat-label">Wins</span></div>
    <div class="modal-stat"><span class="stat-val" style="color:#dc2626">${b.losses}</span><span class="stat-label">Losses</span></div>
    <div class="modal-stat"><span class="stat-val" style="color:var(--accent)">${b.ko}</span><span class="stat-label">KOs</span></div>
    <div class="modal-stat"><span class="stat-val">${wr}%</span><span class="stat-label">Win Rate</span></div>
  `;

  document.querySelector('#modal-notable').textContent = b.notable;
  document.querySelector('#modal-seasons').textContent = `Seasons: ${b.seasons.join(', ')}`;

  modal.hidden = false;
}

// Close modal
document.querySelector('#modal-close').addEventListener('click', () => modal.hidden = true);
document.querySelector('#modal-backdrop').addEventListener('click', () => modal.hidden = true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.hidden = true; });

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
