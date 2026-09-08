import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

export const lockScreenGuard: CanActivateFn = async () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  // If setup just created a locked session, trust it immediately so a late
  // hydrate cannot bounce the learner back to /session/setup.
  let session = sessionService.activeSession();
  if (!session) {
    await sessionService.whenReady();
    session = sessionService.activeSession();
  }

  if (!session) {
    return router.createUrlTree(['/session/setup']);
  }

  if (session.status === 'reflecting') {
    return router.createUrlTree(['/session/reflect']);
  }

  if (session.status === 'completed') {
    return router.createUrlTree(['/session/ai-tutor']);
  }

  if (session.status !== 'locked') {
    return router.createUrlTree(['/session/setup']);
  }

  return true;
};

export const reflectionGuard: CanActivateFn = async () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  let session = sessionService.activeSession();
  if (!session) {
    await sessionService.whenReady();
    session = sessionService.activeSession();
  }

  if (!session) {
    const latest = sessionService.sessionHistory()[0];
    if (latest?.status === 'completed' && latest.reflection) {
      sessionService.reviewSession(latest);
      return true;
    }
    return router.createUrlTree(['/session/setup']);
  }

  if (session.status === 'locked') {
    return router.createUrlTree(['/session/lock']);
  }

  return true;
};

export const aiPanelGuard: CanActivateFn = async () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  let session = sessionService.activeSession();
  if (!session) {
    await sessionService.whenReady();
    session = sessionService.activeSession();
  }

  if (session?.status === 'locked') {
    return router.createUrlTree(['/session/lock']);
  }

  if (session?.status === 'reflecting') {
    return router.createUrlTree(['/session/reflect']);
  }

  return true;
};
