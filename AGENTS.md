# Правила проекта

> **Для ИИ:** перед тем как писать или редактировать код — сначала прочитай этот файл целиком.

## Git-работа

```powershell
git add -A; if ($?) { git commit -m "..." }; if ($?) { git push }
```

- Сообщения коммитов — только на **русском**
- Пушим напрямую в `main` (без PR)

## Что коммитить

Все файлы в репозитории. `.gitignore` исключает:
- `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`

> `config.js` **НЕ** в `.gitignore` — он должен быть в репозитории, т.к. Vercel раздаёт его как статику.
> Ключи API всё равно видны в клиентском JS, так что это ожидаемо для учебного проекта.

## Стиль кода

- **Без комментариев** в production-коде (кроме случаев, когда они действительно необходимы)
- Без эмодзи в коде (кроме пользовательских UI-строк)
- Следовать существующим паттернам — использовать `const $ = id ⇒ document.getElementById(id)` для DOM-запросов
- Скрипты подключать в порядке: `lang.js → theme.js → config.js → api.js → auth.js → page-specific.js`

## TypeScript

- Исходники `.ts` лежат в `src/`, компилируются в корень: `npm run build` (запускает `tsc`)
- Сейчас на TypeScript: `config.ts`, `api.ts` (остальные пока `.js`)
- `config.js` и `api.js` в корне — это скомпилированный вывод; их код в `src/*.ts`
- Типы и интерфейсы: `src/global.d.ts`

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

---

## Состояние сессии (13.06.2026)

### Что сделано
- **item.js** — перезаписан (добавлен `"use strict"`, удалён лишний код) для устранения `Uncaught SyntaxError: Unexpected token '}'` (файл на диске был валиден, ошибка оставалась в браузере — возможно кеш SW/HTTP)
- **item.js** — возвращена пропущенная привязка `deleteConfirm.addEventListener('click', handleDelete)` и `deleteModal.querySelector('.modal-overlay-bg').addEventListener('click', hideDeleteModal)`
- **chat.js** — добавлен `showToast(Lang.t('toast.message.sent'), 'success')` после успешной отправки сообщения
- **lang.js** — добавлен ключ `toast.message.sent` для всех трёх языков (ru/kg/en)

### Открытые вопросы
1. **SyntaxError** — пользователю нужно проверить на клиенте (Ctrl+F5 / очистка SW в DevTools → Application → Service Workers → Unregister + hard reload). При повторении — проверить **DevTools → Sources → item.js:341** что реально показывает браузер.
2. **Перевод `chat.placeholder`** — ключ `chat.placeholder` не найден в коде; возможно ошибка была старой (проверить `chat.input.placeholder` на странице чата).
3. **Toast в чате** — теперь показывается ✅ Сообщение отправлено при успешной отправке.

### Коммиты сессии
```
414b0f1 Перезапись item.js для устранения мистической SyntaxError
9cac894  fix: возвращена привязка события deleteConfirm к handleDelete
a4d37b3  feat: добавлен toast об успешной отправке сообщения + переводы
```
