export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  model?: string;
  highlightNote?: string;
}

export type SupportedAIModel = 'openai/gpt-oss-20b';

export interface AIModelOption {
  id: SupportedAIModel;
  label: string;
  provider: 'Groq';
}
