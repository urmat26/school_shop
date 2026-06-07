/* =========================================================
   app.js — Логика главной страницы (список, поиск, фильтры)
   ========================================================= */

// ───────────────────── State ─────────────────────
let allItems = [];
let filteredItems = [];
let currentPage = 1;
let selectedCategory = 'all';
let currentSort = 'date-desc';
let searchQuery = '';
let searchTimer = null;

// ───────────────────── DOM Elements ─────────────────────
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const categoryFilters = document.getElementById('category-filters');
const sortSelect = document.getElementById('sort-select');
const itemsGrid = document.getElementById('items-grid');
const loadingEl = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const resultsCount = document.getElementById('results-count');
const paginationEl = document.getElementById('pagination');

// ───────────────────── Init ─────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  buildCategoryFilters();
  attachEvents();
  await loadItems();
});

// ───────────────────── Build Category Filters ─────────────────────
function buildCategoryFilters() {
  CONFIG.CATEGORIES.forEach(cat => {
    const pill = document.createElement('button');
    pill.className = 'filter-pill';
    pill.dataset.category = cat.id;
    pill.innerHTML = `<span class="filter-pill-icon">${cat.icon}</span> ${cat.label}`;
    categoryFilters.appendChild(pill);
  });
}

// ───────────────────── Events ─────────────────────
function attachEvents() {
  // Search with debounce
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    searchClear.classList.toggle('visible', searchQuery.length > 0);

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentPage = 1;
      applyFilters();
    }, 300);
  });

  // Clear search
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.classList.remove('visible');
    currentPage = 1;
    applyFilters();
    searchInput.focus();
  });

  // Category filter pills
  categoryFilters.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;

    categoryFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedCategory = pill.dataset.category;
    currentPage = 1;
    applyFilters();
  });

  // Sort
  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    currentPage = 1;
    applyFilters();
  });
}

// ───────────────────── Load Items ─────────────────────
async function loadItems() {
  showLoading(true);
  const data = await fetchAll();
  allItems = (data.items || []).filter(i => i.status === 'active');
  showLoading(false);
  applyFilters();
}

// ───────────────────── Filter + Sort + Paginate ─────────────────────
function applyFilters() {
  // Filter
  filteredItems = allItems.filter(item => {
    const matchSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchSearch && matchCategory;
  });

  // Sort
  filteredItems.sort((a, b) => {
    switch (currentSort) {
      case 'date-desc':
        return new Date(b.created) - new Date(a.created);
      case 'date-asc':
        return new Date(a.created) - new Date(b.created);
      case 'price-asc':
        return (a.price || 0) - (b.price || 0);
      case 'price-desc':
        return (b.price || 0) - (a.price || 0);
      default:
        return 0;
    }
  });

  // Update results count
  const total = filteredItems.length;
  if (total === 0) {
    resultsCount.innerHTML = '';
  } else {
    resultsCount.innerHTML = `Найдено: <strong>${total}</strong> ${pluralize(total, 'объявление', 'объявления', 'объявлений')}`;
  }

  // Paginate
  const totalPages = Math.ceil(filteredItems.length / CONFIG.ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

  const startIdx = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
  const pageItems = filteredItems.slice(startIdx, startIdx + CONFIG.ITEMS_PER_PAGE);

  renderItems(pageItems);
  renderPagination(totalPages);
}

// ───────────────────── Render Items ─────────────────────
function renderItems(items) {
  if (items.length === 0) {
    itemsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  itemsGrid.style.display = 'grid';
  itemsGrid.innerHTML = items.map(item => createCardHTML(item)).join('');

  // Attach card events
  itemsGrid.querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't navigate if clicking favorite button
      if (e.target.closest('.item-card-favorite')) return;
      window.location.href = `item.html?id=${card.dataset.id}`;
    });
  });

  // Attach favorite events
  itemsGrid.querySelectorAll('.item-card-favorite').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const isFav = Favorites.toggle(id);
      btn.classList.toggle('active', isFav);
      btn.innerHTML = isFav ? '♥' : '♡';

      if (isFav) {
        btn.classList.add('heart-bounce');
        setTimeout(() => btn.classList.remove('heart-bounce'), 400);
        showToast('Добавлено в избранное', 'success');
      } else {
        showToast('Удалено из избранного', 'info');
      }
    });
  });
}

function createCardHTML(item) {
  const isFav = Favorites.isFavorite(item.id);
  const imageUrl = item.image || getPlaceholderSVG(item.category);
  const priceClass = (!item.price || item.price === 0) ? 'free' : '';
  const priceText = formatPrice(item.price);

  return `
    <article class="item-card" data-id="${item.id}">
      <div class="item-card-image">
        <img src="${imageUrl}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div class="item-card-badge">
          <span class="category-badge" data-category="${item.category}">
            ${getCategoryIcon(item.category)} ${item.category}
          </span>
        </div>
        <button class="item-card-favorite ${isFav ? 'active' : ''}" data-id="${item.id}" title="В избранное">
          ${isFav ? '♥' : '♡'}
        </button>
      </div>
      <div class="item-card-body">
        <h3 class="item-card-title">${escapeHtml(item.title)}</h3>
        <p class="item-card-description">${escapeHtml(truncate(item.description, 80))}</p>
        <div class="item-card-footer">
          <span class="item-card-price ${priceClass}">${priceText}</span>
          <div class="item-card-meta">
            <span class="item-card-meta-item">👁 ${item.views || 0}</span>
            <span class="item-card-meta-item">${formatDate(item.created)}</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ───────────────────── Render Pagination ─────────────────────
function renderPagination(totalPages) {
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let html = '';

  // Prev button
  html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>`;

  // Page numbers
  const range = getPaginationRange(currentPage, totalPages);
  for (const page of range) {
    if (page === '...') {
      html += `<span class="page-dots">…</span>`;
    } else {
      html += `<button class="page-btn ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`;
    }
  }

  // Next button
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;

  paginationEl.innerHTML = html;

  // Events
  paginationEl.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      applyFilters();
      window.scrollTo({ top: 300, behavior: 'smooth' });
    });
  });
}

function getPaginationRange(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const range = [];
  range.push(1);

  if (current > 3) range.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    range.push(i);
  }

  if (current < total - 2) range.push('...');

  range.push(total);
  return range;
}

// ───────────────────── Helpers ─────────────────────
function showLoading(show) {
  loadingEl.style.display = show ? 'flex' : 'none';
  if (show) {
    itemsGrid.style.display = 'none';
    emptyState.style.display = 'none';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
