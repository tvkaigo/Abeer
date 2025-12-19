import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, UserCheck, ChevronDown } from 'lucide-react';
import { auth, createOrUpdatePlayerProfile, fetchAllTeachers } from '../services/statsService';
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
  const [mode, setMode] = useState<'login' | 'signup'>('login');
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
        fetchAllTeachers().then(list => {
            const sorted = [...list].sort((a, b) => a.displayName.localeCompare(b.displayName, 'ar'));
            setTeachers(sorted);
            setIsFetchingTeachers(false);
        }).catch(() => setIsFetchingTeachers(false));
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const nameToSave = displayName.trim();
        if (!nameToSave) throw new Error("يرجى إدخال اسمك بالعربية");
        if (!teacherId) throw new Error("يرجى اختيار معلمك من القائمة");
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // ربط الطالب بالمعلم المختار عن طريق TeacherId وتخزينه في مسار /Users/{UserId}
        await createOrUpdatePlayerProfile(userCredential.user.uid, email, nameToSave, teacherId);
        
        await updateProfile(userCredential.user, { displayName: nameToSave });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      let msg = "حدث خطأ ما، يرجى المحاولة مرة أخرى";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "بيانات الدخول غير صحيحة";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "هذا البريد الإلكتروني مستخدم بالفعل";
      } else if (err.code === 'auth/weak-password') {
        msg = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-pop-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full border-4 border-indigo-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="text-center mb-6">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">العبقري الصغير</h2>
          <p className="text-slate-500 mt-2 font-medium">
            {mode === 'login' ? 'سجل دخولك لمتابعة تقدمك' : 'أنشئ حساباً جديداً لتبدأ رحلتك'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
            <button 
                onClick={() => setMode('login')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
                دخول
            </button>
            <button 
                onClick={() => setMode('signup')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
                حساب جديد
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
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all pr-12 bg-slate-50 font-bold appearance-none cursor-pointer"
                      disabled={isFetchingTeachers}
                    >
                      <option value="">-- اضغط لاختيار المعلم --</option>
                      {teachers.map(t => (
                          <option key={t.teacherId} value={t.teacherId}>{t.displayName}</option>
                      ))}
                    </select>
                    <UserCheck className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={20} />
                    <ChevronDown className="absolute left-4 top-4 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={20} />
                    
                    {isFetchingTeachers && (
                        <div className="absolute left-12 top-4">
                            <Loader2 className="animate-spin text-indigo-500" size={18} />
                        </div>
                    )}
                  </div>
                  
                  {teacherId && (
                      <div className="mt-3 bg-amber-50 border border-amber-100 p-3 rounded-2xl text-[11px] text-amber-800 font-black flex items-start gap-2 animate-fade-in-up leading-relaxed">
                          <AlertCircle size={16} className="shrink-0 text-amber-600" />
                          <span>تنبيه: لا يمكن تغيير اسم المعلم لاحقاً، تأكد من أنه معلمك الصحيح.</span>
                      </div>
                  )}
                </div>
            </>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-2 pr-1 text-sm">البريد الإلكتروني</label>
            <div className="relative">
              <input 
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all pr-12 bg-slate-50 text-right font-medium"
              />
              <Mail className="absolute right-4 top-4 text-slate-400" size={20} />
            </div>
          </div>

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

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-black flex items-start gap-2 animate-shake border border-red-100">
              <AlertCircle size={20} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading || (mode === 'signup' && isFetchingTeachers)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : mode === 'login' ? (
              <>دخول <LogIn size={20} className="rotate-180" /></>
            ) : (
              <>إنشاء حساب <UserPlus size={20} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}; export default UserEntryModal;