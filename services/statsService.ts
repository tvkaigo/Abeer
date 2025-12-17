
import { UserStats, GameResult, LeaderboardEntry, PREDEFINED_USERS, Badge, getUserDisplayName } from '../types';

// Using v4 bucket for global consistency
const CLOUD_API_URL = 'https://kvdb.io/beta/math-genius-live-v4';
const USER_STATS_PREFIX = 'stats_';

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// --- Helper: Key Generation based on ID ---
const getStorageKey = (usernameOrId: string | number): string => {
  if (typeof usernameOrId === 'number') {
    return `${USER_STATS_PREFIX}${usernameOrId}`;
  }
  const user = PREDEFINED_USERS.find(u => u.name === usernameOrId);
  if (user) {
    return `${USER_STATS_PREFIX}${user.id}`;
  }
  return `${USER_STATS_PREFIX}${usernameOrId}`;
};

// --- Helper: Legacy Key Generation (username based) ---
const getLegacyStorageKey = (username: string): string => {
    return `${USER_STATS_PREFIX}${username}`;
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
    displayName: userObj ? userObj.displayName : username,
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
    // Add timestamp to prevent browser/network caching is CRITICAL for real-time updates
    const response = await fetch(`${CLOUD_API_URL}/${encodedKey}?t=${Date.now()}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
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
  
  const key = getStorageKey(username);
  const initial = getInitialStats(username);
  
  // 1. Fetch from Cloud (Using ID-based key)
  let cloudStats: UserStats | null = await fetchFromCloud<UserStats>(key);

  // 1.5 Cloud Migration: If not found by ID, try Legacy Key (Name)
  if (!cloudStats) {
      const legacyKey = getLegacyStorageKey(username);
      if (legacyKey !== key) {
          const legacyStats = await fetchFromCloud<UserStats>(legacyKey);
          if (legacyStats) {
              console.log("Migrating legacy cloud stats to new format...");
              cloudStats = legacyStats;
              // Ensure ID is set correctly on the migrated object
              const userMeta = PREDEFINED_USERS.find(u => u.name === username);
              if (userMeta) cloudStats.id = userMeta.id;
              
              // Save to new key immediately so next fetch works
              await saveToCloud(key, cloudStats);
          }
      }
  }

  // 2. Fetch from LocalStorage (Using ID-based key)
  let localStats: UserStats | null = null;
  try {
      let localStr = localStorage.getItem(key);
      
      // 2.5 Local Migration: If not found by ID, try Legacy Key
      if (!localStr) {
          const legacyKey = getLegacyStorageKey(username);
          if (legacyKey !== key) {
              localStr = localStorage.getItem(legacyKey);
              if (localStr) console.log("Found legacy local stats, attempting migration...");
          }
      }
      
      if (localStr) localStats = JSON.parse(localStr);
  } catch (e) { console.warn("Local load error"); }

  // 3. SYNCHRONIZATION LOGIC (Merge Strategy: Highest Score Wins)
  
  if (!cloudStats && !localStats) return initial;

  let bestStats: UserStats = initial;
  const cloudScore = cloudStats?.totalCorrect || 0;
  const localScore = localStats?.totalCorrect || 0;
  
  // Compare Scores:
  if (cloudScore > localScore) {
      // Cloud has newer data. Update Local.
      bestStats = { ...initial, ...cloudStats };
      localStorage.setItem(key, JSON.stringify(bestStats));
  } else if (localScore > cloudScore) {
      // Local has newer data. Update Cloud.
      bestStats = { ...initial, ...localStats };
      saveToCloud(key, bestStats); 
  } else {
      // Scores Equal. Prefer Cloud object if exists to get latest metadata, else Local.
      bestStats = cloudStats ? { ...initial, ...cloudStats } : { ...initial, ...localStats || {} };
  }

  // Ensure displayName is always correct based on current mapping
  bestStats.displayName = getUserDisplayName(bestStats.name);
  bestStats.badges = getBadgeDefinitions(bestStats.totalCorrect);
  if (!bestStats.dailyHistory) bestStats.dailyHistory = {};

  return bestStats;
};

export const updateUserStats = async (result: GameResult, username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();

  // 1. Load current best stats (handles sync/migration internally)
  let stats = await loadStats(username);
  
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 2. Apply Game Results
  const pointsEarned = result.score;
  const incorrectCount = result.totalQuestions - result.score;
  
  stats.totalCorrect = (stats.totalCorrect || 0) + pointsEarned;
  stats.totalIncorrect = (stats.totalIncorrect || 0) + incorrectCount;
  stats.name = username; 
  stats.displayName = getUserDisplayName(username);
  
  const userMeta = PREDEFINED_USERS.find(u => u.name === username);
  if (userMeta) stats.id = userMeta.id;

  // Streak Logic
  if (stats.lastPlayedDate !== today) {
    if (stats.lastPlayedDate === yesterday) {
        stats.streak = (stats.streak || 0) + 1;
    } else {
        stats.streak = 1;
    }
  }
  stats.lastPlayedDate = today;

  // History Logic
  if (!stats.dailyHistory) stats.dailyHistory = {};
  if (!stats.dailyHistory[today]) {
    stats.dailyHistory[today] = { date: today, correct: 0, incorrect: 0 };
  }
  stats.dailyHistory[today].correct += pointsEarned;
  stats.dailyHistory[today].incorrect += incorrectCount;

  stats.badges = getBadgeDefinitions(stats.totalCorrect);

  // 3. Save to Storage (Immediate Update)
  const key = getStorageKey(username);
  
  // Save Local
  localStorage.setItem(key, JSON.stringify(stats)); 
  
  // Save Cloud (Critical for real-time leaderboard PUBLIC visibility)
  await saveToCloud(key, stats); 

  return stats;
};

// --- Leaderboard Logic ---

export const getLeaderboard = async (forceSync: boolean = false): Promise<LeaderboardEntry[]> => {
  // Loop through ALL predefined users to build the global leaderboard
  // NOW USING ID TO FETCH DATA
  const fetchPromises = PREDEFINED_USERS.map(async (user) => {
      // Use ID to construct the key: stats_1, stats_2, etc.
      const key = `${USER_STATS_PREFIX}${user.id}`;
      let stats: UserStats | null = null;

      // 1. Try Cloud (Primary Source for Public Leaderboard)
      try {
          stats = await fetchFromCloud<UserStats>(key);
      } catch (e) {}

      // 1.5 Fallback: Try Legacy Cloud Key if not found
      if (!stats) {
          const legacyKey = `${USER_STATS_PREFIX}${user.name}`;
          if (legacyKey !== key) {
              try {
                  stats = await fetchFromCloud<UserStats>(legacyKey);
              } catch(e) {}
          }
      }

      // 2. If Cloud failed or is empty, try Local (Only useful for current user on own device)
      if (!stats) {
         try {
            const localStr = localStorage.getItem(key);
            if (localStr) stats = JSON.parse(localStr);
         } catch (e) {}
      }

      // 3. If still nothing, assume new player with 0 stats
      if (!stats) {
          stats = getInitialStats(user.name);
      }

      const badgesCount = getBadgeDefinitions(stats.totalCorrect || 0).filter(b => b.unlocked).length;

      // Construct the entry
      return {
          name: user.name,
          displayName: user.displayName,
          grade: '-', 
          totalCorrect: stats.totalCorrect || 0,
          badgesCount: badgesCount,
          lastActive: stats.lastPlayedDate || 'جديد'
      } as LeaderboardEntry & { totalIncorrect: number };
  });

  const results = await Promise.all(fetchPromises);

  // Sort Logic: Highest Total Correct Answers wins
  const sorted = results.sort((a, b) => {
     if (b.totalCorrect !== a.totalCorrect) {
         return b.totalCorrect - a.totalCorrect;
     }
     return a.name.localeCompare(b.name, 'ar');
  });

  return sorted;
};

export const registerNewPlayer = async (name: string, grade: string) => {
    // Register using ID key
    const key = getStorageKey(name);
    try {
        // Check if user exists in cloud
        const exists = await fetchFromCloud(key);
        // If not found, ALSO check legacy key to avoid overwriting existing legacy user with 0 stats
        if (exists === null) {
             const legacyKey = getLegacyStorageKey(name);
             const legacyExists = await fetchFromCloud(legacyKey);
             
             if (legacyExists) {
                 // Do nothing here, loadStats will handle the migration on first real load
                 return;
             }

            // Only if NEITHER exist, initialize new player
            await saveToCloud(key, getInitialStats(name));
        }
    } catch (e) {
        console.warn("Registration check skipped due to network error.");
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
