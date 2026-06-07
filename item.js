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

  const id = getUrlParam('id');
  if (!id) {
    showError();
    return;
  }

  await loadItem(id);
});

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
  itemViews.textContent = (item.views || 0) + 1; // +1 for current view

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
