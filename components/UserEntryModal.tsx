
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
  const [step, setStep] = useState(1); // مرحلة التسجيل (1 للحساب، 2 لاختيار المعلم)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingTeachers, setIsFetchingTeachers] = useState(false);

  useEffect(() => {
    // جلب المعلمين فقط في المرحلة الثانية من التسجيل لضمان وجود Auth
    if (mode === 'signup' && step === 2) {
        setIsFetchingTeachers(true);
        fetchAllTeachers().then(list => {
            setTeachers(list.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar')));
            setIsFetchingTeachers(false);
        }).catch(() => {
            setError("فشل جلب قائمة المعلمين. يرجى المحاولة لاحقاً.");
            setIsFetchingTeachers(false);
        });
    }
  }, [mode, step]);

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
        if (step === 1) {
            // المرحلة 1: إنشاء الحساب في Auth
            const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            await updateProfile(userCredential.user, { displayName: displayName.trim() });
            setStep(2); // الانتقال لاختيار المعلم
        } else {
            // المرحلة 2: اختيار المعلم وربط الملف
            const user = auth.currentUser;
            if (!user) throw new Error("جلسة العمل انتهت، يرجى تسجيل الدخول");
            if (!teacherId) throw new Error("يرجى اختيار معلمك");
            await createOrUpdatePlayerProfile(user.uid, cleanEmail, displayName.trim(), teacherId);
            onSuccess();
        }
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        onSuccess();
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = err.message || "حدث خطأ غير متوقع";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "بيانات الدخول غير صحيحة.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "هذا البريد الإلكتروني مستخدم بالفعل.";
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
            {mode === 'signup' && step === 2 ? 'خطوة واحدة أخيرة لنبدأ!' : 'مرحباً بك في عالم الرياضيات الممتع'}
          </p>
        </div>

        {step === 1 && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
                <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>دخول</button>
                <button onClick={() => setMode('signup')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>تسجيل</button>
                <button onClick={() => setMode('teacher')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'teacher' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}>معلم</button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'signup' && step === 1 && (
            <div>
                <label className="block text-slate-700 font-bold mb-2 text-sm">اسم البطل (بالعربية)</label>
                <div className="relative">
                <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="مثال: أحمد محمد" className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 font-bold" />
                <User className="absolute right-4 top-4 text-slate-400" size={20} />
                </div>
            </div>
          )}

          {mode === 'signup' && step === 2 && (
            <div className="animate-fade-in-up">
                <label className="block text-slate-700 font-bold mb-2 text-sm">اختر معلم فصلك</label>
                <div className="relative">
                <select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 font-bold appearance-none">
                    <option value="">{isFetchingTeachers ? 'جاري التحميل...' : '-- اختر المعلم --'}</option>
                    {teachers.map(t => <option key={t.teacherId} value={t.teacherId}>{t.displayName}</option>)}
                </select>
                <UserCheck className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={20} />
                <ChevronDown className="absolute left-4 top-4 text-slate-400 pointer-events-none" size={20} />
                </div>
                <p className="text-[10px] text-indigo-500 mt-2 font-bold px-2">يجب اختيار المعلم لتتمكن من المنافسة في قائمة المتصدرين.</p>
            </div>
          )}

          {step === 1 && (
            <>
                <div>
                    <label className="block text-slate-700 font-bold mb-2 text-sm">البريد الإلكتروني</label>
                    <div className="relative">
                    <input type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 text-right font-medium" />
                    <Mail className="absolute right-4 top-4 text-slate-400" size={20} />
                    </div>
                </div>

                <div>
                    <label className="block text-slate-700 font-bold mb-2 text-sm">كلمة المرور</label>
                    <div className="relative">
                    <input type="password" required dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 bg-slate-50 text-right" />
                    <Lock className="absolute right-4 top-4 text-slate-400" size={20} />
                    </div>
                </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-red-100 animate-shake">
              <AlertCircle size={20} className="shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading || (step === 2 && isFetchingTeachers)} className={`w-full text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 ${mode === 'teacher' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : 
             step === 2 ? 'إكمال التسجيل والدخول' : 
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
