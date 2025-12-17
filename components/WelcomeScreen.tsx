import React, { useState } from 'react';
import { Difficulty, Operation, GameConfig } from '../types';
import { Brain, Calculator, ChevronLeft, Zap, Divide, X as MultiplyIcon, Plus, Minus, Trophy, BarChart3, Timer, Star, Crown } from 'lucide-react';
import { initAudio } from '../services/soundService';
import { getBadgeDefinitions } from '../services/statsService';

interface WelcomeScreenProps {
  onStart: (config: GameConfig) => void;
  onQuickStart: () => void;
  onShowAnalytics: () => void;
  onShowLeaderboard: () => void;
  highScore: number;
  userName?: string;
  currentTotalScore?: number;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    onStart, 
    onQuickStart, 
    onShowAnalytics, 
    onShowLeaderboard, 
    highScore, 
    userName,
    currentTotalScore = 0
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);

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

  // Determine current rank based on total score
  const badges = getBadgeDefinitions(currentTotalScore);
  const currentBadge = badges.reverse().find(b => b.unlocked) || badges[badges.length -1];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-blue-100 text-gray-800 relative">
      
      {/* High Score Badge (Session/Device best) */}
      <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-indigo-100 flex items-center gap-2 text-indigo-900 font-bold animate-pop-in">
        <Trophy className="text-yellow-500" size={20} />
        <span className="text-sm">أفضل جولة:</span>
        <span className="text-xl">{highScore}/10</span>
      </div>

      {/* Action Buttons (Analytics & Leaderboard) */}
      <div className="absolute top-6 right-6 flex gap-3 animate-pop-in">
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
      </div>

      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full border-4 border-white/50 backdrop-blur-sm mt-12">
        <header className="text-center mb-10">
          <div className="bg-indigo-600 text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce-slow">
            <Calculator size={40} />
          </div>
          <h1 className="text-4xl font-extrabold text-indigo-900 mb-2">
            {userName ? `أهلاً بك، ${userName}!` : 'العبقري الصغير'}
          </h1>
          
          {/* User Progress Summary (Cross-Device Sync Visualization) */}
          {userName ? (
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
          ) : (
            <p className="text-gray-500 text-lg">اختبر مهاراتك في الرياضيات وتحدى نفسك!</p>
          )}
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