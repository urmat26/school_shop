/* =========================================================
   auth.js — Простая авторизация через localStorage
   ========================================================= */

const Auth = {
  STORAGE_KEY: 'marketplace_user',

  /** Получить текущего пользователя */
  getUser() {
    return localStorage.getItem(this.STORAGE_KEY);
  },

  /** Сохранить никнейм */
  setUser(nickname) {
    localStorage.setItem(this.STORAGE_KEY, nickname.trim());
  },

  /** Выйти из аккаунта */
  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.updateUI();
    showToast('Вы вышли из аккаунта', 'info');
  },

  /** Проверить, может ли пользователь редактировать объявление */
  canEdit(item) {
    return item.author === this.getUser();
  },

  /** Показать модальное окно авторизации */
  showModal(callback) {
    const modal = document.getElementById('auth-modal');
    const input = document.getElementById('nickname-input');
    const submitBtn = document.getElementById('auth-submit');
    const errorEl = document.getElementById('auth-error');

    if (!modal) return;

    modal.classList.add('active');
    input.value = '';
    errorEl.textContent = '';
    setTimeout(() => input.focus(), 100);

    const handleSubmit = () => {
      const nickname = input.value.trim();
      if (!nickname) {
        errorEl.textContent = 'Введите никнейм';
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
        return;
      }
      if (nickname.length < 2) {
        errorEl.textContent = 'Минимум 2 символа';
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
        return;
      }
      if (nickname.length > 20) {
        errorEl.textContent = 'Максимум 20 символов';
        return;
      }

      Auth.setUser(nickname);
      Auth.hideModal();
      Auth.updateUI();
      showToast(`Привет, ${nickname}! 👋`, 'success');
      if (callback) callback(nickname);
    };

    // Убираем старые обработчики
    const newSubmit = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmit, submitBtn);
    newSubmit.addEventListener('click', handleSubmit);

    input.onkeydown = (e) => {
      if (e.key === 'Enter') handleSubmit();
      errorEl.textContent = '';
    };
  },

  /** Скрыть модальное окно */
  hideModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
  },

  /** Обновить UI шапки в зависимости от авторизации */
  updateUI() {
    const user = this.getUser();
    const loginBtn = document.getElementById('login-btn');
    const userDisplay = document.getElementById('user-display');
    const userNickname = document.getElementById('user-nickname');
    const userAvatar = document.getElementById('user-avatar');

    if (!loginBtn || !userDisplay) return;

    if (user) {
      loginBtn.style.display = 'none';
      userDisplay.style.display = 'flex';
      if (userNickname) userNickname.textContent = user;
      if (userAvatar) userAvatar.textContent = user.charAt(0).toUpperCase();
    } else {
      loginBtn.style.display = 'flex';
      userDisplay.style.display = 'none';
    }
  },

  /** Требовать авторизацию, если не авторизован — показать модалку */
  requireAuth(callback) {
    const user = this.getUser();
    if (user) {
      if (callback) callback(user);
      return true;
    } else {
      this.showModal(callback);
      return false;
    }
  },

  /** Инициализация при загрузке страницы */
  init() {
    this.updateUI();

    // Обработчик кнопки «Войти»
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.showModal());
    }

    // Обработчик кнопки «Выйти»
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Закрытие модалки по клику на фон
    const modalBg = document.querySelector('.modal-overlay-bg');
    if (modalBg) {
      modalBg.addEventListener('click', () => this.hideModal());
    }

    // Закрытие модалки по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideModal();
    });
  }
};
