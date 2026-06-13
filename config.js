"use strict";
/* =========================================================
   config.js — Конфигурация маркетплейса
   ========================================================= */
const CONFIG = {
    BIN_ID: '6a253eecda38895dfe9433b1',
    API_KEY: '$2a$10$fiHdhRvk3KmHunM3LiFwQup5ESfIC3gi33YWwYu.gfy7kTpRhJD9m',
    IMGBB_API_KEY: '6d99550405de855a50e134d5cb9715fa',
    BASE_URL: 'https://api.jsonbin.io/v3',
    // Vercel Serverless (использовать вместо прямых вызовов JSONBin/ImgBB)
    USE_VERCEL_PROXY: false, // true = использовать /api/data + /api/upload
    VERCEL_DATA_URL: '/api/data', // прокси для JSONBin
    VERCEL_UPLOAD_URL: '/api/upload', // прокси для ImgBB
    // Настройки приложения
    ITEMS_PER_PAGE: 10,
    // Категории товаров
    CATEGORIES: [
        { id: 'учебники', label: 'Учебники', icon: '📚', color: '#3b82f6' },
        { id: 'электроника', label: 'Электроника', icon: '📱', color: '#06b6d4' },
        { id: 'одежда', label: 'Одежда', icon: '👕', color: '#ec4899' },
        { id: 'другое', label: 'Другое', icon: '📦', color: '#f59e0b' }
    ]
};
