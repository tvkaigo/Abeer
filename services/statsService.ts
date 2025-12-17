
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

// --- Core Stats Logic (Synchronization) ---

export const loadStats = async (username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();
  
  const key = `${USER_STATS_PREFIX}${username}`;
  const initial = getInitialStats(username);
  
  // 1. Fetch from Cloud
  let cloudStats: UserStats | null = null;
  try {
      cloudStats = await fetchFromCloud<UserStats>(key);
  } catch (e) { console.warn("Cloud load error"); }

  // 2. Fetch from LocalStorage
  let localStats: UserStats | null = null;
  try {
      const localStr = localStorage.getItem(key);
      if (localStr) localStats = JSON.parse(localStr);
  } catch (e) { console.warn("Local load error"); }

  // 3. SYNCHRONIZATION LOGIC: "High Score Wins"
  let bestStats: UserStats = initial;

  const cloudScore = cloudStats?.totalCorrect || 0;
  const localScore = localStats?.totalCorrect || 0;

  if (cloudScore > localScore) {
      // Cloud is newer/better. Use Cloud and update Local.
      bestStats = { ...initial, ...cloudStats };
      localStorage.setItem(key, JSON.stringify(bestStats));
  } else if (localScore > cloudScore) {
      // Local is newer/better. Use Local and update Cloud.
      bestStats = { ...initial, ...localStats };
      saveToCloud(key, bestStats); 
  } else {
      // Equal or both null. Prefer Cloud.
      if (cloudStats) bestStats = { ...initial, ...cloudStats };
      else if (localStats) bestStats = { ...initial, ...localStats };
  }

  // 4. Recalculate Badges
  bestStats.badges = getBadgeDefinitions(bestStats.totalCorrect);
  if (!bestStats.dailyHistory) bestStats.dailyHistory = {};

  return bestStats;
};

export const updateUserStats = async (result: GameResult, username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();

  // 1. Load current best stats
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
  await saveToCloud(key, stats); 

  // 4. Trigger Leaderboard Update (Cache Refresh)
  // We don't await this to keep UI snappy, or we can. 
  // Since getLeaderboard fetches all, we just fire this off to update the global cache file.
  updateLeaderboard(username, "-", stats.totalCorrect);

  return stats;
};

// --- Leaderboard Logic ---

export const getLeaderboard = async (forceSync: boolean = false): Promise<LeaderboardEntry[]> => {
  // Strategy: DYNAMIC CONSTRUCTION
  // To ensure absolute consistency across devices and avoid race conditions in a single file,
  // we fetch the individual stats for ALL predefined users. 
  // Since n=7, this is efficient and robust.

  const fetchPromises = PREDEFINED_USERS.map(async (user) => {
      const key = `${USER_STATS_PREFIX}${user.name}`;
      let stats: UserStats | null = null;

      // 1. Try Cloud (Primary Source of Truth for other users)
      try {
          stats = await fetchFromCloud<UserStats>(key);
      } catch (e) {}

      // 2. Try Local (Primary Source of Truth for CURRENT user on THIS device)
      // If I just played, my local might be ahead of cloud.
      try {
          const localStr = localStorage.getItem(key);
          if (localStr) {
              const localStats = JSON.parse(localStr);
              // Simple High Score check
              if (!stats || localStats.totalCorrect > stats.totalCorrect) {
                  stats = localStats;
              }
          }
      } catch (e) {}

      // 3. Fallback
      if (!stats) {
          stats = getInitialStats(user.name);
      }

      // 4. Calculate derived data
      const badgesCount = getBadgeDefinitions(stats.totalCorrect || 0).filter(b => b.unlocked).length;

      return {
          name: user.name,
          grade: '-', 
          totalCorrect: stats.totalCorrect || 0,
          badgesCount: badgesCount,
          lastActive: stats.lastPlayedDate || 'جديد'
      } as LeaderboardEntry;
  });

  // Execute all fetches in parallel
  const results = await Promise.all(fetchPromises);

  // Sort: Highest Score first
  const sorted = results.sort((a, b) => {
     if (b.totalCorrect !== a.totalCorrect) {
         return b.totalCorrect - a.totalCorrect;
     }
     return a.name.localeCompare(b.name, 'ar');
  });

  // Save the constructed list to the global cache key (for potential other uses)
  // We don't await this; it's just a background sync.
  saveToCloud(LEADERBOARD_KEY, sorted);

  return sorted;
};

export const registerNewPlayer = async (name: string, grade: string) => {
    // No-op for dynamic leaderboard, just ensures stats init
    const key = `${USER_STATS_PREFIX}${name}`;
    const exists = await fetchFromCloud(key);
    if (!exists) {
        await saveToCloud(key, getInitialStats(name));
    }
};

export const updateLeaderboard = async (name: string, grade: string, newTotalScore: number) => {
  // We just trigger a rebuild of the cache. 
  // The actual data is in stats_{name} which is already saved by updateUserStats.
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
