# Правила проекта

> **Для ИИ:** перед тем как писать или редактировать код — сначала прочитай этот файл целиком.

## Git-работа

```powershell
git add -A; if ($?) { git commit -m "..." }; if ($?) { git push }
```

- Сообщения коммитов — только на **русском**
- Пушим напрямую в `main` (без PR)
- `config.js` в `.gitignore` — никогда не коммитить вручную

## Что коммитить

Все файлы в репозитории. `.gitignore` уже исключает:
- `config.js` (локальные API-ключи)
- `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`

## Стиль кода

- **Без комментариев** в production-коде (кроме случаев, когда они действительно необходимы)
- Без эмодзи в коде (кроме пользовательских UI-строк)
- Следовать существующим паттернам — использовать `const $ = id ⇒ document.getElementById(id)` для DOM-запросов
- Скрипты подключать в порядке: `theme.js → config.js → api.js → auth.js → page-specific.js`

## Именование

- HTML-файлы: маленькие буквы, дефисы (`profile.html`, не `Profile.html`)
- JS-файлы: маленькие буквы (`auth.js`, `api.js`)
- CSS-классы: kebab-case (`profile-nav-link`, `item-card-body`)
- JS-идентификаторы: camelCase (`loadProfileData`, `handleFavorite`)

## Хранилище

- Данные профиля (аватар, имя, bio, email, локация) → localStorage (`marketplace_profile`)
- Избранное → localStorage (`marketplace_favorites`)
- Тема → localStorage (`marketplace_theme`)
- Недавно просмотренное → localStorage (`marketplace_recently`)
- Сессия авторизации → localStorage (`marketplace_user`)
- Товары, пользователи, сообщения → JSONBin.io через Vercel Proxy (`/api/data`)

## Авторизация / Роутинг

- Вход/регистрация без callback → редирект на `profile.html`
- Вход/регистрация с callback (например `requireAuth` из `create.html`) → вызов callback, без редиректа
- Модалка авторизации — единая точка входа; отдельной страницы логина нет
- Ссылка «Профиль» в навигации видна только когда пользователь залогинен (CSS `display: none` + JS меняет на `display: flex`)
