import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { ClerkService } from 'ngx-clerk';

const PUBLIC_ENDPOINTS = ['/api/config'];

/**
 * Attaches the Clerk session JWT to Makini's own API calls. Registered only in
 * the browser bootstrap so ClerkJS never reaches the server bundle.
 */
export const clerkAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const isOwnApi = req.url.startsWith('/api');
  const isPublic = PUBLIC_ENDPOINTS.some(path => req.url.startsWith(path));

  if (!isOwnApi || isPublic) {
    return next(req);
  }

  const clerk = inject(ClerkService);

  return from(clerk.getToken()).pipe(
    switchMap(token =>
      next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req)
    )
  );
};
