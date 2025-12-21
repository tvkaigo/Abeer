
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, UserCheck, ChevronDown, GraduationCap, Info, Sparkles, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { 
    auth, 
    createOrUpdatePlayerProfile, 
    fetchAllTeachers, 
    isTeacherByEmail, 
    activateTeacherAccount, 
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from '../services/statsService';
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
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingTeachers, setIsFetchingTeachers] = useState(false);
  const [teacherFetchError, setTeacherFetchError] = useState(false);

  const loadTeachersList = async () => {
    setIsFetchingTeachers(true);
    setTeacherFetchError(false);
    try {
        const list = await fetchAllTeachers();
        const validTeachers = list.filter(t => t.displayName);
        const sorted = validTeachers.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar'));
        setTeachers(sorted);
    } catch (err) {
        setTeacherFetchError(true);
    } finally {
        setIsFetchingTeachers(false);
    }
  };

  useEffect(() => {
    setError('');
    setSuccess('');
    if (mode === 'signup') {
        loadTeachersList();
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setSuccess('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (password.length < 6) {
        setError("كلمة المرور يجب أن تتكون من 6 خانات على الأقل.");
        return;
    }

    setIsLoading(true);

    try {
      if (mode === 'teacher') {
        let userCredential;
        try {
            userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        } catch (authErr: any) {
            if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/wrong-password') {
                throw { code: 'custom/incorrect-credentials' };
            }
            throw authErr;
        }

        const user = userCredential.user;
        const teacherProfile = await isTeacherByEmail(cleanEmail);
        
        if (!teacherProfile) {
            await auth.signOut();
            setError("عذراً، هذا البريد ليس لمعلم معتمد في نظامنا.");
            setIsLoading(false);
            return;
        }

        // ربط الحساب بالـ UID وتفعيل النشاط إذا لم يكن مرتبطاً مسبقاً
        if (!teacherProfile.uid) {
            await activateTeacherAccount(teacherProfile.teacherId, user.uid);
        }
        
        onSuccess();
        
      } else if (mode === 'signup') {
        if (!cleanName || !teacherId) {
            setError("يرجى كتابة اسمك واختيار المعلم للمتابعة.");
            setIsLoading(false);
            return;
        }
        
        // 1. إنشاء حساب في نظام المصادقة
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        
        // 2. تحديث الاسم في نظام المصادقة
        await updateProfile(userCredential.user, { displayName: cleanName });
        
        // 3. إنشاء الملف الشخصي في Firestore والانتظار حتى يكتمل
        try {
            const success = await createOrUpdatePlayerProfile(userCredential.user.uid, cleanEmail, cleanName, teacherId);
            if (success) {
                onSuccess();
            } else {
                throw new Error("فشل تأكيد إنشاء الملف الشخصي");
            }
        } catch (dbErr: any) {
            console.error("Firestore Registration Error:", dbErr);
            setError("حدثت مشكلة في حفظ بياناتك في الفصل. يرجى مراجعة القواعد الأمنية أو المحاولة لاحقاً.");
            setIsLoading(false);
        }
      } else {
        // تسجيل دخول عادي
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        onSuccess();
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      if (!error && !success) setIsLoading(false);
    }
  };

  const handleAuthError = (err: any) => {
    let msg = "خطأ غير متوقع، يرجى المحاولة مرة أخرى.";
    const code = err.code || '';
    
    if (err.message && (err.message.includes('permission') || err.message.includes('insufficient'))) {
        msg = "خطأ في أذونات قاعدة البيانات. يرجى التأكد من ضبط القواعد (Firestore Rules) لتسمح بعمليات التسجيل والربط.";
    } else if (code === 'custom/incorrect-credentials') {
        msg = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    } else {
        switch (code) {
          case 'auth/user-not-found':
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
            msg = "البيانات المدخلة غير صحيحة.";
            break;
          case 'auth/email-already-in-use':
            msg = "هذا البريد مسجل بالفعل في تطبيقنا.";
            break;
          case 'auth/invalid-email':
            msg = "يرجى إدخال بريد إلكتروني صالح.";
            break;
          case 'auth/weak-password':
            msg = "كلمة المرور ضعيفة جداً.";
            break;
        }
    }
    setError(msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl">
      <div className="bg-white rounded-[3rem] shadow-2xl p-8 max-md w-full border-4 border-indigo-50 relative overflow-hidden animate-pop-in">
        <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${mode === 'teacher' ? 'from-purple-500 to-pink-500' : 'from-indigo-500 to-cyan-500'}`}></div>
        
        <div className="text-center mb-6">
          <div className={`${mode === 'teacher' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4`}>
            {mode === 'teacher' ? <GraduationCap size={40} /> : <Sparkles size={40} />}
          </div>
          <h2 className="text-3xl font-black text-slate-800">
             {mode === 'teacher' ? 'بوابة المعلم' : 'العبقري الصغير'}
          </h2>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>دخول</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>تسجيل</button>
            <button onClick={() => setMode('teacher')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'teacher' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}>معلم</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'signup') && (
            <div className="animate-fade-in-up">
                <label className="block text-slate-700 font-bold mb-1.5 text-xs mr-2">الاسم المعروض</label>
                <div className="relative">
                    <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="اسمك بالعربية" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 font-bold bg-slate-50" />
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

          <div className="animate-fade-in-up">
            <label className="block text-slate-700 font-bold mb-1.5 text-xs mr-2">كلمة المرور</label>
            <div className="relative">
              <input type="password" required dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 text-right bg-slate-50" />
              <Lock className="absolute right-4 top-3.5 text-slate-400" size={20} />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="animate-fade-in-up">
                <div className="flex items-center justify-between mb-1.5 mr-2">
                    <label className="block text-slate-700 font-bold text-xs">اختر معلم فصلك</label>
                    {isFetchingTeachers && <Loader2 size={14} className="animate-spin text-indigo-500" />}
                </div>
                <div className="relative">
                    <select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)} disabled={isFetchingTeachers} className={`w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 font-bold appearance-none transition-all ${isFetchingTeachers ? 'bg-slate-100 text-slate-400' : 'bg-slate-50'}`}>
                        <option value="">{isFetchingTeachers ? 'جاري التحميل...' : teacherFetchError ? 'خطأ في التحميل' : '-- اختر المعلم --'}</option>
                        {teachers.map(t => <option key={t.teacherId} value={t.teacherId}>{t.displayName}</option>)}
                    </select>
                    <UserCheck className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={20} />
                    <ChevronDown className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" size={20} />
                </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-red-100 animate-shake">
              <AlertCircle size={20} className="shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading} className={`w-full text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 ${mode === 'teacher' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : mode === 'signup' ? 'إنشاء حساب جديد' : 'انطلق الآن'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserEntryModal;
