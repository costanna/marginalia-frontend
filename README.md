# Marginalia · Frontend

[![CI](https://github.com/costanna/marginalia-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/costanna/marginalia-frontend/actions/workflows/ci.yml)

Web app for **Marginalia**, an AI-powered English corrector that annotates a learner's text like a
teacher's margin notes, estimates the CEFR level and builds personalised exercises.

> Status: **Phase 5 (history and settings)** done: write a text and read it annotated, browse and
> delete your saved texts, edit your profile, download all your data and delete your account.
> Next: practice (Phase 6) and progress (Phase 7).

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
    shared/ui/  reusable components: button, form field, empty state, confirm dialog, logo, toggles...
    shared/     also forms (validators), format (dates), download (save a JSON file)
    layout/     header (with the mobile side panel), footer, shell
    features/   landing (with the demo), auth, write, history (list, detail), settings, not-found
  assets/i18n/  ca.json, es.json, en.json
  styles/       tokens, themes (light/dark), base, components
```

## Requirements covered on every screen

- **Dark mode** (light / dark / system): an inline script sets `data-theme` before the first paint, so
  there is no flash; the choice persists in `localStorage` and, when signed in, in the profile.
- **Three languages**, switched instantly without reloading; no visible text lives in templates or
  TypeScript, only in the JSON files. A test checks the three files have identical keys and
  parameters, and that every API error code is translated.
- **Responsive** from 320px to 1920px and beyond, mobile first, no horizontal scroll, 44px touch
  targets and 16px inputs. The page container is fluid (side padding grows from 16px to 64px), so the
  navbar, footer and pages use the whole screen; only what reads badly stretched keeps a width (the
  sign-in card, the hero text, the forms in settings).
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
- **Offsets are converted once, in a pure function.** The API counts Unicode code points (Python),
  JavaScript strings count UTF-16 units: an emoji is one and two. `buildSegments` converts them and is
  tested with emoji, ZWJ sequences, accents, CJK and 200 random round-trips. Checked end to end in a
  real browser: with an emoji before the mistakes, every mark falls exactly on the fragment the server
  located, and "copy text" after "apply all" is identical to the server's `corrected_text`.
- **The learner's text and the model's explanations are never HTML.** Marks and text use
  `[textContent]` (no `innerHTML`); a test feeds `<img onerror>` and `<script>` and checks nothing runs.
  `[textContent]` also avoids the whitespace Angular adds around an interpolation, which would show as
  spaces inside inline marks.
- **Categories are told apart by colour AND underline style** (wavy, dotted, dashed, solid, double),
  and the same headings work under any page: their level (`h2`/`h3`) is an input.
- **Native controls where they are best**: the language menu is a `<select>`, the mobile menu and the
  confirmation dialogs are modal `<dialog>`s (focus trap and Escape for free). The confirmation starts
  on "Cancel" and cannot be dismissed while the request runs.
- **The history keeps its state in the address** (`/history?level=B1&page=2`): back button, reload and
  shared links work. A late answer for a filter the user already left is dropped (`switchMap`), and a
  page past the end shows the last one instead of an error.
- **The whole history card is one tap target** (the title link stretches over it), so the accessible
  name stays the title and the target is far above 44px.
- **"Export my data" is built in the browser**: the JSON the API returns becomes a Blob and a hidden
  `download` link; nothing goes through a third party. The API limits it to 5 per minute.
- **Deleting is always asked twice** (a delete button, then a dialog that names the consequence), and
  deleting the account ends the session and returns to the home page.

## Environment

Angular does not read environment variables at run time: the API URL is compiled into the bundle
from `src/environments/environment.ts` (local) and `environment.production.ts` (set the Render URL
there before deploying).

## Author

[@costanna](https://github.com/costanna)
