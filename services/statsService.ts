
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
  serverTimestamp,
  DocumentReference,
  Unsubscribe,
  FirestoreError
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut, 
  User,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  signInAnonymously
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

/**
 * وظيفة لتسجيل الدخول المجهول للسماح بجلب البيانات العامة مثل قائمة المعلمين
 */
export const loginAnonymously = async () => {
    try {
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Anonymous login failed:", error);
    }
};

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
  if (!uid || auth.currentUser?.isAnonymous) return null;
  
  try {
    const studentSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (studentSnap.exists()) {
      const data = studentSnap.data();
      let teacherIdStr = '';
      if (data.teacherId && typeof data.teacherId !== 'string') {
        teacherIdStr = (data.teacherId as DocumentReference).id;
      } else {
        teacherIdStr = data.teacherId || '';
      }
      return { ...data, uid: studentSnap.id, teacherId: teacherIdStr, badges: getBadgeDefinitions(data.totalCorrect || 0) } as UserStats;
    }
    
    const q = query(collection(db, TEACHERS_COLLECTION), where("uid", "==", uid), limit(1));
    const tSnap = await getDocs(q);
    if (!tSnap.empty) {
      const docSnap = tSnap.docs[0];
      return { ...docSnap.data(), teacherId: docSnap.id, role: UserRole.TEACHER } as TeacherProfile;
    }
  } catch (error) {
    console.warn("LoadStats Error:", error);
  }
  return null;
};

export const isTeacherByEmail = async (email: string): Promise<TeacherProfile | null> => {
    if (!email) return null;
    try {
      const q = query(collection(db, TEACHERS_COLLECTION), where("email", "==", email.trim().toLowerCase()), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
          const teacherDoc = snap.docs[0];
          return { teacherId: teacherDoc.id, ...teacherDoc.data() } as TeacherProfile;
      }
      return null;
    } catch (err) {
      return null;
    }
};

export const fetchAllTeachers = async (): Promise<TeacherProfile[]> => {
  try {
    // نطلب المعلمين النشطين فقط
    const q = query(collection(db, TEACHERS_COLLECTION), where("active", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), teacherId: doc.id })) as any;
  } catch (error) {
    console.error("Critical: Permission Denied for Teachers List. Check Firebase Rules.", error);
    return [];
  }
};

export const fetchTeacherInfo = async (teacherId: string): Promise<TeacherProfile | null> => {
  if (!teacherId || teacherId === 'none') return null;
  try {
    const docSnap = await getDoc(doc(db, TEACHERS_COLLECTION, teacherId.trim()));
    if (docSnap.exists()) {
      return { teacherId: docSnap.id, ...docSnap.data() } as TeacherProfile;
    }
  } catch (error) {
    console.error("Error fetching teacher info:", error);
  }
  return null;
};

export const subscribeToUserStats = (uid: string, callback: (stats: any) => void): Unsubscribe => {
  if (auth.currentUser?.isAnonymous) {
      return () => {};
  }

  let innerUnsubscribe: Unsubscribe | null = null;
  const outerUnsubscribe = onSnapshot(doc(db, USERS_COLLECTION, uid), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      let teacherIdStr = '';
      if (data.teacherId && typeof data.teacherId !== 'string') {
        teacherIdStr = (data.teacherId as DocumentReference).id;
      } else {
        teacherIdStr = data.teacherId || '';
      }
      callback({ ...data, uid: docSnap.id, teacherId: teacherIdStr, badges: getBadgeDefinitions(data.totalCorrect || 0) });
    } else {
        if (!innerUnsubscribe) {
            const q = query(collection(db, TEACHERS_COLLECTION), where("uid", "==", uid), limit(1));
            innerUnsubscribe = onSnapshot(q, (tSnap) => {
                if (!tSnap.empty) {
                    const tDocSnap = tSnap.docs[0];
                    callback({ ...tDocSnap.data(), teacherId: tDocSnap.id, role: UserRole.TEACHER });
                }
            }, (error) => {});
        }
    }
  }, (error) => {});
  
  return () => {
      outerUnsubscribe();
      if (innerUnsubscribe) innerUnsubscribe();
  };
};

export const createOrUpdatePlayerProfile = async (uid: string, email: string, displayName: string, teacherId?: string) => {
    const studentRef = doc(db, USERS_COLLECTION, uid);
    try {
      const teacherRef = (teacherId && teacherId !== 'none') ? doc(db, TEACHERS_COLLECTION, teacherId.trim()) : null;
      await setDoc(studentRef, {
          uid, 
          email: email.trim().toLowerCase(), 
          displayName: displayName || 'لاعب جديد', 
          role: UserRole.STUDENT, 
          teacherId: teacherRef,
          totalCorrect: 0, 
          totalIncorrect: 0, 
          streak: 0, 
          lastActive: new Date().toISOString(), 
          dailyHistory: {},
          badgesCount: 0
      }, { merge: true });
    } catch (e) {
      console.error("Error in createOrUpdatePlayerProfile:", e);
      throw e;
    }
};

export const updateUserStats = async (result: GameResult, uid: string) => {
    if (auth.currentUser?.isAnonymous) return;
    const today = getLocalDateString();
    const userRef = doc(db, USERS_COLLECTION, uid);
    try {
      let snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const dailyHistory = data.dailyHistory || {};
      const todayStats = dailyHistory[today] || { date: today, correct: 0, incorrect: 0 };
      todayStats.correct += result.score;
      todayStats.incorrect += (result.totalQuestions - result.score);
      const totalCorrectNow = (data.totalCorrect || 0) + result.score;
      const badgesCount = getBadgeDefinitions(totalCorrectNow).filter(b => b.unlocked).length;
      await updateDoc(userRef, {
          totalCorrect: increment(result.score),
          totalIncorrect: increment(result.totalQuestions - result.score),
          lastActive: new Date().toISOString(),
          lastPlayedDate: today,
          badgesCount: badgesCount,
          dailyHistory: { ...dailyHistory, [today]: todayStats }
      });
    } catch (e) {
      console.error("Error in updateUserStats:", e);
    }
};

export const subscribeToLeaderboard = (callback: (data: LeaderboardEntry[]) => void, teacherId: string) => {
  if (!teacherId || teacherId === 'none' || auth.currentUser?.isAnonymous) {
    callback([]);
    return () => {};
  }
  const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId.trim());
  const q = query(collection(db, USERS_COLLECTION), where("teacherId", "==", teacherRef));
  return onSnapshot(q, (snapshot) => {
    const students: LeaderboardEntry[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      let tid = '';
      if (data.teacherId && typeof data.teacherId !== 'string') tid = (data.teacherId as DocumentReference).id;
      else tid = data.teacherId || '';
      
      students.push({ 
        uid: docSnap.id, 
        displayName: data.displayName || 'لاعب',
        role: data.role || UserRole.STUDENT,
        totalCorrect: data.totalCorrect || 0,
        badgesCount: data.badgesCount || 0,
        lastActive: data.lastActive || '',
        teacherId: tid 
      });
    });
    callback(students);
  }, (error) => {
      callback([]);
  });
};

export const updateUserProfileName = async (uid: string, newName: string, role: UserRole, teacherId?: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) throw new Error("يجب تسجيل الدخول أولاً");
    await updateProfile(user, { displayName: newName });
    if (role === UserRole.STUDENT) {
        await updateDoc(doc(db, USERS_COLLECTION, uid), { displayName: newName });
    } else if (role === UserRole.TEACHER && teacherId) {
        await updateDoc(doc(db, TEACHERS_COLLECTION, teacherId), { displayName: newName });
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
