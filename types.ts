
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
  id: number;
  name: string;
  displayName?: string;
  totalCorrect: number;
  totalIncorrect: number;
  streak: number;
  lastPlayedDate: string | null;
  dailyHistory: Record<string, DailyStat>;
  badges: Badge[];
}

export interface LeaderboardEntry {
  name: string;
  displayName: string;
  totalCorrect: number;
  badgesCount: number;
  lastActive: string;
}

export const PREDEFINED_USERS = [
  { id: 1, name: 'Abeer_Mohammed', displayName: 'عبير محمد' },
  { id: 2, name: 'Abeer_Hanash', displayName: 'عبير حنش' },
  { id: 3, name: 'Nada', displayName: 'ندى' },
  { id: 4, name: 'Asmaa', displayName: 'أسماء' },
  { id: 5, name: 'Reem', displayName: 'ريم' },
  { id: 6, name: 'Manal', displayName: 'منال' },
  { id: 7, name: 'Aisha', displayName: 'عائشة' }
];

export const getUserDisplayName = (englishName: string): string => {
  const user = PREDEFINED_USERS.find(u => u.name === englishName);
  return user ? user.displayName : englishName;
};
