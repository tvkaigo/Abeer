
import React, { useState } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { auth } from '../services/statsService';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile 
} from 'firebase/auth';

interface UserEntryModalProps {
  onSuccess: () => void;
}

const UserEntryModal: React.FC<UserEntryModalProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) throw new Error("يرجى إدخال اسمك بالعربية");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
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
        {/* Decorative background */}
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

        {/* Tabs */}
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
            disabled={isLoading}
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
};

export default UserEntryModal;
