export type SessionStatus = 'idle' | 'locked' | 'reflecting' | 'completed';

export interface SourceLink {
  title: string;
  description: string;
  url: string;
  icon: string;
}

export interface SelfCheckProtocol {
  explainWithoutNotes: boolean;
  identifyEdgeCases: boolean;
  teachSomeoneElse: boolean;
}

export type ReflectionInputMode = 'typed' | 'spoken';

export interface ReflectionGrade {
  score: number;
  verdict: 'relearn' | 'proceed';
  covered: string[];
  missed: string[];
  note: string;
}

export interface SessionReflection {
  text: string;
  selfCheck: SelfCheckProtocol;
  confidenceRating: number; // 1 - 5
  submittedAt: number;
  inputMode?: ReflectionInputMode;
  grade?: ReflectionGrade;
}

export interface Session {
  id: string;
  topic: string;
  plannedMinutes: number;
  startedAt: number;
  endedAt?: number;
  status: SessionStatus;
  scratchpadNotes: string;
  sources: SourceLink[];
  sourceSummary?: string;
  reflection?: SessionReflection;
}
