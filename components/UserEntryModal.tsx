import React, { useState } from 'react';
import { User, ArrowLeft, ChevronDown } from 'lucide-react';

interface UserEntryModalProps {
  onSubmit: (name: string) => void;
}

const PREDEFINED_USERS = [
  'عبير محمد',
  'عبير حنش',
  'ندى',
  'اسماء',
  'ريم',
  'منال',
  'عائشه'
];

const UserEntryModal: React.FC<UserEntryModalProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى اختيار الاسم');
      return;
    }
    onSubmit(name);
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
          <p className="text-gray-500 mt-2">للبدء، يرجى اختيار اسمك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2 pr-1">اسم الطالبة</label>
            <div className="relative">
              <select 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all pr-10 appearance-none bg-white text-gray-700 font-medium"
              >
                <option value="" disabled>اختر اسمك من القائمة...</option>
                {PREDEFINED_USERS.map((user) => (
                  <option key={user} value={user}>
                    {user}
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
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
          >
            دخول <ArrowLeft className="rtl:rotate-180" size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserEntryModal;