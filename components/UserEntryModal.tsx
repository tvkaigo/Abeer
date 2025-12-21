
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, UserCheck, ChevronDown, GraduationCap, Info } from 'lucide-react';
import { auth, createOrUpdatePlayerProfile, fetchAllTeachers, isTeacherByEmail, db } from '../services/statsService';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    signOut
} from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { TeacherProfile } from '../types';

interface UserEntryModalProps {
  onSuccess: (manualTeacher?: TeacherProfile) => void;
}

const UserEntryModal: React.FC<UserEntryModalProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'teacher'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingTeachers, setIsFetchingTeachers] = useState(false);

  useEffect(() => {
    if (mode === 'signup') {
        setIsFetchingTeachers(true);
        setError('');
        fetchAllTeachers().then(list => {
            if (list && list.length > 0) {
              const sorted = [...list].sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar'));
              setTeachers(sorted);
            } else {
              setError("لا يوجد معلمين مسجلين حالياً.");
              setTeachers([]);
            }
            setIsFetchingTeachers(false);
        }).catch((err) => {
            setError("عذراً، فشل جلب قائمة المعلمين.");
            setIsFetchingTeachers(false);
            setTeachers([]);
        });
    } else {
        setError('');
        setPassword('');
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    const cleanEmail = email.trim().toLowerCase();
    
    if (password.length < 6) {
      setError("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'teacher') {
        // 1. تسجيل الدخول أولاً للحصول على الصلاحيات
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        
        // 2. البحث عن وثيقة المعلم في /Teachers/ بواسطة البريد الإلكتروني
        const teacherProfile = await isTeacherByEmail(cleanEmail);
        
        if (!teacherProfile) {
            // إذا لم يكن معلماً في النظام، سجل خروجه فوراً
            await signOut(auth);
            throw new Error("عذراً، هذا الحساب ليس مسجلاً كمعلم في قاعدة البيانات.");
        }

        // 3. ربط معرف الـ Auth بوثيقة المعلم في المسار الصحيح /Teachers/{teacherId}
        const teacherDocRef = doc(db, 'Teachers', teacherProfile.teacherId);
        await updateDoc(teacherDocRef, { 
            uid: userCredential.user.uid, 
            lastActive: new Date().toISOString()
        });

        onSuccess();
      } else if (mode === 'signup') {
        const nameToSave = displayName.trim();
        if (!nameToSave) throw new Error("يرجى إدخال اسمك بالعربية");
        if (!teacherId) throw new Error("يرجى اختيار معلمك من القائمة");
        
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await createOrUpdatePlayerProfile(userCredential.user.uid, cleanEmail, nameToSave, teacherId);
        await updateProfile(userCredential.user, { displayName: nameToSave });
        onSuccess();
      } else {
        // تسجيل دخول الطالب
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        onSuccess();
      }
    } catch (err: any) {
      console.error("Auth Action Error:", err);
      let msg = "حدث خطأ ما، يرجى المحاولة مرة أخرى";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "هذا البريد الإلكتروني مستخدم بالفعل.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-lg">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full border-4 border-indigo-50 relative overflow-hidden animate-pop-in">
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${mode === 'teacher' ? 'from-purple-500 via-fuchsia-500 to-pink-500' : 'from-indigo-500 via-blue-500 to-cyan-500'}`}></div>
        
        <div className="text-center mb-6">
          <div className={`${mode === 'teacher' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
            {mode === 'teacher' ? <GraduationCap size={32} /> : <User size={32} />}
          </div>
          <h2 className="text-2xl font-black text-slate-800">
             {mode === 'teacher' ? 'بوابة المعلم' : 'العبقري الصغير'}
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            {mode === 'login' ? 'سجل دخولك لمتابعة تقدمك' : mode === 'signup' ? 'أنشئ حساباً جديداً لتبدأ رحلتك' : 'ادخل ببيانات المعلم الممنوحة لك'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
            <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>طالب</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>جديد</button>
            <button onClick={() => setMode('teacher')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'teacher' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}>معلم</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'signup' && (
            <>
                <div>
                  <label className="block text-slate-700 font-bold mb-2 text-sm">الاسم بالكامل (بالعربية)</label>
                  <div className="relative">
                    <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="مثال: سارة محمد" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 font-bold" />
                    <User className="absolute right-4 top-4 text-slate-400" size={20} />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-2 text-sm">اختر معلمك</label>
                  <div className="relative">
                    <select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 font-bold appearance-none">
                      <option value="">{isFetchingTeachers ? 'جاري التحميل...' : '-- اختر المعلم --'}</option>
                      {teachers.map(t => <option key={t.teacherId} value={t.teacherId}>{t.displayName}</option>)}
                    </select>
                    <UserCheck className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={20} />
                    <ChevronDown className="absolute left-4 top-4 text-slate-400 pointer-events-none" size={20} />
                  </div>
                </div>
            </>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-2 text-sm">البريد الإلكتروني</label>
            <div className="relative">
              <input type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 text-right font-medium" />
              <Mail className="absolute right-4 top-4 text-slate-400" size={20} />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-2 text-sm">كلمة المرور</label>
            <div className="relative">
              <input type="password" required dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 text-right" />
              <Lock className="absolute right-4 top-4 text-slate-400" size={20} />
            </div>
          </div>

          {mode === 'teacher' && (
            <div className="bg-purple-50 text-purple-700 p-4 rounded-2xl text-xs font-bold border border-purple-100">
              <Info className="inline-block ml-2" size={16} /> استخدم البريد وكلمة المرور الممنوحة لك في الفصل.
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-red-100 animate-shake">
              <AlertCircle size={20} className="shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading || (mode === 'signup' && (isFetchingTeachers || teachers.length === 0))} className={`w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 ${mode === 'teacher' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : mode === 'teacher' ? <>دخول المعلم <LogIn size={20} className="rotate-180" /></> : <>انطلق <LogIn size={20} className="rotate-180" /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserEntryModal;
