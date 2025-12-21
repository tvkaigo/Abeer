
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, UserCheck, ChevronDown, GraduationCap, Info, Sparkles } from 'lucide-react';
import { auth, createOrUpdatePlayerProfile, fetchAllTeachers, isTeacherByEmail, db } from '../services/statsService';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    signOut
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { TeacherProfile } from '../types';

interface UserEntryModalProps {
  onSuccess: () => void;
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
    // جلب قائمة المعلمين فور اختيار وضع التسجيل
    if (mode === 'signup') {
        setIsFetchingTeachers(true);
        fetchAllTeachers().then(list => {
            const sorted = list.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar'));
            setTeachers(sorted);
            setIsFetchingTeachers(false);
        }).catch((err) => {
            console.error("Error fetching teachers:", err);
            setError("فشل تحميل قائمة المعلمين. قد تحتاج لتحديث الصفحة.");
            setIsFetchingTeachers(false);
        });
    } else {
        setError('');
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();

    // التحقق من البيانات الأساسية
    if (password.length < 6) {
        setError("كلمة المرور يجب ألا تقل عن 6 أحرف");
        return;
    }

    if (mode === 'signup' && (!cleanName || !teacherId)) {
        setError("يرجى إكمال جميع الحقول واختيار المعلم");
        return;
    }

    setIsLoading(true);

    try {
      if (mode === 'teacher') {
        // دخول المعلم
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const teacherProfile = await isTeacherByEmail(cleanEmail);
        if (!teacherProfile) {
            await signOut(auth);
            throw new Error("عذراً، هذا الحساب ليس مسجلاً كمعلم معتمد.");
        }
        await updateDoc(doc(db, 'Teachers', teacherProfile.teacherId), { 
            uid: userCredential.user.uid, 
            lastActive: new Date().toISOString()
        });
        onSuccess();
      } else if (mode === 'signup') {
        // إنشاء حساب طالب جديد (عملية واحدة)
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(userCredential.user, { displayName: cleanName });
        // ربط المعلم وحفظ البيانات في Firestore
        await createOrUpdatePlayerProfile(userCredential.user.uid, cleanEmail, cleanName, teacherId);
        onSuccess();
      } else {
        // تسجيل دخول طالب موجود
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        onSuccess();
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "حدث خطأ غير متوقع. يرجى المحاولة ثانية.";
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "بيانات الدخول غير صحيحة.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "هذا البريد الإلكتروني مسجل مسبقاً.";
      } else if (err.message) {
        msg = err.message;
      }
      
      // في حال وجود خطأ في الصلاحيات أثناء التسجيل (قواعد Firestore)
      if (err.message && err.message.includes('permissions')) {
          msg = "حدث خطأ أثناء حفظ بياناتك. يرجى إبلاغ المعلم.";
      }
      
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl">
      <div className="bg-white rounded-[3rem] shadow-2xl p-8 max-w-md w-full border-4 border-indigo-50 relative overflow-hidden animate-pop-in">
        <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${mode === 'teacher' ? 'from-purple-500 to-pink-500' : 'from-indigo-500 to-cyan-500'}`}></div>
        
        <div className="text-center mb-6">
          <div className={`${mode === 'teacher' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4`}>
            {mode === 'teacher' ? <GraduationCap size={40} /> : <Sparkles size={40} />}
          </div>
          <h2 className="text-3xl font-black text-slate-800">
             {mode === 'teacher' ? 'بوابة المعلم' : 'العبقري الصغير'}
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            {mode === 'login' ? 'مرحباً بعودتك يا بطل!' : mode === 'signup' ? 'سجل الآن لتنضم لعالم الأبطال' : 'بوابة تسجيل المعلمين'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>دخول</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>تسجيل</button>
            <button onClick={() => setMode('teacher')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'teacher' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}>معلم</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="animate-fade-in-up">
                <label className="block text-slate-700 font-bold mb-1.5 text-xs mr-2">اسم البطل (بالعربية)</label>
                <div className="relative">
                    <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="مثال: سارة أحمد" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 font-bold" />
                    <User className="absolute right-4 top-3.5 text-slate-400" size={20} />
                </div>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs mr-2">البريد الإلكتروني</label>
            <div className="relative">
              <input type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 text-right font-medium" />
              <Mail className="absolute right-4 top-3.5 text-slate-400" size={20} />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs mr-2">كلمة المرور</label>
            <div className="relative">
              <input type="password" required dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 text-right" />
              <Lock className="absolute right-4 top-3.5 text-slate-400" size={20} />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="animate-fade-in-up">
                <label className="block text-slate-700 font-bold mb-1.5 text-xs mr-2">اختر معلم فصلك</label>
                <div className="relative">
                    <select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 font-bold appearance-none">
                        <option value="">{isFetchingTeachers ? 'جاري تحميل المعلمين...' : '-- اختر المعلم --'}</option>
                        {teachers.map(t => <option key={t.teacherId} value={t.teacherId}>{t.displayName}</option>)}
                    </select>
                    <UserCheck className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={20} />
                    <ChevronDown className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" size={20} />
                </div>
            </div>
          )}

          {mode === 'teacher' && (
            <div className="bg-purple-50 text-purple-700 p-4 rounded-2xl text-xs font-bold border border-purple-100 flex items-start gap-2">
              <Info className="shrink-0 mt-0.5" size={14} /> 
              <span>هذه البوابة مخصصة فقط للمعلمين المسجلين مسبقاً من قِبل الإدارة.</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-red-100 animate-shake">
              <AlertCircle size={20} className="shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading || (mode === 'signup' && isFetchingTeachers)} className={`w-full text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 ${mode === 'teacher' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : 
             mode === 'signup' ? 'إنشاء حساب جديد' : 
             mode === 'teacher' ? 'دخول المعلم' : 'انطلق الآن'}
            <LogIn size={20} className="rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserEntryModal;
