
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, UserCheck, ChevronDown, GraduationCap, Info, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { auth, createOrUpdatePlayerProfile, fetchAllTeachers, isTeacherByEmail, activateTeacherAccount, loadStats, loginAnonymously } from '../services/statsService';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile
} from 'firebase/auth';
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

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const loadTeachersList = async () => {
    setIsFetchingTeachers(true);
    try {
        await loginAnonymously();
        const list = await fetchAllTeachers();
        const validTeachers = list.filter(t => t.displayName);
        const sorted = validTeachers.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar'));
        setTeachers(sorted);
    } catch (err) {
        console.error("Failed to load teachers:", err);
        setError("عذراً، لم نتمكن من جلب قائمة المعلمين.");
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
        // تسجيل دخول المعلم بكلمة المرور المعطاة من الإدارة
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;

        // البحث عن ملف المعلم في Firestore للتأكد من أنه مسجل مسبقاً من قبل الإدارة
        const teacherProfile = await isTeacherByEmail(cleanEmail);
        
        if (teacherProfile) {
            // إذا كان الدخول الأول (الحساب غير نشط)، نقوم بتفعيله وربطه بـ UID الخاص بالدخول
            if (!teacherProfile.active) {
                await activateTeacherAccount(teacherProfile.teacherId, user.uid);
                setSuccess("تم تفعيل حسابك بنجاح! أهلاً بك في منصة العبقري الصغير.");
                // تأخير بسيط لعرض رسالة النجاح
                setTimeout(() => onSuccess(), 1500);
            } else {
                // الحساب نشط بالفعل، فقط ننتقل للداخل
                onSuccess();
            }
        } else {
            // إذا لم يتم العثور على ملف في Firestore رغم نجاح الدخول في Auth
            throw { code: 'custom/not-a-teacher' };
        }
      } else if (mode === 'signup') {
        if (!cleanName || !teacherId) {
            setError("يرجى كتابة اسمك واختيار المعلم.");
            setIsLoading(false);
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(userCredential.user, { displayName: cleanName });
        await createOrUpdatePlayerProfile(userCredential.user.uid, cleanEmail, cleanName, teacherId);
        onSuccess();
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        onSuccess();
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      if (!success) setIsLoading(false);
    }
  };

  const handleAuthError = (err: any) => {
    console.error("Auth Action Error:", err);
    let msg = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.";
    switch (err.code) {
      case 'auth/user-not-found':
        msg = "لم نجد حساباً بهذا البريد الإلكتروني.";
        break;
      case 'auth/wrong-password':
        msg = "كلمة المرور التي أدخلتها غير صحيحة.";
        break;
      case 'auth/invalid-credential':
        msg = "بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.";
        break;
      case 'custom/not-a-teacher':
        msg = "عذراً، هذا الحساب ليس مسجلاً كمعلم في نظامنا. يرجى مراجعة الإدارة.";
        break;
      default:
        break;
    }
    setError(msg);
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
            {mode === 'login' ? 'مرحباً بعودتك يا بطل!' : mode === 'signup' ? 'سجل الآن لتنضم لعالم الأبطال' : 'الدخول بكلمة المرور الممنوحة لك'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>دخول</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>تسجيل</button>
            <button onClick={() => setMode('teacher')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'teacher' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}>معلم</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* حقل الاسم: معطل للمعلم لأن الإدارة حددته مسبقاً */}
          {(mode === 'signup' || mode === 'teacher') && (
            <div className={`animate-fade-in-up ${mode === 'teacher' ? 'opacity-50' : ''}`}>
                <label className="block text-slate-700 font-bold mb-1.5 text-xs mr-2">الاسم المعروض</label>
                <div className="relative">
                    <input 
                      type="text" 
                      required={mode === 'signup'} 
                      disabled={mode === 'teacher'}
                      value={mode === 'teacher' ? 'الاسم محدد مسبقاً' : displayName} 
                      onChange={(e) => setDisplayName(e.target.value)} 
                      placeholder="اسمك بالعربية" 
                      className={`w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 outline-none pr-12 font-bold ${mode === 'teacher' ? 'bg-slate-200 cursor-not-allowed italic' : 'focus:border-indigo-500 bg-slate-50'}`} 
                    />
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
              <input 
                type="password" 
                required 
                dir="ltr" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none pr-12 text-right bg-slate-50" 
              />
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
            <div className="bg-purple-50 text-purple-700 p-4 rounded-2xl text-xs font-bold border border-purple-100 flex items-start gap-2 animate-fade-in">
              <Info className="shrink-0 mt-0.5" size={16} /> 
              <div className="leading-relaxed">
                <p className="mb-1 text-purple-900">تنبيه للمعلم:</p>
                <p className="opacity-80">استخدم البريد وكلمة المرور التي زودتك بها الإدارة. عند دخولك الأول، سيتم تنشيط حسابك تلقائياً لتظهر لطلابك في قائمة التسجيل.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-red-100 animate-shake">
              <AlertCircle size={20} className="shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-green-100 animate-pop-in">
              <CheckCircle2 size={20} className="shrink-0 text-green-500" />
              <span className="leading-relaxed">{success}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading || (mode === 'signup' && isFetchingTeachers)} 
            className={`w-full text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'teacher' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : 
             mode === 'signup' ? 'إنشاء حساب جديد' : 
             mode === 'teacher' ? 'تسجيل دخول المعلم' : 'انطلق الآن'}
            {!isLoading && <LogIn size={20} className="rotate-180" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserEntryModal;
