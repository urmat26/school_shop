/* =========================================================
   config.js — Конфигурация маркетплейса
   ========================================================= */

const CONFIG = {
  // ⚠️ ЗАМЕНИ на свои данные из JSONBin.io
  BIN_ID: 'YOUR_BIN_ID_HERE',
  API_KEY: '$2a$10$YOUR_API_KEY_HERE',
  BASE_URL: 'https://api.jsonbin.io/v3',

  // Настройки приложения
  ITEMS_PER_PAGE: 10,

  // Категории товаров
  CATEGORIES: [
    { id: 'учебники',    label: 'Учебники',    icon: '📚', color: '#3b82f6' },
    { id: 'электроника', label: 'Электроника', icon: '📱', color: '#06b6d4' },
    { id: 'одежда',      label: 'Одежда',      icon: '👕', color: '#ec4899' },
    { id: 'другое',      label: 'Другое',      icon: '📦', color: '#f59e0b' }
  ]
};
