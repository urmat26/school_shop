/* =========================================================
   api.js — CRUD-функции + утилиты
   ========================================================= */

// ───────────────────── Утилиты ─────────────────────

/** Генерация уникального ID */
function generateId() {
  return Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

/** Форматирование даты */
function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/** Форматирование цены */
function formatPrice(price) {
  if (!price || price === 0) return 'Бесплатно';
  return new Intl.NumberFormat('ru-RU').format(price) + ' Сом';
}

/** Иконка категории */
function getCategoryIcon(category) {
  const cat = CONFIG.CATEGORIES.find(c => c.id === category);
  return cat ? cat.icon : '📦';
}

/** Цвет категории */
function getCategoryColor(category) {
  const cat = CONFIG.CATEGORIES.find(c => c.id === category);
  return cat ? cat.color : '#f59e0b';
}

/** Получить параметр из URL */
function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Обрезать текст */
function truncate(str, maxLen = 100) {
  if (!str || str.length <= maxLen) return str;
  return str.substring(0, maxLen).trim() + '…';
}

// ───────────────────── Toast-уведомления ─────────────────────

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ───────────────────── Избранное (localStorage) ─────────────────────

const Favorites = {
  KEY: 'marketplace_favorites',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  },

  isFavorite(id) {
    return this.getAll().includes(id);
  },

  toggle(id) {
    let favs = this.getAll();
    const wasFav = favs.includes(id);
    if (wasFav) {
      favs = favs.filter(f => f !== id);
    } else {
      favs.push(id);
    }
    localStorage.setItem(this.KEY, JSON.stringify(favs));
    return !wasFav; // возвращает новое состояние
  },

  count() {
    return this.getAll().length;
  }
};

// ───────────────────── Placeholder-изображения ─────────────────────

function getPlaceholderSVG(category) {
  const color = getCategoryColor(category);
  const icon = getCategoryIcon(category);

  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.15"/>
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.05"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#bg)" rx="0"/>
      <text x="200" y="160" text-anchor="middle" font-size="64">${icon}</text>
    </svg>
  `)}`;
}

// ───────────────────── API: работа с JSONBin ─────────────────────

/** Загрузить все данные */
async function fetchAll() {
  try {
    const response = await fetch(`${CONFIG.BASE_URL}/b/${CONFIG.BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': CONFIG.API_KEY
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json.record || { items: [] };
  } catch (error) {
    console.error('fetchAll error:', error);
    showToast('Ошибка загрузки данных', 'error');
    return { items: [] };
  }
}

/** Сохранить все данные */
async function saveAll(data) {
  try {
    const response = await fetch(`${CONFIG.BASE_URL}/b/${CONFIG.BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': CONFIG.API_KEY
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  } catch (error) {
    console.error('saveAll error:', error);
    showToast('Ошибка сохранения данных', 'error');
    return false;
  }
}

/** Создать объявление */
async function createItem(newItem) {
  const data = await fetchAll();
  newItem.id = generateId();
  newItem.author = Auth.getUser();
  newItem.created = new Date().toISOString();
  newItem.views = 0;
  newItem.status = 'active';

  data.items.unshift(newItem); // новые — в начало
  const success = await saveAll(data);
  if (!success) throw new Error('Ошибка создания объявления');
  return newItem;
}

/** Обновить объявление */
async function updateItem(id, updates) {
  const data = await fetchAll();
  const index = data.items.findIndex(i => i.id === id);
  if (index === -1) throw new Error('Объявление не найдено');
  if (data.items[index].author !== Auth.getUser()) {
    throw new Error('Нет прав на редактирование');
  }
  Object.assign(data.items[index], updates);
  const success = await saveAll(data);
  if (!success) throw new Error('Ошибка обновления');
}

/** Удалить объявление */
async function deleteItem(id) {
  const data = await fetchAll();
  const index = data.items.findIndex(i => i.id === id);
  if (index === -1) throw new Error('Объявление не найдено');
  if (data.items[index].author !== Auth.getUser()) {
    throw new Error('Нет прав на удаление');
  }
  data.items.splice(index, 1);
  const success = await saveAll(data);
  if (!success) throw new Error('Ошибка удаления');
}

/** Получить объявление по ID */
async function getItemById(id) {
  const data = await fetchAll();
  const item = data.items.find(i => i.id === id);
  return item || null;
}

/** Увеличить счётчик просмотров */
async function incrementViews(id) {
  const viewedKey = 'marketplace_viewed';
  let viewed = [];
  try {
    viewed = JSON.parse(sessionStorage.getItem(viewedKey) || '[]');
  } catch { /* ignore */ }

  // Не считать повторные просмотры в одной сессии
  if (viewed.includes(id)) return;

  const data = await fetchAll();
  const item = data.items.find(i => i.id === id);
  if (item) {
    item.views = (item.views || 0) + 1;
    await saveAll(data);
    viewed.push(id);
    sessionStorage.setItem(viewedKey, JSON.stringify(viewed));
  }
}
