
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
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut, User } from 'firebase/auth';
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

const USERS_COLLECTION = 'users';
const TEACHERS_COLLECTION = 'Teachers'; // تم التغيير ليتطابق مع طلبك

const actionCodeSettings = {
  url: 'https://abeer-stzj-new.vercel.app/finish-signin',
  handleCodeInApp: true
};

const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const sendTeacherSignInLink = async (email: string) => {
  const cleanEmail = email.trim().toLowerCase();
  
  // لا نقوم بالتحقق من Firestore هنا لأن المستخدم غير مسجل دخوله حالياً
  // وسيؤدي ذلك لخطأ Missing permissions إذا كانت القواعد تمنع القراءة العامة
  await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);
  window.localStorage.setItem('emailForSignIn', cleanEmail);
};

export const completeSignInWithLink = async (): Promise<User> => {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    throw new Error("الرابط غير صالح أو انتهت صلاحيته.");
  }
  
  let email = window.localStorage.getItem('emailForSignIn');
  if (!email) {
    email = window.prompt('يرجى إدخال بريدك الإلكتروني للتأكيد:');
  }
  
  if (!email) throw new Error("البريد الإلكتروني مطلوب لإكمال العملية.");

  const cleanEmail = email.trim().toLowerCase();
  
  // 1. تسجيل الدخول أولاً ليصبح المستخدم معرّفاً (Authenticated)
  const result = await signInWithEmailLink(auth, cleanEmail, window.location.href);
  window.localStorage.removeItem('emailForSignIn');

  if (result.user) {
    // 2. التحقق من السجل في مجموعة Teachers باستخدام البريد الإلكتروني كمعرف للوثيقة
    const teacherDocRef = doc(db, TEACHERS_COLLECTION, cleanEmail);
    const snap = await getDoc(teacherDocRef);

    if (!snap.exists()) {
        await signOut(auth);
        throw new Error("عذراً، هذا البريد غير مسجل كمعلم مصرح له في النظام.");
    }

    // 3. تحديث السجل برقم الـ UID الجديد
    await updateDoc(teacherDocRef, { 
        uid: result.user.uid, 
        lastLogin: serverTimestamp(),
        active: true
    });
  }
  return result.user;
};

export const checkIsSignInLink = () => isSignInWithEmailLink(auth, window.location.href);

export const getBadgeDefinitions = (totalCorrect: number): Badge[] => [
  { id: 1, name: 'مبتدئ', required: 50, icon: '🌱', unlocked: totalCorrect >= 50, color: 'text-green-600 bg-green-100 border-green-200' },
  { id: 2, name: 'عبقري', required: 100, icon: '🧠', unlocked: totalCorrect >= 100, color: 'text-blue-600 bg-blue-100 border-blue-200' },
  { id: 3, name: 'الملك', required: 200, icon: '👑', unlocked: totalCorrect >= 200, color: 'text-purple-600 bg-purple-100 border-purple-200' },
  { id: 4, name: 'الأسطورة', required: 300, icon: '🏆', unlocked: totalCorrect >= 300, color: 'text-yellow-600 bg-yellow-100 border-yellow-200' },
];

export const loadStats = async (uid: string): Promise<UserStats | TeacherProfile | null> => {
  if (!uid) return null;
  
  const studentRef = doc(db, USERS_COLLECTION, uid);
  const studentSnap = await getDoc(studentRef);
  if (studentSnap.exists()) {
    const data = studentSnap.data() as UserStats;
    return { ...data, uid: studentSnap.id, badges: getBadgeDefinitions(data.totalCorrect || 0) };
  }
  
  const q = query(collection(db, TEACHERS_COLLECTION), where("uid", "==", uid), limit(1));
  const tSnap = await getDocs(q);
  if (!tSnap.empty) {
    const data = tSnap.docs[0].data();
    return { ...data, teacherId: tSnap.docs[0].id, role: UserRole.TEACHER } as TeacherProfile;
  }
  
  return null;
};

export const isTeacherByEmail = async (email: string): Promise<boolean> => {
    if (!email) return false;
    const docRef = doc(db, TEACHERS_COLLECTION, email.trim().toLowerCase());
    const snap = await getDoc(docRef);
    return snap.exists();
};

export const fetchTeacherInfo = async (teacherId: string): Promise<TeacherProfile | null> => {
  if (!teacherId) return null;
  const docRef = doc(db, TEACHERS_COLLECTION, teacherId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) return { ...docSnap.data(), teacherId: docSnap.id, role: UserRole.TEACHER } as TeacherProfile;
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
  });
};

export const createOrUpdatePlayerProfile = async (uid: string, email: string, displayName: string, teacherId?: string) => {
    const studentRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) {
        await setDoc(studentRef, {
            uid, email, displayName, role: UserRole.STUDENT, teacherId: teacherId || '', totalCorrect: 0, totalIncorrect: 0, streak: 0, lastActive: new Date().toISOString(), dailyHistory: {}
        });
    } else if (teacherId) {
        await updateDoc(studentRef, { teacherId });
    }
};

export const updateUserStats = async (result: GameResult, uid: string) => {
    const today = getLocalDateString();
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const dailyHistory = data.dailyHistory || {};
    const todayStats = dailyHistory[today] || { date: today, correct: 0, incorrect: 0 };
    
    todayStats.correct += result.score;
    todayStats.incorrect += (result.totalQuestions - result.score);

    await updateDoc(userRef, {
        totalCorrect: increment(result.score),
        totalIncorrect: increment(result.totalQuestions - result.score),
        lastActive: new Date().toISOString(),
        lastPlayedDate: today,
        [`dailyHistory.${today}`]: todayStats
    });
};

export const subscribeToLeaderboard = (callback: (data: LeaderboardEntry[]) => void, teacherId?: string) => {
  let q;
  if (teacherId && teacherId !== 'none') {
    q = query(collection(db, USERS_COLLECTION), where("teacherId", "==", teacherId), orderBy("totalCorrect", "desc"));
  } else {
    q = query(collection(db, USERS_COLLECTION), orderBy("totalCorrect", "desc"), limit(50));
  }

  return onSnapshot(q, (snapshot) => {
    const leaders = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        uid: doc.id, 
        displayName: data.displayName || 'لاعب',
        role: data.role || UserRole.STUDENT,
        totalCorrect: data.totalCorrect || 0,
        badgesCount: data.badgesCount || 0,
        lastActive: data.lastActive || ''
      };
    });
    callback(leaders as any);
  });
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
