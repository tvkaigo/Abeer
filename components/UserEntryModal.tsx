import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle, KeyRound, UserCheck } from 'lucide-react';
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
            setTeachers(list);
            setIsFetchingTeachers(false);
        });
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
        
        // Save profile with selected teacherId
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
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-indigo-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="text-center mb-6">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">العبقري الصغير</h2>
          <p className="text-gray-500 mt-2">
            {mode === 'login' ? 'سجل دخولك لمتابعة تقدمك' : 'أنشئ حساباً جديداً لتبدأ رحلتك'}
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
            <button 
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
            >
                دخول
            </button>
            <button 
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
            >
                حساب جديد
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
                <div>
                  <label className="block text-gray-700 font-bold mb-1.5 pr-1">الاسم بالكامل (بالعربية)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="مثال: أحمد محمد"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all pr-10 bg-gray-50"
                    />
                    <User className="absolute right-3 top-3.5 text-gray-400" size={18} />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5 pr-1">اختر معلمك</label>
                  <div className="relative">
                    <select
                      required
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all pr-10 bg-gray-50 appearance-none"
                      disabled={isFetchingTeachers}
                    >
                      <option value="">-- اختر المعلم --</option>
                      {teachers.map(t => (
                          <option key={t.teacherId} value={t.teacherId}>{t.displayName}</option>
                      ))}
                    </select>
                    <UserCheck className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
                    {isFetchingTeachers && (
                        <div className="absolute left-10 top-3.5">
                            <Loader2 className="animate-spin text-indigo-500" size={18} />
                        </div>
                    )}
                  </div>
                  {teacherId && (
                      <div className="mt-2 bg-orange-50 border border-orange-100 p-2.5 rounded-xl text-[11px] text-orange-700 font-bold flex items-start gap-2 animate-fade-in">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          <span>تنبيه: لا يمكنك تغيير اسم المعلم لاحقاً، تأكد من اختيار معلمك الصحيح.</span>
                      </div>
                  )}
                </div>
            </>
          )}

          <div>
            <label className="block text-gray-700 font-bold mb-1.5 pr-1">البريد الإلكتروني</label>
            <div className="relative">
              <input 
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all pr-10 bg-gray-50 text-right"
              />
              <Mail className="absolute right-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1.5 pr-1">كلمة المرور</label>
            <div className="relative">
              <input 
                type="password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all pr-10 bg-gray-50 text-right"
              />
              <Lock className="absolute right-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-start gap-2 animate-shake">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading || isFetchingTeachers}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
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