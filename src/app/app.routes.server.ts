import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * ngx-clerk is client-side only, so every route that reads auth state or
 * per-user data must render in the browser. Only the public landing page is
 * prerendered.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
