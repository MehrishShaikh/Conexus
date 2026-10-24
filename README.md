# CONEXUs — The Intelligent Campus Experience

A premium, responsive smart-campus prototype for the **TII (Transforming Ideas to Innovation)** project.
It turns the team's design-thinking work (survey n = 48, persona *Aanya Sharma*, final problem statement) into a working
front-end with six core features plus faculty and admin consoles.

> **Prototype notice.** It is a front-end-only prototype: data is stored in the browser (`localStorage`), all people and courses
> are fictional, and no real institutional system, server database or generative-AI service is connected.

## Quick start

```bash
npm install
npm run dev            # http://localhost:5173
```

Open the site and press **Continue as Student / Faculty / Administrator** (demo mode, no password), or create an account.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the automated tests |
| `npm run test:report` | Run tests and write `public/test-report.json` (shown on the Phase 3 page after a rebuild) |
| `npm run screenshots` | Capture real screenshots into `public/screenshots/` (needs `npm run build` first) |

`npm run screenshots` uses Playwright. If Chromium is missing run `npx playwright install chromium`
(or set `CHROMIUM_PATH` to an existing Chrome/Chromium binary). Rebuild afterwards so the Phase 3 gallery picks up the images.

## Features and what is real

| Feature | Status |
|---|---|
| AI Study Planner | Working. **Rule-based scheduler**, not generative AI (labelled in the UI). |
| AI Doubt Sharing | Working threads, images, upvotes, bookmarks, resolved state. AI answers are **simulated** unless `VITE_AI_ENDPOINT` is set. |
| Smart Attendance Planner | Working maths, records, warnings, leave planner. 75% is only a configurable demo default. |
| Lecture Translator | Live speech-to-text is real in Chrome/Edge; translation is real only with the browser Translator API or a configured endpoint; otherwise a clearly labelled **demonstration** mode with hand-written translations. |
| Lost & Found | Working reports, images, filters, claims. Contact emails are private. No AI image matching. |
| Timetable & Events | Working day/week/month, role-restricted college events, `.ics` export. **No Google Calendar sync.** |
| Faculty / Admin consoles | Announcements, assignments, timetable, official notices, college events, usage stats. |
| Productivity tools | Rule-based assistant, extractive note summariser, revision ranking, mood tips, voice navigation (browser). |

## Phase 3 page

Visit **`/phase-3`** (also linked from the app sidebar and landing page): executable link, architecture diagram (implemented vs planned),
screenshots, original design-thinking artefacts, and the implementation report with live test results. Use *Print / save as PDF* to submit it.

## Deploying (to get the public link)

1. Push this folder to a GitHub repository.
2. Choose one:
   - **Vercel** — import the repo; defaults work (`vercel.json` is included).
   - **Netlify** — import the repo; `netlify.toml` and `public/_redirects` are included.
   - **GitHub Pages** — Settings → Pages → Source: *GitHub Actions*; `.github/workflows/deploy.yml` builds, tests and publishes.
3. Copy the issued URL, set it as `VITE_DEPLOY_URL` (Vercel/Netlify env var, or a GitHub *repository variable*), and redeploy.
   The Phase 3 page then shows it automatically. Until then it honestly says **Pending**.

## Optional live AI

See [`docs/AI_PROXY.md`](docs/AI_PROXY.md). Never put API keys in `VITE_*` variables.

## Limitations

- No server: data is per browser/device; "multi-user" flows (e.g. faculty announcement → student) work within one browser profile.
- Authentication and roles are client-side demonstrations, not real security. Roles are selectable at sign-up for review purposes.
- Images are downscaled and limited by the browser's ~5 MB `localStorage`; the app warns when saving fails.
- Live transcription needs Chrome/Edge and a connection; browser support for translation varies.
- Google Calendar sync, push/email notifications, server database, live LLM and AI image matching are future scope.
- Session 9 wireframes were not available when this was built; add them in `public/artefacts/` and to `ARTEFACTS` in `src/pages/Phase3.tsx`.

## Testing

`npm test` runs 29 tests: scheduler rules (goals, exam deadlines, warnings, determinism), attendance maths, sign-up validation, role guards,
and data-layer flows for the eight required journeys. UI-only behaviour (microphone, layout) is checked by `npm run screenshots`
(a browser smoke test that fails on console/page errors) and manually.

Design tokens (ivory, beige, sand, champagne gold, rich black), DM Serif Display + Manrope fonts are self-hosted via `@fontsource`.
