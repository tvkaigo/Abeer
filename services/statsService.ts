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
  where,
  getDocs
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { UserStats, GameResult, LeaderboardEntry, Badge, UserRole, TeacherProfile } from '../types';

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
const TEACHERS_COLLECTION = 'Teachers';

const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getBadgeDefinitions = (totalCorrect: number): Badge[] => [
  { id: 1, name: 'مبتدئ', required: 50, icon: '🌱', unlocked: totalCorrect >= 50, color: 'text-green-600 bg-green-100 border-green-200' },
  { id: 2, name: 'عبقري', required: 100, icon: '🧠', unlocked: totalCorrect >= 100, color: 'text-blue-600 bg-blue-100 border-blue-200' },
  { id: 3, name: 'الملك', required: 200, icon: '👑', unlocked: totalCorrect >= 200, color: 'text-purple-600 bg-purple-100 border-purple-200' },
  { id: 4, name: 'الأسطورة', required: 300, icon: '🏆', unlocked: totalCorrect >= 300, color: 'text-yellow-600 bg-yellow-100 border-yellow-200' },
];

export const getInitialStats = (uid: string, email: string, displayName: string, teacherId?: string): UserStats => {
  return {
    uid,
    email,
    displayName: displayName || 'لاعب جديد',
    role: UserRole.STUDENT,
    teacherId: teacherId || '',
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

export const loadStats = async (uid: string): Promise<UserStats | TeacherProfile | null> => {
  if (!uid) return null;
  try {
    const studentRef = doc(db, USERS_COLLECTION, uid);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const data = studentSnap.data();
      const totalCorrect = Number(data.totalCorrect) || 0;
      const badges = getBadgeDefinitions(totalCorrect);
      return {
        ...data,
        uid: studentSnap.id,
        badges,
        badgesCount: badges.filter(b => b.unlocked).length
      } as UserStats;
    }

    const teacherRef = doc(db, TEACHERS_COLLECTION, uid);
    const teacherSnap = await getDoc(teacherRef);
    if (teacherSnap.exists()) {
      return {
        ...teacherSnap.data(),
        teacherId: teacherSnap.id,
        role: UserRole.TEACHER
      } as TeacherProfile;
    }

    return null;
  } catch (err: any) {
    console.error("MathGenius: Error loading stats", err);
    return null;
  }
};

export const fetchTeacherInfo = async (teacherId: string): Promise<TeacherProfile | null> => {
  if (!teacherId) return null;
  try {
    const docRef = doc(db, TEACHERS_COLLECTION, teacherId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), teacherId: docSnap.id } as TeacherProfile;
    }
    return null;
  } catch (err) {
    console.error("Error fetching teacher:", err);
    return null;
  }
};

export const fetchAllTeachers = async (): Promise<TeacherProfile[]> => {
  try {
    const teachersCol = collection(db, TEACHERS_COLLECTION);
    const snapshot = await getDocs(teachersCol);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      teacherId: doc.id,
      role: UserRole.TEACHER
    })) as TeacherProfile[];
  } catch (err) {
    console.error("Error fetching all teachers:", err);
    return [];
  }
};

