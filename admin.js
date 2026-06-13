const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  updateFavCount();
  updateUnreadBadge();

  const loginWrap = $('admin-login-wrap');
  const dashboard = $('admin-dashboard');
  const loginBtn = $('admin-login-btn');
  const loginInput = $('admin-login-input');
  const loginPass = $('admin-login-pass');
  const loginError = $('admin-login-error');
  const refreshBtn = $('admin-refresh-btn');
  const logoutBtn = $('admin-logout-btn');

  const showLogin = () => {
    loginWrap.style.display = '';
    dashboard.style.display = 'none';
  };

  const showDashboard = () => {
    loginWrap.style.display = 'none';
    dashboard.style.display = '';
  };

  if (Auth.isAdmin()) {
    showDashboard();
    await loadAdminData();
  } else {
    showLogin();
  }

  loginBtn.addEventListener('click', async () => {
    const username = loginInput.value.trim();
    const password = loginPass.value;
    if (!username || !password) {
      loginError.textContent = 'Введите логин и пароль';
      return;
    }
    loginBtn.disabled = true;
    loginBtn.textContent = 'Проверка...';
    try {
      const ok = await Auth.adminLogin(username, password);
      if (ok) {
        loginError.textContent = '';
        showDashboard();
        await loadAdminData();
      } else {
        loginError.textContent = 'Неверный логин или пароль';
      }
    } catch (e) {
      loginError.textContent = 'Ошибка: ' + e.message;
    }
    loginBtn.disabled = false;
    loginBtn.textContent = 'Войти';
  });

  loginInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') loginBtn.click();
  });
  loginPass.addEventListener('keydown', e => {
    if (e.key === 'Enter') loginBtn.click();
  });

  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄 ...';
    await loadAdminData();
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 Обновить';
  });

  logoutBtn.addEventListener('click', () => {
    Auth.adminLogout();
    showLogin();
    loginInput.value = '';
    loginPass.value = '';
    loginError.textContent = '';
    loginInput.focus();
  });
});

async function loadAdminData() {
  const data = await fetchAll(true);
  renderStats(data);
  renderItems(data);
  renderUsers(data);
}

function renderStats(data) {
  const container = $('admin-stats');
  const items = data.items || [];
  const users = data.users || [];
  const messages = data.messages || [];

  const totalItems = items.length;
  const activeItems = items.filter(i => i.status === 'active').length;
  const soldItems = items.filter(i => i.status === 'sold').length;
  const deletedItems = items.filter(i => i.status === 'deleted').length;
  const totalUsers = users.length;
  const totalMessages = messages.length;

  container.innerHTML = `
    <div class="admin-stat-card"><div class="admin-stat-value">${totalItems}</div><div class="admin-stat-label">Всего товаров</div></div>
    <div class="admin-stat-card"><div class="admin-stat-value">${activeItems}</div><div class="admin-stat-label">Активные</div></div>
    <div class="admin-stat-card"><div class="admin-stat-value">${soldItems}</div><div class="admin-stat-label">Продано</div></div>
    <div class="admin-stat-card"><div class="admin-stat-value">${deletedItems}</div><div class="admin-stat-label">Удалено</div></div>
    <div class="admin-stat-card"><div class="admin-stat-value">${totalUsers}</div><div class="admin-stat-label">Пользователей</div></div>
    <div class="admin-stat-card"><div class="admin-stat-value">${totalMessages}</div><div class="admin-stat-label">Сообщений</div></div>
  `;
}

function renderItems(data) {
  const tbody = $('admin-items-body');
  const items = data.items || [];

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Нет товаров</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const statusClass = item.status === 'active' ? 'status-active' : item.status === 'sold' ? 'status-sold' : 'status-deleted';
    const statusLabel = item.status === 'active' ? 'Активен' : item.status === 'sold' ? 'Продан' : 'Удалён';
    const date = item.created ? new Date(item.created).toLocaleDateString('ru-RU') : '—';
    return `
      <tr>
        <td class="no-select" style="font-family:monospace;font-size:0.75rem">${escapeHtml(item.id)}</td>
        <td><a href="item.html?id=${encodeURIComponent(item.id)}" style="color:var(--accent)">${escapeHtml(item.title)}</a></td>
        <td>${escapeHtml(item.author)}</td>
        <td>${escapeHtml(formatPrice(item.price))}</td>
        <td class="${statusClass}">${statusLabel}</td>
        <td>${date}</td>
        <td><button class="btn btn-danger btn-sm admin-delete-item" data-id="${escapeHtml(item.id)}" style="font-size:0.78rem">Удалить</button></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.admin-delete-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('Удалить товар «' + (items.find(i => i.id === id)?.title || id) + '»? Это действие необратимо.')) return;
      btn.disabled = true;
      btn.textContent = '...';
      const ok = await deleteItem(id);
      if (ok) {
        await loadAdminData();
        showToast('Товар удалён', 'success');
      } else {
        showToast('Ошибка удаления', 'error');
        btn.disabled = false;
        btn.textContent = 'Удалить';
      }
    });
  });
}

function renderUsers(data) {
  const tbody = $('admin-users-body');
  const users = data.users || [];
  const items = data.items || [];

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:24px;color:var(--text-muted)">Нет пользователей</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const userItemsCount = items.filter(i => i.author === user.username).length;
    const date = user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—';
    return `
      <tr>
        <td><a href="user.html?name=${encodeURIComponent(user.username)}" style="color:var(--accent)">${escapeHtml(user.username)}</a></td>
        <td>${date}</td>
        <td>${userItemsCount}</td>
      </tr>
    `;
  }).join('');
}
