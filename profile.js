/* =========================================================
   profile.js — Страница профиля пользователя
   ========================================================= */

const $ = id => document.getElementById(id);

const PROFILE_KEY = 'marketplace_profile';

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

document.addEventListener('DOMContentLoaded', () => {
  const username = Auth.getUser();
  if (!username) {
    window.location.href = 'index.html';
    return;
  }

  Auth.updateUI();
  updateFavCount();

  const editBtn = $('profile-edit');
  const logoutBtn = $('profile-logout');

  const els = {
    avatar: $('profile-avatar'),
    nickname: $('profile-nickname'),
    name: $('profile-name'),
    bio: $('profile-bio'),
    email: $('profile-email'),
    location: $('profile-location'),
    since: $('profile-since'),
  };

  if (els.nickname) els.nickname.textContent = username;

  loadProfileData(username, els);
  loadUserItems(username);

  if (editBtn) {
    editBtn.addEventListener('click', () => openEditModal(username, els));
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout();
      window.location.href = 'index.html';
    });
  }

  const logoutHeader = $('logout-btn');
  if (logoutHeader) {
    logoutHeader.addEventListener('click', () => {
      Auth.logout();
      window.location.href = 'index.html';
    });
  }
});

function loadProfileData(username, els) {
  const p = getProfile();

  const renderName = p.name || '';
  const renderBio = p.bio || '';
  const renderEmail = p.email || '';
  const renderLocation = p.location || '';

  if (els.avatar) {
    if (p.avatar) {
      els.avatar.innerHTML = `<img src="${p.avatar}" alt="">`;
      els.avatar.classList.add('has-image');
    } else {
      els.avatar.textContent = username.charAt(0).toUpperCase();
    }
  }

  if (els.name) {
    els.name.textContent = renderName;
    els.name.style.display = renderName ? '' : 'none';
  }

  if (els.bio) {
    els.bio.textContent = renderBio;
    els.bio.style.display = renderBio ? '' : 'none';
  }

  if (els.email) {
    els.email.textContent = renderEmail || Lang.t('profile.no.email');
    els.email.style.display = renderEmail ? '' : 'none';
  }

  if (els.location) {
    els.location.textContent = renderLocation ? `📍 ${renderLocation}` : '';
    els.location.style.display = renderLocation ? '' : 'none';
  }

  if (els.since) {
    els.since.textContent = Lang.t('profile.member.since');
  }
}

