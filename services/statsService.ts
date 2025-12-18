
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
  onSnapshot
} from 'firebase/firestore';
import { UserStats, GameResult, LeaderboardEntry, PREDEFINED_USERS, Badge, getUserDisplayName } from '../types';

// ملاحظة: يجب استبدال هذا التكوين ببيانات مشروع Firebase الخاص بك
// Note: In a production environment, these would be in process.env
const firebaseConfig = {
  apiKey: "AIzaSyAs-Placeholder-Key",
  authDomain: "math-genius-app.firebaseapp.com",
  projectId: "math-genius-app",
  storageBucket: "math-genius-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

export const loadStats = async (username: string): Promise<UserStats> => {
  if (!username) return getInitialStats();
  
  try {
    const docRef = doc(db, PLAYERS_COLLECTION, username);
    const docSnap = await getDoc(docRef);
    
    const initial = getInitialStats(username);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const stats: UserStats = {
        ...initial,
        ...data,
        totalCorrect: Number(data.totalCorrect) || 0,
        totalIncorrect: Number(data.totalIncorrect) || 0,
        streak: Number(data.streak) || 0,
        badges: getBadgeDefinitions(Number(data.totalCorrect) || 0)
      };
      // Sync local storage as backup
      localStorage.setItem(`stats_${username}`, JSON.stringify(stats));
      return stats;
    } else {
      // If user doesn't exist in Firebase yet, create them
      await setDoc(docRef, initial);
      return initial;
    }
  } catch (error) {
    console.warn("Firestore load error, falling back to local:", error);
    const local = localStorage.getItem(`stats_${username}`);
    return local ? JSON.parse(local) : getInitialStats(username);
  }
};

export const registerNewPlayer = async (username: string): Promise<void> => {
  if (!username) return;
  const docRef = doc(db, PLAYERS_COLLECTION, username);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    const initial = getInitialStats(username);
    await setDoc(docRef, initial);
  }
};

export const updateUserStats = async (result: GameResult, username: string): Promise<UserStats> => {
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const currentStats = await loadStats(username);
  
  // Calculate new streak
  let newStreak = currentStats.streak;
  if (currentStats.lastPlayedDate !== today) {
    newStreak = currentStats.lastPlayedDate === yesterday ? currentStats.streak + 1 : 1;
  }

  const updates: any = {
    totalCorrect: increment(result.score),
    totalIncorrect: increment(result.totalQuestions - result.score),
    lastPlayedDate: today,
    streak: newStreak,
    displayName: currentStats.displayName
  };

  // Update Daily History in nested object
  const historyKey = `dailyHistory.${today}`;
  const existingDay = currentStats.dailyHistory[today] || { correct: 0, incorrect: 0 };
  
  updates[historyKey] = {
    date: today,
    correct: existingDay.correct + result.score,
    incorrect: existingDay.incorrect + (result.totalQuestions - result.score)
  };

  const docRef = doc(db, PLAYERS_COLLECTION, username);
  await updateDoc(docRef, updates);

  // Return fresh stats
  return await loadStats(username);
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
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
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};

// Helper for real-time updates in the component
export const subscribeToLeaderboard = (callback: (data: LeaderboardEntry[]) => void) => {
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
  });
};

export const getLast7DaysStats = (stats: UserStats) => {
  const days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('ar-EG', { weekday: 'short' });
    const dayStat = stats.dailyHistory && stats.dailyHistory[dateStr] 
      ? stats.dailyHistory[dateStr] 
      : { correct: 0, incorrect: 0 };
    
    days.push({ label, correct: dayStat.correct, incorrect: dayStat.incorrect });
  }
  return days;
};

export const getBadgeStatus = (totalCorrect: number) => getBadgeDefinitions(totalCorrect);
