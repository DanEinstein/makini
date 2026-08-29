import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

export const lockScreenGuard: CanActivateFn = async () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);
  await sessionService.whenReady();
  const session = sessionService.activeSession();

  if (!session) {
    return router.createUrlTree(['/session/setup']);
  }

  if (session.status === 'reflecting') {
    return router.createUrlTree(['/session/reflect']);
  }

  if (session.status === 'completed') {
    return router.createUrlTree(['/session/ai-tutor']);
  }

  return true;
};

export const reflectionGuard: CanActivateFn = async () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);
  await sessionService.whenReady();
  const session = sessionService.activeSession();

  if (!session) {
    return router.createUrlTree(['/session/setup']);
  }

  if (session.status === 'locked') {
    return router.createUrlTree(['/session/lock']);
  }

  if (session.status === 'completed') {
    return router.createUrlTree(['/session/ai-tutor']);
  }

  return true;
};

export const aiPanelGuard: CanActivateFn = async () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);
  await sessionService.whenReady();
  const session = sessionService.activeSession();

  if (session?.status === 'locked') {
    return router.createUrlTree(['/session/lock']);
  }

  if (session?.status === 'reflecting') {
    return router.createUrlTree(['/session/reflect']);
  }

  return true;
};
