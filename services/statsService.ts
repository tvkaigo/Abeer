import { UserStats, GameResult, LeaderboardEntry } from '../types';

const STORAGE_KEY = 'mathGeniusStats_v1';
// Changed key to v2 to ensure we start with a clean slate
const LEADERBOARD_KEY = 'mathGeniusLeaderboard_v2';

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getInitialStats = (): UserStats => ({
  totalCorrect: 0,
  totalIncorrect: 0,
  streak: 0,
  lastPlayedDate: null,
  dailyHistory: {}
});

export const loadStats = (): UserStats => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load stats", e);
  }
  return getInitialStats();
};

export const saveStats = (stats: UserStats) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error("Failed to save stats", e);
  }
};

export const updateUserStats = (result: GameResult): UserStats => {
  const stats = loadStats();
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 1. Update Totals
  const correctCount = result.score;
  const incorrectCount = result.totalQuestions - result.score;
  
  stats.totalCorrect += correctCount;
  stats.totalIncorrect += incorrectCount;

  // 2. Update Streak
  if (stats.lastPlayedDate === today) {
    // Already played today, streak remains same
  } else if (stats.lastPlayedDate === yesterday) {
    stats.streak += 1;
  } else {
    // Missed a day or first time
    stats.streak = 1;
  }
  stats.lastPlayedDate = today;

  // 3. Update Daily History
  if (!stats.dailyHistory[today]) {
    stats.dailyHistory[today] = { date: today, correct: 0, incorrect: 0 };
  }
  
  stats.dailyHistory[today].correct += correctCount;
  stats.dailyHistory[today].incorrect += incorrectCount;

  saveStats(stats);
  return stats;
};

export const getLast7DaysStats = (stats: UserStats) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    // Create short label (e.g., "Sat", "السبت")
    const label = new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(d);
    
    const dayData = stats.dailyHistory[dateStr] || { correct: 0, incorrect: 0 };
    days.push({
      date: dateStr,
      label,
      correct: dayData.correct,
      incorrect: dayData.incorrect
    });
  }
  return days;
};

export const getBadgeStatus = (totalCorrect: number) => {
  return [
    { id: 1, name: 'مبتدئ', required: 50, icon: '🌱', unlocked: totalCorrect >= 50, color: 'text-green-600 bg-green-100 border-green-200' },
    { id: 2, name: 'عبقري', required: 100, icon: '🧠', unlocked: totalCorrect >= 100, color: 'text-blue-600 bg-blue-100 border-blue-200' },
    { id: 3, name: 'الملك', required: 200, icon: '👑', unlocked: totalCorrect >= 200, color: 'text-purple-600 bg-purple-100 border-purple-200' },
    { id: 4, name: 'الأسطورة', required: 300, icon: '🏆', unlocked: totalCorrect >= 300, color: 'text-yellow-600 bg-yellow-100 border-yellow-200' },
  ];
};

// --- Leaderboard Logic ---

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const stored = localStorage.getItem(LEADERBOARD_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return []; 
  } catch (e) {
    return [];
  }
};

// New function to register a player immediately upon entry
export const registerNewPlayer = (name: string, grade: string) => {
    try {
        const currentList = getLeaderboard();
        const existingIndex = currentList.findIndex(p => p.name === name);

        if (existingIndex === -1) {
            // Only add if not exists
            currentList.push({
                name,
                grade,
                totalCorrect: 0,
                badgesCount: 0,
                lastActive: getTodayDateString()
            });
            // Sort (even though score is 0, to keep structure consistent)
            const sortedList = currentList.sort((a, b) => b.totalCorrect - a.totalCorrect);
            localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sortedList));
        } else {
            // If exists, just update last active
             currentList[existingIndex].lastActive = getTodayDateString();
             currentList[existingIndex].grade = grade; // Update grade if changed
             localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(currentList));
        }
    } catch (e) {
        console.error("Error registering player", e);
    }
};

export const updateLeaderboard = (name: string, grade: string, totalCorrect: number) => {
  try {
    const currentList = getLeaderboard();
    const badgesCount = getBadgeStatus(totalCorrect).filter(b => b.unlocked).length;
    
    const existingIndex = currentList.findIndex(p => p.name === name);
    
    if (existingIndex >= 0) {
      // Update existing player
      currentList[existingIndex] = {
        ...currentList[existingIndex],
        totalCorrect, // Ensure this is the cumulative total
        badgesCount,
        lastActive: getTodayDateString(),
        grade // Update grade in case it changed
      };
    } else {
      // Add new player (fallback if not registered via registerNewPlayer)
      currentList.push({
        name,
        grade,
        totalCorrect,
        badgesCount,
        lastActive: getTodayDateString()
      });
    }

    // Sort by Total Correct (Descending)
    const sortedList = currentList.sort((a, b) => b.totalCorrect - a.totalCorrect);

    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sortedList));
    return sortedList;
  } catch (e) {
    console.error("Error updating leaderboard", e);
    return [];
  }
};