async function loadUserItems(username) {
  const data = await fetchAll();
  const userItems = data.items.filter(
    i => i.author === username && i.status !== 'deleted'
  );

  const container = $('profile-items');
  const countEl = $('profile-items-count');
  const loading = $('profile-loading');

  if (countEl) {
    const c = userItems.length;
    const d = c % 10, dd = c % 100;
    let label = 'объявлений';
    if (dd < 11 || dd > 19) {
      if (d === 1) label = 'объявление';
      else if (d >= 2 && d <= 4) label = 'объявления';
    }
    countEl.textContent = `${c} ${label}`;
  }

  if (loading) loading.remove();
  container.innerHTML = '';

  if (userItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h2 class="empty-state-title">${Lang.t('profile.empty.title')}</h2>
        <p class="empty-state-text">${Lang.t('profile.empty.text')}</p>
        <a href="create.html" class="btn btn-primary">${Lang.t('profile.empty.btn')}</a>
      </div>
    `;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'items-grid';
  grid.innerHTML = userItems.map(item => createCardHTML(item)).join('');
  container.appendChild(grid);
  attachItemCardEvents(grid);
}

function openEditModal(username, els) {
  const modal = $('profile-edit-modal');
  if (!modal) return;

  const errorEl = $('edit-error');
  const saveBtn = $('edit-save');
  const cancelBtn = $('edit-cancel');

  const fields = {
    avatar: $('edit-avatar-preview'),
    avatarInput: $('edit-avatar-input'),
    avatarBtn: $('edit-avatar-btn'),
    avatarRemove: $('edit-avatar-remove'),
    nickname: $('edit-nickname'),
    name: $('edit-name'),
    email: $('edit-email'),
    bio: $('edit-bio'),
    location: $('edit-location'),
  };

  const p = getProfile();

  if (fields.nickname) fields.nickname.value = username;
  if (fields.name) fields.name.value = p.name || '';
  if (fields.email) fields.email.value = p.email || '';
  if (fields.bio) fields.bio.value = p.bio || '';
  if (fields.location) fields.location.value = p.location || '';

  if (fields.avatar) {
    if (p.avatar) {
      fields.avatar.innerHTML = `<img src="${p.avatar}" alt="">`;
      fields.avatar.classList.add('has-image');
      if (fields.avatarRemove) fields.avatarRemove.style.display = '';
    } else {
      fields.avatar.textContent = username.charAt(0).toUpperCase();
    }
  }

  let newAvatarDataUrl = null;
  modal.classList.add('active');

  const close = () => {
    modal.classList.remove('active');
    newAvatarDataUrl = null;
  };

  // ── Avatar upload ──
  if (fields.avatarBtn && fields.avatarInput) {
    fields.avatarBtn.addEventListener('click', () => fields.avatarInput.click());
    fields.avatarInput.addEventListener('change', () => {
      const file = fields.avatarInput.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        if (errorEl) errorEl.textContent = Lang.t('profile.avatar.error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        newAvatarDataUrl = e.target.result;
        if (fields.avatar) {
          fields.avatar.innerHTML = `<img src="${newAvatarDataUrl}" alt="">`;
          fields.avatar.classList.add('has-image');
        }
        if (fields.avatarRemove) fields.avatarRemove.style.display = '';
        if (errorEl) errorEl.textContent = '';
      };
      reader.readAsDataURL(file);
    });
  }

  if (fields.avatarRemove) {
    fields.avatarRemove.addEventListener('click', () => {
      newAvatarDataUrl = null;
      fields.avatarInput.value = '';
      if (fields.avatar) {
        fields.avatar.textContent = username.charAt(0).toUpperCase();
        fields.avatar.classList.remove('has-image');
      }
      fields.avatarRemove.style.display = 'none';
    });
  }

  // ── Save ──
  const onSave = () => {
    if (errorEl) errorEl.textContent = '';
    if (saveBtn) saveBtn.disabled = true;

    try {
      const data = {
        name: fields.name ? fields.name.value.trim() : '',
        email: fields.email ? fields.email.value.trim() : '',
        bio: fields.bio ? fields.bio.value.trim() : '',
        location: fields.location ? fields.location.value.trim() : '',
      };

      if (newAvatarDataUrl !== null) {
        data.avatar = newAvatarDataUrl;
      } else if (p.avatar && newAvatarDataUrl === null) {
        // Keep existing avatar unless explicitly removed
        data.avatar = p.avatar;
      }

      saveProfile(data);
      close();
      showToast(Lang.t('profile.saved'), 'success');
      loadProfileData(username, els);
    } catch (e) {
      if (errorEl) errorEl.textContent = e.message;
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  };

  cloneAndReplace(saveBtn, onSave);
  cloneAndReplace(cancelBtn, close);

  const bg = modal.querySelector('.modal-overlay-bg');
  if (bg) cloneAndReplace(bg, close);

  if (fields.name) {
    fields.name.onkeydown = (e) => {
      if (e.key === 'Enter') onSave();
    };
    setTimeout(() => fields.name.focus(), 150);
  }

  document.addEventListener('keydown', escHandler = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  });
}

function cloneAndReplace(el, handler) {
  if (!el || !el.parentNode) return;
  const clone = el.cloneNode(true);
  el.parentNode.replaceChild(clone, el);
  clone.addEventListener('click', handler);
}
