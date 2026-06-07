/* =========================================================
   config.js — Конфигурация маркетплейса
   ========================================================= */

const CONFIG = {
  BIN_ID: '6a253eecda38895dfe9433b1',
  API_KEY: '$2a$10$fiHdhRvk3KmHunM3LiFwQup5ESfIC3gi33YWwYu.gfy7kTpRhJD9m',
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
