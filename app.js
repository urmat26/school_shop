"use strict";
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
const priceRangeFill = document.getElementById('price-range-fill');
const priceMinLabel = document.getElementById('price-min-label');
const priceMaxLabel = document.getElementById('price-max-label');
const PRICE_MAX = 200000;
function fmtPrice(v) {
    return new Intl.NumberFormat('ru-RU').format(v) + ' ' + Lang.t('item.currency');
}
// ───────────────────── Init ─────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    Auth.init();
    buildCategoryFilters();
    attachEvents();
    updateRangeSlider();
    updateFavCount();
    await loadItems();
    Lang.onChange(() => {
        updateRangeSlider();
        updateResultsCount();
    });
});
// ───────────────────── Build Category Filters ─────────────────────
function buildCategoryFilters() {
    CONFIG.CATEGORIES.forEach(cat => {
        const pill = document.createElement('button');
        pill.className = 'filter-pill';
        pill.dataset.category = cat.id;
        pill.innerHTML = `<span class="filter-pill-icon">${cat.icon}</span> <span data-i18n="cat.${cat.id}">${Lang.t('cat.' + cat.id)}</span>`;
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
        if (!pill)
            return;
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
        const min = parseInt(priceMinInput.value) || 0;
        const max = parseInt(priceMaxInput.value) || PRICE_MAX;
        if (min > max) {
            priceMinInput.value = max;
        }
        priceMin = priceMinInput.value;
        currentPage = 1;
        updateRangeSlider();
        applyFilters();
    });
    priceMaxInput.addEventListener('input', () => {
        const min = parseInt(priceMinInput.value) || 0;
        const max = parseInt(priceMaxInput.value) || PRICE_MAX;
        if (max < min) {
            priceMaxInput.value = min;
        }
        priceMax = priceMaxInput.value;
        currentPage = 1;
        updateRangeSlider();
        applyFilters();
    });
    // Clear all filters
    clearFiltersBtn.addEventListener('click', clearAllFilters);
    // Scroll to top
    const scrollBtn = document.getElementById('scroll-top');
    if (scrollBtn) {
        window.addEventListener('scroll', () => {
            scrollBtn.classList.toggle('visible', window.scrollY > 400);
            onScroll();
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
    if (allPill)
        allPill.classList.add('active');
    currentSort = 'date-desc';
    sortSelect.value = 'date-desc';
    myAdsOnly = false;
    myAdsBtn.classList.remove('active');
    priceMin = '';
    priceMinInput.value = 0;
    priceMax = '';
    priceMaxInput.value = PRICE_MAX;
    updateRangeSlider();
    currentPage = 1;
    applyFilters();
}
function updateRangeSlider() {
    const min = parseInt(priceMinInput.value) || 0;
    const max = parseInt(priceMaxInput.value) || PRICE_MAX;
    const pctMin = (min / PRICE_MAX) * 100;
    const pctMax = (max / PRICE_MAX) * 100;
    priceRangeFill.style.left = pctMin + '%';
    priceRangeFill.style.right = (100 - pctMax) + '%';
    priceMinLabel.textContent = fmtPrice(min);
    priceMaxLabel.textContent = max >= PRICE_MAX ? fmtPrice(PRICE_MAX) + '+' : fmtPrice(max);
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
    updateResultsCount();
    // Paginate
    const totalPages = Math.ceil(filteredItems.length / CONFIG.ITEMS_PER_PAGE);
    if (currentPage > totalPages)
        currentPage = Math.max(1, totalPages);
    const startIdx = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const pageItems = filteredItems.slice(startIdx, startIdx + CONFIG.ITEMS_PER_PAGE);
    renderItems(pageItems, currentPage === 1);
    updateInfiniteScroll(totalPages);
}
function updateResultsCount() {
    const total = filteredItems.length;
    if (total === 0) {
        resultsCount.innerHTML = '';
    }
    else {
        resultsCount.innerHTML = `${Lang.t('items.found')}: <strong>${total}</strong> ${pluralize(total, Lang.t('items.one'), Lang.t('items.few'), Lang.t('items.many'))}`;
    }
}
// ───────────────────── Render Items ─────────────────────
function renderItems(items, replace = true) {
    if (items.length === 0 && replace) {
        itemsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        const emptyTitle = emptyState.querySelector('.empty-state-title');
        const emptyText = emptyState.querySelector('.empty-state-text');
        if (searchQuery) {
            if (emptyTitle)
                emptyTitle.textContent = Lang.t('empty.notfound');
            if (emptyText)
                emptyText.textContent = `По запросу «${escapeHtml(searchQuery)}» нет объявлений`;
        }
        else {
            if (emptyTitle)
                emptyTitle.textContent = Lang.t('empty.noitems');
            if (emptyText)
                emptyText.textContent = Lang.t('empty.noitems.text');
        }
        return;
    }
    emptyState.style.display = 'none';
    itemsGrid.style.display = 'grid';
    if (replace) {
        itemsGrid.innerHTML = items.map(item => createCardHTML(item)).join('');
    }
    else {
        itemsGrid.insertAdjacentHTML('beforeend', items.map(item => createCardHTML(item)).join(''));
    }
    attachItemCardEvents(itemsGrid);
}
// ───────────────────── Infinite Scroll ─────────────────────
function updateInfiniteScroll(totalPages) {
    const hasMore = currentPage < totalPages;
    if (hasMore) {
        paginationEl.innerHTML = '<div class="infinite-scroll-loader"><div class="spinner"></div></div>';
        paginationEl.style.display = '';
    }
    else {
        if (filteredItems.length > CONFIG.ITEMS_PER_PAGE) {
            paginationEl.innerHTML = '<p class="infinite-scroll-end" data-i18n="items.all">Показаны все объявления</p>';
            paginationEl.style.display = '';
        }
        else {
            paginationEl.style.display = 'none';
        }
    }
}
let scrollThrottle = null;
function onScroll() {
    if (scrollThrottle)
        return;
    scrollThrottle = setTimeout(() => { scrollThrottle = null; }, 200);
    const hasMore = currentPage < Math.ceil(filteredItems.length / CONFIG.ITEMS_PER_PAGE);
    if (!hasMore)
        return;
    const threshold = 300;
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - threshold;
    if (nearBottom) {
        currentPage++;
        const startIdx = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
        const pageItems = filteredItems.slice(startIdx, startIdx + CONFIG.ITEMS_PER_PAGE);
        if (pageItems.length > 0) {
            renderItems(pageItems, false);
        }
        updateInfiniteScroll(Math.ceil(filteredItems.length / CONFIG.ITEMS_PER_PAGE));
    }
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
        }
        else {
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
    if (current > 3)
        range.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
        range.push(i);
    }
    if (current < total - 2)
        range.push('...');
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
