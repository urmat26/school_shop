const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  updateFavCount();

  const data = await fetchAll();

  const HISTORY_KEY = 'marketplace_recently';
  let recentIds = [];
  try {
    recentIds = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { /* ignore */ }

  const items = recentIds
    .map(id => data.items.find(i => i.id === id))
    .filter(Boolean);

  const container = $('history-items');
  const emptyState = $('history-empty');

  if (items.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';
  const grid = document.createElement('div');
  grid.className = 'items-grid';
  grid.innerHTML = items.map(item => createCardHTML(item)).join('');
  container.appendChild(grid);
  attachItemCardEvents(grid);

  // Clear
  $('history-clear').addEventListener('click', () => {
    localStorage.removeItem(HISTORY_KEY);
    container.innerHTML = '';
    container.style.display = 'none';
    emptyState.style.display = '';
    showToast(Lang.t('history.cleared'), 'info');
  });
});
