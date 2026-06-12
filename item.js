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
const soldToggleBtn = document.getElementById('sold-toggle-btn');
const soldDetailBadge = document.getElementById('sold-detail-badge');
const itemActions = document.getElementById('item-actions');
const deleteModal = document.getElementById('delete-modal');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');
const deleteItemName = document.getElementById('delete-item-name');
const restoreBtn = document.getElementById('restore-btn');
const itemRestore = document.getElementById('item-restore');
const recentlySkeleton = document.getElementById('recently-skeleton');
const similarSkeleton = document.getElementById('similar-skeleton');

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
  if (recentlySkeleton) recentlySkeleton.style.display = 'none';
  const key = 'marketplace_recently';
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(key) || '[]'); } catch { return; }
  const filtered = recent.filter(i => i.id !== currentItem.id);
  if (filtered.length === 0) return;
  const container = document.getElementById('recently-viewed');
  const grid = document.getElementById('recently-viewed-grid');
  if (!container || !grid) return;
  container.style.display = 'block';
  grid.innerHTML = filtered.slice(0, 5).map(i => createMiniCardHTML(i)).join('');
  attachMiniCardEvents(grid);
}

async function renderSimilarItems() {
  if (similarSkeleton) similarSkeleton.style.display = 'none';
  const container = document.getElementById('similar-items');
  const grid = document.getElementById('similar-items-grid');
  if (!container || !grid || !currentItem) return;
  const data = await fetchAll();
  const similar = (data.items || [])
    .filter(i => i.id !== currentItem.id && i.category === currentItem.category && i.status === 'active')
    .slice(0, 4);
  if (similar.length === 0) return;
  container.style.display = 'block';
  grid.innerHTML = similar.map(i => createMiniCardHTML(i)).join('');
  attachMiniCardEvents(grid);
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
  itemCategory.innerHTML = `${getCategoryIcon(item.category)} <span data-i18n="cat.${escapeHtml(item.category)}">${Lang.t('cat.' + item.category)}</span>`;

  // Description
  itemDescription.textContent = item.description || Lang.t('item.no.description');

  // Author
  itemAuthor.textContent = item.author;
  authorAvatar.textContent = item.author ? item.author.charAt(0).toUpperCase() : '?';

  // Contact
  itemContact.textContent = item.contact || Lang.t('item.no.contact');

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

  // Sold badge on detail image
  if (item.status === 'sold') {
    soldDetailBadge.style.display = 'flex';
  }

  // Actions (only for owner)
  if (Auth.canEdit(item)) {
    itemActions.style.display = 'flex';
    editBtn.href = `create.html?id=${item.id}`;
    deleteBtn.addEventListener('click', () => showDeleteModal());
    updateSoldToggleBtn(item.status);
    soldToggleBtn.addEventListener('click', handleSoldToggle);
  }

  // Recently viewed & similar items (show skeleton while loading)
  if (recentlySkeleton) recentlySkeleton.style.display = 'grid';
  if (similarSkeleton) similarSkeleton.style.display = 'grid';
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
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(`${item.title} — School Shop`);
  document.getElementById('share-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href);
    showToast(Lang.t('toast.copied'), 'success');
  });
  document.getElementById('share-tg')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener');
  });
  document.getElementById('share-wa')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(`https://wa.me/?text=${url}%20${text}`, '_blank', 'noopener');
  });

  // Restore
  if (item.status === 'deleted' && Auth.canEdit(item)) {
    itemRestore.style.display = 'flex';
    restoreBtn.addEventListener('click', handleRestore);
  }

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
    showToast(Lang.t('item.fav.add') + ' ❤️', 'success');
  } else {
    showToast(Lang.t('item.fav.remove'), 'info');
  }

  updateFavCount();
  Favorites.syncToServer();
}

// ───────────────────── Delete Modal ─────────────────────
function showDeleteModal() {
  if (currentItem) {
    deleteItemName.textContent = `«${currentItem.title}»`;
  }
  deleteModal.classList.add('active');
  document.addEventListener('keydown', onDeleteEscape);
}

function hideDeleteModal() {
  deleteModal.classList.remove('active');
  document.removeEventListener('keydown', onDeleteEscape);
}

function onDeleteEscape(e) {
  if (e.key === 'Escape') hideDeleteModal();
}

// ───────────────────── Delete Item (soft) ─────────────────────
async function handleDelete() {
  if (!currentItem) return;

  deleteConfirm.disabled = true;
  deleteConfirm.classList.add('loading');

  try {
    await deleteItem(currentItem.id);
    hideDeleteModal();
    showToast(Lang.t('toast.deleted'), 'success');
    currentItem.status = 'deleted';
    itemActions.style.display = 'none';
    itemRestore.style.display = 'flex';
    soldDetailBadge.style.display = 'none';
    restoreBtn.addEventListener('click', handleRestore);
  } catch (error) {
    console.error('Delete error:', error);
    showToast(error.message || Lang.t('toast.delete.error'), 'error');
    deleteConfirm.disabled = false;
    deleteConfirm.classList.remove('loading');
    deleteConfirm.textContent = Lang.t('item.delete');
  }
}

// ───────────────────── Restore Item ─────────────────────
async function handleRestore() {
  if (!currentItem) return;
  restoreBtn.disabled = true;
  restoreBtn.classList.add('loading');
  try {
    await restoreItem(currentItem.id);
    showToast(Lang.t('toast.restored'), 'success');
    currentItem.status = 'active';
    itemRestore.style.display = 'none';
    itemActions.style.display = 'flex';
    updateSoldToggleBtn('active');
    soldDetailBadge.style.display = 'none';
  } catch (error) {
    showToast(error.message || Lang.t('toast.restore.error'), 'error');
  }
  restoreBtn.disabled = false;
  restoreBtn.classList.remove('loading');
}
  restoreBtn.disabled = false;
  restoreBtn.classList.remove('loading');
}

// ───────────────────── Sold Toggle ─────────────────────
function updateSoldToggleBtn(status) {
  if (status === 'sold') {
    soldToggleBtn.textContent = Lang.t('item.sold.untoggle');
    soldToggleBtn.className = 'btn btn-secondary';
  } else {
    soldToggleBtn.textContent = Lang.t('item.sold.toggle');
    soldToggleBtn.className = 'btn btn-success';
  }
}

async function handleSoldToggle() {
  if (!currentItem) return;
  soldToggleBtn.disabled = true;
  const prevText = soldToggleBtn.textContent;
  soldToggleBtn.textContent = '⏳ Сохранение...';
  try {
    const newStatus = await toggleItemSold(currentItem.id);
    currentItem.status = newStatus;
    updateSoldToggleBtn(newStatus);
    soldDetailBadge.style.display = newStatus === 'sold' ? 'flex' : 'none';
    showToast(newStatus === 'sold' ? Lang.t('toast.sold') : Lang.t('toast.active'), 'success');
  } catch (error) {
    showToast(error.message || Lang.t('toast.status.error'), 'error');
    soldToggleBtn.textContent = prevText;
  }
  soldToggleBtn.disabled = false;
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
