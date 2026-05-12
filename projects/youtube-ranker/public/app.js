(function () {
  "use strict";

  // ── State ──
  let videos = [];
  let currentSort = "views";
  let searchQuery = "";

  // ── DOM refs ──
  const tableBody = document.getElementById("table-body");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const sortButtons = document.getElementById("sort-buttons");
  const statFights = document.getElementById("stat-fights");
  const statViews = document.getElementById("stat-views");
  const statBot = document.getElementById("stat-bot");

  // ── Formatting helpers ──
  function fmtNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return n.toLocaleString();
  }

  function fmtDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function thumbFor(v) {
    return v.thumbnail;
  }

  // ── Sorting ──
  function sortVideos(list, metric) {
    const sorted = [...list];
    if (metric === "controversial") {
      // Comments-to-likes ratio (higher = more controversial)
      sorted.sort((a, b) => b.comments / b.likes - a.comments / a.likes);
    } else {
      sorted.sort((a, b) => b[metric] - a[metric]);
    }
    return sorted;
  }

  // ── Filter ──
  function filterVideos(list, query) {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(
      (v) =>
        v.botA.toLowerCase().includes(q) ||
        v.botB.toLowerCase().includes(q) ||
        v.title.toLowerCase().includes(q)
    );
  }

  // ── Stats ──
  function renderStats(list) {
    statFights.textContent = list.length;

    const totalViews = list.reduce((sum, v) => sum + v.views, 0);
    statViews.textContent = fmtNumber(totalViews);

    // Count bot appearances
    const counts = {};
    list.forEach((v) => {
      counts[v.botA] = (counts[v.botA] || 0) + v.views;
      counts[v.botB] = (counts[v.botB] || 0) + v.views;
    });
    const topBot = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    statBot.textContent = topBot ? topBot[0] : "—";
  }

  // ── Render Table ──
  function renderTable() {
    const filtered = filterVideos(videos, searchQuery);
    const sorted = sortVideos(filtered, currentSort);

    renderStats(filtered);

    if (sorted.length === 0) {
      tableBody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    tableBody.innerHTML = sorted
      .map((v, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? "td-rank top-3" : "td-rank";

        return `<tr>
          <td class="${rankClass}">${rank}</td>
          <td>
            <div class="fight-cell">
              <img
                class="fight-thumb"
                src="${thumbFor(v)}"
                alt="${v.title}"
                loading="lazy"
              />
              <div class="fight-info">
                <div class="fight-title">
                  <a href="${v.url}" target="_blank" rel="noopener">${v.title}</a>
                </div>
                <div class="fight-meta">
                  <span class="fight-duration">${v.duration}</span>
                  <span class="fight-season">S${v.season}</span>
                </div>
              </div>
            </div>
          </td>
          <td class="td-metric views">${fmtNumber(v.views)}</td>
          <td class="td-metric likes">${fmtNumber(v.likes)}</td>
          <td class="td-metric comments">${fmtNumber(v.comments)}</td>
          <td class="td-date">${fmtDate(v.uploadDate)}</td>
        </tr>`;
      })
      .join("");
  }

  // ── Event handlers ──
  sortButtons.addEventListener("click", (e) => {
    const btn = e.target.closest(".sort-btn");
    if (!btn) return;

    sortButtons.querySelectorAll(".sort-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    currentSort = btn.dataset.sort;
    renderTable();
  });

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderTable();
  });

  // ── Init ──
  async function init() {
    try {
      const res = await fetch("/videos.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      videos = await res.json();
      renderTable();
    } catch (err) {
      console.error("Failed to load videos:", err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#6b7280;">
        Failed to load fight data. Make sure the server is running.
      </td></tr>`;
    }
  }

  init();
})();
