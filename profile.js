/* =========================================================
   profile.js — Страница профиля пользователя
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const username = Auth.getUser();
  if (!username) {
    window.location.href = 'index.html';
    return;
  }

  Auth.updateUI();
  updateFavCount();

  const editBtn = document.getElementById('profile-edit');
  const logoutBtn = document.getElementById('profile-logout');

  const $ = id => document.getElementById(id);

  const els = {
    avatar: $('profile-avatar'),
    nickname: $('profile-nickname'),
    name: $('profile-name'),
    bio: $('profile-bio'),
    email: $('profile-email'),
    location: $('profile-location'),
    website: $('profile-website'),
    social: $('profile-social'),
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
      window.location.href = 'index.html';
    });
  }
});

const $ = id => document.getElementById(id);

async function loadProfileData(username, els) {
  const data = await fetchAll();
  const u = (data.users || []).find(x => x.username === username);
  if (!u) return;

  if (els.avatar) {
    if (u.avatar) {
      els.avatar.innerHTML = `<img src="${escapeHtml(u.avatar)}" alt="">`;
      els.avatar.classList.add('has-image');
    } else {
      els.avatar.textContent = username.charAt(0).toUpperCase();
    }
  }

  if (els.name) els.name.textContent = u.displayName || '';
  if (els.name && !u.displayName) els.name.style.display = 'none';

  if (els.email) els.email.textContent = u.email || 'Email не указан';
  if (els.email && !u.email) els.email.style.display = 'none';

  if (els.bio) {
    els.bio.textContent = u.bio || '';
    if (!u.bio) els.bio.style.display = 'none';
  }

  if (els.location) {
    els.location.textContent = u.location ? `📍 ${u.location}` : '';
    if (!u.location) els.location.style.display = 'none';
  }

  if (els.website && u.website) {
    els.website.innerHTML = `<a href="${escapeHtml(u.website)}" target="_blank" rel="noopener">🔗 ${escapeHtml(u.website)}</a>`;
  } else if (els.website) {
    els.website.style.display = 'none';
  }

  if (els.social) {
    const links = u.socialLinks || [];
    const active = links.filter(Boolean);
    if (active.length > 0) {
      els.social.innerHTML = active.map((link, i) =>
        `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="profile-social-link">🌐 ${escapeHtml(link)}</a>`
      ).join('');
    } else {
      els.social.style.display = 'none';
    }
  }

  if (els.since && u.createdAt) {
    const d = new Date(u.createdAt);
    els.since.textContent = `Участник с ${d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
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

  if (userItems.length === 0) {
    if (loading) loading.remove();
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h2 class="empty-state-title">У вас пока нет объявлений</h2>
        <p class="empty-state-text">Создайте своё первое объявление</p>
        <a href="create.html" class="btn btn-primary">Создать объявление</a>
      </div>
    `;
    return;
  }

  if (loading) loading.remove();
  container.innerHTML = '';
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
    pronouns: $('edit-pronouns'),
    company: $('edit-company'),
    location: $('edit-location'),
    website: $('edit-website'),
    social1: $('edit-social-1'),
    social2: $('edit-social-2'),
    social3: $('edit-social-3'),
    social4: $('edit-social-4'),
  };

  let newAvatarDataUrl = null;

  loadEditData(username, fields);
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
        if (errorEl) errorEl.textContent = 'Фото не больше 2 MB';
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
  const onSave = async () => {
    if (errorEl) errorEl.textContent = '';
    if (saveBtn) saveBtn.disabled = true;

    try {
      let avatarUrl = null;

      // Upload avatar if changed
      if (newAvatarDataUrl) {
        try {
          avatarUrl = await uploadImage(newAvatarDataUrl);
        } catch {
          throw new Error('Ошибка загрузки фото');
        }
      }

      const data = await fetchAll(true);
      const idx = (data.users || []).findIndex(u => u.username === username);
      if (idx === -1) throw new Error('Пользователь не найден');

      const user = data.users[idx];

      if (newAvatarDataUrl !== null) user.avatar = avatarUrl;
      user.displayName = fields.name ? fields.name.value.trim() : '';
      user.email = fields.email ? fields.email.value.trim() : '';
      user.bio = fields.bio ? fields.bio.value.trim() : '';
      user.pronouns = fields.pronouns ? fields.pronouns.value.trim() : '';
      user.company = fields.company ? fields.company.value.trim() : '';
      user.location = fields.location ? fields.location.value.trim() : '';
      user.website = fields.website ? fields.website.value.trim() : '';
      user.socialLinks = [
        fields.social1 ? fields.social1.value.trim() : '',
        fields.social2 ? fields.social2.value.trim() : '',
        fields.social3 ? fields.social3.value.trim() : '',
        fields.social4 ? fields.social4.value.trim() : '',
      ];

      const ok = await saveAll(data);
      if (!ok) throw new Error('Ошибка сохранения');

      close();
      showToast('Профиль обновлён', 'success');
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

async function loadEditData(username, fields) {
  const data = await fetchAll();
  const u = (data.users || []).find(x => x.username === username);
  if (!u) return;

  if (fields.nickname) fields.nickname.value = username;
  if (fields.name) fields.name.value = u.displayName || '';
  if (fields.email) fields.email.value = u.email || '';
  if (fields.bio) fields.bio.value = u.bio || '';
  if (fields.pronouns) fields.pronouns.value = u.pronouns || '';
  if (fields.company) fields.company.value = u.company || '';
  if (fields.location) fields.location.value = u.location || '';
  if (fields.website) fields.website.value = u.website || '';
  if (fields.social1) fields.social1.value = (u.socialLinks || [])[0] || '';
  if (fields.social2) fields.social2.value = (u.socialLinks || [])[1] || '';
  if (fields.social3) fields.social3.value = (u.socialLinks || [])[2] || '';
  if (fields.social4) fields.social4.value = (u.socialLinks || [])[3] || '';

  // Show existing avatar in preview
  if (fields.avatar && u.avatar) {
    fields.avatar.innerHTML = `<img src="${escapeHtml(u.avatar)}" alt="">`;
    fields.avatar.classList.add('has-image');
    if (fields.avatarRemove) fields.avatarRemove.style.display = '';
  }
}

function cloneAndReplace(el, handler) {
  if (!el || !el.parentNode) return;
  const clone = el.cloneNode(true);
  el.parentNode.replaceChild(clone, el);
  clone.addEventListener('click', handler);
}
