
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  updateDoc,
  increment,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { UserStats, GameResult, LeaderboardEntry, PREDEFINED_USERS, Badge } from '../types';

// Replace with actual keys if available, but the app handles failures gracefully now.
const firebaseConfig = {
  apiKey: "AIzaSyAs-Placeholder-Key",
  authDomain: "math-genius-app.firebaseapp.com",
  projectId: "math-genius-app",
  storageBucket: "math-genius-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

let db: Firestore;
let cloudEnabled = true;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase initialization failed.");
  cloudEnabled = false;
}

const PLAYERS_COLLECTION = 'players';
const getTodayDateString = (): string => new Date().toISOString().split('T')[0];

export const getBadgeDefinitions = (totalCorrect: number): Badge[] => [
  { id: 1, name: 'مبتدئ', required: 50, icon: '🌱', unlocked: totalCorrect >= 50, color: 'text-green-600 bg-green-100 border-green-200' },
  { id: 2, name: 'عبقري', required: 100, icon: '🧠', unlocked: totalCorrect >= 100, color: 'text-blue-600 bg-blue-100 border-blue-200' },
  { id: 3, name: 'الملك', required: 200, icon: '👑', unlocked: totalCorrect >= 200, color: 'text-purple-600 bg-purple-100 border-purple-200' },
  { id: 4, name: 'الأسطورة', required: 300, icon: '🏆', unlocked: totalCorrect >= 300, color: 'text-yellow-600 bg-yellow-100 border-yellow-200' },
];

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

// Helper to get local data for fallback
const getLocalLeaderboardEntry = (username: string): LeaderboardEntry | null => {
  try {
    const localData = localStorage.getItem(`stats_${username}`);
    if (localData) {
      const stats = JSON.parse(localData);
      return {
        name: stats.name,
        displayName: stats.displayName || stats.name,
        totalCorrect: stats.totalCorrect,
        badgesCount: getBadgeDefinitions(stats.totalCorrect).filter(b => b.unlocked).length,
        lastActive: stats.lastPlayedDate || 'اليوم'
      };
    }
  } catch (e) {}
  return null;
};

export const loadStats = async (username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();
  const localKey = `stats_${username}`;
  const localData = localStorage.getItem(localKey);
  const stats = localData ? JSON.parse(localData) : getInitialStats(username);

  if (cloudEnabled) {
    getDoc(doc(db, PLAYERS_COLLECTION, username)).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const cloudStats = {
          ...stats,
          ...data,
          totalCorrect: Number(data.totalCorrect) || stats.totalCorrect,
          badges: getBadgeDefinitions(Number(data.totalCorrect) || stats.totalCorrect)
        };
        localStorage.setItem(localKey, JSON.stringify(cloudStats));
      }
    }).catch((err: any) => {
      if (err.code === 'permission-denied') cloudEnabled = false;
    });
  }
  return stats;
};

export const registerNewPlayer = async (username: string): Promise<void> => {
  if (!username || !cloudEnabled) return;
  setDoc(doc(db, PLAYERS_COLLECTION, username), getInitialStats(username), { merge: true }).catch((err: any) => {
    if (err.code === 'permission-denied') cloudEnabled = false;
  });
};

