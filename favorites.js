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
  itemsGrid.innerHTML = filteredItems
    .map(item => createCardHTML(item, { favTitle: 'Убрать из избранного' }))
    .join('');

  favSubtitle.textContent = `${filteredItems.length} ${pluralize(filteredItems.length, 'объявление', 'объявления', 'объявлений')}`;

  attachItemCardEvents(itemsGrid, {
    onFavoriteToggle: async () => {
      await loadFavorites();
    }
  });
}

function showLoading(show) {
  loadingEl.style.display = show ? 'flex' : 'none';
  if (show) {
    itemsGrid.style.display = 'none';
    emptyState.style.display = 'none';
  }
}
