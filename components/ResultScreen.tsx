import React, { useState, useEffect } from 'react';
import { GameResult } from '../types';
import { RefreshCcw, Star, Trophy, Frown, Sparkles, Award } from 'lucide-react';
import { getAiFeedback } from '../services/geminiService';
// @ts-ignore
import confetti from 'canvas-confetti';

interface ResultScreenProps {
  result: GameResult;
  difficulty: string;
  onRestart: () => void;
  isNewHighScore: boolean;
  userName?: string;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ result, difficulty, onRestart, isNewHighScore, userName }) => {
  const [aiMessage, setAiMessage] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    // Trigger confetti if score is 4 or more (Good or Excellent) OR if it is a new high score
    if (result.score >= 4 || isNewHighScore) {
      const duration = 3000;
      const end = Date.now() + duration;
      const colors = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, [result.score, isNewHighScore]);

  const percentage = (result.score / result.totalQuestions) * 100;
  
  let message = "";
  let icon = null;
  let colorClass = "";

  const nameSuffix = userName ? ` يا ${userName}` : '';

  if (result.score >= 7) {
    message = `ممتاز، أنت مبدعة${nameSuffix}! 🌟`;
    icon = <Trophy size={64} className="text-yellow-400" />;
    colorClass = "text-yellow-600";
  } else if (result.score >= 4) {
    message = `مستواك جيد، تدربي مرة أخرى${nameSuffix} 👍`;
    icon = <Star size={64} className="text-blue-400" />;
    colorClass = "text-blue-600";
  } else {
    message = `أنت تحتاجين إلى المزيد من التدريب${nameSuffix}`;
    icon = <Frown size={64} className="text-orange-400" />;
    colorClass = "text-orange-600";
  }

  const handleAiFeedback = async () => {
    setLoadingAi(true);
    const feedback = await getAiFeedback(result.score, result.history, difficulty);
    setAiMessage(feedback);
    setLoadingAi(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center border-4 border-indigo-50 animate-pop-in relative z-10">
        
        {/* New High Score Banner */}
        {isNewHighScore && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 animate-bounce whitespace-nowrap border-2 border-white">
            <Award size={20} />
            رقم قياسي جديد!
          </div>
        )}

        <div className="mb-6 flex justify-center animate-pulse">
            {icon}
        </div>

        <h2 className={`text-3xl font-bold mb-2 ${colorClass}`}>
          {message}
        </h2>

        <div className="my-8 relative">
            <div className="text-gray-500 font-medium text-lg uppercase tracking-widest mb-2">النتيجة النهائية</div>
            <div className="text-7xl font-black text-indigo-900">
                {result.score}<span className="text-3xl text-gray-400">/{result.totalQuestions}</span>
            </div>
        </div>

        <div className="space-y-4">
            {!aiMessage && !loadingAi && (
                <button
                    onClick={handleAiFeedback}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                    <Sparkles size={20} /> ماذا يقول المعلم الذكي؟
                </button>
            )}

            {loadingAi && (
                <div className="p-4 bg-purple-50 rounded-xl text-purple-700 animate-pulse">
                    جاري تحليل أدائك...
                </div>
            )}

            {aiMessage && (
                <div className="p-6 bg-purple-50 rounded-xl text-purple-800 text-right border border-purple-100 shadow-inner">
                    <div className="flex items-center gap-2 mb-2 font-bold text-purple-900">
                        <Sparkles size={18} /> نصيحة المعلم:
                    </div>
                    <p className="leading-relaxed">{aiMessage}</p>
                </div>
            )}

            <button
                onClick={onRestart}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
                <RefreshCcw size={20} /> العب مرة أخرى
            </button>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;