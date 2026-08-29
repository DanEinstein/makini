# Makini

Focus-first learning platform: lock AI away during a study session, write a
self-explanation, then unlock guided AI feedback. Angular 22 with SSR and an
Express API in `src/server.ts`.

## Credentials

All configuration lives in a single `.env` file at the project root:

```bash
cp .env.example .env
```

`.env.example` documents every variable. The server loads it automatically in
both `ng serve` and the built SSR server. On Render, set these in the service's
Environment tab instead of committing a file.

### Required now

| Variable | Where to get it |
| --- | --- |
| `CLERK_PUBLISHABLE_KEY` | [Clerk dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Same page. Server-side only — never commit it |
| `DATABASE_URL` | Render dashboard → your Postgres instance → **Connect** → **External** URL |
| `GROQ_API_KEY` | [Groq console](https://console.groq.com/keys) — AI tutor |
| `ELEVENLABS_API_KEY` | [ElevenLabs API keys](https://elevenlabs.io/app/settings/api-keys) — spoken reflections (optional) |

Create a Clerk application, then add `http://localhost:4200` (and your Render
URL for production) to its allowed origins. Use `pk_test_`/`sk_test_` keys
locally and `pk_live_`/`sk_live_` in production.

The publishable key is served to the browser at runtime via `GET /api/config`,
so changing Clerk instances does not require a rebuild. Until both Clerk keys
are set, every `/api` route returns `503` and the console prints a warning —
pages still render.

Until `DATABASE_URL` is set, session and stats APIs return `503`. Clerk sign-in
still works. Until `GROQ_API_KEY` is set, the AI tutor returns `503` and the
runtime panel shows Offline. Spoken reflections need `ELEVENLABS_API_KEY`;
typing a reflection still works without it.

### Postgres (Render)

1. In the [Render dashboard](https://dashboard.render.com), create a **PostgreSQL** database. The web service does not have to exist yet.
2. Open the database → **Connect** → copy the **External Database URL** (the one that works from your laptop; it includes TLS).
3. Paste it as `DATABASE_URL` in `.env`.
4. Apply the schema from the `makini/` app directory:

```bash
npm run db:migrate
```

5. Restart `ng serve`.

On Render later, point the **web service** at the **Internal** URL so traffic stays on Render's private network. Do not commit `.env`.

### Not needed yet

None of the product phases require extra keys beyond Clerk, Postgres, Groq,
and ElevenLabs. Spoken reflection is optional — typing still unlocks the tutor.

## Authentication

Auth is handled by [Clerk](https://clerk.com) through the community
[`ngx-clerk`](https://github.com/anagstef/ngx-clerk) SDK on the frontend and
`@clerk/express` on the server.

Because `ngx-clerk` is client-side only, every authenticated route renders in the
browser (`RenderMode.Client` in `src/app/app.routes.server.ts`); only the public
landing page is prerendered. `provideClerk()` is registered in `src/main.ts`
rather than the shared app config so ClerkJS never reaches the server bundle.

Sign-in and sign-up live at `/sign-in` and `/sign-up` using catch-all route
matchers so Clerk can handle its own sub-routes. Browser requests to `/api/*`
carry the Clerk session JWT via an HTTP interceptor, and the server rejects
unauthenticated calls with a `401`.

## AI Tutor (Groq)

The AI Tutor runs on Groq from the Express server. The browser never sees the
key.

1. Create an API key at [console.groq.com/keys](https://console.groq.com/keys).
2. Set `GROQ_API_KEY` in `.env`. Optionally override `GROQ_MODEL`
   (default `llama-3.3-70b-versatile`).
3. Restart `ng serve`.

The app exposes:
- `GET /api/ai/health` to verify Groq connectivity (signed-in)
- `POST /api/ai/chat` for streaming tutor completions (SSE)

Both require a signed-in user. `GET /api/config` and `GET /api/health` are the
only public endpoints.

If the runtime panel shows **Offline**, the Groq key is missing or rejected.

## Spoken reflections (ElevenLabs Scribe)

On the reflection screen, tap the mic to record. Audio is sent to
`POST /api/reflections/transcribe`, transcribed with Scribe v2, and dropped
into the textarea so you can edit before submitting. The audio is discarded;
only the transcript is stored.

Recordings are capped at 3 minutes per take and 10 minutes per user per day.

## Render

`render.yaml` is a Blueprint for one web service plus managed Postgres.

1. Create the Postgres instance (or let the Blueprint create `makini-db`).
2. Point Render at **this** app repo (`DanEinstein/makini`), root directory `.`.
3. Paste `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `GROQ_API_KEY`, and
   `ELEVENLABS_API_KEY` in the Environment tab. `DATABASE_URL` is injected from
   the database when using the Blueprint.
4. The web service should use the **Internal** database URL. From your laptop,
   use the **External** URL in `.env`.
5. After deploy, add the Render URL to Clerk's allowed origins.

`npm run db:migrate` runs during the build. The process health check is
`GET /api/health`.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
