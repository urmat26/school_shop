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
let myAdsOnly = false;
let priceMin = '';
let priceMax = '';

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
const myAdsBtn = document.getElementById('my-ads-btn');
const priceMinInput = document.getElementById('price-min');
const priceMaxInput = document.getElementById('price-max');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const skeletonGrid = document.getElementById('skeleton-grid');

// ───────────────────── Init ─────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  buildCategoryFilters();
  attachEvents();
  updateFavCount();
  await loadItems();
});

// ───────────────────── Build Category Filters ─────────────────────
function buildCategoryFilters() {
  CONFIG.CATEGORIES.forEach(cat => {
    const pill = document.createElement('button');
    pill.className = 'filter-pill';
    pill.dataset.category = cat.id;
    pill.innerHTML = `<span class="filter-pill-icon">${cat.icon}</span> ${Lang.t('cat.' + cat.id)}`;
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

  // My ads filter
  myAdsBtn.addEventListener('click', () => {
    myAdsOnly = !myAdsOnly;
    myAdsBtn.classList.toggle('active', myAdsOnly);
    currentPage = 1;
    applyFilters();
  });

  // Price range
  priceMinInput.addEventListener('input', () => {
    priceMin = priceMinInput.value;
    currentPage = 1;
    applyFilters();
  });
  priceMaxInput.addEventListener('input', () => {
    priceMax = priceMaxInput.value;
    currentPage = 1;
    applyFilters();
  });

  // Clear all filters
  clearFiltersBtn.addEventListener('click', clearAllFilters);

  // Scroll to top
  const scrollBtn = document.getElementById('scroll-top');
  if (scrollBtn) {
    window.addEventListener('scroll', () => {
      scrollBtn.classList.toggle('visible', window.scrollY > 400);
    });
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function clearAllFilters() {
  searchInput.value = '';
  searchQuery = '';
  searchClear.classList.remove('visible');
  selectedCategory = 'all';
  categoryFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  const allPill = categoryFilters.querySelector('[data-category="all"]');
  if (allPill) allPill.classList.add('active');
  currentSort = 'date-desc';
  sortSelect.value = 'date-desc';
  myAdsOnly = false;
  myAdsBtn.classList.remove('active');
  priceMin = ''; priceMinInput.value = '';
  priceMax = ''; priceMaxInput.value = '';
  currentPage = 1;
  applyFilters();
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

    const matchMyAds = !myAdsOnly || !Auth.getUser() || item.author === Auth.getUser();

    const matchPriceMin = !priceMin || (item.price || 0) >= parseInt(priceMin);
    const matchPriceMax = !priceMax || (item.price || 0) <= parseInt(priceMax);

    return matchSearch && matchCategory && matchMyAds && matchPriceMin && matchPriceMax;
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
      case 'views-desc':
        return (b.views || 0) - (a.views || 0);
      default:
        return 0;
    }
  });

  // Update results count
  const total = filteredItems.length;
  if (total === 0) {
    resultsCount.innerHTML = '';
  } else {
    resultsCount.innerHTML = `${Lang.t('items.found')}: <strong>${total}</strong> ${pluralize(total, 'объявление', 'объявления', 'объявлений')}`;
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
    const emptyTitle = emptyState.querySelector('.empty-state-title');
    const emptyText = emptyState.querySelector('.empty-state-text');
    if (searchQuery) {
      if (emptyTitle) emptyTitle.textContent = Lang.t('empty.notfound');
      if (emptyText) emptyText.textContent = `По запросу «${escapeHtml(searchQuery)}» нет объявлений`;
    } else {
      if (emptyTitle) emptyTitle.textContent = Lang.t('empty.noitems');
      if (emptyText) emptyText.textContent = Lang.t('empty.noitems.text');
    }
    return;
  }

  emptyState.style.display = 'none';
  itemsGrid.style.display = 'grid';
  itemsGrid.innerHTML = items.map(item => createCardHTML(item)).join('');
  attachItemCardEvents(itemsGrid);
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
