import { Session } from './session.model';

export interface ConfidenceDataPoint {
  date: string;
  label: string; // e.g. "Mon", "Tue"
  score: number; // 0 to 100
  topic?: string;
}

export interface StatsSummary {
  totalStudyHours: number;
  currentStreakDays: number;
  topicsMastered: number;
  confidenceTrend: ConfidenceDataPoint[];
  recentSessions: Session[];
}
