
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection, 
  query, 
  orderBy, 
  increment,
  onSnapshot,
  where,
  getDocs,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut, 
  User,
  setPersistence,
  browserLocalPersistence,
  updateProfile
} from 'firebase/auth';
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

setPersistence(auth, browserLocalPersistence).catch(console.error);

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

export const loadStats = async (uid: string): Promise<UserStats | TeacherProfile | null> => {
  if (!uid) return null;
  
  try {
    const studentRef = doc(db, USERS_COLLECTION, uid);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const data = studentSnap.data() as UserStats;
      return { ...data, uid: studentSnap.id, badges: getBadgeDefinitions(data.totalCorrect || 0) };
    }
    
    const q = query(collection(db, TEACHERS_COLLECTION), where("uid", "==", uid), limit(1));
    const tSnap = await getDocs(q);
    if (!tSnap.empty) {
      const docData = tSnap.docs[0].data();
      return { ...docData, teacherId: tSnap.docs[0].id, role: UserRole.TEACHER } as TeacherProfile;
    }
  } catch (error) {
    console.error("Error loading stats:", error);
  }
  return null;
};

export const isTeacherByEmail = async (email: string): Promise<boolean> => {
    if (!email) return false;
    try {
      const docRef = doc(db, TEACHERS_COLLECTION, email.trim().toLowerCase());
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch {
      return false;
    }
};

export const fetchTeacherInfo = async (teacherId: string): Promise<TeacherProfile | null> => {
  if (!teacherId) return null;
  try {
    const docRef = doc(db, TEACHERS_COLLECTION, teacherId.trim());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { ...docSnap.data(), teacherId: docSnap.id, role: UserRole.TEACHER } as TeacherProfile;
  } catch (error) {
    console.error("Error fetching teacher info:", error);
  }
  return null;
};

export const fetchAllTeachers = async (): Promise<TeacherProfile[]> => {
  try {
    const q = query(collection(db, TEACHERS_COLLECTION), where("active", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), teacherId: doc.id })) as any;
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return [];
  }
};

export const subscribeToUserStats = (uid: string, callback: (stats: any) => void) => {
  return onSnapshot(doc(db, USERS_COLLECTION, uid), async (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({ ...data, uid: docSnap.id, badges: getBadgeDefinitions(data.totalCorrect || 0) });
    } else {
        const q = query(collection(db, TEACHERS_COLLECTION), where("uid", "==", uid), limit(1));
        const tSnap = await getDocs(q);
        if (!tSnap.empty) {
          const data = tSnap.docs[0].data();
          callback({ ...data, teacherId: tSnap.docs[0].id, role: UserRole.TEACHER });
        }
    }
  }, (error) => {
    console.error("Subscription error:", error);
  });
};

export const createOrUpdatePlayerProfile = async (uid: string, email: string, displayName: string, teacherId?: string) => {
    const studentRef = doc(db, USERS_COLLECTION, uid);
    try {
      const snap = await getDoc(studentRef);
      const cleanTeacherId = teacherId?.trim() || ''; 
      
      if (!snap.exists()) {
          await setDoc(studentRef, {
              uid, 
              email: email.trim().toLowerCase(), 
              displayName: displayName || 'لاعب جديد', 
              role: UserRole.STUDENT, 
              teacherId: cleanTeacherId, 
              totalCorrect: 0, 
              totalIncorrect: 0, 
              streak: 0, 
              lastActive: new Date().toISOString(), 
              dailyHistory: {},
              badgesCount: 0
          });
      } else if (teacherId) {
          await updateDoc(studentRef, { teacherId: cleanTeacherId });
      }
    } catch (e) {
      console.error("Error in createOrUpdatePlayerProfile:", e);
    }
};

export const updateUserStats = async (result: GameResult, uid: string) => {
    const today = getLocalDateString();
    const userRef = doc(db, USERS_COLLECTION, uid);
    
    try {
      let snap = await getDoc(userRef);
      if (!snap.exists()) {
          const user = auth.currentUser;
          if (user) {
              await createOrUpdatePlayerProfile(uid, user.email || '', user.displayName || '');
              snap = await getDoc(userRef);
          } else {
              return;
          }
      }
      
      const data = snap.data();
      if (!data) return;
      
      const dailyHistory = data.dailyHistory || {};
      const todayStats = dailyHistory[today] || { date: today, correct: 0, incorrect: 0 };
      
      todayStats.correct += result.score;
      todayStats.incorrect += (result.totalQuestions - result.score);

      const totalCorrectNow = (data.totalCorrect || 0) + result.score;
      const badgesCount = getBadgeDefinitions(totalCorrectNow).filter(b => b.unlocked).length;

      await setDoc(userRef, {
          totalCorrect: increment(result.score),
          totalIncorrect: increment(result.totalQuestions - result.score),
          lastActive: new Date().toISOString(),
          lastPlayedDate: today,
          badgesCount: badgesCount,
          dailyHistory: {
              ...dailyHistory,
              [today]: todayStats
          }
      }, { merge: true });
    } catch (e) {
      console.error("Error in updateUserStats:", e);
      throw e;
    }
};

export const subscribeToLeaderboard = (callback: (data: LeaderboardEntry[]) => void, teacherId: string) => {
  if (!teacherId || teacherId === 'none') {
    callback([]);
    return () => {};
  }

  const cleanTeacherId = teacherId.trim();

  const q = query(
    collection(db, USERS_COLLECTION),
    where("teacherId", "==", cleanTeacherId)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const students: LeaderboardEntry[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      students.push({ 
        uid: doc.id, 
        displayName: data.displayName || 'لاعب',
        role: data.role || UserRole.STUDENT,
        totalCorrect: data.totalCorrect || 0,
        badgesCount: data.badgesCount || 0,
        lastActive: data.lastActive || '',
        teacherId: data.teacherId 
      });
    });
    callback(students);
  }, (error) => {
    console.error("Leaderboard subscription error:", error);
    callback([]);
  });

  return unsubscribe;
};

export const updateUserProfileName = async (uid: string, newName: string, role: UserRole, teacherId?: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("يجب تسجيل الدخول أولاً");

    await updateProfile(user, { displayName: newName });

    if (role === UserRole.STUDENT) {
        const studentRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(studentRef, { displayName: newName });
    } else if (role === UserRole.TEACHER && teacherId) {
        const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
        await updateDoc(teacherRef, { displayName: newName });
    }
};

export const isCloudEnabledValue = () => true;

export const getLast7DaysStatsValue = (stats: any) => {
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
    days.push({ label, date: dateStr, correct: dayStat.correct || 0, incorrect: dayStat.incorrect || 0 });
  }
  return days;
};
