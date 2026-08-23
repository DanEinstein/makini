import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { lockScreenGuard, reflectionGuard, aiPanelGuard } from './core/guards/session-lock.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'session/setup',
    canActivate: [authGuard],
    loadComponent: () => import('./features/session-setup/session-setup.component').then(m => m.SessionSetupComponent)
  },
  {
    path: 'session/lock',
    canActivate: [authGuard, lockScreenGuard],
    loadComponent: () => import('./features/lock-screen/lock-screen.component').then(m => m.LockScreenComponent)
  },
  {
    path: 'session/reflect',
    canActivate: [authGuard, reflectionGuard],
    loadComponent: () => import('./features/reflection/reflection.component').then(m => m.ReflectionComponent)
  },
  {
    path: 'session/ai-tutor',
    canActivate: [authGuard, aiPanelGuard],
    loadComponent: () => import('./features/ai-panel/ai-panel.component').then(m => m.AiPanelComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent)
  },
  {
    path: 'achievements',
    canActivate: [authGuard],
    loadComponent: () => import('./features/achievements/achievements.component').then(m => m.AchievementsComponent)
  },
  {
    path: 'community',
    canActivate: [authGuard],
    loadComponent: () => import('./features/community/community.component').then(m => m.CommunityComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
