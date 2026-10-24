# CONEXUs architecture

```
Users (Student · Faculty · Admin)
        │
Responsive UI  — React 19, TypeScript, Tailwind CSS 4, React Router 7
        │
Access  — demo auth (PBKDF2 local accounts / demo mode) · route guards · role checks in every action
        │
Six modules — Study Planner · Doubts · Attendance · Lecture Translator · Lost & Found · Timetable & Events
        │
Services (src/lib) — planner · attendance · calendar · notifications · productivity · ai (optional hook)
        │
Data — localStorage store (src/lib/store.ts), versioned key `conexus.state.v1`
        │
Integrations — Web Speech API · browser Translator API · .ics export  (implemented)
               LLM · cloud translation · Google Calendar · push/email · DB · image matching (planned)
```

The interactive, colour-coded version is on the `/phase-3` page of the app.

## Data flow
UI → `actions.ts` (validates input + role, returns `Result`) → `store.ts` `setState` → `localStorage` → `useStore` selectors re-render the UI.
Notifications are derived/pushed by actions and filtered per role and per user preference.

## Source map
| Path | Purpose |
|---|---|
| `src/pages/*` | One file per screen; `Staff.tsx` holds the faculty and admin consoles |
| `src/components/*` | App shell/navigation, shared UI primitives, wordmark |
| `src/lib/planner.ts` | Rule-based study scheduler |
| `src/lib/attendance.ts` | Percentages, can-miss / must-attend, projections |
| `src/lib/actions.ts` | Every mutation, with validation and role checks |
| `src/lib/seed.ts` | Fictional demo data |
| `src/test/*` | Vitest unit and flow tests |
| `scripts/screenshots.mjs` | Real screenshots + browser smoke test |

## Honest boundaries
No server exists: data is per-browser, and role enforcement is client-side. See the Limitations list in the app and README.
