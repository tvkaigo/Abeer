
import { UserStats, GameResult, LeaderboardEntry, PREDEFINED_USERS, Badge } from '../types';

// Using v4 bucket for fresh start
const CLOUD_API_URL = 'https://kvdb.io/beta/math-genius-live-v4';
const USER_STATS_PREFIX = 'stats_';
const LEADERBOARD_KEY = 'leaderboard_global';

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Helper to get badge definitions
export const getBadgeDefinitions = (totalCorrect: number): Badge[] => {
  return [
    { id: 1, name: 'مبتدئ', required: 50, icon: '🌱', unlocked: totalCorrect >= 50, color: 'text-green-600 bg-green-100 border-green-200' },
    { id: 2, name: 'عبقري', required: 100, icon: '🧠', unlocked: totalCorrect >= 100, color: 'text-blue-600 bg-blue-100 border-blue-200' },
    { id: 3, name: 'الملك', required: 200, icon: '👑', unlocked: totalCorrect >= 200, color: 'text-purple-600 bg-purple-100 border-purple-200' },
    { id: 4, name: 'الأسطورة', required: 300, icon: '🏆', unlocked: totalCorrect >= 300, color: 'text-yellow-600 bg-yellow-100 border-yellow-200' },
  ];
};

export const getInitialStats = (username: string = ''): UserStats => {
  const userObj = PREDEFINED_USERS.find(u => u.name === username);
  return {
    id: userObj ? userObj.id : 0,
    name: username,
    totalCorrect: 0,
    totalIncorrect: 0,
    streak: 0,
    lastPlayedDate: null,
    dailyHistory: {},
    badges: getBadgeDefinitions(0)
  };
};

// --- Cloud Helpers ---

