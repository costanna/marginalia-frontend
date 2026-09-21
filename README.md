# Marginalia · Frontend

[![CI](https://github.com/costanna/marginalia-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/costanna/marginalia-frontend/actions/workflows/ci.yml)

Web app for **Marginalia**, an AI-powered English corrector that annotates a learner's text like a
teacher's margin notes, estimates the CEFR level and builds personalised exercises.

> Status: **Phase 3 (frontend base)** done: design system, light/dark theme, three languages,
> layout, landing, sign-up and login. The writing screen arrives in Phase 4.

Backend: [marginalia-backend](https://github.com/costanna/marginalia-backend)

## Stack

Angular 22 (standalone components, signals, zoneless, `OnPush`) · strict TypeScript · SCSS with CSS
variables · Transloco (ca / es / en) · self-hosted Inter and Fraunces · Vitest · ESLint
(angular-eslint, with template accessibility rules) · Prettier · deployed on Vercel

## Run locally

```bash
npm ci
npm start          # http://localhost:4200
```

It talks to the API at `http://localhost:8000/api/v1` (see `src/environments/environment.ts`). Start
the backend first (`docker compose up` in `marginalia-backend`); it works out of the box with its
free, offline LLM client.

| Script                                    | What it does                                 |
| ----------------------------------------- | -------------------------------------------- |
| `npm start`                               | Dev server                                   |
| `npm run build`                           | Production build (`dist/marginalia/browser`) |
| `npm run lint`                            | ESLint, including template accessibility     |
| `npm run test:ci`                         | Unit tests once, headless (Vitest + jsdom)   |
| `npm run format:check` / `npm run format` | Prettier                                     |

## Structure

```
src/
  app/
    core/       api (ApiService, interceptors), auth, i18n, theme, preferences, toast, config
    shared/ui/  reusable components: button, form field, logo, theme toggle, language switcher...
    layout/     header (with the mobile side panel), footer, shell
    features/   landing, auth (login, register), write, not-found
  assets/i18n/  ca.json, es.json, en.json
  styles/       tokens, themes (light/dark), base, components
```

## Requirements covered on every screen

- **Dark mode** (light / dark / system): an inline script sets `data-theme` before the first paint, so
  there is no flash; the choice persists in `localStorage` and, when signed in, in the profile.
- **Three languages**, switched instantly without reloading; no visible text lives in templates or
  TypeScript, only in the JSON files. A test checks the three files have identical keys and
  parameters, and that every API error code is translated.
- **Responsive** from 320px to 1920px, mobile first, no horizontal scroll, 44px touch targets and
  16px inputs.
- **Footer** with the current year (computed, never typed) and the `@costanna` link on every page.
- **Accessibility**: landmarks, skip link, visible focus ring, labelled and described form fields,
  announced errors, `prefers-reduced-motion`, information never conveyed by colour alone.

## Technical decisions

- **The first paint never waits for the server.** The free hosting plan puts the API to sleep; the
  app pings `/health` in the background and shows a "waking up the server" banner after 3 seconds.
- **API errors are translated by code**, never by the server's text: `errors.api.<code>`. Forms show
  their own errors inline; other failures show a toast.
- **Interceptors have a clear order**: an expired token ends the session (and redirects only when the
  visitor is on a private page); a wrong password is not mistaken for an expired session.
- **The token goes to our API only**, never to other origins. It lives in `localStorage`: simple
  across the Vercel and Render domains, at the price of being readable by injected scripts (XSS).
  Angular escapes templates by default and user content is never rendered as HTML. The alternative,
  an httpOnly cookie, needs both apps under one domain.
- **`returnUrl` is validated** so the login page cannot be used as an open redirect.
- **Preferences are saved on explicit user actions**, not by watching signals: the language loads
  asynchronously, and watching it would let a not-yet-switched value overwrite the saved one.
- **Native controls where they are best**: the language menu is a `<select>`, the mobile menu is a
  modal `<dialog>` (focus trap and Escape for free).

## Environment

Angular does not read environment variables at run time: the API URL is compiled into the bundle
from `src/environments/environment.ts` (local) and `environment.production.ts` (set the Render URL
there before deploying).

## Author

[@costanna](https://github.com/costanna)
