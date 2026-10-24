# Optional live AI / translation (server-side proxy)

CONEXUs ships **without any API key**. By default doubt answers are *simulated* (and labelled as such) and
translation uses the browser's Translator API when available, otherwise a hand-written demo script.

To switch on real services, deploy a small server you control (Vercel/Netlify function, Cloud Run, Express…)
that holds the provider key, and set the URLs at **build time**:

| Variable | Called by | Request (POST, JSON) | Response (JSON) |
|---|---|---|---|
| `VITE_AI_ENDPOINT` | Doubts → "Get an answer" | `{ "prompt": string, "context": string }` | `{ "text": string }` |
| `VITE_TRANSLATE_ENDPOINT` | Lecture Translator | `{ "text": string, "source": "en", "target": "hi" }` | `{ "translation": string }` |

Requirements for the proxy
- Enable CORS for your site's origin only.
- Keep the provider key in server-side environment variables — never in a `VITE_*` variable.
- Rate-limit and size-limit requests (anyone can call a public endpoint).
- Return a non-2xx status on failure; the UI shows a real error instead of a fake answer.

When `VITE_AI_ENDPOINT` is set the UI stops labelling answers as simulated, so only set it when it is really connected.
