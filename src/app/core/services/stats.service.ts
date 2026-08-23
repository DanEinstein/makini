import { Injectable, signal, inject } from '@angular/core';
import { StatsSummary, ConfidenceDataPoint } from '../models/stats.model';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private sessionService = inject(SessionService);

  readonly timeframe = signal<'7d' | '30d'>('7d');
  readonly stats = signal<StatsSummary>(this.computeStats('7d'));
  readonly isLoading = signal<boolean>(false);

  constructor() {
    this.refresh();
  }

  setTimeframe(tf: '7d' | '30d'): void {
    this.timeframe.set(tf);
    this.refresh();
  }

  refresh(): void {
    this.stats.set(this.computeStats(this.timeframe()));
  }

  // Ready for swapping in real HTTP endpoint: return this.http.get<StatsSummary>(`/api/stats?timeframe=${tf}`)
  private computeStats(timeframe: '7d' | '30d'): StatsSummary {
    const history = this.sessionService.sessionHistory();
    
    // Calculate total hours from history
    const sessionMinutes = history.reduce((sum, s) => sum + (s.plannedMinutes || 0), 0);
    const totalStudyHours = Math.round((sessionMinutes / 60) * 10) / 10;

    const topicsMastered = history.filter(s => (s.reflection?.confidenceRating || 0) >= 4).length;
    const currentStreakDays = history.length > 0 ? 1 : 0;

    let confidenceTrend: ConfidenceDataPoint[];

    if (timeframe === '7d') {
      confidenceTrend = [
        { date: '2026-08-21', label: 'Fri', score: 52, topic: 'Recursion Basics' },
        { date: '2026-08-22', label: 'Sat', score: 63, topic: 'Call Stack Frames' },
        { date: '2026-08-23', label: 'Sun', score: 78, topic: 'Recursive Patterns' }
      ];
    } else {
      confidenceTrend = [
        { date: 'Week 1', label: 'W1', score: 52 },
        { date: 'Week 2', label: 'W2', score: 66 }
      ];
    }

    return {
      totalStudyHours,
      currentStreakDays,
      topicsMastered,
      confidenceTrend,
      recentSessions: history.slice(0, 5)
    };
  }
}
