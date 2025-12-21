
import { initializeApp, getApp, getApps } from 'firebase/app';
export { initializeApp, getApp, getApps } from 'firebase/app';

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
  FirestoreError,
  arrayUnion
} from 'firebase/firestore';
export { 
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
  arrayUnion
};
export type { DocumentReference, Unsubscribe, FirestoreError };

import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut, 
  User,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
export { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut, 
  setPersistence, 
  browserLocalPersistence,
  updateProfile,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword
};
export type { User };

import { getAnalytics, isSupported } from 'firebase/analytics';
export { getAnalytics, isSupported } from 'firebase/analytics';

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

// ملاحظة: تم التغيير إلى 'Users' (كبيرة) بناءً على طلبك
const USERS_COLLECTION = 'Users'; 
const TEACHERS_COLLECTION = 'Teachers'; 

export const loginAnonymously = async () => {
    return Promise.resolve();
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
  if (!uid) return null;
  
  try {
    const studentSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (studentSnap.exists()) {
      const data = studentSnap.data();
      let teacherIdStr = '';
      if (data.teacherId) {
        teacherIdStr = typeof data.teacherId === 'string' ? data.teacherId : (data.teacherId as DocumentReference).id;
      }
      return { ...data, uid: studentSnap.id, teacherId: teacherIdStr, badges: getBadgeDefinitions(data.totalCorrect || 0) } as UserStats;
    }
  } catch (error) {
    console.debug("Checking teachers collection...");
  }

  try {
    const q = query(collection(db, TEACHERS_COLLECTION), where("uid", "==", uid), limit(1));
    const tSnap = await getDocs(q);
    if (!tSnap.empty) {
      const docSnap = tSnap.docs[0];
      const data = docSnap.data();
      return { 
        ...data, 
        teacherId: docSnap.id, 
        role: UserRole.TEACHER,
        bestSession: data.bestSession || 0,
        badges: getBadgeDefinitions(data.totalCorrect || 0) 
      } as TeacherProfile;
    }
  } catch (error) {
    console.warn("LoadStats Teacher Query Error:", error);
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
      console.error("Error checking teacher in DB:", err);
      return null;
    }
};

export const activateTeacherAccount = async (teacherId: string, uid: string) => {
    if (!teacherId || !uid) return;
    const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
    
    try {
        const docSnap = await getDoc(teacherRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.active === true && data.uid === uid) {
                console.log("Teacher account already active.");
                return;
            }
            
            await updateDoc(teacherRef, {
                active: true,
                uid: uid,
                lastActive: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error("Error in activateTeacherAccount:", error);
        throw error;
    }
};

export const fetchAllTeachers = async (): Promise<TeacherProfile[]> => {
  try {
    const q = query(collection(db, TEACHERS_COLLECTION));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), teacherId: doc.id })) as any;
  } catch (error) {
    console.debug("Restricted access to full teacher list.");
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

export const fetchStudentsByTeacherId = async (teacherId: string): Promise<UserStats[]> => {
    if (!teacherId || teacherId === 'none') return [];
    try {
        const q = query(collection(db, USERS_COLLECTION), where("teacherId", "==", teacherId.trim()));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(s => {
            const data = s.data();
            return { ...data, uid: s.id, badges: getBadgeDefinitions(data.totalCorrect || 0) } as UserStats;
        }).sort((a, b) => (b.totalCorrect || 0) - (a.totalCorrect || 0));
    } catch (error) {
        console.error("Error fetching students by query:", error);
        return [];
    }
};

export const subscribeToUserStats = (uid: string, callback: (stats: any) => void): Unsubscribe => {
  let innerUnsubscribe: Unsubscribe | null = null;
  
  const outerUnsubscribe = onSnapshot(doc(db, USERS_COLLECTION, uid), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      let teacherIdStr = '';
      if (data.teacherId) {
        teacherIdStr = typeof data.teacherId === 'string' ? data.teacherId : (data.teacherId as DocumentReference).id;
      }
      callback({ ...data, uid: docSnap.id, teacherId: teacherIdStr, badges: getBadgeDefinitions(data.totalCorrect || 0) });
    } else {
        if (!innerUnsubscribe) {
            const q = query(collection(db, TEACHERS_COLLECTION), where("uid", "==", uid), limit(1));
            innerUnsubscribe = onSnapshot(q, (tSnap) => {
                if (!tSnap.empty) {
                    const tDocSnap = tSnap.docs[0];
                    const data = tDocSnap.data();
                    callback({ ...data, teacherId: tDocSnap.id, role: UserRole.TEACHER, bestSession: data.bestSession || 0, badges: getBadgeDefinitions(data.totalCorrect || 0) });
                } else {
                    callback(null);
                }
            }, (error) => {
                callback(null);
            });
        }
    }
  }, (error) => {
      if (error.code !== 'permission-denied') {
          console.warn("Snapshot error:", error.message);
      }
  });
  
  return () => {
      outerUnsubscribe();
      if (innerUnsubscribe) innerUnsubscribe();
  };
};

