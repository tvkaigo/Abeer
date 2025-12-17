
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
  // If cloud fetch failed completely (network error), we return local to allow offline play,
  // BUT we do NOT trigger a sync back to cloud to avoid overwriting good cloud data with stale local data.
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
      // Cloud is ahead. Update Local.
      bestStats = { ...initial, ...cloudStats };
      localStorage.setItem(key, JSON.stringify(bestStats));
  } else if (localScore > cloudScore) {
      // Local is ahead. Update Cloud.
      bestStats = { ...initial, ...localStats };
      saveToCloud(key, bestStats); 
  } else {
      // Scores Equal. Tie break with Incorrect answers (more play time = better source of truth)
      if (cloudIncorrect >= localIncorrect) {
          bestStats = cloudStats ? { ...initial, ...cloudStats } : { ...initial, ...localStats || {} };
          if (cloudStats) localStorage.setItem(key, JSON.stringify(bestStats));
      } else {
          bestStats = { ...initial, ...localStats };
          saveToCloud(key, bestStats);
      }
  }

  // 4. Recalculate Badges & Ensure Consistency
  bestStats.badges = getBadgeDefinitions(bestStats.totalCorrect);
  if (!bestStats.dailyHistory) bestStats.dailyHistory = {};

  return bestStats;
};

export const updateUserStats = async (result: GameResult, username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();

  // 1. Load current best stats (Sync first)
  let stats = await loadStats(username);
  
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 2. Apply Game Results
  const pointsEarned = result.score;
  const incorrectCount = result.totalQuestions - result.score;
  
  stats.totalCorrect = (stats.totalCorrect || 0) + pointsEarned;
  stats.totalIncorrect = (stats.totalIncorrect || 0) + incorrectCount;
  stats.name = username; 
  
  const userMeta = PREDEFINED_USERS.find(u => u.name === username);
  if (userMeta) stats.id = userMeta.id;

  // Streak
  if (stats.lastPlayedDate !== today) {
    if (stats.lastPlayedDate === yesterday) {
        stats.streak = (stats.streak || 0) + 1;
    } else {
        stats.streak = 1;
    }
  }
  stats.lastPlayedDate = today;

  // History
  if (!stats.dailyHistory) stats.dailyHistory = {};
  if (!stats.dailyHistory[today]) {
    stats.dailyHistory[today] = { date: today, correct: 0, incorrect: 0 };
  }
  stats.dailyHistory[today].correct += pointsEarned;
  stats.dailyHistory[today].incorrect += incorrectCount;

  stats.badges = getBadgeDefinitions(stats.totalCorrect);

  // 3. Save to Storage
  const key = `${USER_STATS_PREFIX}${username}`;
  localStorage.setItem(key, JSON.stringify(stats)); 
  
  // We save to cloud regardless here to ensure progress is captured. 
  // loadStats handled the safety check for base data.
  await saveToCloud(key, stats); 

  // 4. Trigger Leaderboard Update (Cache Refresh)
  updateLeaderboard(username, "-", stats.totalCorrect);

  return stats;
};

// --- Leaderboard Logic ---

export const getLeaderboard = async (forceSync: boolean = false): Promise<LeaderboardEntry[]> => {
  const fetchPromises = PREDEFINED_USERS.map(async (user) => {
      const key = `${USER_STATS_PREFIX}${user.name}`;
      let stats: UserStats | null = null;

      // 1. Try Cloud (Primary Source of Truth for other users)
      try {
          stats = await fetchFromCloud<UserStats>(key);
          // NEW: Cache successful cloud fetch to local storage. 
          // This ensures that this device remembers the latest scores of OTHER users too,
          // providing better offline support and faster subsequent checks.
          if (stats) {
              localStorage.setItem(key, JSON.stringify(stats));
          }
      } catch (e) {}

      // 2. Try Local (Fallback or Primary if I am the user)
      try {
          const localStr = localStorage.getItem(key);
          if (localStr) {
              const localStats = JSON.parse(localStr);
              // Check Score AND Incorrect for Tie-Break
              const cloudScore = stats?.totalCorrect || 0;
              const localScore = localStats.totalCorrect || 0;
              
              if (!stats || localScore > cloudScore) {
                  stats = localStats;
              } else if (localScore === cloudScore) {
                 if ((localStats.totalIncorrect || 0) > (stats.totalIncorrect || 0)) {
                    stats = localStats;
                 }
              }
          }
      } catch (e) {}

      if (!stats) {
          stats = getInitialStats(user.name);
      }

      const badgesCount = getBadgeDefinitions(stats.totalCorrect || 0).filter(b => b.unlocked).length;

      return {
          name: user.name,
          grade: '-', 
          totalCorrect: stats.totalCorrect || 0,
          badgesCount: badgesCount,
          lastActive: stats.lastPlayedDate || 'جديد'
      } as LeaderboardEntry;
  });

  const results = await Promise.all(fetchPromises);

  const sorted = results.sort((a, b) => {
     if (b.totalCorrect !== a.totalCorrect) {
         return b.totalCorrect - a.totalCorrect;
     }
     return a.name.localeCompare(b.name, 'ar');
  });

  // Background cache update
  saveToCloud(LEADERBOARD_KEY, sorted);

  return sorted;
};

export const registerNewPlayer = async (name: string, grade: string) => {
    const key = `${USER_STATS_PREFIX}${name}`;
    try {
        const exists = await fetchFromCloud(key);
        // Only initialize if explicitly Not Found (404). 
        // If fetch throws (Network Error), we skip to prevent overwriting valid data.
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
