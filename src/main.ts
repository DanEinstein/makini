import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClerk } from 'ngx-clerk';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { clerkAuthInterceptor } from './app/core/interceptors/clerk-auth.interceptor';

interface PublicConfig {
  clerkPublishableKey: string;
}

/**
 * Public config is served at runtime rather than baked in at build time, so
 * every credential lives in one place (the server environment) and swapping
 * Clerk instances does not require a rebuild.
 */
async function loadPublicConfig(): Promise<PublicConfig> {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) {
      throw new Error(`/api/config responded with ${response.status}`);
    }
    return (await response.json()) as PublicConfig;
  } catch (error) {
    console.error('[makini] Failed to load /api/config.', error);
    return { clerkPublishableKey: '' };
  }
}

async function main(): Promise<void> {
  const { clerkPublishableKey } = await loadPublicConfig();

  if (!clerkPublishableKey) {
    console.error(
      '[makini] CLERK_PUBLISHABLE_KEY is not set on the server. ' +
        'Copy .env.example to .env and add your Clerk keys, then restart the dev server.'
    );
  }

  await bootstrapApplication(App, {
    providers: [
      ...appConfig.providers,
      provideHttpClient(withFetch(), withInterceptors([clerkAuthInterceptor])),
      provideClerk({
        publishableKey: clerkPublishableKey,
        signInUrl: '/sign-in',
        signUpUrl: '/sign-up',
        afterSignOutUrl: '/'
      })
    ]
  });
}

main().catch(err => console.error(err));