export const updateUserStats = async (result: GameResult, username: string): Promise<UserStats> => {
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const localKey = `stats_${username}`;
  const localData = localStorage.getItem(localKey);
  const currentStats: UserStats = localData ? JSON.parse(localData) : getInitialStats(username);
  
  let newStreak = currentStats.streak;
  if (currentStats.lastPlayedDate !== today) {
    newStreak = currentStats.lastPlayedDate === yesterday ? currentStats.streak + 1 : 1;
  }

  const newTotalCorrect = currentStats.totalCorrect + result.score;
  const historyKey = `dailyHistory.${today}`;
  const dailyUpdate = {
    date: today,
    correct: (currentStats.dailyHistory[today]?.correct || 0) + result.score,
    incorrect: (currentStats.dailyHistory[today]?.incorrect || 0) + (result.totalQuestions - result.score)
  };

  const updatedStats: UserStats = {
    ...currentStats,
    totalCorrect: newTotalCorrect,
    totalIncorrect: currentStats.totalIncorrect + (result.totalQuestions - result.score),
    streak: newStreak,
    lastPlayedDate: today,
    badges: getBadgeDefinitions(newTotalCorrect),
    dailyHistory: { ...currentStats.dailyHistory, [today]: dailyUpdate }
  };

  localStorage.setItem(localKey, JSON.stringify(updatedStats));

  if (cloudEnabled) {
    const updates: any = {
      totalCorrect: increment(result.score),
      totalIncorrect: increment(result.totalQuestions - result.score),
      lastPlayedDate: today,
      streak: newStreak,
      [historyKey]: dailyUpdate
    };
    updateDoc(doc(db, PLAYERS_COLLECTION, username), updates).catch((err: any) => {
      if (err.code === 'permission-denied') cloudEnabled = false;
    });
  }
  return updatedStats;
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  if (!cloudEnabled) {
    const saved = localStorage.getItem('mathGeniusUserData');
    if (saved) {
        const user = JSON.parse(saved);
        const entry = getLocalLeaderboardEntry(user.name);
        return entry ? [entry] : [];
    }
    return [];
  }
  try {
    const q = query(collection(db, PLAYERS_COLLECTION), orderBy("totalCorrect", "desc"));
    const querySnapshot = await getDocs(q);
    const leaders: LeaderboardEntry[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      leaders.push({
        name: doc.id,
        displayName: data.displayName || doc.id,
        totalCorrect: Number(data.totalCorrect) || 0,
        badgesCount: getBadgeDefinitions(Number(data.totalCorrect) || 0).filter(b => b.unlocked).length,
        lastActive: data.lastPlayedDate || 'جديد'
      });
    });
    return leaders;
  } catch (err: any) {
    if (err.code === 'permission-denied') cloudEnabled = false;
    return [];
  }
};

export const subscribeToLeaderboard = (callback: (data: LeaderboardEntry[]) => void) => {
  if (!cloudEnabled) {
      const saved = localStorage.getItem('mathGeniusUserData');
      if (saved) {
          const user = JSON.parse(saved);
          const entry = getLocalLeaderboardEntry(user.name);
          callback(entry ? [entry] : []);
      } else {
          callback([]);
      }
      return () => {};
  }
  const q = query(collection(db, PLAYERS_COLLECTION), orderBy("totalCorrect", "desc"));
  return onSnapshot(q, (snapshot) => {
    const leaders: LeaderboardEntry[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      leaders.push({
        name: doc.id,
        displayName: data.displayName || doc.id,
        totalCorrect: Number(data.totalCorrect) || 0,
        badgesCount: getBadgeDefinitions(Number(data.totalCorrect) || 0).filter(b => b.unlocked).length,
        lastActive: data.lastPlayedDate || 'جديد'
      });
    });
    callback(leaders);
  }, (err: any) => {
    if (err.code === 'permission-denied') {
        cloudEnabled = false;
        const saved = localStorage.getItem('mathGeniusUserData');
        if (saved) {
            const user = JSON.parse(saved);
            const entry = getLocalLeaderboardEntry(user.name);
            callback(entry ? [entry] : []);
        } else {
            callback([]);
        }
    }
  });
};

export const isCloudEnabled = () => cloudEnabled;

export const getLast7DaysStats = (stats: UserStats) => {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('ar-EG', { weekday: 'short' });
    const dayStat = stats.dailyHistory && stats.dailyHistory[dateStr] ? stats.dailyHistory[dateStr] : { correct: 0, incorrect: 0 };
    days.push({ label, correct: dayStat.correct, incorrect: dayStat.incorrect });
  }
  return days;
};

export const getBadgeStatus = (totalCorrect: number) => getBadgeDefinitions(totalCorrect);
