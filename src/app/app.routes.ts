import { Routes } from '@angular/router';
import { canActivateClerk, catchAllRoute } from 'ngx-clerk';
import { lockScreenGuard, reflectionGuard, aiPanelGuard } from './core/guards/session-lock.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    matcher: catchAllRoute('sign-in'),
    loadComponent: () => import('./features/auth/sign-in.component').then(m => m.SignInComponent)
  },
  {
    matcher: catchAllRoute('sign-up'),
    loadComponent: () => import('./features/auth/sign-up.component').then(m => m.SignUpComponent)
  },
  {
    path: 'session/setup',
    canActivate: [canActivateClerk],
    loadComponent: () => import('./features/session-setup/session-setup.component').then(m => m.SessionSetupComponent)
  },
  {
    path: 'session/lock',
    canActivate: [canActivateClerk, lockScreenGuard],
    loadComponent: () => import('./features/lock-screen/lock-screen.component').then(m => m.LockScreenComponent)
  },
  {
    path: 'session/reflect',
    canActivate: [canActivateClerk, reflectionGuard],
    loadComponent: () => import('./features/reflection/reflection.component').then(m => m.ReflectionComponent)
  },
  {
    path: 'session/ai-tutor',
    canActivate: [canActivateClerk, aiPanelGuard],
    loadComponent: () => import('./features/ai-panel/ai-panel.component').then(m => m.AiPanelComponent)
  },
  {
    path: 'dashboard',
    canActivate: [canActivateClerk],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'history',
    canActivate: [canActivateClerk],
    loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent)
  },
  {
    path: 'achievements',
    canActivate: [canActivateClerk],
    loadComponent: () => import('./features/achievements/achievements.component').then(m => m.AchievementsComponent)
  },
  {
    path: 'community',
    canActivate: [canActivateClerk],
    loadComponent: () => import('./features/community/community.component').then(m => m.CommunityComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
