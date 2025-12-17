
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
  id: number; // Added ID
  name: string; // Added Name
  totalCorrect: number;
  totalIncorrect: number;
  streak: number;
  lastPlayedDate: string | null;
  dailyHistory: Record<string, DailyStat>;
  badges: Badge[]; // Added Badges list to be stored in cloud
}

export interface LeaderboardEntry {
  name: string;
  grade: string;
  totalCorrect: number;
  badgesCount: number;
  lastActive: string;
}

// Predefined Users with IDs as requested
export const PREDEFINED_USERS = [
  { id: 1, name: 'عبير محمد' },
  { id: 2, name: 'عبير حنش' },
  { id: 3, name: 'ندى' },
  { id: 4, name: 'اسماء' },
  { id: 5, name: 'ريم' },
  { id: 6, name: 'منال' },
  { id: 7, name: 'عائشه' }
];
