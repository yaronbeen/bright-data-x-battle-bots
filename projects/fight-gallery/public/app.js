(function () {
  'use strict';

  // ── State ──
  let mediaItems = [];
  let activeType = 'all';
  let activeBot = 'all';
  let activeSeason = 'all';

  // ── Source icons (inline SVGs) ──
  const SOURCE_ICONS = {
    youtube: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.9 31.9 0 0 0 0 12a31.9 31.9 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.9 31.9 0 0 0 24 12a31.9 31.9 0 0 0-.5-5.8zM9.8 15.5V8.5l6.2 3.5-6.2 3.5z"/></svg>',
    reddit: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="12"/><path d="M18.7 12a1.5 1.5 0 0 0-2.5-1 7.3 7.3 0 0 0-3.8-1.2l.7-3.2 2.2.5a1.1 1.1 0 1 0 .1-.6l-2.5-.5a.3.3 0 0 0-.4.3l-.8 3.5a7.4 7.4 0 0 0-3.9 1.2 1.5 1.5 0 1 0-1.6 2.5 2.9 2.9 0 0 0 0 .5c0 2.5 2.9 4.5 6.5 4.5s6.5-2 6.5-4.5a2.9 2.9 0 0 0 0-.5 1.5 1.5 0 0 0 .5-1.5z" fill="#fff"/><circle cx="9.5" cy="13" r="1" fill="#ff4500"/><circle cx="14.5" cy="13" r="1" fill="#ff4500"/><path d="M9.8 15.5a3.6 3.6 0 0 0 4.4 0 .3.3 0 0 0-.4-.4 3 3 0 0 1-3.6 0 .3.3 0 0 0-.4.4z" fill="#ff4500"/></svg>',
    instagram: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/></svg>'
  };

  const SOURCE_LABELS = {
    youtube: 'YouTube',
    reddit: 'Reddit',
    instagram: 'Instagram'
  };

  const TYPE_LABELS = {
    video_thumbnail: 'Video',
    fight_photo: 'Photo',
    behind_scenes: 'BTS'
  };

  // ── DOM refs ──
  const gallery = document.getElementById('gallery');
  const galleryEmpty = document.getElementById('galleryEmpty');
  const heroStats = document.getElementById('heroStats');
  const filterCount = document.getElementById('filterCount');
  const typePills = document.getElementById('typePills');
  const botFilter = document.getElementById('botFilter');
  const seasonFilter = document.getElementById('seasonFilter');
  const lightbox = document.getElementById('lightbox');

  // ── Boot ──
  init();

  async function init() {
    try {
      const res = await fetch('/api/media');
      mediaItems = await res.json();
    } catch (e) {
      console.error('Failed to load media:', e);
      mediaItems = [];
    }

    renderStats();
    populateDropdowns();
    renderGallery();
    bindEvents();
  }

  // ── Stats ──
  function renderStats() {
    const sources = new Set(mediaItems.map(m => m.source));
    const bots = new Set(mediaItems.flatMap(m => m.bots));
    heroStats.innerHTML = `
      <span class="hero-stat"><strong>${mediaItems.length}</strong> media items</span>
      <span class="hero-stat"><strong>${sources.size}</strong> sources</span>
      <span class="hero-stat"><strong>${bots.size}</strong> bots</span>
    `;
  }

  // ── Dropdowns ──
  function populateDropdowns() {
    const bots = [...new Set(mediaItems.flatMap(m => m.bots))].sort();
    bots.forEach(bot => {
      const opt = document.createElement('option');
      opt.value = bot;
      opt.textContent = bot;
      botFilter.appendChild(opt);
    });

    const seasons = [...new Set(mediaItems.map(m => m.season))].sort((a, b) => a - b);
    seasons.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = `Season ${s}`;
      seasonFilter.appendChild(opt);
    });
  }

  // ── Filter ──
  function getFiltered() {
    return mediaItems.filter(item => {
      if (activeType !== 'all' && item.type !== activeType) return false;
      if (activeBot !== 'all' && !item.bots.includes(activeBot)) return false;
      if (activeSeason !== 'all' && item.season !== Number(activeSeason)) return false;
      return true;
    });
  }

  // ── Render Gallery ──
  function renderGallery() {
    const filtered = getFiltered();
    gallery.innerHTML = '';

    if (filtered.length === 0) {
      galleryEmpty.style.display = 'flex';
      filterCount.textContent = '0 results';
      return;
    }

    galleryEmpty.style.display = 'none';
    filterCount.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-id', item.id);

      const botTags = item.bots.map(b => `<span class="card-bot-tag">${b}</span>`).join('');

      card.innerHTML = `
        <div class="card-img-wrap">
          <img class="card-img" src="${item.imageUrl}" alt="${item.title}" loading="lazy">
          <span class="card-source-badge ${item.source}">
            ${SOURCE_ICONS[item.source] || ''}
            ${SOURCE_LABELS[item.source] || item.source}
          </span>
          <span class="card-type-badge">${TYPE_LABELS[item.type] || item.type}</span>
          <div class="card-overlay">
            <span class="card-overlay-title">${item.title}</span>
          </div>
        </div>
        <div class="card-body">
          <p class="card-title">${item.title}</p>
          <div class="card-meta">
            ${botTags}
            <span class="card-season">S${item.season}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openLightbox(item));
      gallery.appendChild(card);
    });
  }

  // ── Lightbox ──
  function openLightbox(item) {
    document.getElementById('lightboxImg').src = item.imageUrl;
    document.getElementById('lightboxImg').alt = item.title;
    document.getElementById('lightboxTitle').textContent = item.title;

    const botsEl = document.getElementById('lightboxBots');
    botsEl.innerHTML = item.bots.map(b => `<span class="lightbox-bot-tag">${b}</span>`).join('');

    document.getElementById('lightboxSeason').textContent = `Season ${item.season}`;
    document.getElementById('lightboxDate').textContent = formatDate(item.date);

    const badge = document.getElementById('lightboxSourceBadge');
    badge.className = `lightbox-source-badge ${item.source}`;
    badge.innerHTML = `${SOURCE_ICONS[item.source] || ''} ${SOURCE_LABELS[item.source] || item.source}`;

    const link = document.getElementById('lightboxLink');
    link.href = item.sourceUrl;

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── Events ──
  function bindEvents() {
    // Type pills
    typePills.addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      typePills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeType = pill.dataset.type;
      renderGallery();
    });

    // Bot filter
    botFilter.addEventListener('change', () => {
      activeBot = botFilter.value;
      renderGallery();
    });

    // Season filter
    seasonFilter.addEventListener('change', () => {
      activeSeason = seasonFilter.value;
      renderGallery();
    });

    // Lightbox close
    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeLightbox();
    });
  }
})();
