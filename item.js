/* =========================================================
   item.js — Логика страницы одного объявления
   ========================================================= */

// ───────────────────── DOM Elements ─────────────────────
const loadingEl = document.getElementById('loading');
const errorState = document.getElementById('error-state');
const itemContainer = document.getElementById('item-container');
const itemTitle = document.getElementById('item-title');
const itemImage = document.getElementById('item-image');
const itemDescription = document.getElementById('item-description');
const itemPrice = document.getElementById('item-price');
const itemCategory = document.getElementById('item-category');
const itemAuthor = document.getElementById('item-author');
const itemContact = document.getElementById('item-contact');
const itemDate = document.getElementById('item-date');
const itemViews = document.getElementById('item-views');
const authorAvatar = document.getElementById('author-avatar');
const breadcrumbTitle = document.getElementById('breadcrumb-title');
const favoriteBtn = document.getElementById('favorite-btn');
const editBtn = document.getElementById('edit-btn');
const deleteBtn = document.getElementById('delete-btn');
const itemActions = document.getElementById('item-actions');
const deleteModal = document.getElementById('delete-modal');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');

let currentItem = null;

// ───────────────────── Init ─────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  updateFavCount();

  const id = getUrlParam('id');
  if (!id) {
    showError();
    return;
  }

  await loadItem(id);
});

function updateFavCount() {
  const badges = document.querySelectorAll('.fav-count-badge');
  const count = Favorites.count();
  badges.forEach(b => { b.textContent = count; b.style.display = count > 0 ? 'inline' : 'none'; });
}

function trackRecentlyViewed(item) {
  const key = 'marketplace_recently';
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(key) || '[]'); } catch { recent = []; }
  recent = recent.filter(i => i.id !== item.id);
  recent.unshift({ id: item.id, title: item.title, price: item.price, category: item.category, image: item.image });
  if (recent.length > 10) recent = recent.slice(0, 10);
  localStorage.setItem(key, JSON.stringify(recent));
}

function renderRecentlyViewed() {
  const key = 'marketplace_recently';
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(key) || '[]'); } catch { return; }
  const filtered = recent.filter(i => i.id !== currentItem.id);
  if (filtered.length === 0) return;
  const container = document.getElementById('recently-viewed');
  const grid = document.getElementById('recently-viewed-grid');
  if (!container || !grid) return;
  container.style.display = 'block';
  grid.innerHTML = filtered.slice(0, 5).map(i => `
    <div class="recently-viewed-card" onclick="window.location.href='item.html?id=${i.id}'">
      <img src="${i.image || getPlaceholderSVG(i.category)}" alt="${i.title}" loading="lazy">
      <div class="recently-viewed-card-body">
        <div class="recently-viewed-card-title">${i.title}</div>
        <div class="recently-viewed-card-price">${formatPrice(i.price)}</div>
      </div>
    </div>
  `).join('');
}

async function renderSimilarItems() {
  const container = document.getElementById('similar-items');
  const grid = document.getElementById('similar-items-grid');
  if (!container || !grid || !currentItem) return;
  const data = await fetchAll();
  const similar = (data.items || [])
    .filter(i => i.id !== currentItem.id && i.category === currentItem.category && i.status === 'active')
    .slice(0, 4);
  if (similar.length === 0) return;
  container.style.display = 'block';
  grid.innerHTML = similar.map(i => `
    <div class="recently-viewed-card" onclick="window.location.href='item.html?id=${i.id}'">
      <img src="${i.image || getPlaceholderSVG(i.category)}" alt="${i.title}" loading="lazy">
      <div class="recently-viewed-card-body">
        <div class="recently-viewed-card-title">${i.title}</div>
        <div class="recently-viewed-card-price">${formatPrice(i.price)}</div>
      </div>
    </div>
  `).join('');
}

// ───────────────────── Load Item ─────────────────────
async function loadItem(id) {
  showLoading(true);

  try {
    currentItem = await getItemById(id);

    if (!currentItem) {
      showError();
      return;
    }

    renderItem(currentItem);
    showLoading(false);
    itemContainer.style.display = 'grid';

    // Increment views in background
    incrementViews(id);

  } catch (error) {
    console.error('Load error:', error);
    showError();
  }
}

