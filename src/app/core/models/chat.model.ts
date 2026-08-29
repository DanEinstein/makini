export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  model?: string;
  highlightNote?: string;
}

export type SupportedAIModel = 'llama-3.3-70b-versatile';

export interface AIModelOption {
  id: SupportedAIModel;
  label: string;
  provider: 'Groq';
}
