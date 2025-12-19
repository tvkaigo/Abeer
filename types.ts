
export enum Difficulty {
  BEGINNER = 'مبتدئ',
  INTERMEDIATE = 'متوسط',
  EXPERT = 'خبير'
}

export enum Operation {
  ADDITION = 'جمع',
  SUBTRACTION = 'طرح',
  MULTIPLICATION = 'ضرب',
  DIVISION = 'قسمة',
  MIXED = 'منوع'
}

export interface Question {
  id: number;
  num1: number;
  num2: number;
  operation: Operation;
  correctAnswer: number;
  userAnswer?: number;
  isCorrect?: boolean;
}

export interface GameConfig {
  difficulty: Difficulty;
  operation: Operation;
}

export interface GameResult {
  score: number;
  totalQuestions: number;
  history: Question[];
}

export enum AppState {
  WELCOME = 'WELCOME',
  PLAYING = 'PLAYING',
  RESULTS = 'RESULTS',
  ANALYTICS = 'ANALYTICS',
  LEADERBOARD = 'LEADERBOARD'
}

export interface DailyStat {
  date: string;
  correct: number;
  incorrect: number;
}

export interface Badge {
  id: number;
  name: string;
  icon: string;
  unlocked: boolean;
  required: number;
  color: string;
}

export interface UserStats {
  uid: string;
  email: string;
  displayName: string;
  totalCorrect: number;
  totalIncorrect: number;
  streak: number;
  lastPlayedDate: string | null;
  lastActive: string | null;
  dailyHistory: Record<string, DailyStat>;
  badges: Badge[];
  badgesCount: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  totalCorrect: number;
  badgesCount: number;
  lastActive: string;
}

/**
 * Helper function to extract a displayable name from a username or email.
 * If the input is an email, it returns the part before the '@' symbol.
 */
export const getUserDisplayName = (userName: string): string => {
  if (!userName) return '';
  if (userName.includes('@')) {
    return userName.split('@')[0];
  }
  return userName;
};