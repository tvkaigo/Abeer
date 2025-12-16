import { UserStats, GameResult, LeaderboardEntry, PREDEFINED_USERS } from '../types';

// Using v4 bucket as established
const CLOUD_API_URL = 'https://kvdb.io/beta/math-genius-live-v4';
const USER_STATS_PREFIX = 'stats_';
const LEADERBOARD_KEY = 'leaderboard_global';

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
    const encodedKey = encodeURIComponent(key);
    // Add timestamp to bypass cache
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
  
  // Try cloud
  const cloudStats = await fetchFromCloud<UserStats>(`${USER_STATS_PREFIX}${username}`);
  if (cloudStats) {
    return cloudStats;
  }
  
  return getInitialStats();
};

export const updateUserStats = async (result: GameResult, username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();

  // 1. Load User's detailed stats
  let stats = await loadStats(username);
  
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 2. CRITICAL FIX: Get the TRUE accumulated score from Leaderboard/Stats reconciliation.
  // We do not trust 'stats.totalCorrect' alone because it might be from a fresh/empty file.
  // We fetch the leaderboard (which now syncs with everything) to find the max valid score.
  let currentTotalCorrect = stats.totalCorrect;
  
  try {
      // We use false here to avoid a double-heavy sync, relying on the fact that loadStats above 
      // just got the user's specific file. However, to be ultra safe against race conditions:
      const leaderboard = await getLeaderboard(false); 
      const userEntry = leaderboard.find(p => p.name === username);
      if (userEntry) {
          currentTotalCorrect = Math.max(currentTotalCorrect, userEntry.totalCorrect);
      }
  } catch (e) {
      console.warn("Could not sync with leaderboard for baseline", e);
  }

  // 3. Add New Points
  const pointsEarned = result.score;
  const newTotalCorrect = currentTotalCorrect + pointsEarned;
  
  stats.totalCorrect = newTotalCorrect;
  stats.totalIncorrect += (result.totalQuestions - result.score);

  // 4. Update Streak
  if (stats.lastPlayedDate !== today) {
    if (stats.lastPlayedDate === yesterday) {
        stats.streak += 1;
    } else {
        stats.streak = 1;
    }
  }
  stats.lastPlayedDate = today;

  // 5. Update Daily History
  if (!stats.dailyHistory[today]) {
    stats.dailyHistory[today] = { date: today, correct: 0, incorrect: 0 };
  }
  stats.dailyHistory[today].correct += pointsEarned;
  stats.dailyHistory[today].incorrect += (result.totalQuestions - result.score);

  // 6. Save Stats (Detail view)
  // We save this first so the subsequent leaderboard sync can see it
  await saveToCloud(`${USER_STATS_PREFIX}${username}`, stats);
  localStorage.setItem(`${USER_STATS_PREFIX}${username}`, JSON.stringify(stats));

  // 7. Update Leaderboard
  // This will force a sync of all users to ensure consistency
  await updateLeaderboard(username, "-", newTotalCorrect);

  return stats;
};

// --- Leaderboard Logic ---

export const getLeaderboard = async (forceSync: boolean = false): Promise<LeaderboardEntry[]> => {
  let currentList: LeaderboardEntry[] = [];

  // 1. Fetch current aggregate data to preserve grades/metadata
  const cloudData = await fetchFromCloud<LeaderboardEntry[]>(LEADERBOARD_KEY);
  if (cloudData && Array.isArray(cloudData)) {
    currentList = cloudData;
  } else {
     // Fallback local
     try {
       const local = localStorage.getItem(LEADERBOARD_KEY);
       if (local) currentList = JSON.parse(local);
     } catch (e) {}
  }

  // 2. Ensure Predefined Users exist in the list
  const existingMap = new Map(currentList.map(p => [p.name.trim(), p]));
  PREDEFINED_USERS.forEach(name => {
      const trimmedName = name.trim();
      if (!existingMap.has(trimmedName)) {
          currentList.push({
              name: trimmedName,
              grade: '-',
              totalCorrect: 0,
              badgesCount: 0,
              lastActive: 'غير نشط'
          });
      }
  });

  // 3. RECONSTRUCTION: If forceSync is true, fetch individual stats for ALL users
  // This ensures the leaderboard reflects the actual analytics data
  if (forceSync) {
      try {
          const statsPromises = PREDEFINED_USERS.map(async (name) => {
              const stats = await loadStats(name.trim());
              return { name: name.trim(), stats };
          });

          const allStats = await Promise.all(statsPromises);
          
          currentList = currentList.map(entry => {
              const userStatsObj = allStats.find(s => s.name === entry.name);
              
              // If we found stats, reconcile the score
              if (userStatsObj) {
                  const statsScore = userStatsObj.stats.totalCorrect;
                  // We take the MAX of stats vs existing leaderboard to prevent data loss
                  // But we prioritize stats if it's higher or if leaderboard was 0
                  const finalScore = Math.max(statsScore, entry.totalCorrect);
                  
                  return {
                      ...entry,
                      totalCorrect: finalScore,
                      badgesCount: getBadgeStatus(finalScore).filter(b => b.unlocked).length,
                      lastActive: userStatsObj.stats.lastPlayedDate || entry.lastActive
                  };
              }
              return entry;
          });
          
          // Save the synchronized list
          saveToCloud(LEADERBOARD_KEY, currentList);
          
      } catch (e) {
          console.error("Failed to sync leaderboard with analytics", e);
      }
  }

  // 4. Sort
  const sorted = currentList.sort((a, b) => {
     if (b.totalCorrect !== a.totalCorrect) {
         return b.totalCorrect - a.totalCorrect;
     }
     return a.name.localeCompare(b.name, 'ar');
  });

  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sorted));
  return sorted;
};

export const registerNewPlayer = async (name: string, grade: string) => {
  // Trigger a sync to make sure this player is initialized correctly
  await updateLeaderboard(name, grade, 0);
};

export const updateLeaderboard = async (name: string, grade: string, newTotalScore: number) => {
  try {
    // We force sync here to ensure the leaderboard is clean before we update our specific user
    // This is a bit heavy (7 fetches) but guarantees consistency
    let currentList = await getLeaderboard(true);
    
    const trimmedName = name.trim();
    const existingIndex = currentList.findIndex(p => p.name === trimmedName);
    const today = getTodayDateString();

    if (existingIndex >= 0) {
        const entry = currentList[existingIndex];
        // Ensure we don't overwrite a higher score from a parallel session
        const finalScore = Math.max(newTotalScore, entry.totalCorrect);
        
        currentList[existingIndex] = {
            ...entry,
            grade: grade !== '-' ? grade : entry.grade,
            totalCorrect: finalScore,
            badgesCount: getBadgeStatus(finalScore).filter(b => b.unlocked).length,
            lastActive: today
        };
    }

    // Sort again after update
    const sortedList = currentList.sort((a, b) => {
        if (b.totalCorrect !== a.totalCorrect) {
            return b.totalCorrect - a.totalCorrect;
        }
        return a.name.localeCompare(b.name, 'ar');
    });

    // Save
    await saveToCloud(LEADERBOARD_KEY, sortedList);
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