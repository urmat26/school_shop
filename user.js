const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  updateFavCount();

  const params = new URLSearchParams(window.location.search);
  const username = params.get('name');
  if (!username) {
    window.location.href = 'index.html';
    return;
  }

  const skeleton = $('user-skeleton');
  if (skeleton) skeleton.style.display = '';
  const data = await fetchAll();
  if (skeleton) skeleton.style.display = 'none';
  const userData = data.users.find(u => u.username === username);

  // Profile
  const p = JSON.parse(localStorage.getItem('marketplace_profile') || '{}');
  const profile = p.username === username ? p : {};

  const els = {
    avatar: $('user-avatar'),
    nickname: $('user-nickname'),
    name: $('user-name'),
    bio: $('user-bio'),
    email: $('user-email'),
    location: $('user-location'),
    since: $('user-since'),
  };

  if (els.nickname) els.nickname.textContent = username;
  if (els.avatar) {
    if (profile.avatar) {
      els.avatar.innerHTML = `<img src="${profile.avatar}" alt="">`;
      els.avatar.classList.add('has-image');
    } else {
      els.avatar.textContent = username.charAt(0).toUpperCase();
    }
  }
  if (els.name) { els.name.textContent = profile.name || ''; els.name.style.display = profile.name ? '' : 'none'; }
  if (els.bio) { els.bio.textContent = profile.bio || ''; els.bio.style.display = profile.bio ? '' : 'none'; }
  if (els.email) { els.email.textContent = profile.email || ''; els.email.style.display = profile.email ? '' : 'none'; }
  if (els.location) { els.location.textContent = profile.location ? '📍 ' + profile.location : ''; els.location.style.display = profile.location ? '' : 'none'; }
  if (els.since) {
    els.since.textContent = userData
      ? Lang.t('profile.member.since').replace('2026', new Date(userData.createdAt).getFullYear())
      : Lang.t('profile.member.since');
  }

  // Chat btn
  const chatBtn = $('user-chat-btn');
  const currentUser = Auth.getUser();
  if (chatBtn && currentUser && currentUser !== username) {
    chatBtn.href = `chat.html?item=&user=${encodeURIComponent(username)}`;
  } else if (chatBtn) {
    chatBtn.style.display = 'none';
  }

  // Items
  const userItems = data.items.filter(i => i.author === username && i.status === 'active');
  const container = $('user-items');
  const countEl = $('user-items-count');
  if (countEl) {
    countEl.textContent = `${userItems.length} ${pluralize(userItems.length, Lang.t('items.one'), Lang.t('items.few'), Lang.t('items.many'))}`;
  }

  if (userItems.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><h2 class="empty-state-title" data-i18n="profile.empty.title">${Lang.t('profile.empty.title')}</h2></div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'items-grid';
  grid.innerHTML = userItems.map(item => createCardHTML(item)).join('');
  container.appendChild(grid);
  attachItemCardEvents(grid);
});
