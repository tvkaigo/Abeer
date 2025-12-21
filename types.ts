
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

export enum UserRole {
  STUDENT = 'Student',
  TEACHER = 'Teacher'
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
  LEADERBOARD = 'LEADERBOARD',
  PROFILE = 'PROFILE'
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
  role: UserRole.STUDENT;
  teacherId?: string; // كود المعلم المرتبط به الطالب
  totalCorrect: number;
  totalIncorrect: number;
  streak: number;
  lastPlayedDate: string | null;
  lastActive: string | null;
  dailyHistory: Record<string, DailyStat>;
  badges: Badge[];
  badgesCount: number;
}

export interface TeacherProfile {
  uid?: string; // UID الخاص بـ Firebase Auth للربط
  teacherId: string; // Document ID
  email: string;
  displayName: string;
  role: UserRole.TEACHER;
   active: boolean;
    createdByAdmin: boolean;
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
  role: UserRole;
  totalCorrect: number;
  badgesCount: number;
  lastActive: string;
  teacherId?: string; // أضيفت للفلترة المتقدمة
}

export const getUserDisplayName = (userName: string): string => {
  if (!userName) return '';
  if (userName.includes('@')) {
    return userName.split('@')[0];
  }
  return userName;
};
