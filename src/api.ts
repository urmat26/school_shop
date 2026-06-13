/* =========================================================
   api.js — CRUD-функции + утилиты
   ========================================================= */

// ───────────────────── Утилиты ─────────────────────

/** Генерация уникального ID */
function generateId() {
  return Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

/** Экранирование HTML */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Склонение числительных (ru) */
function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/** Форматирование даты */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = +now - +date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return Lang.t('time.justnow');
  if (diffMins < 60) return `${diffMins} ${Lang.t('time.minutes')}`;
  if (diffHours < 24) return `${diffHours} ${Lang.t('time.hours')}`;
  if (diffDays < 7) return `${diffDays} ${Lang.t('time.days')}`;

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/** Форматирование цены */
function formatPrice(price) {
  if (!price || price === 0) return Lang.t('item.free');
  return new Intl.NumberFormat('ru-RU').format(price) + ' ' + Lang.t('item.currency');
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
    <span class="toast-message">${escapeHtml(message)}</span>
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

// ───────────────────── Избранное (localStorage + JSONBin) ─────────────────────

const Favorites = {
  KEY: 'marketplace_favorites',
  _cache: null,

  getAll() {
    if (this._cache === null) {
      try {
        this._cache = JSON.parse(localStorage.getItem(this.KEY) || '[]');
      } catch {
        this._cache = [];
      }
    }
    return this._cache;
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
    this._cache = favs;
    return !wasFav;
  },

  count() {
    return this.getAll().length;
  },

  async syncToServer() {
    const username = Auth.getUser();
    if (!username) return;
    try {
      const data = await fetchAll(true);
      if (!data.users) return;
      const user = data.users.find(u => u.username === username);
      if (!user) return;
      user.favorites = this.getAll();
      await saveAll(data);
    } catch (e) {
      console.error('Favorites sync error:', e);
    }
  },

  async loadFromServer() {
    const username = Auth.getUser();
    if (!username) return;
    try {
      const data = await fetchAll(true);
      if (!data.users) return;
      const user = data.users.find(u => u.username === username);
      if (!user || !user.favorites) return;
      const server = user.favorites;
      const local = this.getAll();
      const merged = [...new Set([...server, ...local])];
      localStorage.setItem(this.KEY, JSON.stringify(merged));
      this._cache = merged;
    } catch (e) {
      console.error('Favorites load error:', e);
    }
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

// ───────────────────── Загрузка фото на ImgBB ─────────────────────

async function uploadImage(base64) {
  const formData = new FormData();
  formData.append('image', base64.split(',')[1]);

  const url = CONFIG.USE_VERCEL_PROXY
    ? CONFIG.VERCEL_UPLOAD_URL
    : 'https://api.imgbb.com/1/upload?key=' + CONFIG.IMGBB_API_KEY;

  const res = await fetch(url, { method: 'POST', body: formData });
  const json = await res.json();
  if (!json.success) throw new Error(Lang.t('toast.photo.error'));
  return json.data.url;
}

// ───────────────────── Карточки объявлений ─────────────────────

function createCardHTML(item: ItemData, options: { favTitle?: string; onFavoriteToggle?: (id: string, isFav: boolean) => void } = {}): string {
  const favTitle = options.favTitle || Lang.t('item.fav.add.title');
  const isFav = Favorites.isFavorite(item.id);
  const imageUrl = item.image || getPlaceholderSVG(item.category);
  const priceClass = (!item.price || item.price === 0) ? 'free' : '';
  const priceText = formatPrice(item.price);
  const isSold = item.status === 'sold';

  return `
    <article class="item-card" data-id="${escapeHtml(item.id)}">
      <div class="item-card-image">
        ${isSold ? '<div class="sold-badge">' + Lang.t('item.sold') + '</div>' : ''}
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(getPlaceholderSVG(item.category))}'">
        <div class="item-card-badge">
          <span class="category-badge" data-category="${escapeHtml(item.category)}">
            ${getCategoryIcon(item.category)} <span data-i18n="cat.${escapeHtml(item.category)}">${Lang.t('cat.' + item.category)}</span>
          </span>
        </div>
        <button class="item-card-favorite ${isFav ? 'active' : ''}" data-id="${escapeHtml(item.id)}" title="${escapeHtml(favTitle)}">
          ${isFav ? '♥' : '♡'}
        </button>
      </div>
      <div class="item-card-body">
        <h3 class="item-card-title">${escapeHtml(item.title)}</h3>
        <p class="item-card-description">${escapeHtml(truncate(item.description, 80))}</p>
        <div class="item-card-footer">
          <span class="item-card-price ${priceClass}">${escapeHtml(priceText)}</span>
          <div class="item-card-meta">
            <span class="item-card-meta-item">👁 ${item.views || 0}</span>
            <span class="item-card-meta-item">${escapeHtml(formatDate(item.created))}</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function createMiniCardHTML(item) {
  const imageUrl = item.image || getPlaceholderSVG(item.category);
  return `
    <div class="recently-viewed-card" data-id="${escapeHtml(item.id)}" role="link" tabindex="0">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(getPlaceholderSVG(item.category))}'">
      <div class="recently-viewed-card-body">
        <div class="recently-viewed-card-title">${escapeHtml(item.title)}</div>
        <div class="recently-viewed-card-price">${escapeHtml(formatPrice(item.price))}</div>
      </div>
    </div>
  `;
}

function attachItemCardEvents(grid: HTMLElement, options: { onFavoriteToggle?: (id: string, isFav: boolean) => void } = {}): void {
  const { onFavoriteToggle } = options;

  grid.querySelectorAll('.item-card-image img').forEach(img => {
    img.addEventListener('error', function () {
      this.onerror = null;
      const card = this.closest('.item-card');
      if (card) {
        const cat = card.querySelector('.category-badge')?.dataset.category;
        this.src = getPlaceholderSVG(cat);
      }
    });
  });

  grid.querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.item-card-favorite')) return;
      window.location.href = `item.html?id=${encodeURIComponent((card as HTMLElement).dataset.id)}`;
    });
  });

  grid.querySelectorAll('.item-card-favorite').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.id;
      const isFav = Favorites.toggle(id);
      btn.classList.toggle('active', isFav);
      btn.innerHTML = isFav ? '♥' : '♡';

      if (onFavoriteToggle) {
        await onFavoriteToggle(id, isFav);
      } else if (isFav) {
        btn.classList.add('heart-bounce');
        spawnFavParticles(btn);
        setTimeout(() => btn.classList.remove('heart-bounce'), 500);
        showToast(Lang.t('item.fav.add'), 'success');
      } else {
        showToast(Lang.t('item.fav.remove'), 'info');
      }

      updateFavCount();
      Favorites.syncToServer();
    });
  });
}

function attachMiniCardEvents(container) {
  container.querySelectorAll('.recently-viewed-card').forEach(card => {
    const navigate = () => {
      window.location.href = `item.html?id=${encodeURIComponent(card.dataset.id)}`;
    };
    card.addEventListener('click', navigate);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate();
      }
    });
  });
}

// ─── Fav Particle Burst ───
function spawnFavParticles(el) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#ec4899', '#8b5cf6'];
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'fav-particle';
    const angle = (Math.PI * 2 / 8) * i + (Math.random() - 0.5) * 0.5;
    const dist = 40 + Math.random() * 30;
    p.style.cssText = `
      left:${cx}px; top:${cy}px;
      background:${colors[i % colors.length]};
      --dx:${Math.cos(angle) * dist}px;
      --dy:${Math.sin(angle) * dist}px;
      animation:favParticle 0.6s ease-out forwards;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

function updateFavCount(): void {
  const badges = document.querySelectorAll('.fav-count-badge');
  const count = Favorites.count();
  badges.forEach(b => {
    (b as HTMLElement).textContent = count;
    (b as HTMLElement).style.display = count > 0 ? 'inline' : 'none';
  });
}

// ───────────────────── API: работа с JSONBin ─────────────────────

let _dataCache = null;
let _cacheTime = 0;
const CACHE_TTL = 30000;

function invalidateCache() {
  _dataCache = null;
  _cacheTime = 0;
}

function cloneData(data) {
  if (typeof structuredClone === 'function') return structuredClone(data);
  return JSON.parse(JSON.stringify(data));
}

/** Загрузить все данные */
async function fetchAll(forceRefresh = false) {
  if (!forceRefresh && _dataCache && Date.now() - _cacheTime < CACHE_TTL) {
    return cloneData(_dataCache);
  }

  try {
    const url = CONFIG.USE_VERCEL_PROXY
      ? CONFIG.VERCEL_DATA_URL + '?latest=true'
      : `${CONFIG.BASE_URL}/b/${CONFIG.BIN_ID}/latest`;

    const headers = CONFIG.USE_VERCEL_PROXY ? {} : { 'X-Master-Key': CONFIG.API_KEY };
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let json;
    if (CONFIG.USE_VERCEL_PROXY) {
      json = await response.json();
      json = json.record || json;
    } else {
      json = await response.json();
      json = json.record || { items: [] };
    }
    const data = json || { items: [] };
    _lastVersion = data._version || 0;
    _dataCache = data;
    _cacheTime = Date.now();
    return cloneData(data);
  } catch (error) {
    console.error('fetchAll error:', error);
    showToast(Lang.t('toast.load.error'), 'error');
    return { items: [] };
  }
}

let _lastVersion = 0;

/** Сохранить все данные */
async function saveAll(data) {
  // Проверка конфликта версий (между fetchAll и saveAll)
  if (data._version !== undefined && data._version !== _lastVersion) {
    showToast(Lang.t('toast.version.error'), 'error');
    return false;
  }
  data._version = (data._version || 0) + 1;

  try {
    const url = CONFIG.USE_VERCEL_PROXY ? CONFIG.VERCEL_DATA_URL : `${CONFIG.BASE_URL}/b/${CONFIG.BIN_ID}`;
    const headers = CONFIG.USE_VERCEL_PROXY
      ? { 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json', 'X-Master-Key': CONFIG.API_KEY };

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    _lastVersion = data._version;
    _dataCache = data;
    _cacheTime = Date.now();
    return true;
  } catch (error) {
    console.error('saveAll error:', error);
    showToast(Lang.t('toast.save.error'), 'error');
    return false;
  }
}

/** Создать объявление */
async function createItem(newItem) {
  const data = await fetchAll(true);
  newItem.id = generateId();
  newItem.author = Auth.getUser();
  newItem.created = new Date().toISOString();
  newItem.views = 0;
  newItem.status = 'active';

  data.items.unshift(newItem); // новые — в начало
  const success = await saveAll(data);
  if (!success) throw new Error(Lang.t('toast.create.error'));
  return newItem;
}

/** Обновить объявление */
async function updateItem(id, updates) {
  const data = await fetchAll(true);
  const index = data.items.findIndex(i => i.id === id);
  if (index === -1) throw new Error(Lang.t('detail.notfound'));
  if (data.items[index].author !== Auth.getUser()) {
    throw new Error(Lang.t('create.error.permission'));
  }
  Object.assign(data.items[index], updates);
  const success = await saveAll(data);
  if (!success) throw new Error(Lang.t('toast.update.error'));
}

/** Удалить объявление (мягкое удаление) */
async function deleteItem(id) {
  const data = await fetchAll(true);
  const index = data.items.findIndex(i => i.id === id);
  if (index === -1) throw new Error(Lang.t('detail.notfound'));
  if (data.items[index].author !== Auth.getUser()) {
    throw new Error(Lang.t('create.error.permission'));
  }
  data.items[index].status = 'deleted';
  data.items[index].deletedAt = new Date().toISOString();
  const success = await saveAll(data);
  if (!success) throw new Error(Lang.t('toast.delete.error'));
}

/** Восстановить объявление */
async function restoreItem(id) {
  const data = await fetchAll(true);
  const item = data.items.find(i => i.id === id);
  if (!item) throw new Error(Lang.t('detail.notfound'));
  if (item.author !== Auth.getUser()) throw new Error(Lang.t('create.error.permission'));
  item.status = 'active';
  delete item.deletedAt;
  const success = await saveAll(data);
  if (!success) throw new Error(Lang.t('toast.restore.error'));
}

/** Переключить статус объявления (active ↔ sold) */
async function toggleItemSold(id) {
  const data = await fetchAll(true);
  const item = data.items.find(i => i.id === id);
  if (!item) throw new Error(Lang.t('detail.notfound'));
  if (item.author !== Auth.getUser()) throw new Error(Lang.t('create.error.permission'));
  item.status = item.status === 'sold' ? 'active' : 'sold';
  const success = await saveAll(data);
  if (!success) throw new Error(Lang.t('toast.status.error'));
  return item.status;
}

/** Получить количество удалённых объявлений текущего пользователя */
async function getDeletedCount() {
  const data = await fetchAll();
  const user = Auth.getUser();
  if (!user) return 0;
  return data.items.filter(i => i.author === user && i.status === 'deleted').length;
}

/** Экспорт данных в JSON (скачивание) */
function downloadBackup() {
  fetchAll().then(data => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `school-shop-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/** Валидация формы (кратко) */
function validateItemForm(title, description) {
  if (!title || title.trim().length < 3) return Lang.t('validate.title.len');
  if (description && description.length > 5000) return Lang.t('validate.desc.len');
  return null;
}

/** Получить объявление по ID */
async function getItemById(id) {
  const data = await fetchAll();
  const item = data.items.find(i => i.id === id);
  return item || null;
}

// ───────────────────── Сообщения / Чат ─────────────────────

async function sendMessage(itemId, itemTitle, to, text) {
  const from = Auth.getUser();
  if (!from) throw new Error('Not logged in');
  const data = await fetchAll(true);
  if (!data.messages) data.messages = [];
  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    itemId,
    itemTitle,
    from,
    to,
    text,
    createdAt: new Date().toISOString(),
    read: false
  };
  data.messages.push(msg);
  const ok = await saveAll(data);
  if (!ok) throw new Error(Lang.t('toast.send.error'));
  return msg;
}

function getConversations(data: BinData): MessageData[] {
  const user = Auth.getUser();
  if (!user || !data.messages) return [];
  const seen: Record<string, MessageData> = {};
  data.messages.forEach(m => {
    if (m.from !== user && m.to !== user) return;
    const other = m.from === user ? m.to : m.from;
    const key = m.itemId + '|' + other;
    if (!seen[key] || new Date(m.createdAt) > new Date(seen[key].createdAt)) {
      seen[key] = m;
    }
  });
  return Object.values(seen)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

function getMessages(data: BinData, itemId: string, otherUser: string): MessageData[] {
  const user = Auth.getUser();
  if (!user || !data.messages) return [];
  return data.messages.filter(m =>
    m.itemId === itemId &&
    ((m.from === user && m.to === otherUser) || (m.from === otherUser && m.to === user))
  ).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

function getUnreadCount(data: BinData): number {
  const user = Auth.getUser();
  if (!user || !data.messages) return 0;
  return data.messages.filter(m => m.to === user && !m.read).length;
}

async function markConversationRead(itemId, otherUser) {
  const user = Auth.getUser();
  if (!user) return;
  const data = await fetchAll(true);
  if (!data.messages) return;
  let changed = false;
  data.messages.forEach(m => {
    if (m.itemId === itemId && m.to === user && !m.read) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) await saveAll(data);
}

// ───────────────────── Mobile Menu ─────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-overlay');
  if (!btn || !menu || !overlay) return;

  const open = () => {
    btn.classList.add('active');
    menu.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    btn.classList.remove('active');
    menu.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  btn.addEventListener('click', () => {
    if (menu.classList.contains('active')) {
      close();
    } else {
      open();
    }
  });

  overlay.addEventListener('click', close);

  menu.querySelectorAll('.mobile-menu-link').forEach(link => {
    link.addEventListener('click', close);
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('active')) close();
  });
});

// ───────────────────── Увеличить счётчик просмотров ─────────────────────
async function incrementViews(id) {
  const viewedKey = 'marketplace_viewed';
  let viewed = [];
  try {
    viewed = JSON.parse(localStorage.getItem(viewedKey) || '[]');
  } catch { /* ignore */ }

  // Не считать повторные просмотры с одного браузера
  if (viewed.includes(id)) return;

  const data = await fetchAll(true);
  const item = data.items.find(i => i.id === id);
  if (item) {
    item.views = (item.views || 0) + 1;
    await saveAll(data);
    viewed.push(id);
    localStorage.setItem(viewedKey, JSON.stringify(viewed));
  }
}

// ───────────────────── Обновить бейдж непрочитанных чатов ─────────────────────

async function updateUnreadBadge() {
  const navBadge = document.getElementById('chat-unread-nav');
  if (!navBadge) return;
  const data = await fetchAll();
  const count = getUnreadCount(data);
  if (count > 0) {
    navBadge.textContent = '' + count;
    navBadge.style.display = '';
  } else {
    navBadge.style.display = 'none';
  }
}
