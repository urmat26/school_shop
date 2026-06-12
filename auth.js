const Auth = {
  STORAGE_KEY: 'marketplace_user',

  getUser() {
    return localStorage.getItem(this.STORAGE_KEY);
  },

  setUser(username) {
    localStorage.setItem(this.STORAGE_KEY, username);
  },

  _confirmModal: null,

  _createConfirmModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'auth-confirm-modal';
    overlay.innerHTML = `
      <div class="modal-overlay-bg"></div>
      <div class="modal modal-sm">
        <div class="modal-header">
          <div class="modal-icon">🚪</div>
          <h2 class="modal-title">${Lang.t('auth.logout.confirm.title')}</h2>
          <p class="modal-subtitle">${Lang.t('auth.logout.confirm.sub')}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-cancel">${Lang.t('auth.logout.confirm.cancel')}</button>
          <button class="btn btn-danger" id="confirm-ok">${Lang.t('auth.logout.confirm.ok')}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    this._confirmModal = overlay;
  },

  _showConfirm(title, subtitle, okText, okClass, action) {
    if (!this._confirmModal) this._createConfirmModal();
    const modal = this._confirmModal;
    modal.querySelector('.modal-title').textContent = title;
    modal.querySelector('.modal-subtitle').textContent = subtitle;
    const okBtn = modal.querySelector('#confirm-ok');
    okBtn.textContent = okText;
    okBtn.className = `btn ${okClass}`;
    const cancelBtn = modal.querySelector('#confirm-cancel');
    const bg = modal.querySelector('.modal-overlay-bg');

    const cleanup = () => {
      modal.classList.remove('active');
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      bg.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onEscape);
    };
    const onCancel = () => cleanup();
    const onOk = () => { cleanup(); action(); };
    const onEscape = (e) => { if (e.key === 'Escape') cleanup(); };
    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    bg.addEventListener('click', onCancel);
    document.addEventListener('keydown', onEscape);
    modal.classList.add('active');
  },

  logout() {
    this._showConfirm(
      Lang.t('auth.logout.confirm.title'),
      Lang.t('auth.logout.confirm.sub'),
      Lang.t('auth.logout.confirm.ok'),
      'btn-danger',
      () => {
        localStorage.removeItem(this.STORAGE_KEY);
        this.updateUI();
        showToast(Lang.t('auth.loggedout'), 'info');
      }
    );
  },

  canEdit(item) {
    return item.author === this.getUser();
  },

  async hashPassword(password) {
    const enc = new TextEncoder().encode(password);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex;
  },

  async getUsers() {
    const data = await fetchAll();
    return data.users || [];
  },

  async register(username, password) {
    const users = await this.getUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error(Lang.t('auth.taken'));
    }
    const passwordHash = await this.hashPassword(password);
    const data = await fetchAll(true);
    if (!data.users) data.users = [];
    data.users.push({ username, passwordHash, createdAt: new Date().toISOString() });
    const ok = await saveAll(data);
    if (!ok) throw new Error(Lang.t('auth.register.error'));
    this.setUser(username);
    this.updateUI();
    Favorites.loadFromServer();
  },

  async login(username, password) {
    const users = await this.getUsers();
    const user = users.find(u => u.username === username);
    if (!user) throw new Error(Lang.t('auth.notfound'));
    const hash = await this.hashPassword(password);
    if (hash !== user.passwordHash) throw new Error(Lang.t('auth.wrongpass'));
    this.setUser(username);
    this.updateUI();
    Favorites.loadFromServer();
  },

  showModal(mode, callback) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    modal.classList.add('active');

    const tabs = modal.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const loginTab = document.getElementById('auth-login-tab');
    const registerTab = document.getElementById('auth-register-tab');

    let loginFooterBtn = document.getElementById('auth-login-btn');
    let registerFooterBtn = document.getElementById('auth-register-btn');
    const strengthBar = document.getElementById('auth-strength-bar');
    const strengthText = document.getElementById('auth-strength-text');

    const errorEl = modal.querySelector('#auth-error');
    const clearError = () => { if (errorEl) errorEl.textContent = ''; };

    const clearFields = (form) => {
      form.querySelectorAll('input').forEach(i => i.value = '');
    };

    const switchMode = (m) => {
      tabs.forEach(t => t.classList.remove('active'));
      if (m === 'login') {
        loginTab.classList.add('active');
        loginForm.style.display = '';
        registerForm.style.display = 'none';
        loginFooterBtn.style.display = '';
        registerFooterBtn.style.display = 'none';
      } else {
        registerTab.classList.add('active');
        loginForm.style.display = 'none';
        registerForm.style.display = '';
        loginFooterBtn.style.display = 'none';
        registerFooterBtn.style.display = '';
      }
      clearError();
      clearFields(loginForm);
      clearFields(registerForm);
      if (strengthBar) { strengthBar.style.width = '0'; strengthBar.className = 'strength-bar-fill'; }
      if (strengthText) strengthText.textContent = '';
    };

    loginTab.onclick = () => switchMode('login');
    registerTab.onclick = () => switchMode('register');

    switchMode(mode || 'login');

    // ── Login ──
    const loginBtn = document.getElementById('auth-login-btn');
    const loginInput = document.getElementById('auth-login-input');
    const loginPass = document.getElementById('auth-login-pass');
    const loginToggle = document.getElementById('auth-login-toggle');

    const createEyeIcon = (closed) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.5');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      if (closed) {
        svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>';
      } else {
        svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
      }
      return svg;
    };

    const setupToggle = (btn, input) => {
      btn.textContent = '';
      btn.appendChild(createEyeIcon(true));
      btn.onclick = () => {
        const wasHidden = input.type === 'password';
        input.type = wasHidden ? 'text' : 'password';
        btn.textContent = '';
        btn.appendChild(createEyeIcon(!wasHidden));
      };
    };

    setupToggle(loginToggle, loginPass);

    const doLogin = async () => {
      const username = loginInput.value.trim();
      const password = loginPass.value;
      if (!username || !password) {
        errorEl.textContent = Lang.t('auth.fill.all');
        return;
      }
      try {
        await this.login(username, password);
        this.hideModal();
        if (callback) {
          callback(username);
        } else {
          window.location.href = 'profile.html';
        }
      } catch (e) {
        errorEl.textContent = e.message;
      }
    };

    const newLoginBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
    newLoginBtn.addEventListener('click', doLogin);
    loginFooterBtn = newLoginBtn;

    loginInput.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); clearError(); };
    loginPass.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); clearError(); };

    // ── Register ──
    const registerBtn = document.getElementById('auth-register-btn');
    const regInput = document.getElementById('auth-reg-input');
    const regPass = document.getElementById('auth-reg-pass');
    const regConfirm = document.getElementById('auth-reg-confirm');
    const regToggle = document.getElementById('auth-reg-toggle');
    const regConfirmToggle = document.getElementById('auth-reg-confirm-toggle');

    setupToggle(regToggle, regPass);
    setupToggle(regConfirmToggle, regConfirm);

    const updateStrength = () => {
      const val = regPass.value;
      let score = 0;
      if (val.length >= 6) score++;
      if (val.length >= 10) score++;
      if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++;
      if (/\d/.test(val)) score++;
      if (/[^a-zA-Z0-9]/.test(val)) score++;
      const pct = Math.min(score / 5 * 100, 100);
      strengthBar.style.width = pct + '%';
      if (score <= 1) {
        strengthBar.className = 'strength-bar-fill weak';
        strengthText.textContent = Lang.t('auth.strength.weak');
      } else if (score <= 3) {
        strengthBar.className = 'strength-bar-fill medium';
        strengthText.textContent = Lang.t('auth.strength.medium');
      } else {
        strengthBar.className = 'strength-bar-fill strong';
        strengthText.textContent = Lang.t('auth.strength.strong');
      }
    };
    regPass.oninput = updateStrength;

    const doRegister = async () => {
      const username = regInput.value.trim();
      const password = regPass.value;
      const confirm = regConfirm.value;
      if (!username || !password || !confirm) {
        errorEl.textContent = Lang.t('auth.fill.all');
        return;
      }
      if (username.length < 2 || username.length > 20) {
        errorEl.textContent = Lang.t('auth.username.len');
        return;
      }
      if (password.length < 6) {
        errorEl.textContent = Lang.t('auth.password.len');
        return;
      }
      if (password !== confirm) {
        errorEl.textContent = Lang.t('auth.password.match');
        return;
      }
      try {
        await this.register(username, password);
        this.hideModal();
        if (callback) {
          callback(username);
        } else {
          window.location.href = 'profile.html';
        }
      } catch (e) {
        errorEl.textContent = e.message;
      }
    };

    const newRegisterBtn = registerBtn.cloneNode(true);
    registerBtn.parentNode.replaceChild(newRegisterBtn, registerBtn);
    newRegisterBtn.addEventListener('click', doRegister);
    registerFooterBtn = newRegisterBtn;

    regInput.onkeydown = (e) => { if (e.key === 'Enter') doRegister(); clearError(); };
    regPass.onkeydown = (e) => { if (e.key === 'Enter') doRegister(); clearError(); };
    regConfirm.onkeydown = (e) => { if (e.key === 'Enter') doRegister(); clearError(); };
  },

  hideModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
  },

  updateUI() {
    const user = this.getUser();
    const loginBtn = document.getElementById('login-btn');
    const userDisplay = document.getElementById('user-display');
    const userNickname = document.getElementById('user-nickname');
    const userAvatar = document.getElementById('user-avatar');
    const profileLinks = document.querySelectorAll('.profile-nav-link');
    const profileMobileLinks = document.querySelectorAll('.profile-nav-link-mobile');
    const chatLinks = document.querySelectorAll('#chat-nav-link');
    const chatMobileLinks = document.querySelectorAll('.mobile-menu-link[href="chat.html"]');
    const unreadBadges = document.querySelectorAll('.chat-unread-badge');

    if (!loginBtn || !userDisplay) return;

    if (user) {
      loginBtn.style.display = 'none';
      userDisplay.style.display = 'flex';
      if (userNickname) userNickname.textContent = user;
      if (userAvatar) userAvatar.textContent = user.charAt(0).toUpperCase();
      profileLinks.forEach(el => el.style.display = 'flex');
      profileMobileLinks.forEach(el => el.style.display = 'flex');
      chatLinks.forEach(el => el.style.display = 'flex');
      chatMobileLinks.forEach(el => el.style.display = 'flex');
      unreadBadges.forEach(el => el.style.display = 'none');
      updateUnreadBadge();
    } else {
      loginBtn.style.display = 'flex';
      userDisplay.style.display = 'none';
      profileLinks.forEach(el => el.style.display = 'none');
      profileMobileLinks.forEach(el => el.style.display = 'none');
      chatLinks.forEach(el => el.style.display = 'none');
      chatMobileLinks.forEach(el => el.style.display = 'none');
      unreadBadges.forEach(el => el.style.display = 'none');
    }
  },

  requireAuth(callback) {
    const user = this.getUser();
    if (user) {
      if (callback) callback(user);
      return true;
    } else {
      this.showModal('login', callback);
      return false;
    }
  },

  init() {
    this.updateUI();

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.showModal('login'));
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    const modalBg = document.querySelector('.modal-overlay-bg');
    if (modalBg) {
      modalBg.addEventListener('click', () => this.hideModal());
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideModal();
    });
  }
};
