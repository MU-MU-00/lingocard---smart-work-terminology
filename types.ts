export interface TermData {
  id: string;
  term: string;
  phonetic: string;
  /** 名词的对应翻译：名词为英文时存中文，名词为中文时存英文 */
  termTranslation?: string;
  definitionEn: string;
  definitionCn: string;
  example: string;
  wrongDefinitions: string[]; // Distractors for the quiz
  groupId: string;
  createdAt: number;
  
  // Spaced Repetition State
  status: 'new' | 'learning' | 'learned';
  nextReviewDate: number; // Timestamp
  reviewStage: number; // 0 to 5 (21 days)
  consecutiveFailures: number; // For the "3 times fails" rule
}

export interface Group {
  id: string;
  name: string;
  isDefault: boolean;
}

export enum SwipeDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  NONE = 'NONE'
}

export enum AppView {
  HOME = 'HOME',
  REVIEW_SELECTION = 'REVIEW_SELECTION',
  REVIEW_SESSION = 'REVIEW_SESSION',
  GROUP_DETAIL = 'GROUP_DETAIL'
}

export interface ReviewSessionConfig {
  mode: 'all' | 'group';
  groupId?: string;
}