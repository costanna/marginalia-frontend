# Marginalia · Frontend

[![CI](https://github.com/costanna/marginalia-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/costanna/marginalia-frontend/actions/workflows/ci.yml)

Web app for **Marginalia**, an AI-powered English corrector that annotates a learner's text like a
teacher's margin notes, estimates the CEFR level and builds personalised exercises.

> Status: **Phase 7 (progress)** done: write a text and read it annotated, browse and delete your
> saved texts, edit your profile, download all your data and delete your account, practise the rules
> you fail most with exercises built from your own mistakes, and see KPIs, a streak and three charts
> built from your own history. Next: deployment polish (Phase 8).

Backend: [marginalia-backend](https://github.com/costanna/marginalia-backend)

## Stack

Angular 22 (standalone components, signals, zoneless, `OnPush`) · strict TypeScript · SCSS with CSS
variables · Transloco (ca / es / en) · self-hosted Inter and Fraunces · Chart.js (via ng2-charts) ·
Vitest · ESLint (angular-eslint, with template accessibility rules) · Prettier · deployed on Vercel

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
    features/   landing (with the demo), auth, write, history (list, detail), practice, progress,
                settings, not-found
  assets/i18n/  ca.json, es.json, en.json
  styles/       tokens, themes (light/dark), base, components
  testing/      fixtures, i18n test provider, a canvas/ResizeObserver stub for chart specs
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
- **`(ngSubmit)` needs `[formGroup]` (or `FormsModule`'s `NgForm`) to fire at all.**
  `ReactiveFormsModule` alone exports `FormControlDirective`, `FormGroupDirective` and friends, but
  not `NgForm`; a bare `<form (ngSubmit)="...">` with no `[formGroup]` compiles without error but the
  handler is never called (a raw `submit` event still reaches a plain native listener, which is how
  this was found). The practice screen's fill-in-the-blank form wraps its single `FormControl` in a
  one-field `FormGroup` purely so `[formGroup]` has something to bind to.
- **Practice is one exercise at a time, capped at 640px and centred**, at every screen width (not
  just on mobile): a quiz reads better as a single column than as a grid. The correct answer and the
  explanation are never sent to the browser before an attempt; the API only reveals them in the
  response to that attempt.
- **A batch of exercises survives a reload.** Generating is idempotent: while any exercise from the
  current batch is still unanswered, the API hands the same batch back instead of building (and
  charging for) a new one, so leaving mid-session and coming back resumes where the learner left off.
- **Charts read their colours from the page's CSS custom properties at draw time**
  (`cssColor(document, name)`, via `getComputedStyle`), never a fixed palette: a `computed` that
  depends on `ThemeService.resolved()` re-reads them and rebuilds each chart's `data`/`options`
  whenever the theme changes, so light/dark and the category colours always match the rest of the UI.
- **Chart.js is registered on `ProgressPage`'s own `@Component` providers, not on the route.** A
  route's `providers` in `app.routes.ts` are evaluated as soon as that (eagerly-imported) file loads,
  which would pull `ng2-charts` and `chart.js` into the main bundle; providers on a lazy-loaded
  standalone component are only evaluated once its own chunk is fetched. Moving `provideCharts(...)`
  from the route to the component dropped the main bundle by ~180KB (verified with `ng build`) with no
  behaviour change. Only the specific `ChartComponentLike`s the three charts need are registered
  (`chart-setup.ts`), not Chart.js's full `registerables` — including `Filler`, needed for the line
  chart's area fill even though the line itself draws without it (Chart.js only warns, never throws,
  if a used plugin isn't registered — worth registering deliberately rather than reading the console).
- **A `fullPage` screenshot can catch a chart mid-redraw.** Verifying this screen with Playwright,
  a `page.screenshot({ fullPage: true })` taken right after the page settled showed the three chart
  panels completely blank, with no console error; a tall fixed-viewport screenshot of the same page
  state showed them fully rendered. `fullPage` resizes the viewport to the document's height just
  before capturing, which fires Chart.js's `ResizeObserver`-driven redraw; that redraw isn't always
  synchronous with the capture. Not an app bug — just something to know when scripting verification
  against real Chart.js output: prefer a tall viewport over `fullPage` for pages with charts.

## Environment

Angular does not read environment variables at run time: the API URL is compiled into the bundle
from `src/environments/environment.ts` (local) and `environment.production.ts` (set the Render URL
there before deploying).

## Author

[@costanna](https://github.com/costanna)