const fetchFromCloud = async <T>(key: string): Promise<T | null> => {
  try {
    const encodedKey = encodeURIComponent(key);
    // Add timestamp to prevent caching
    const response = await fetch(`${CLOUD_API_URL}/${encodedKey}?t=${Date.now()}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (e) {
    console.warn(`Cloud fetch failed for ${key}`, e);
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
  
  const initial = getInitialStats(username);
  const key = `${USER_STATS_PREFIX}${username}`;
  
  // 1. Try fetching from Cloud
  let loadedData: UserStats | null = await fetchFromCloud<UserStats>(key);
  
  // 2. Fallback: Try LocalStorage if Cloud failed or returned null
  // This ensures that if the user played offline or cloud is flaky, we still show their progress.
  if (!loadedData) {
      try {
          const local = localStorage.getItem(key);
          if (local) {
              const parsed = JSON.parse(local);
              if (parsed && parsed.totalCorrect !== undefined) {
                  loadedData = parsed;
                  // If we found local data but missed cloud, try to sync back to cloud in background
                  saveToCloud(key, loadedData);
              }
          }
      } catch (e) {
          console.warn("Local load failed", e);
      }
  }

  if (loadedData) {
    // Merge loaded stats with initial structure to ensure all fields (like dailyHistory) exist
    // regardless of versioning differences.
    return {
        ...initial,
        ...loadedData,
        // Recalculate badge status based on the trusted totalCorrect score
        badges: getBadgeDefinitions(loadedData.totalCorrect || 0),
        // Ensure dailyHistory exists
        dailyHistory: loadedData.dailyHistory || {} 
    };
  }
  
  // If absolutely no data found, return initial empty stats
  return initial;
};

export const updateUserStats = async (result: GameResult, username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();

  // 1. Load User's detailed stats (Source of Truth)
  let stats = await loadStats(username);
  
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 2. Update Totals
  const pointsEarned = result.score;
  const newTotalCorrect = (stats.totalCorrect || 0) + pointsEarned;
  
  stats.totalCorrect = newTotalCorrect;
  stats.totalIncorrect = (stats.totalIncorrect || 0) + (result.totalQuestions - result.score);
  
  // Ensure ID and Name are consistent
  const userMeta = PREDEFINED_USERS.find(u => u.name === username);
  if (userMeta) stats.id = userMeta.id;
  stats.name = username;

  // 3. Update Streak
  if (stats.lastPlayedDate !== today) {
    if (stats.lastPlayedDate === yesterday) {
        stats.streak = (stats.streak || 0) + 1;
    } else {
        // Reset streak if missed a day, unless it's first play
        stats.streak = 1;
    }
  }
  stats.lastPlayedDate = today;

  // 4. Update Daily History
  if (!stats.dailyHistory) stats.dailyHistory = {};
  if (!stats.dailyHistory[today]) {
    stats.dailyHistory[today] = { date: today, correct: 0, incorrect: 0 };
  }
  stats.dailyHistory[today].correct += pointsEarned;
  stats.dailyHistory[today].incorrect += (result.totalQuestions - result.score);

  // 5. Update Badges
  stats.badges = getBadgeDefinitions(newTotalCorrect);

  // 6. Save Detailed Stats to Cloud AND LocalStorage
  const key = `${USER_STATS_PREFIX}${username}`;
  await saveToCloud(key, stats);
  localStorage.setItem(key, JSON.stringify(stats));

  // 7. Update Global Leaderboard based on the new stats
  await updateLeaderboard(username, "-", newTotalCorrect);

  return stats;
};

// --- Leaderboard Logic ---

export const getLeaderboard = async (forceSync: boolean = false): Promise<LeaderboardEntry[]> => {
  let currentList: LeaderboardEntry[] = [];

  // Try Cloud First
  const cloudData = await fetchFromCloud<LeaderboardEntry[]>(LEADERBOARD_KEY);
  if (cloudData && Array.isArray(cloudData)) {
    currentList = cloudData;
  } else {
     // Fallback to local
     try {
       const local = localStorage.getItem(LEADERBOARD_KEY);
       if (local) currentList = JSON.parse(local);
     } catch (e) {}
  }

  // Ensure all predefined users are in the list
  const existingMap = new Map(currentList.map(p => [p.name.trim(), p]));
  let listChanged = false;

  PREDEFINED_USERS.forEach(user => {
      const trimmedName = user.name.trim();
      if (!existingMap.has(trimmedName)) {
          currentList.push({
              name: trimmedName,
              grade: '-',
              totalCorrect: 0,
              badgesCount: 0,
              lastActive: 'جديد'
          });
          listChanged = true;
      }
  });

  // Sort by Total Correct (Desc), then Name (Asc)
  const sorted = currentList.sort((a, b) => {
     if (b.totalCorrect !== a.totalCorrect) {
         return b.totalCorrect - a.totalCorrect;
     }
     return a.name.localeCompare(b.name, 'ar');
  });

  if (listChanged && cloudData) {
      saveToCloud(LEADERBOARD_KEY, sorted);
  }

  // Save to local for fast access next time
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sorted));
  return sorted;
};

export const registerNewPlayer = async (name: string, grade: string) => {
  const leaderboard = await getLeaderboard(false);
  const exists = leaderboard.find(p => p.name === name);
  if (!exists) {
    await updateLeaderboard(name, grade, 0);
  }
};

export const updateLeaderboard = async (name: string, grade: string, newTotalScore: number) => {
  try {
    let currentList = await getLeaderboard(false);
    
    const trimmedName = name.trim();
    const existingIndex = currentList.findIndex(p => p.name === trimmedName);
    const today = getTodayDateString();

    if (existingIndex >= 0) {
        const entry = currentList[existingIndex];
        // Only update score if new score is higher (monotonic increase expected for totalCorrect)
        const finalScore = Math.max(newTotalScore, entry.totalCorrect);
        
        currentList[existingIndex] = {
            ...entry,
            grade: grade !== '-' ? grade : entry.grade,
            totalCorrect: finalScore,
            badgesCount: getBadgeDefinitions(finalScore).filter(b => b.unlocked).length,
            lastActive: today
        };
    }

    const sortedList = currentList.sort((a, b) => {
        if (b.totalCorrect !== a.totalCorrect) {
            return b.totalCorrect - a.totalCorrect;
        }
        return a.name.localeCompare(b.name, 'ar');
    });

    await saveToCloud(LEADERBOARD_KEY, sortedList);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sortedList));

    return sortedList;
  } catch (e) {
    console.error("Error updating leaderboard", e);
    return [];
  }
};

export const getLast7DaysStats = (stats: UserStats) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(d);
    
    const history = stats.dailyHistory || {};
    const dayData = history[dateStr] || { correct: 0, incorrect: 0 };
    days.push({
      date: dateStr,
      label,
      correct: dayData.correct,
      incorrect: dayData.incorrect
    });
  }
  return days;
};

export const getBadgeStatus = (totalCorrect: number) => getBadgeDefinitions(totalCorrect);
