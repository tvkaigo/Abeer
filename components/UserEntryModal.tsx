
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, UserCheck, ChevronDown, GraduationCap, CheckCircle2, Send } from 'lucide-react';
import { auth, createOrUpdatePlayerProfile, fetchAllTeachers, sendTeacherSignInLink } from '../services/statsService';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile 
} from 'firebase/auth';
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
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    if (mode === 'signup') {
        setIsFetchingTeachers(true);
        setError('');
        fetchAllTeachers().then(list => {
            if (list && list.length > 0) {
              const sorted = [...list].sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar'));
              setTeachers(sorted);
            } else {
              setError("لا يوجد معلمين مسجلين حالياً. لا يمكن إتمام عملية تسجيل الطلاب في الوقت الحالي.");
              setTeachers([]);
            }
            setIsFetchingTeachers(false);
        }).catch((err) => {
            setError("عذراً، فشل جلب قائمة المعلمين من النظام. يرجى التحقق من اتصالك بالإنترنت.");
            setIsFetchingTeachers(false);
            setTeachers([]);
        });
    } else {
        setError('');
        setLinkSent(false);
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'teacher') {
        // سيقوم هذا التابع بالتحقق من (active: true) داخلياً ويعيد رسالة مخصصة
        await sendTeacherSignInLink(email.trim());
        setLinkSent(true);
      } else if (mode === 'signup') {
        const nameToSave = displayName.trim();
        if (!nameToSave) throw new Error("يرجى إدخال اسمك بالعربية");
        if (!teacherId) throw new Error("يرجى اختيار معلمك من القائمة لإكمال التسجيل");
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createOrUpdatePlayerProfile(userCredential.user.uid, email, nameToSave, teacherId);
        await updateProfile(userCredential.user, { displayName: nameToSave });
        onSuccess();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      let msg = "حدث خطأ ما، يرجى المحاولة مرة أخرى";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "هذا البريد الإلكتروني مستخدم بالفعل، جرب تسجيل الدخول.";
      } else if (err.code === 'auth/weak-password') {
        msg = "كلمة المرور يجب أن تكون 6 أحرف على الأقل للأمان.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-pop-in">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full border-4 border-indigo-50 text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-4">تم إرسال الرابط!</h2>
            <p className="text-slate-600 leading-relaxed mb-8">
                لقد أرسلنا رابط تسجيل دخول آمن إلى <strong>{email}</strong>.
                يرجى فتح بريدك الإلكتروني والضغط على الرابط لتسجيل الدخول مباشرة.
            </p>
            <button 
                onClick={() => setLinkSent(false)}
                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all"
            >
                تم، العودة للخلف
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-pop-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full border-4 border-indigo-50 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${mode === 'teacher' ? 'from-purple-500 via-fuchsia-500 to-pink-500' : 'from-indigo-500 via-blue-500 to-cyan-500'}`}></div>
        
        <div className="text-center mb-6">
          <div className={`${mode === 'teacher' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner`}>
            {mode === 'teacher' ? <GraduationCap size={32} /> : <User size={32} />}
          </div>
          <h2 className="text-2xl font-black text-slate-800">
             {mode === 'teacher' ? 'بوابة المعلم' : 'العبقري الصغير'}
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            {mode === 'login' ? 'سجل دخولك لمتابعة تقدمك' : mode === 'signup' ? 'أنشئ حساباً جديداً لتبدأ رحلتك' : 'تسجيل دخول آمن للمعلمين المصرح لهم'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
            <button 
                onClick={() => setMode('login')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}
            >
                طالب
            </button>
            <button 
                onClick={() => setMode('signup')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}
            >
                جديد
            </button>
            <button 
                onClick={() => setMode('teacher')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'teacher' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-purple-400'}`}
            >
                معلم
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'signup' && (
            <>
                <div>
                  <label className="block text-slate-700 font-bold mb-2 pr-1 text-sm">الاسم بالكامل (بالعربية)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="مثال: سارة محمد"
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all pr-12 bg-slate-50 font-bold"
                      disabled={isFetchingTeachers || (mode === 'signup' && teachers.length === 0)}
                    />
                    <User className="absolute right-4 top-4 text-slate-400" size={20} />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-2 pr-1 text-sm">اختر معلمك</label>
                  <div className="relative group">
                    <select
                      required
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all pr-12 bg-slate-50 font-bold appearance-none cursor-pointer disabled:bg-slate-200"
                      disabled={isFetchingTeachers || teachers.length === 0}
                    >
                      <option value="">{isFetchingTeachers ? 'جاري التحميل...' : (teachers.length === 0 ? '-- لا يوجد معلمين --' : '-- اضغط لاختيار المعلم --')}</option>
                      {teachers.map(t => (
                          <option key={t.teacherId} value={t.teacherId}>{t.displayName}</option>
                      ))}
                    </select>
                    <UserCheck className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={20} />
                    <ChevronDown className="absolute left-4 top-4 text-slate-400 pointer-events-none" size={20} />
                  </div>
                </div>
            </>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-2 pr-1 text-sm">البريد الإلكتروني للمعلم</label>
            <div className="relative">
              <input 
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@teacher.com"
                className={`w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 outline-none transition-all pr-12 bg-slate-50 text-right font-medium ${mode === 'teacher' ? 'focus:border-purple-500 focus:ring-purple-50' : 'focus:border-indigo-500 focus:ring-indigo-50'}`}
              />
              <Mail className="absolute right-4 top-4 text-slate-400" size={20} />
            </div>
          </div>

          {mode !== 'teacher' && (
            <div>
              <label className="block text-slate-700 font-bold mb-2 pr-1 text-sm">كلمة المرور</label>
              <div className="relative">
                <input 
                  type="password"
                  required
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all pr-12 bg-slate-50 text-right"
                />
                <Lock className="absolute right-4 top-4 text-slate-400" size={20} />
              </div>
            </div>
          )}

          {mode === 'teacher' && (
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-start gap-3 animate-fade-in">
              <AlertCircle size={20} className="text-purple-600 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-800 leading-relaxed font-bold">
                سيتم التحقق من حالة حسابك (active). إذا كنت معلماً نشطاً، سيصلك رابط الدخول الآمن.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 border border-red-100 shadow-sm">
              <AlertCircle size={20} className="shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading || (mode === 'signup' && (isFetchingTeachers || teachers.length === 0))}
            className={`w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 ${mode === 'teacher' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : mode === 'teacher' ? (
              <>تسجيل الدخول <Send size={20} className="rtl:rotate-180" /></>
            ) : mode === 'login' ? (
              <>دخول الطالب <LogIn size={20} className="rotate-180" /></>
            ) : (
              <>إنشاء حساب <UserPlus size={20} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserEntryModal;
