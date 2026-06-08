let allItems = [];
let filteredItems = [];

const loadingEl = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const itemsGrid = document.getElementById('items-grid');
const favSubtitle = document.getElementById('fav-subtitle');

document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  updateFavCount();

  const scrollBtn = document.getElementById('scroll-top');
  if (scrollBtn) {
    window.addEventListener('scroll', () => {
      scrollBtn.classList.toggle('visible', window.scrollY > 400);
    });
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  await loadFavorites();
});

async function loadFavorites() {
  showLoading(true);
  const data = await fetchAll();
  allItems = (data.items || []).filter(i => i.status === 'active');
  showLoading(false);

  const favIds = Favorites.getAll();
  filteredItems = allItems.filter(i => favIds.includes(i.id));

  if (filteredItems.length === 0) {
    itemsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    favSubtitle.textContent = 'Нет сохранённых объявлений';
    return;
  }

  emptyState.style.display = 'none';
  itemsGrid.style.display = 'grid';
  itemsGrid.innerHTML = filteredItems.map(item => createCardHTML(item)).join('');

  favSubtitle.textContent = `${filteredItems.length} ${pluralize(filteredItems.length, 'объявление', 'объявления', 'объявлений')}`;

  itemsGrid.querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.item-card-favorite')) return;
      window.location.href = `item.html?id=${card.dataset.id}`;
    });
  });

  itemsGrid.querySelectorAll('.item-card-favorite').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      Favorites.toggle(id);
      btn.classList.toggle('active');
      btn.innerHTML = btn.classList.contains('active') ? '♥' : '♡';
      updateFavCount();
      await loadFavorites();
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
        <button class="item-card-favorite ${isFav ? 'active' : ''}" data-id="${item.id}" title="Убрать из избранного">
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

function showLoading(show) {
  loadingEl.style.display = show ? 'flex' : 'none';
  if (show) {
    itemsGrid.style.display = 'none';
    emptyState.style.display = 'none';
  }
}

function updateFavCount() {
  const badges = document.querySelectorAll('.fav-count-badge');
  const count = Favorites.count();
  badges.forEach(b => { b.textContent = count; b.style.display = count > 0 ? 'inline' : 'none'; });
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
