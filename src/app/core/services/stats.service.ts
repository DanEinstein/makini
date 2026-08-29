import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StatsSummary } from '../models/stats.model';

const EMPTY_STATS: StatsSummary = {
  totalStudyHours: 0,
  currentStreakDays: 0,
  topicsMastered: 0,
  confidenceTrend: [],
  recentSessions: []
};

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private http = inject(HttpClient);

  readonly timeframe = signal<'7d' | '30d'>('7d');
  readonly stats = signal<StatsSummary>(EMPTY_STATS);
  readonly isLoading = signal<boolean>(false);

  constructor() {
    void this.refresh();
  }

  setTimeframe(tf: '7d' | '30d'): void {
    this.timeframe.set(tf);
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.isLoading.set(true);
    try {
      const summary = await firstValueFrom(
        this.http.get<StatsSummary>('/api/stats', {
          params: { timeframe: this.timeframe() }
        })
      );
      this.stats.set(summary);
    } catch {
      this.stats.set(EMPTY_STATS);
    } finally {
      this.isLoading.set(false);
    }
  }
}
