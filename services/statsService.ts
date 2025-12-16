import { UserStats, GameResult, LeaderboardEntry } from '../types';

// Using a public KVDB bucket for demo purposes to allow cross-device sync.
// In a real production app, this should be a secure backend API.
const CLOUD_API_URL = 'https://kvdb.io/beta/math-genius-app-public-db';
const USER_STATS_PREFIX = 'stats_';
const LEADERBOARD_KEY = 'leaderboard_v3';

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

// --- Cloud Helpers ---

const fetchFromCloud = async <T>(key: string): Promise<T | null> => {
  try {
    const response = await fetch(`${CLOUD_API_URL}/${key}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (e) {
    console.warn(`Cloud fetch failed for ${key}, falling back to local`, e);
    return null;
  }
};

const saveToCloud = async (key: string, data: any): Promise<void> => {
  try {
    await fetch(`${CLOUD_API_URL}/${key}`, {
      method: 'POST', // KVDB uses POST to update/create
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.warn(`Cloud save failed for ${key}`, e);
  }
};

// --- Stats Logic ---

export const loadStats = async (username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();
  
  // 1. Try Cloud
  const cloudStats = await fetchFromCloud<UserStats>(`${USER_STATS_PREFIX}${username}`);
  if (cloudStats) {
    // Update local cache
    localStorage.setItem(`${USER_STATS_PREFIX}${username}`, JSON.stringify(cloudStats));
    return cloudStats;
  }

  // 2. Fallback to Local
  try {
    const local = localStorage.getItem(`${USER_STATS_PREFIX}${username}`);
    if (local) return JSON.parse(local);
  } catch (e) {
    console.error("Local load failed", e);
  }

  return getInitialStats();
};

export const updateUserStats = async (result: GameResult, username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();

  // Load current stats (awaiting ensures we have latest)
  const stats = await loadStats(username);
  
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 1. Update Totals
  const correctCount = result.score;
  const incorrectCount = result.totalQuestions - result.score;
  
  stats.totalCorrect += correctCount;
  stats.totalIncorrect += incorrectCount;

  // 2. Update Streak
  if (stats.lastPlayedDate === today) {
    // Already played today
  } else if (stats.lastPlayedDate === yesterday) {
    stats.streak += 1;
  } else {
    // Only reset if missed a day (and played before)
    if (stats.lastPlayedDate) {
        stats.streak = 1;
    } else {
        stats.streak = 1; // First game ever
    }
  }
  stats.lastPlayedDate = today;

  // 3. Update Daily History
  if (!stats.dailyHistory[today]) {
    stats.dailyHistory[today] = { date: today, correct: 0, incorrect: 0 };
  }
  
  stats.dailyHistory[today].correct += correctCount;
  stats.dailyHistory[today].incorrect += incorrectCount;

  // 4. Save to Cloud & Local
  localStorage.setItem(`${USER_STATS_PREFIX}${username}`, JSON.stringify(stats));
  await saveToCloud(`${USER_STATS_PREFIX}${username}`, stats);

  // 5. Trigger Leaderboard Update
  await updateLeaderboard(username, "-", stats.totalCorrect);

  return stats;
};

// --- Leaderboard Logic ---

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  // 1. Try Cloud
  const cloudData = await fetchFromCloud<LeaderboardEntry[]>(LEADERBOARD_KEY);
  if (cloudData) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(cloudData));
    return cloudData;
  }

  // 2. Fallback Local
  try {
    const local = localStorage.getItem(LEADERBOARD_KEY);
    if (local) return JSON.parse(local);
  } catch (e) {
    console.error("Local leaderboard load failed", e);
  }
  return [];
};

export const registerNewPlayer = async (name: string, grade: string) => {
  // Check if player exists in stats to carry over score
  const stats = await loadStats(name);
  await updateLeaderboard(name, grade, stats.totalCorrect);
};

export const updateLeaderboard = async (name: string, grade: string, totalCorrect: number) => {
  try {
    // 1. Get current list (prefer cloud)
    let currentList = await getLeaderboard();
    
    // 2. Calculate badges
    const badgesCount = getBadgeStatus(totalCorrect).filter(b => b.unlocked).length;
    
    const existingIndex = currentList.findIndex(p => p.name === name);
    const today = getTodayDateString();

    const newEntry: LeaderboardEntry = {
      name,
      grade,
      totalCorrect,
      badgesCount,
      lastActive: today
    };
    
    if (existingIndex >= 0) {
      // Update
      currentList[existingIndex] = newEntry;
    } else {
      // Add
      currentList.push(newEntry);
    }

    // 3. Sort
    const sortedList = currentList.sort((a, b) => b.totalCorrect - a.totalCorrect);

    // 4. Save Cloud & Local
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sortedList));
    await saveToCloud(LEADERBOARD_KEY, sortedList);

    return sortedList;
  } catch (e) {
    console.error("Error updating leaderboard", e);
    return [];
  }
};

// --- Helpers ---

export const getLast7DaysStats = (stats: UserStats) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
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