export const createOrUpdatePlayerProfile = async (uid: string, email: string, displayName: string, teacherId?: string) => {
    if (!uid) return false;
    const studentRef = doc(db, USERS_COLLECTION, uid);
    const finalTeacherId = (teacherId && teacherId !== 'none') ? teacherId.trim() : '';
    
    const profileData = {
        uid, 
        email: email.trim().toLowerCase(), 
        displayName: displayName || 'لاعب جديد', 
        role: UserRole.STUDENT, 
        teacherId: finalTeacherId,
        totalCorrect: 0, 
        totalIncorrect: 0, 
        streak: 0, 
        bestSession: 0,
        lastActive: new Date().toISOString(), 
        dailyHistory: {},
        badgesCount: 0
    };

    try {
        await setDoc(studentRef, profileData, { merge: true });
        return true;
    } catch (e) {
        console.error("Firestore write failed:", e);
        throw e;
    }
};

export const updateUserStats = async (result: GameResult, uid: string, role: UserRole = UserRole.STUDENT) => {
    const todayStr = getLocalDateString();
    try {
      let userRef;
      if (role === UserRole.TEACHER) {
          const q = query(collection(db, TEACHERS_COLLECTION), where("uid", "==", uid), limit(1));
          const snap = await getDocs(q);
          if (snap.empty) return;
          userRef = doc(db, TEACHERS_COLLECTION, snap.docs[0].id);
      } else {
          userRef = doc(db, USERS_COLLECTION, uid);
      }

      let snapShot = await getDoc(userRef);
      if (!snapShot.exists()) return;
      
      const data = snapShot.data() as any;
      const dailyHistory = data.dailyHistory || {};
      const todayStats = dailyHistory[todayStr] || { date: todayStr, correct: 0, incorrect: 0 };
      
      todayStats.correct += result.score;
      todayStats.incorrect += (result.totalQuestions - result.score);
      
      const totalCorrectNow = (data.totalCorrect || 0) + result.score;
      const badgesCount = getBadgeDefinitions(totalCorrectNow).filter(b => b.unlocked).length;
      const bestSession = Math.max(data.bestSession || 0, result.score);
      
      await updateDoc(userRef, {
          totalCorrect: increment(result.score),
          totalIncorrect: increment(result.totalQuestions - result.score),
          lastActive: new Date().toISOString(),
          lastPlayedDate: todayStr,
          badgesCount: badgesCount,
          bestSession: bestSession,
          dailyHistory: { ...dailyHistory, [todayStr]: todayStats }
      });
    } catch (e) {
      console.error("Error in updateUserStats:", e);
    }
};

export const subscribeToLeaderboard = (callback: (data: LeaderboardEntry[]) => void, teacherId: string) => {
  if (!teacherId || teacherId === 'none') {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, USERS_COLLECTION), where("teacherId", "==", teacherId.trim()));
  return onSnapshot(q, (snapshot) => {
    const students: LeaderboardEntry[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      students.push({ 
        uid: docSnap.id, 
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
      callback([]);
  });
};

export const updateUserProfileName = async (uid: string, newName: string, role: UserRole, teacherId?: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || user.uid !== uid) throw new Error("يجب تسجيل الدخول بصلاحية صحيحة");
    
    try {
        await updateProfile(user, { displayName: newName });
        const userRef = role === UserRole.STUDENT 
            ? doc(db, USERS_COLLECTION, uid) 
            : doc(db, TEACHERS_COLLECTION, teacherId || '');
            
        await setDoc(userRef, { displayName: newName }, { merge: true });
    } catch (error) {
        console.error("Error updating profile name:", error);
        throw error;
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
