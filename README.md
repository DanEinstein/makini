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

Create a Clerk application, then add `http://localhost:4200` (and your Render
URL for production) to its allowed origins. Use `pk_test_`/`sk_test_` keys
locally and `pk_live_`/`sk_live_` in production.

The publishable key is served to the browser at runtime via `GET /api/config`,
so changing Clerk instances does not require a rebuild. Until both keys are set,
every `/api` route returns `503` and the console prints a warning — pages still
render.

### Not needed yet

`DATABASE_URL` and `CLERK_WEBHOOK_SECRET` (Postgres), `GROQ_API_KEY`
(replaces Ollama), and `ELEVENLABS_API_KEY` (spoken reflections) are commented
out in `.env.example` and land in later phases.

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

## Local AI Runtime (Gemma via Ollama)

Makini's AI Tutor now uses a self-hosted Gemma model through Ollama. User API keys are not required.

### 1) Start Ollama

```bash
ollama serve
```

### 2) Pull the model

```bash
ollama pull gemma3:4b
```

### 3) Optional runtime environment variables

Makini server defaults:
- `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- `OLLAMA_MODEL=gemma3:4b`

You can override them when starting the app:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434 OLLAMA_MODEL=gemma3:4b npm start
```

### 4) Health check endpoint

The app exposes:
- `GET /api/ai/health` to verify Ollama connectivity
- `POST /api/ai/chat` for AI Tutor completions

Both require a signed-in user. `GET /api/config` is the only public endpoint.

### Troubleshooting

- If status shows **Offline**, ensure `ollama serve` is running.
- If chat fails, run `ollama list` and confirm `gemma3:4b` exists.
- If Ollama starts after the app, refresh or restart the app server.

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
