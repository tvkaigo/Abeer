import { UserStats, GameResult, LeaderboardEntry, PREDEFINED_USERS } from '../types';

// Unique bucket ID for this specific app instance to ensure all users share the same data
const CLOUD_API_URL = 'https://kvdb.io/beta/math-genius-live-v1';
const USER_STATS_PREFIX = 'stats_';
const LEADERBOARD_KEY = 'leaderboard_global_v1';

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
    // Add timestamp to prevent caching and ENCODE the key for Arabic support
    const encodedKey = encodeURIComponent(key);
    const response = await fetch(`${CLOUD_API_URL}/${encodedKey}?t=${Date.now()}`);
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
    const encodedKey = encodeURIComponent(key);
    await fetch(`${CLOUD_API_URL}/${encodedKey}`, {
      method: 'POST',
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
  
  // 1. Try Cloud first (Source of Truth)
  const cloudStats = await fetchFromCloud<UserStats>(`${USER_STATS_PREFIX}${username}`);
  if (cloudStats) {
    localStorage.setItem(`${USER_STATS_PREFIX}${username}`, JSON.stringify(cloudStats));
    return cloudStats;
  }

  // 2. Fallback to Local if cloud fails or doesn't exist
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

  // 1. Load latest individual stats
  const stats = await loadStats(username);
  
  // 2. SAFETY SYNC: Check Leaderboard to recover lost progress
  // If local stats file was reset/lost but leaderboard has higher score, resume from leaderboard
  try {
      const leaderboard = await getLeaderboard(true);
      const userEntry = leaderboard.find(p => p.name === username);
      if (userEntry && userEntry.totalCorrect > stats.totalCorrect) {
          console.log(`Restoring stats from leaderboard: ${stats.totalCorrect} -> ${userEntry.totalCorrect}`);
          stats.totalCorrect = userEntry.totalCorrect;
      }
  } catch (e) {
      console.warn("Leaderboard sync check failed, proceeding with local stats");
  }

  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 3. Apply New Game Results
  const correctCount = result.score;
  const incorrectCount = result.totalQuestions - result.score;
  
  stats.totalCorrect += correctCount;
  stats.totalIncorrect += incorrectCount;

  // 4. Update Streak
  if (stats.lastPlayedDate === today) {
    // Already played today
  } else if (stats.lastPlayedDate === yesterday) {
    stats.streak += 1;
  } else {
    // Check if it's not the very first game
    if (stats.lastPlayedDate) {
        stats.streak = 1;
    } else {
        stats.streak = 1; 
    }
  }
  stats.lastPlayedDate = today;

  // 5. Update Daily History
  if (!stats.dailyHistory[today]) {
    stats.dailyHistory[today] = { date: today, correct: 0, incorrect: 0 };
  }
  
  stats.dailyHistory[today].correct += correctCount;
  stats.dailyHistory[today].incorrect += incorrectCount;

  // 6. Save to Cloud & Local
  localStorage.setItem(`${USER_STATS_PREFIX}${username}`, JSON.stringify(stats));
  await saveToCloud(`${USER_STATS_PREFIX}${username}`, stats);

  // 7. Trigger Leaderboard Update immediately
  await updateLeaderboard(username, "-", stats.totalCorrect);

  return stats;
};

// --- Leaderboard Logic ---

export const getLeaderboard = async (skipCache: boolean = false): Promise<LeaderboardEntry[]> => {
  let currentList: LeaderboardEntry[] = [];

  // 1. Try Cloud
  const cloudData = await fetchFromCloud<LeaderboardEntry[]>(LEADERBOARD_KEY);
  if (cloudData) {
    currentList = cloudData;
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(cloudData));
  } else if (!skipCache) {
    // Fallback Local
    try {
      const local = localStorage.getItem(LEADERBOARD_KEY);
      if (local) currentList = JSON.parse(local);
    } catch (e) {
      console.error("Local leaderboard load failed", e);
    }
  }

  // 2. Merge with Predefined Users
  // This ensures that all students appear in the list even if they haven't played yet
  const existingMap = new Map(currentList.map(p => [p.name, p]));
  
  PREDEFINED_USERS.forEach(name => {
      if (!existingMap.has(name)) {
          currentList.push({
              name,
              grade: '-',
              totalCorrect: 0,
              badgesCount: 0,
              lastActive: 'غير نشط' // Not active yet
          });
      }
  });

  // 3. Sort by Score (Desc) then by Name (Asc) for stability
  return currentList.sort((a, b) => {
     if (b.totalCorrect !== a.totalCorrect) {
         return b.totalCorrect - a.totalCorrect;
     }
     return a.name.localeCompare(b.name, 'ar');
  });
};

export const registerNewPlayer = async (name: string, grade: string) => {
  // Always load stats from cloud to ensure we have the real totalCorrect
  const stats = await loadStats(name);
  
  // Only update leaderboard if we have data or to initialize, 
  // but updateLeaderboard now handles safety checks.
  await updateLeaderboard(name, grade, stats.totalCorrect);
};

export const updateLeaderboard = async (name: string, grade: string, totalCorrect: number) => {
  try {
    // 1. Fetch Fresh Leaderboard from Cloud
    let currentList = await getLeaderboard(true);
    
    const existingIndex = currentList.findIndex(p => p.name === name);
    const today = getTodayDateString();

    let finalTotalCorrect = totalCorrect;
    
    // Safety check: Ensure Monotonicity (Score should never go down)
    // This protects against overwriting high scores with 0 if local data was lost
    if (existingIndex >= 0) {
        const existingEntry = currentList[existingIndex];
        if (totalCorrect < existingEntry.totalCorrect) {
            console.log(`Preventing score reset for ${name}: New=${totalCorrect}, Kept=${existingEntry.totalCorrect}`);
            finalTotalCorrect = existingEntry.totalCorrect;
        }
    }

    const badgesCount = getBadgeStatus(finalTotalCorrect).filter(b => b.unlocked).length;

    const newEntry: LeaderboardEntry = {
      name,
      grade,
      totalCorrect: finalTotalCorrect,
      badgesCount,
      lastActive: today
    };
    
    if (existingIndex >= 0) {
      // Update existing entry
      currentList[existingIndex] = newEntry;
    } else {
      // Add new entry
      currentList.push(newEntry);
    }

    // 3. Sort - CRITICAL: Must match getLeaderboard sort logic to ensure consistent ranking
    const sortedList = currentList.sort((a, b) => {
        if (b.totalCorrect !== a.totalCorrect) {
            return b.totalCorrect - a.totalCorrect;
        }
        return a.name.localeCompare(b.name, 'ar');
    });

    // 4. Save back to Cloud
    await saveToCloud(LEADERBOARD_KEY, sortedList);
    // Also save local
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sortedList));

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