export const subscribeToUserStats = (uid: string, callback: (stats: UserStats | TeacherProfile) => void) => {
  if (!uid) return () => {};
  
  const studentUnsub = onSnapshot(doc(db, USERS_COLLECTION, uid), (docSnap) => {
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

  const teacherUnsub = onSnapshot(doc(db, TEACHERS_COLLECTION, uid), (docSnap) => {
    if (docSnap.exists()) {
      callback({
        ...docSnap.data(),
        teacherId: docSnap.id,
        role: UserRole.TEACHER
      } as TeacherProfile);
    }
  });

  return () => {
    studentUnsub();
    teacherUnsub();
  };
};

export const createOrUpdatePlayerProfile = async (uid: string, email: string, displayName: string, teacherId?: string): Promise<void> => {
  if (!uid) return;
  try {
    const teacherRef = doc(db, TEACHERS_COLLECTION, uid);
    const teacherSnap = await getDoc(teacherRef);
    
    if (teacherSnap.exists()) {
        await setDoc(teacherRef, { 
            email, 
            displayName: displayName || teacherSnap.data().displayName,
            lastActive: new Date().toISOString()
        }, { merge: true });
        return;
    }

    const studentRef = doc(db, USERS_COLLECTION, uid);
    const studentSnap = await getDoc(studentRef);
    
    if (!studentSnap.exists()) {
      const initial = getInitialStats(uid, email, displayName, teacherId);
      await setDoc(studentRef, initial);
    } else {
      const updatePayload: any = { 
        email,
        uid,
        lastActive: new Date().toISOString()
      };
      if (displayName && displayName.trim() !== '' && displayName !== 'لاعب') {
          updatePayload.displayName = displayName;
      }
      if (teacherId) {
          updatePayload.teacherId = teacherId;
      }
      await setDoc(studentRef, updatePayload, { merge: true });
    }
  } catch (err: any) {
    console.error("MathGenius: Failed to sync profile", err.message);
  }
};

export const updateUserStats = async (result: GameResult, uid: string): Promise<UserStats | null> => {
  const today = getLocalDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);
  
  const currentData = await loadStats(uid);
  if (!currentData || currentData.role !== UserRole.STUDENT) return null;
  
  const baseStats = currentData as UserStats;

  let newStreak = baseStats.streak || 0;
  if (baseStats.lastPlayedDate !== today) {
    newStreak = baseStats.lastPlayedDate === yesterday ? (baseStats.streak || 0) + 1 : 1;
  }

  const addedCorrect = result.score;
  const addedIncorrect = result.totalQuestions - result.score;
  const newTotalCorrect = (baseStats.totalCorrect || 0) + addedCorrect;
  
  const historyKey = `dailyHistory.${today}`;
  const dailyUpdate = {
    date: today,
    correct: (baseStats.dailyHistory?.[today]?.correct || 0) + addedCorrect,
    incorrect: (baseStats.dailyHistory?.[today]?.incorrect || 0) + addedIncorrect
  };

  const currentBadges = getBadgeDefinitions(newTotalCorrect);
  const newBadgesCount = currentBadges.filter(b => b.unlocked).length;
  const nowIso = new Date().toISOString();

  const cloudPayload: any = {
    totalCorrect: increment(addedCorrect),
    totalIncorrect: increment(addedIncorrect),
    lastPlayedDate: today,
    lastActive: nowIso,
    streak: newStreak,
    [historyKey]: dailyUpdate,
    badgesCount: newBadgesCount,
    badges: currentBadges
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
    totalIncorrect: (baseStats.totalIncorrect || 0) + addedIncorrect,
    streak: newStreak,
    lastPlayedDate: today,
    lastActive: nowIso,
    dailyHistory: { ...baseStats.dailyHistory, [today]: dailyUpdate },
    badges: currentBadges,
    badgesCount: newBadgesCount
  };
};

export const subscribeToLeaderboard = (callback: (data: LeaderboardEntry[]) => void, teacherId?: string) => {
  let q;
  if (teacherId) {
    // Filter by linked teacher
    q = query(
      collection(db, USERS_COLLECTION), 
      where("teacherId", "==", teacherId),
      orderBy("totalCorrect", "desc")
    );
  } else {
    // Global leaderboard
    q = query(collection(db, USERS_COLLECTION), orderBy("totalCorrect", "desc"));
  }

  return onSnapshot(q, (snapshot) => {
    const leaders: LeaderboardEntry[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      leaders.push({
        uid: doc.id,
        displayName: data.displayName || 'لاعب مجهول',
        role: data.role || UserRole.STUDENT,
        totalCorrect: Number(data.totalCorrect) || 0,
        badgesCount: Number(data.badgesCount) || 0,
        lastActive: data.lastPlayedDate || 'جديد'
      });
    });
    callback(leaders);
  }, (err) => {
      console.error("MathGenius: Leaderboard error", err);
      callback([]);
  });
};

export const isCloudEnabled = () => true;

export const getLast7DaysStats = (stats: UserStats) => {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(d);
    const label = d.toLocaleDateString('ar-EG', { weekday: 'short' });
    const dayStat = stats.dailyHistory && stats.dailyHistory[dateStr] 
      ? stats.dailyHistory[dateStr] 
      : { correct: 0, incorrect: 0 };
    days.push({ 
      label, 
      date: dateStr, 
      correct: Number(dayStat.correct) || 0, 
      incorrect: Number(dayStat.incorrect) || 0 
    });
  }
  return days;
};