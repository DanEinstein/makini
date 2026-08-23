import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { User } from '../models/user.model';

const STORAGE_KEY_AUTH = 'makini_current_user';

const DEMO_USER: User = {
  id: 'usr_01',
  name: 'Alex Rivera',
  email: 'alex.rivera@cognition.io',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIv5lgdgdNwLh3YRVLvxa3LqUxNzWpV5PYXVmglKl4goZjXow0Y-QjxpdoTDHUle8Zd8EZHvUlYVrQ6ATYoCdByB5jKeS4yp8Yyv-eVlvJNniaj0AxANEhvUbcOSOXPulQ7EGC5u5sFvZvkh3iXQPxL21CQmtCz0GchMtB4S2Lxy1hJz2ZW6u97OkSHHNebx9MbY4L3g-jzZHR6XLyY70KV7QF88yIb1UnpRueIY8RXd8qBivLZUCu',
  plan: 'Deep Focus Pro'
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  readonly currentUser = signal<User | null>(this.getInitialUser());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  private getInitialUser(): User | null {
    if (!this.isBrowser) return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  login(email: string): boolean {
    const user: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: email.split('@')[0] || 'Learner',
      email,
      avatarUrl: DEMO_USER.avatarUrl,
      plan: 'Deep Focus Pro'
    };
    this.currentUser.set(user);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
    }
    return true;
  }

  loginDemo(): void {
    this.currentUser.set(DEMO_USER);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(DEMO_USER));
    }
  }

  logout(): void {
    this.currentUser.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  }
}