// ───────────────────── Render Item ─────────────────────
function renderItem(item) {
  // Title
  itemTitle.textContent = item.title;
  document.title = `${item.title} — Маркетплейс`;
  breadcrumbTitle.textContent = item.title;

  // Image
  const imageUrl = item.image || getPlaceholderSVG(item.category);
  itemImage.src = imageUrl;
  itemImage.alt = item.title;
  itemImage.onerror = function () {
    this.onerror = null;
    this.src = getPlaceholderSVG(item.category);
  };

  // Price
  const price = formatPrice(item.price);
  itemPrice.textContent = price;
  if (!item.price || item.price === 0) {
    itemPrice.classList.add('free');
  }

  // Category
  itemCategory.dataset.category = item.category;
  itemCategory.innerHTML = `${getCategoryIcon(item.category)} ${item.category}`;

  // Description
  itemDescription.textContent = item.description || 'Без описания';

  // Author
  itemAuthor.textContent = item.author;
  authorAvatar.textContent = item.author ? item.author.charAt(0).toUpperCase() : '?';

  // Contact
  itemContact.textContent = item.contact || 'Не указан';

  // Date & Views
  itemDate.textContent = formatDate(item.created);
  const viewCount = (item.views || 0) + 1;
  itemViews.textContent = viewCount;
  // Animate views counter
  itemViews.classList.remove('views-animate');
  void itemViews.offsetWidth; // trigger reflow
  itemViews.classList.add('views-animate');

  // Track recently viewed
  trackRecentlyViewed(item);

  // Favorite
  const isFav = Favorites.isFavorite(item.id);
  favoriteBtn.classList.toggle('active', isFav);
  favoriteBtn.innerHTML = isFav ? '♥' : '♡';
  favoriteBtn.addEventListener('click', handleFavorite);

  // Actions (only for owner)
  if (Auth.canEdit(item)) {
    itemActions.style.display = 'flex';
    editBtn.href = `create.html?id=${item.id}`;
    deleteBtn.addEventListener('click', () => showDeleteModal());
  }

  // Recently viewed & similar items
  renderRecentlyViewed();
  renderSimilarItems();

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

  // Share
  document.getElementById('share-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Ссылка скопирована! 🔗', 'success');
  });

  // Delete modal events
  deleteCancel.addEventListener('click', hideDeleteModal);
  deleteModal.querySelector('.modal-overlay-bg').addEventListener('click', hideDeleteModal);
  deleteConfirm.addEventListener('click', handleDelete);
}

// ───────────────────── Favorite ─────────────────────
function handleFavorite() {
  if (!currentItem) return;

  const isFav = Favorites.toggle(currentItem.id);
  favoriteBtn.classList.toggle('active', isFav);
  favoriteBtn.innerHTML = isFav ? '♥' : '♡';

  if (isFav) {
    favoriteBtn.classList.add('heart-bounce');
    setTimeout(() => favoriteBtn.classList.remove('heart-bounce'), 400);
    showToast('Добавлено в избранное ❤️', 'success');
  } else {
    showToast('Удалено из избранного', 'info');
  }
}

// ───────────────────── Delete Modal ─────────────────────
function showDeleteModal() {
  deleteModal.classList.add('active');
}

function hideDeleteModal() {
  deleteModal.classList.remove('active');
}

// ───────────────────── Delete Item ─────────────────────
async function handleDelete() {
  if (!currentItem) return;

  deleteConfirm.disabled = true;
  deleteConfirm.textContent = '⏳ Удаление...';

  try {
    await deleteItem(currentItem.id);
    hideDeleteModal();
    showToast('Объявление удалено! 🗑', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  } catch (error) {
    console.error('Delete error:', error);
    showToast(error.message || 'Ошибка удаления', 'error');
    deleteConfirm.disabled = false;
    deleteConfirm.textContent = '🗑 Удалить';
  }
}

// ───────────────────── Helpers ─────────────────────
function showLoading(show) {
  loadingEl.style.display = show ? 'flex' : 'none';
}

function showError() {
  showLoading(false);
  itemContainer.style.display = 'none';
  errorState.style.display = 'block';
}
