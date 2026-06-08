/* =========================================================
   config.example.js — Шаблон конфигурации
   Скопируйте в config.js и заполните своими ключами
   ========================================================= */

const CONFIG = {
  BIN_ID: 'your-jsonbin-bin-id',
  API_KEY: 'your-jsonbin-master-key',
  IMGBB_API_KEY: 'your-imgbb-api-key',
  BASE_URL: 'https://api.jsonbin.io/v3',

  ITEMS_PER_PAGE: 10,

  CATEGORIES: [
    { id: 'учебники',    label: 'Учебники',    icon: '📚', color: '#3b82f6' },
    { id: 'электроника', label: 'Электроника', icon: '📱', color: '#06b6d4' },
    { id: 'одежда',      label: 'Одежда',      icon: '👕', color: '#ec4899' },
    { id: 'другое',      label: 'Другое',      icon: '📦', color: '#f59e0b' }
  ]
};
