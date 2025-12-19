import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  increment,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { UserStats, GameResult, LeaderboardEntry, Badge } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyAtPiYQgil6zH5TEWx5LsOmNxAAQkuyIIY",
  authDomain: "abeer-fdf0c.firebaseapp.com",
  projectId: "abeer-fdf0c",
  storageBucket: "abeer-fdf0c.firebasestorage.app",
  messagingSenderId: "289681251054",
  appId: "1:289681251054:web:ff1fa3b3c13048a22271ff",
  measurementId: "G-Z2SGMD4R79"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

isSupported().then(supported => {
  if (supported) {
    getAnalytics(app);
  }
});

const USERS_COLLECTION = 'Users';
const getTodayDateString = (): string => new Date().toISOString().split('T')[0];

export const getBadgeDefinitions = (totalCorrect: number): Badge[] => [
  { id: 1, name: 'مبتدئ', required: 50, icon: '🌱', unlocked: totalCorrect >= 50, color: 'text-green-600 bg-green-100 border-green-200' },
  { id: 2, name: 'عبقري', required: 100, icon: '🧠', unlocked: totalCorrect >= 100, color: 'text-blue-600 bg-blue-100 border-blue-200' },
  { id: 3, name: 'الملك', required: 200, icon: '👑', unlocked: totalCorrect >= 200, color: 'text-purple-600 bg-purple-100 border-purple-200' },
  { id: 4, name: 'الأسطورة', required: 300, icon: '🏆', unlocked: totalCorrect >= 300, color: 'text-yellow-600 bg-yellow-100 border-yellow-200' },
];

export const getInitialStats = (uid: string, email: string, displayName: string): UserStats => {
  return {
    uid,
    email,
    displayName: displayName || 'لاعب جديد',
    totalCorrect: 0,
    totalIncorrect: 0,
    streak: 0,
    lastPlayedDate: null,
    lastActive: new Date().toISOString(),
    dailyHistory: {},
    badges: getBadgeDefinitions(0),
    badgesCount: 0
  };
};

// يحمل البيانات من المسار /Users/{uid}
export const loadStats = async (uid: string): Promise<UserStats | null> => {
  try {
    const docSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      const totalCorrect = Number(data.totalCorrect) || 0;
      const badges = getBadgeDefinitions(totalCorrect);
      return {
        ...data,
        uid: docSnap.id,
        badges,
        badgesCount: badges.filter(b => b.unlocked).length
      } as UserStats;
    }
    return null;
  } catch (err: any) {
    console.error("MathGenius: Error loading stats", err);
    return null;
  }
};

// اشتراك حي لبيانات المستخدم لضمان التحديث التلقائي في كل الصفحات
export const subscribeToUserStats = (uid: string, callback: (stats: UserStats) => void) => {
  return onSnapshot(doc(db, USERS_COLLECTION, uid), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const totalCorrect = Number(data.totalCorrect) || 0;
      const badges = getBadgeDefinitions(totalCorrect);
      callback({
        ...data,
        uid: docSnap.id,
        badges,
        badgesCount: badges.filter(b => b.unlocked).length
      } as UserStats);
    }
  });
};

export const createOrUpdatePlayerProfile = async (uid: string, email: string, displayName: string): Promise<void> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    
    const nowIso = new Date().toISOString();
    
    if (!docSnap.exists()) {
      const initial = getInitialStats(uid, email, displayName);
      await setDoc(docRef, initial);
    } else {
      // تحديث displayName و lastActive عند كل دخول
      await setDoc(docRef, { 
        displayName, 
        email,
        uid,
        lastActive: nowIso
      }, { merge: true });
    }
  } catch (err: any) {
    console.error("MathGenius: Failed to sync profile", err.message);
  }
};

// تحديث البيانات وحفظها في المسار /Users/{uid} بعد كل جولة لعب
export const updateUserStats = async (result: GameResult, uid: string): Promise<UserStats> => {
  const today = getTodayDateString();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const currentStats = await loadStats(uid);
  const baseStats = currentStats || getInitialStats(uid, '', '');

  // حساب الـ streak
  let newStreak = baseStats.streak;
  if (baseStats.lastPlayedDate !== today) {
    newStreak = baseStats.lastPlayedDate === yesterday ? baseStats.streak + 1 : 1;
  }

  const addedCorrect = result.score;
  const addedIncorrect = result.totalQuestions - result.score;
  const newTotalCorrect = baseStats.totalCorrect + addedCorrect;
  
  const historyKey = `dailyHistory.${today}`;
  const dailyUpdate = {
    date: today,
    correct: (baseStats.dailyHistory?.[today]?.correct || 0) + addedCorrect,
    incorrect: (baseStats.dailyHistory?.[today]?.incorrect || 0) + addedIncorrect
  };

  const currentBadges = getBadgeDefinitions(newTotalCorrect);
  const newBadgesCount = currentBadges.filter(b => b.unlocked).length;
  const nowIso = new Date().toISOString();

  // تعبئة وتحديث جميع الحقول المطلوبة في Firestore
  const cloudPayload: any = {
    displayName: baseStats.displayName, // التأكد من وجود الاسم
    totalCorrect: increment(addedCorrect),
    totalIncorrect: increment(addedIncorrect),
    lastPlayedDate: today,
    lastActive: nowIso,
    streak: newStreak,
    [historyKey]: dailyUpdate,
    badgesCount: newBadgesCount,
    badges: currentBadges // تخزين مصفوفة الأوسمة كاملة كما طلبت
  };

  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(userDocRef, cloudPayload, { merge: true });
  } catch (err: any) {
    console.error("MathGenius: Failed to update stats in Firebase", err.message);
  }
  
  return {
    ...baseStats,
    totalCorrect: newTotalCorrect,
    totalIncorrect: baseStats.totalIncorrect + addedIncorrect,
    streak: newStreak,
    lastPlayedDate: today,
    lastActive: nowIso,
    dailyHistory: { ...baseStats.dailyHistory, [today]: dailyUpdate },
    badges: currentBadges,
    badgesCount: newBadgesCount
  };
};

export const subscribeToLeaderboard = (callback: (data: LeaderboardEntry[]) => void) => {
  const q = query(collection(db, USERS_COLLECTION), orderBy("totalCorrect", "desc"));
  return onSnapshot(q, (snapshot) => {
    const leaders: LeaderboardEntry[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.totalCorrect !== undefined && data.totalCorrect > 0) {
          leaders.push({
            uid: doc.id,
            displayName: data.displayName || 'لاعب مجهول',
            totalCorrect: Number(data.totalCorrect) || 0,
            badgesCount: Number(data.badgesCount) || 0,
            lastActive: data.lastPlayedDate || 'جديد'
          });
      }
    });
    callback(leaders);
  });
};

export const isCloudEnabled = () => true;

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