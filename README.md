# Marginalia · Frontend

[![CI](https://github.com/costanna/marginalia-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/costanna/marginalia-frontend/actions/workflows/ci.yml)

Web app for **Marginalia**, an AI-powered English corrector that annotates a learner's text like a
teacher's margin notes, estimates the CEFR level and builds personalised exercises.

> Status: **Phase 9 (portfolio polish)**. All planned phases (0-9) are done: write a text and read it
> annotated, browse and delete your saved texts, edit your profile, download all your data and
> delete your account, practise the rules you fail most with exercises built from your own mistakes,
> see KPIs, a streak and three charts built from your own history, a strict Content-Security-Policy
> on the deployed site, and the interface in Catalan, Spanish, English or French.

Backend: [marginalia-backend](https://github.com/costanna/marginalia-backend)

## Stack

Angular 22 (standalone components, signals, zoneless, `OnPush`) · strict TypeScript · SCSS with CSS
variables · Transloco (ca / es / en / fr) · self-hosted Inter and Fraunces · Chart.js (via ng2-charts) ·
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
  assets/i18n/  ca.json, es.json, en.json, fr.json
  styles/       tokens, themes (light/dark), base, components
  testing/      fixtures, i18n test provider, a canvas/ResizeObserver stub for chart specs
```

## Requirements covered on every screen

- **Dark mode** (light / dark / system): an inline script sets `data-theme` before the first paint, so
  there is no flash; the choice persists in `localStorage` and, when signed in, in the profile.
- **Four languages** (Catalan, Spanish, English, French), switched instantly without reloading; no
  visible text lives in templates or TypeScript, only in the JSON files. A test checks all four
  files have identical keys and parameters, and that every API error code is translated.
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
- **The Content-Security-Policy needs no script hash, but does need `'unsafe-inline'` for styles.**
  The theme-setting script that used to be inlined in `index.html` (to run before first paint,
  avoiding a flash of the wrong theme) now lives in `public/theme-init.js` instead — a plain
  `<script src="theme-init.js">` covered by `script-src 'self'`, with no per-build hash to keep in
  sync whenever the script is edited. `script-src` stays strict with no exceptions.
  `style-src`, though, needs `'unsafe-inline'`: Angular's Emulated view encapsulation applies a
  component's `styles` by inserting a `<style>` element per component _type_ into `<head>` the first
  time it renders — and a dynamically-created `<style>` element is "inline" to CSP regardless of its
  content, so every such insertion needs `'unsafe-inline'` (or a nonce, which needs a per-request
  server to mint) unless the exact CSS text matches a hash source, which is as unmanageable per
  component as it was for one script. An earlier version of this policy shipped without
  `'unsafe-inline'` in `style-src` on the (wrong) belief that Angular's runtime style injection did
  not need it: manual testing of several pages found no console violations, but the one component it
  never happened to catch — the header's theme toggle, silently missing its whole `.toggle` rule and
  shrunk to its unstyled ~16×32px browser default — was exactly what Lighthouse's `target-size`
  accessibility audit on the live site caught. Confirmed the fix by measuring that button's real
  bounding box (44×44px again once `'unsafe-inline'` is present) and finding zero CSP violations from
  the app's own code (`chunk-*.js`) with it, versus several `Applying inline style violates ...
style-src` errors sourced from the app's own bundle without it. `optimization.styles.inlineCritical`
  in `angular.json` stays off regardless — a normal blocking `<link>` for the stylesheet, not tied to
  this decision — and Lighthouse (audited from a clean environment, since this machine's antivirus
  intercepts and injects its own render-blocking resources into every page load, local and remote
  alike, which is a trap worth knowing about before trusting any Lighthouse run on a contaminated
  machine) already scores Performance 100 desktop / 94 mobile, so there was nothing to chase there.
- **Adding French only meant a fourth JSON file and a fourth array entry** (`SUPPORTED_LANGS`) —
  everywhere else in the app already reads the language list from `SUPPORTED_LANGS` rather than
  naming "the three languages", so nothing else needed to change. The one real gap it exposed:
  `src/testing/i18n-testing.ts` served the REAL translation files to every spec, but its own
  `TRANSLATIONS` map had `ca`/`es`/`en` typed out by hand rather than built from `SUPPORTED_LANGS`,
  so it silently kept working for the three original languages and would have quietly served
  `undefined` for French in every test — an easy thing to miss without a test that actually renders
  in French (added to `header.component.spec.ts`, and confirmed non-vacuous the same way as
  everything else: reverting the fix in `i18n-testing.ts` breaks exactly that one test).

## Environment

Angular does not read environment variables at run time: the API URL is compiled into the bundle
from `src/environments/environment.ts` (local) and `environment.production.ts` (set the Render URL
there before deploying).

## Deployment (Vercel, free)

Already deployed at [marginalia-english.vercel.app](https://marginalia-english.vercel.app) (the name
`marginalia` was taken, hence `-english`). To redeploy or set it up again:

1. _New Project_, import this repository. Vercel detects Angular automatically (build command
   `ng build`, output `dist/marginalia/browser`); no extra configuration needed beyond `vercel.json`,
   already in the repo.
2. **Deployment Protection / Vercel Authentication must stay OFF.** With it on, every visitor is sent
   to a Vercel login page instead of the app — easy to miss since it works fine when _you_ are signed
   into Vercel.
3. Before deploying, `src/environments/environment.production.ts` must point at the real backend URL
   (see [marginalia-backend](https://github.com/costanna/marginalia-backend)'s own deployment steps);
   Angular compiles it into the bundle, so a stale URL there means redeploying, not an env var change.

**Verify** after any deploy that touches `vercel.json`, `index.html` or `angular.json`'s
`optimization` settings — a CSP mistake fails silently (nothing crashes, things just quietly stop
rendering or running):

1. Open the deployed site in a real browser with the console open. `data-theme` must already be set
   on `<html>` on first load (no flash of the wrong theme), and the page must be fully styled — both
   depend on `theme-init.js` and the stylesheet loading, which the CSP could block.
2. No `Content Security Policy` / `Refused to` messages in the console anywhere in the app (sign up,
   write and analyse a text, history, practice, progress, settings). A real browser extension (e.g.
   antivirus web-protection) can add noise here by rewriting the page's policy — check the reported
   violation's source before assuming it is the app's.
3. `curl -s -D - -o /dev/null https://marginalia-english.vercel.app/ | grep -i content-security` shows
   the policy actually being sent (not just present in `vercel.json`).
4. Any change to `public/theme-init.js`'s content does not need a matching change anywhere else — that
   is the point of it being a `script-src 'self'`-covered file instead of an inline, hashed one.

## Author

[@costanna](https://github.com/costanna)
