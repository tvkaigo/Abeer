import React, { useState, useEffect } from 'react';
import { Difficulty, Operation, GameConfig, TeacherProfile, UserRole } from '../types';
import { Brain, Calculator, ChevronLeft, Zap, Divide, X as MultiplyIcon, Plus, Minus, Trophy, BarChart3, Timer, Star, LogOut, UserCheck } from 'lucide-react';
import { initAudio } from '../services/soundService';
import { getBadgeDefinitions, auth, fetchTeacherInfo } from '../services/statsService';
import { signOut } from 'firebase/auth';

interface WelcomeScreenProps {
  onStart: (config: GameConfig) => void;
  onQuickStart: () => void;
  onShowAnalytics: () => void;
  onShowLeaderboard: () => void;
  highScore: number;
  userName?: string;
  currentTotalScore?: number;
  role?: UserRole;
  teacherId?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    onStart, 
    onQuickStart, 
    onShowAnalytics, 
    onShowLeaderboard, 
    highScore, 
    userName,
    currentTotalScore = 0,
    role = UserRole.STUDENT,
    teacherId
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);

  useEffect(() => {
    if (role === UserRole.STUDENT && teacherId) {
        fetchTeacherInfo(teacherId).then(setTeacher);
    }
  }, [role, teacherId]);

  const handleStart = () => {
    if (difficulty && operation) {
      initAudio();
      onStart({ difficulty, operation });
    }
  };

  const handleQuickStart = () => {
      initAudio();
      onQuickStart();
  };

  const handleLogout = () => {
      signOut(auth);
  };

  const badges = getBadgeDefinitions(currentTotalScore);
  const currentBadge = [...badges].reverse().find(b => b.unlocked) || badges[0];
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-blue-100 text-gray-800 relative">
      
      {/* High Score Badge */}
      <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-indigo-100 flex items-center gap-2 text-indigo-900 font-bold animate-pop-in">
        <Trophy className="text-yellow-500" size={20} />
        <span className="text-sm font-black">أفضل جولة: {highScore}/10</span>
      </div>

      {/* Teacher Info (Only for Students) */}
      {role === UserRole.STUDENT && teacher && (
        <div className="absolute bottom-6 right-6 bg-indigo-600 text-white px-4 py-2 rounded-2xl shadow-lg border border-white/20 flex items-center gap-3 animate-pop-in">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <UserCheck size={18} />
            </div>
            <div>
                <div className="text-[10px] opacity-70 font-bold">معلمك:</div>
                <div className="text-xs font-black">{teacher.displayName}</div>
            </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute top-6 right-6 flex gap-2 animate-pop-in">
        <button 
            onClick={onShowLeaderboard}
            className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-yellow-100 flex items-center gap-2 text-indigo-900 font-bold hover:bg-white hover:scale-105 transition-all"
            title="قائمة الأبطال"
        >
            <Trophy className="text-yellow-500" size={20} />
            <span className="hidden sm:inline text-sm">قائمة الأبطال</span>
        </button>

        <button 
            onClick={onShowAnalytics}
            className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-indigo-100 flex items-center gap-2 text-indigo-900 font-bold hover:bg-white hover:scale-105 transition-all"
            title="تحليلاتي"
        >
            <BarChart3 className="text-blue-500" size={20} />
            <span className="hidden sm:inline text-sm">تحليلاتي</span>
        </button>

        <button 
            onClick={handleLogout}
            className="bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-sm border border-red-100 flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 hover:scale-105 transition-all"
            title="خروج"
        >
            <LogOut size={20} />
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full border-4 border-white/50 backdrop-blur-sm mt-12">
        <header className="text-center mb-10">
          <div className="bg-indigo-600 text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce-slow">
            <Calculator size={40} />
          </div>
          <h1 className="text-4xl font-extrabold text-indigo-900 mb-2">
            {userName ? `أهلاً بك، ${userName}!` : 'العبقري الصغير'}
          </h1>
          
          <div className="flex items-center justify-center gap-3 mt-3 animate-fade-in-up">
               <div className="bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-100 flex items-center gap-2">
                  <Star size={16} fill="currentColor" />
                  <span>الرصيد: {currentTotalScore} نقطة</span>
               </div>
               {currentBadge && (
                  <div className={`px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2 ${currentBadge.color.replace('bg-', 'bg-opacity-20 ')}`}>
                      <span>{currentBadge.icon}</span>
                      <span>{currentBadge.name}</span>
                  </div>
               )}
          </div>
        </header>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Brain className="text-indigo-500" />
            <span>1. اختر المستوى:</span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {Object.values(Difficulty).map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`p-4 rounded-2xl border-2 transition-all duration-300 font-bold text-lg shadow-sm hover:shadow-md
                  ${difficulty === diff 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 scale-105' 
                    : 'border-gray-200 hover:border-indigo-300 text-gray-600'}`}
              >
                {diff}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Zap className="text-yellow-500" />
            <span>2. اختر العملية:</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { type: Operation.ADDITION, icon: <Plus />, color: 'text-green-600' },
              { type: Operation.SUBTRACTION, icon: <Minus />, color: 'text-red-600' },
              { type: Operation.MULTIPLICATION, icon: <MultiplyIcon />, color: 'text-purple-600' },
              { type: Operation.DIVISION, icon: <Divide />, color: 'text-orange-600' }
            ].map((op) => (
              <button
                key={op.type}
                onClick={() => setOperation(op.type)}
                className={`p-4 rounded-2xl border-2 transition-all duration-300 font-bold text-lg flex flex-col items-center gap-2 shadow-sm hover:shadow-md
                  ${operation === op.type 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 scale-105' 
                    : 'border-gray-200 hover:border-indigo-300 text-gray-600'}`}
              >
                <span className={`${op.color}`}>{op.icon}</span>
                {op.type}
              </button>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-3">
            <button
            onClick={handleStart}
            disabled={!difficulty || !operation}
            className={`w-full py-4 rounded-2xl text-2xl font-bold text-white shadow-xl flex items-center justify-center gap-3 transition-all duration-300
                ${difficulty && operation 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.02] cursor-pointer' 
                : 'bg-gray-300 cursor-not-allowed grayscale'}`}
            >
            <span>انطلق</span>
            <ChevronLeft className={`transition-transform ${difficulty && operation ? 'translate-x-1' : ''}`} />
            </button>

            <button
                onClick={handleQuickStart}
                className="w-full py-3 rounded-2xl text-lg font-bold text-orange-700 bg-orange-100 border-2 border-orange-200 hover:bg-orange-200 hover:scale-[1.01] shadow-sm flex items-center justify-center gap-2 transition-all"
            >
                <Timer size={20} className="text-orange-600" />
                <span>اختبار سريع (5 أسئلة عشوائية)</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;