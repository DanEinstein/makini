# Makini

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.4.

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
