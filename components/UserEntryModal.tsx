import React, { useState } from 'react';
import { User, ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';
import { PREDEFINED_USERS } from '../types';

interface UserEntryModalProps {
  onSubmit: (name: string) => void;
}

const UserEntryModal: React.FC<UserEntryModalProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى اختيار الاسم');
      return;
    }
    
    setIsLoading(true);
    // Simulate a brief delay or wait for async operation if passed
    await onSubmit(name);
    // Note: We don't set isLoading(false) because the modal usually unmounts immediately after submit
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-pop-in">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-indigo-50 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="text-center mb-8">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">مرحباً بك في العبقري الصغير!</h2>
          <p className="text-gray-500 mt-2">للبدء، يرجى اختيار اسمك لاستعادة نقاطك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2 pr-1">اسم الطالبة</label>
            <div className="relative">
              <select 
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all pr-10 appearance-none bg-white text-gray-700 font-medium disabled:opacity-70"
              >
                <option value="" disabled>اختر اسمك من القائمة...</option>
                {PREDEFINED_USERS.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>
              <User className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" size={20} />
              <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                <ChevronDown size={20} />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm font-bold text-center bg-red-50 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-wait"
          >
            {isLoading ? (
                <>
                    <Loader2 className="animate-spin" size={20} /> جاري جلب البيانات...
                </>
            ) : (
                <>
                    دخول <ArrowLeft className="rtl:rotate-180" size={20} />
                </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserEntryModal;