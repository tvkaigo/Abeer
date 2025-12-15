import React, { useState } from 'react';
import { Difficulty, Operation, GameConfig } from '../types';
import { Brain, Calculator, ChevronLeft, GraduationCap, Zap, Divide, X as MultiplyIcon, Plus, Minus, Trophy, BarChart3 } from 'lucide-react';
import { initAudio } from '../services/soundService';

interface WelcomeScreenProps {
  onStart: (config: GameConfig) => void;
  onShowAnalytics: () => void;
  highScore: number;
  userName?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onShowAnalytics, highScore, userName }) => {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);

  const handleStart = () => {
    if (difficulty && operation) {
      initAudio();
      onStart({ difficulty, operation });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-blue-100 text-gray-800 relative">
      
      {/* High Score Badge */}
      <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-indigo-100 flex items-center gap-2 text-indigo-900 font-bold animate-pop-in">
        <Trophy className="text-yellow-500" size={20} />
        <span className="text-sm">أعلى نتيجة:</span>
        <span className="text-xl">{highScore}/10</span>
      </div>

      {/* Analytics Button */}
      <div className="absolute top-6 right-6 animate-pop-in">
        <button 
            onClick={onShowAnalytics}
            className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-indigo-100 flex items-center gap-2 text-indigo-900 font-bold hover:bg-white hover:scale-105 transition-all"
        >
            <BarChart3 className="text-blue-500" size={20} />
            <span className="text-sm">تحليلاتي</span>
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
          {userName ? (
            <p className="text-gray-500 text-lg">هل أنت مستعدة لتحدي الرياضيات اليوم؟</p>
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
      </div>
    </div>
  );
};

export default WelcomeScreen;