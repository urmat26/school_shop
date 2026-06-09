/* =========================================================
   theme.js — Тёмная / светлая тема
   ========================================================= */

const Theme = {
  STORAGE_KEY: 'marketplace_theme',

  get() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-label', isDark ? 'Включить светлую тему' : 'Включить тёмную тему');
      btn.title = isDark ? 'Светлая тема' : 'Тёмная тема';
      btn.textContent = isDark ? '☀️' : '🌙';
    }
  },

  toggle() {
    const next = this.get() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(this.STORAGE_KEY, next);
    this.apply(next);
  },

  init() {
    this.apply(this.get());

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => this.toggle());
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Theme.init());
