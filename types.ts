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

export interface UserStats {
  totalCorrect: number;
  totalIncorrect: number;
  streak: number;
  lastPlayedDate: string | null;
  dailyHistory: Record<string, DailyStat>; // Key is YYYY-MM-DD
}

export interface LeaderboardEntry {
  name: string;
  grade: string;
  totalCorrect: number;
  badgesCount: number;
  lastActive: string;
}