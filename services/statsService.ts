
import { UserStats, GameResult, LeaderboardEntry, PREDEFINED_USERS, Badge } from '../types';

// Using v4 bucket for global consistency
const CLOUD_API_URL = 'https://kvdb.io/beta/math-genius-live-v4';
const USER_STATS_PREFIX = 'stats_';
const LEADERBOARD_KEY = 'leaderboard_global';

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// --- Helper: Badge Logic ---
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
    // Add timestamp to prevent browser/network caching
    const response = await fetch(`${CLOUD_API_URL}/${encodedKey}?t=${Date.now()}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.warn(`Cloud fetch failed for ${key}`, e);
    throw e; // Re-throw to handle in caller
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

// --- Core Stats Logic (Synchronization) ---

export const loadStats = async (username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();
  
  const key = `${USER_STATS_PREFIX}${username}`;
  const initial = getInitialStats(username);
  
  // 1. Fetch from Cloud with error handling
  let cloudStats: UserStats | null = null;
  let cloudFetchFailed = false;
  try {
      cloudStats = await fetchFromCloud<UserStats>(key);
  } catch (e) { 
      cloudFetchFailed = true; 
  }

  // 2. Fetch from LocalStorage
  let localStats: UserStats | null = null;
  try {
      const localStr = localStorage.getItem(key);
      if (localStr) localStats = JSON.parse(localStr);
  } catch (e) { console.warn("Local load error"); }

  // 3. SYNCHRONIZATION LOGIC
  if (cloudFetchFailed) {
      if (localStats) return localStats;
      return initial;
  }

  let bestStats: UserStats = initial;
  const cloudScore = cloudStats?.totalCorrect || 0;
  const localScore = localStats?.totalCorrect || 0;
  
  const cloudIncorrect = cloudStats?.totalIncorrect || 0;
  const localIncorrect = localStats?.totalIncorrect || 0;

  // Compare Logic: Correct Answers > Incorrect Answers > Prefer Cloud
  if (cloudScore > localScore) {
      bestStats = { ...initial, ...cloudStats };
      localStorage.setItem(key, JSON.stringify(bestStats));
  } else if (localScore > cloudScore) {
      bestStats = { ...initial, ...localStats };
      saveToCloud(key, bestStats); 
  } else {
      // Scores Equal. Tie break with Incorrect answers
      if (cloudIncorrect >= localIncorrect) {
          bestStats = cloudStats ? { ...initial, ...cloudStats } : { ...initial, ...localStats || {} };
          if (cloudStats) localStorage.setItem(key, JSON.stringify(bestStats));
      } else {
          bestStats = { ...initial, ...localStats };
          saveToCloud(key, bestStats);
      }
  }

  bestStats.badges = getBadgeDefinitions(bestStats.totalCorrect);
  if (!bestStats.dailyHistory) bestStats.dailyHistory = {};

  return bestStats;
};

export const updateUserStats = async (result: GameResult, username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();

  let stats = await loadStats(username);
  
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const pointsEarned = result.score;
  const incorrectCount = result.totalQuestions - result.score;
  
  stats.totalCorrect = (stats.totalCorrect || 0) + pointsEarned;
  stats.totalIncorrect = (stats.totalIncorrect || 0) + incorrectCount;
  stats.name = username; 
  
  const userMeta = PREDEFINED_USERS.find(u => u.name === username);
  if (userMeta) stats.id = userMeta.id;

  if (stats.lastPlayedDate !== today) {
    if (stats.lastPlayedDate === yesterday) {
        stats.streak = (stats.streak || 0) + 1;
    } else {
        stats.streak = 1;
    }
  }
  stats.lastPlayedDate = today;

  if (!stats.dailyHistory) stats.dailyHistory = {};
  if (!stats.dailyHistory[today]) {
    stats.dailyHistory[today] = { date: today, correct: 0, incorrect: 0 };
  }
  stats.dailyHistory[today].correct += pointsEarned;
  stats.dailyHistory[today].incorrect += incorrectCount;

  stats.badges = getBadgeDefinitions(stats.totalCorrect);

  const key = `${USER_STATS_PREFIX}${username}`;
  localStorage.setItem(key, JSON.stringify(stats)); 
  await saveToCloud(key, stats); 

  updateLeaderboard(username, "-", stats.totalCorrect);

  return stats;
};

// --- Leaderboard Logic ---

export const getLeaderboard = async (forceSync: boolean = false): Promise<LeaderboardEntry[]> => {
  const fetchPromises = PREDEFINED_USERS.map(async (user) => {
      const key = `${USER_STATS_PREFIX}${user.name}`;
      let stats: UserStats | null = null;

      // 1. Always try Cloud first for Leaderboard to ensure global consistency
      try {
          const cloudData = await fetchFromCloud<UserStats>(key);
          if (cloudData) {
              stats = cloudData;
              // Update local cache so next time it's faster if offline
              localStorage.setItem(key, JSON.stringify(cloudData));
          }
      } catch (e) {
          // Silent fail on cloud, will fallback to local
      }

      // 2. Fallback to Local if Cloud failed or returned nothing
      if (!stats) {
          try {
              const localStr = localStorage.getItem(key);
              if (localStr) {
                  stats = JSON.parse(localStr);
              }
          } catch (e) {}
      }

      if (!stats) {
          stats = getInitialStats(user.name);
      }

      const badgesCount = getBadgeDefinitions(stats.totalCorrect || 0).filter(b => b.unlocked).length;

      return {
          name: user.name,
          grade: '-', 
          totalCorrect: stats.totalCorrect || 0,
          totalIncorrect: stats.totalIncorrect || 0, // Added for sorting
          badgesCount: badgesCount,
          lastActive: stats.lastPlayedDate || 'جديد'
      } as LeaderboardEntry & { totalIncorrect: number };
  });

  const results = await Promise.all(fetchPromises);

  // Sorting Logic:
  // 1. Higher Total Correct wins.
  // 2. If Equal, Lower Total Incorrect wins (Better accuracy).
  // 3. If Equal, Alphabetical.
  const sorted = results.sort((a, b) => {
     if (b.totalCorrect !== a.totalCorrect) {
         return b.totalCorrect - a.totalCorrect;
     }
     // Tie-breaker: Accuracy (Less incorrect answers is better)
     if (a.totalIncorrect !== b.totalIncorrect) {
         return a.totalIncorrect - b.totalIncorrect;
     }
     return a.name.localeCompare(b.name, 'ar');
  });

  return sorted;
};

export const registerNewPlayer = async (name: string, grade: string) => {
    const key = `${USER_STATS_PREFIX}${name}`;
    try {
        const exists = await fetchFromCloud(key);
        if (exists === null) {
            await saveToCloud(key, getInitialStats(name));
        }
    } catch (e) {
        console.warn("Registration skipped due to network error to protect data.");
    }
};

export const updateLeaderboard = async (name: string, grade: string, newTotalScore: number) => {
  return getLeaderboard(true);
};

export const getLast7DaysStats = (stats: UserStats) => {
  const days = [];
  const history = stats.dailyHistory || {};
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(d);
    
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
