
import { UserStats, GameResult, LeaderboardEntry, PREDEFINED_USERS, Badge } from '../types';

// Using v4 bucket for global consistency
const CLOUD_API_URL = 'https://kvdb.io/beta/math-genius-live-v4';
const USER_STATS_PREFIX = 'stats_';
const LEADERBOARD_KEY = 'leaderboard_global';

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// --- Helper: Badge Logic ---
// We export this so components can use it if needed, but mainly used internally
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
  // This ensures that if a user plays on Device A (Score 100), then goes to Device B (Score 0),
  // Device B will adopt the Score 100.
  // Conversely, if user plays offline on Device B (Score 150), it overrides Cloud (Score 100).
  
  let bestStats: UserStats = initial;

  const cloudScore = cloudStats?.totalCorrect || 0;
  const localScore = localStats?.totalCorrect || 0;

  if (cloudScore > localScore) {
      // Cloud is newer/better. Use Cloud and update Local.
      bestStats = { ...initial, ...cloudStats };
      localStorage.setItem(key, JSON.stringify(bestStats));
  } else if (localScore > cloudScore) {
      // Local is newer/better (played offline?). Use Local and update Cloud.
      bestStats = { ...initial, ...localStats };
      saveToCloud(key, bestStats); // Sync back to cloud in background
  } else {
      // Equal or both null. Prefer Cloud if available, else Local, else Initial.
      if (cloudStats) bestStats = { ...initial, ...cloudStats };
      else if (localStats) bestStats = { ...initial, ...localStats };
  }

  // 4. Recalculate Badges to ensure consistency
  // We don't trust the stored badges array purely, we regenerate it based on the trusted score.
  bestStats.badges = getBadgeDefinitions(bestStats.totalCorrect);
  
  // Ensure dailyHistory exists (migration safety)
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
  stats.name = username; // Ensure name is set
  
  // Update ID
  const userMeta = PREDEFINED_USERS.find(u => u.name === username);
  if (userMeta) stats.id = userMeta.id;

  // Streak Logic
  if (stats.lastPlayedDate !== today) {
    if (stats.lastPlayedDate === yesterday) {
        stats.streak = (stats.streak || 0) + 1;
    } else {
        stats.streak = 1; // Reset or Start new
    }
  }
  stats.lastPlayedDate = today;

  // Daily History
  if (!stats.dailyHistory) stats.dailyHistory = {};
  if (!stats.dailyHistory[today]) {
    stats.dailyHistory[today] = { date: today, correct: 0, incorrect: 0 };
  }
  stats.dailyHistory[today].correct += pointsEarned;
  stats.dailyHistory[today].incorrect += incorrectCount;

  // Update Badges based on new total
  stats.badges = getBadgeDefinitions(stats.totalCorrect);

  // 3. Save to Storage (Both Cloud and Local)
  const key = `${USER_STATS_PREFIX}${username}`;
  localStorage.setItem(key, JSON.stringify(stats)); // Immediate local update
  await saveToCloud(key, stats); // Cloud update

  // 4. Update Global Leaderboard
  await updateLeaderboard(username, "-", stats.totalCorrect);

  return stats;
};

// --- Leaderboard Logic ---

export const getLeaderboard = async (forceSync: boolean = false): Promise<LeaderboardEntry[]> => {
  let currentList: LeaderboardEntry[] = [];

  // Always try Cloud first for Leaderboard to see other players
  const cloudData = await fetchFromCloud<LeaderboardEntry[]>(LEADERBOARD_KEY);
  
  if (cloudData && Array.isArray(cloudData)) {
    currentList = cloudData;
    // Cache it locally
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(currentList));
  } else {
     // Fallback to local cache if cloud fails
     try {
       const local = localStorage.getItem(LEADERBOARD_KEY);
       if (local) currentList = JSON.parse(local);
     } catch (e) {}
  }

  // Ensure all predefined users are in the list (Fill gaps)
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

  // Sort
  const sorted = currentList.sort((a, b) => {
     if (b.totalCorrect !== a.totalCorrect) {
         return b.totalCorrect - a.totalCorrect;
     }
     return a.name.localeCompare(b.name, 'ar');
  });

  if (listChanged && cloudData) {
      saveToCloud(LEADERBOARD_KEY, sorted);
  }

  return sorted;
};

export const registerNewPlayer = async (name: string, grade: string) => {
    // Just ensure existence
    await updateLeaderboard(name, grade, 0);
};

export const updateLeaderboard = async (name: string, grade: string, newTotalScore: number) => {
  try {
    // Fetch latest to avoid race conditions overwriting others
    let currentList = await getLeaderboard(true);
    
    const trimmedName = name.trim();
    const existingIndex = currentList.findIndex(p => p.name === trimmedName);
    const today = getTodayDateString();

    if (existingIndex >= 0) {
        const entry = currentList[existingIndex];
        // Critical: Only update if the new score is actually higher or equal
        // This prevents a device with old data from resetting the leaderboard score
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
