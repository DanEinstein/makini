import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

/**
 * Providers shared by the browser and server bootstraps. HttpClient is
 * intentionally left out: the browser adds it with the Clerk interceptor
 * (see main.ts) and the server adds it without (see app.config.server.ts).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration()
  ]
};
