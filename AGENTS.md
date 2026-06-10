# Project Guidelines

## Git Workflow

```powershell
git add -A; if ($?) { git commit -m "..." }; if ($?) { git push }
```

- Commit messages must be written in **Russian**
- Push directly to `main` (no PR workflow)
- `config.js` is in `.gitignore` — never commit it manually

## Commit Scope

All files in the repo should be committed. The `.gitignore` already excludes:
- `config.js` (local API keys)
- `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`

## Code Style

- **No comments** in production code (unless absolutely necessary for explanation)
- No emojis in code (except user-facing UI strings)
- Follow existing patterns — use `const $ = id => document.getElementById(id)` for DOM queries
- Scripts load in order: `theme.js → config.js → api.js → auth.js → page-specific.js`

## Naming

- HTML files: lowercase with hyphens (`profile.html`, not `Profile.html`)
- JS files: lowercase (`auth.js`, `api.js`)
- CSS classes: kebab-case (`profile-nav-link`, `item-card-body`)
- JS identifiers: camelCase (`loadProfileData`, `handleFavorite`)

## Storage

- Profile data (avatar, name, bio, email, location) → localStorage (`marketplace_profile`)
- Favorites → localStorage (`marketplace_favorites`)
- Theme preference → localStorage (`marketplace_theme`)
- Recently viewed → localStorage (`marketplace_recently`)
- Auth session → localStorage (`marketplace_user`)
- Items, users, messages → JSONBin.io via Vercel Proxy (`/api/data`)

## Auth / Routing

- Login/register without callback → redirect to `profile.html`
- Login/register with callback (e.g. `requireAuth` from `create.html`) → fire callback, no redirect
- Auth modal is the single entry point; no separate login page
- Profile nav link visible only when logged in (CSS `display: none` + JS sets `display: flex`)
