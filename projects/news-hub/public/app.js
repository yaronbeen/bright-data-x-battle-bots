(function () {
  'use strict';

  /* ── State ──────────────────────────────────────── */
  let articles = [];
  let activeCategory = 'All';
  let activeSource = 'All';

  /* ── Category → CSS class mapping ───────────────── */
  const categoryClass = {
    'Events': 'category-events',
    'Team News': 'category-team-news',
    'Rule Changes': 'category-rule-changes',
    'Build Logs': 'category-build-logs',
    'Recaps': 'category-recaps',
    'Tech Analysis': 'category-tech-analysis',
  };

  /* ── DOM refs ───────────────────────────────────── */
  const $feed = document.getElementById('feed');
  const $filters = document.getElementById('category-filters');
  const $sourceFilter = document.getElementById('source-filter');
  const $statArticles = document.getElementById('stat-articles');
  const $statSources = document.getElementById('stat-sources');

  /* ── Helpers ────────────────────────────────────── */
  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── Render ─────────────────────────────────────── */
  function renderStats(filtered) {
    const sources = new Set(filtered.map(a => a.source));
    $statArticles.textContent = filtered.length;
    $statSources.textContent = sources.size;
  }

  function renderSourceDropdown() {
    const sources = [...new Set(articles.map(a => a.source))].sort();
    $sourceFilter.innerHTML = '<option value="All">All sources</option>';
    sources.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      $sourceFilter.appendChild(opt);
    });
  }

  function renderFilters() {
    const categories = ['All', 'Events', 'Team News', 'Rule Changes', 'Build Logs', 'Recaps', 'Tech Analysis'];
    $filters.innerHTML = '';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-pill' + (cat === activeCategory ? ' active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        activeCategory = cat;
        renderFilters();
        renderFeed();
      });
      $filters.appendChild(btn);
    });
  }

  function renderFeed() {
    let filtered = articles;

    if (activeCategory !== 'All') {
      filtered = filtered.filter(a => a.category === activeCategory);
    }
    if (activeSource !== 'All') {
      filtered = filtered.filter(a => a.source === activeSource);
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    renderStats(filtered);

    if (filtered.length === 0) {
      $feed.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>No articles found</h3>
          <p>Try adjusting your filters to see more results.</p>
        </div>`;
      return;
    }

    $feed.innerHTML = filtered.map(a => `
      <article class="article-card">
        <span class="article-category ${categoryClass[a.category] || ''}">${escapeHtml(a.category)}</span>
        <h3 class="article-title">
          <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.title)}</a>
        </h3>
        <p class="article-summary">${escapeHtml(a.summary)}</p>
        <div class="article-meta">
          <span class="article-source">${a.sourceIcon} ${escapeHtml(a.source)}</span>
          <span class="meta-dot">·</span>
          <span>${formatDate(a.date)}</span>
          <span class="meta-dot">·</span>
          <span>${escapeHtml(a.readTime)} read</span>
        </div>
      </article>
    `).join('');
  }

  /* ── Source filter handler ──────────────────────── */
  $sourceFilter.addEventListener('change', (e) => {
    activeSource = e.target.value;
    renderFeed();
  });

  /* ── Init ───────────────────────────────────────── */
  function showLoading() {
    $feed.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Loading articles…</p>
      </div>`;
  }

  async function init() {
    showLoading();
    try {
      const res = await fetch('/articles.json');
      if (!res.ok) throw new Error('Failed to fetch articles');
      articles = await res.json();
      renderSourceDropdown();
      renderFilters();
      renderFeed();
    } catch (err) {
      $feed.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Failed to load articles</h3>
          <p>${escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  init();
})();
