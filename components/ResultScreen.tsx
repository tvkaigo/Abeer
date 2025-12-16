import React, { useState, useEffect, useRef } from 'react';
import { GameResult } from '../types';
import { RefreshCcw, Star, Trophy, Frown, Sparkles, Award, PartyPopper, TrendingUp } from 'lucide-react';
import { getAiFeedback } from '../services/geminiService';
// @ts-ignore
import confetti from 'canvas-confetti';

interface ResultScreenProps {
  result: GameResult;
  difficulty: string;
  onRestart: () => void;
  isNewHighScore: boolean;
  userName?: string;
  totalCumulativeScore?: number;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ result, difficulty, onRestart, isNewHighScore, userName, totalCumulativeScore }) => {
  const [aiMessage, setAiMessage] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Advanced Confetti Logic
    const isPerfect = result.score === result.totalQuestions;
    let interval: any = null;
    
    if (isPerfect || isNewHighScore) {
       // Fireworks effect for perfect score or high score
       const duration = 5000;
       const animationEnd = Date.now() + duration;
       const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
       
       const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

       interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
      
          if (timeLeft <= 0) {
            return clearInterval(interval);
          }
      
          const particleCount = 50 * (timeLeft / duration);
          // since particles fall down, start a bit higher than random
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

    } else if (result.score >= 4) {
      // Standard side cannons for good score
      const duration = 3000;
      const end = Date.now() + duration;
      const colors = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b'];

      const frame = () => {
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
          animationFrameRef.current = requestAnimationFrame(frame);
        }
      };
      
      frame();
    }

    return () => {
        if (interval) clearInterval(interval);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [result.score, result.totalQuestions, isNewHighScore]);

  
  let message = "";
  let icon = null;
  let colorClass = "";
  let bgClass = "bg-gray-50"; // Default background

  const nameSuffix = userName ? ` يا ${userName}` : '';

  if (result.score >= 7) {
    message = `ممتاز، أنت مبدعة${nameSuffix}! 🌟`;
    icon = <Trophy size={64} className="text-yellow-400 drop-shadow-lg" />;
    colorClass = "text-yellow-600";
    // Festive background for high scores
    bgClass = "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-100 via-orange-50 to-white";
  } else if (result.score >= 4) {
    message = `مستواك جيد، تدربي مرة أخرى${nameSuffix} 👍`;
    icon = <Star size={64} className="text-blue-400 drop-shadow-lg" />;
    colorClass = "text-blue-600";
    bgClass = "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-indigo-50 to-white";
  } else {
    message = `أنت تحتاجين إلى المزيد من التدريب${nameSuffix}`;
    icon = <Frown size={64} className="text-orange-400" />;
    colorClass = "text-orange-600";
    bgClass = "bg-gray-50";
  }

  const handleAiFeedback = async () => {
    setLoadingAi(true);
    const feedback = await getAiFeedback(result.score, result.history, difficulty);
    setAiMessage(feedback);
    setLoadingAi(false);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative ${bgClass} transition-colors duration-1000`}>
      
      {/* Floating Background Elements for High Scores */}
      {result.score >= 7 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[10%] left-[10%] text-yellow-300 opacity-40 animate-bounce" style={{ animationDuration: '3s' }}>
                <Star size={48} fill="currentColor" />
            </div>
            <div className="absolute top-[20%] right-[15%] text-purple-300 opacity-30 animate-pulse" style={{ animationDuration: '4s' }}>
                <Sparkles size={60} />
            </div>
            <div className="absolute bottom-[15%] left-[20%] text-pink-300 opacity-30 animate-bounce" style={{ animationDuration: '5s' }}>
                <PartyPopper size={50} />
            </div>
            <div className="absolute bottom-[25%] right-[10%] text-blue-200 opacity-40 animate-pulse" style={{ animationDuration: '3s' }}>
                <Star size={32} fill="currentColor" />
            </div>
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center border-4 border-white animate-pop-in relative z-10">
        
        {/* New High Score Banner */}
        {isNewHighScore && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 animate-bounce whitespace-nowrap border-2 border-white z-20">
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

        {/* Score Card */}
        <div className="my-8 relative">
            <div className="text-gray-500 font-medium text-lg uppercase tracking-widest mb-2">النتيجة النهائية</div>
            <div className="text-7xl font-black text-indigo-900 drop-shadow-sm flex items-center justify-center">
                {result.score}<span className="text-3xl text-gray-400">/{result.totalQuestions}</span>
            </div>
            
            {/* Total Accumulative Score Badge */}
            {totalCumulativeScore !== undefined && totalCumulativeScore > 0 && (
              <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center justify-center gap-2 animate-fade-in-up">
                 <div className="bg-indigo-100 p-1.5 rounded-full text-indigo-600">
                    <TrendingUp size={16} />
                 </div>
                 <div className="text-sm text-indigo-800 font-bold">
                    مجموعك الكلي الآن: <span className="text-lg">{totalCumulativeScore}</span> إجابة صحيحة
                 </div>
              </div>
            )}
        </div>

        <div className="space-y-4">
            {!aiMessage && !loadingAi && (
                <button
                    onClick={handleAiFeedback}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.02]"
                >
                    <Sparkles size={20} /> ماذا يقول المعلم الذكي؟
                </button>
            )}

            {loadingAi && (
                <div className="p-4 bg-purple-50 rounded-xl text-purple-700 animate-pulse flex items-center justify-center gap-2">
                    <Sparkles className="animate-spin" size={16} /> جاري تحليل أدائك...
                </div>
            )}

            {aiMessage && (
                <div className="p-6 bg-purple-50 rounded-xl text-purple-800 text-right border border-purple-100 shadow-inner animate-fade-in">
                    <div className="flex items-center gap-2 mb-2 font-bold text-purple-900">
                        <Sparkles size={18} /> نصيحة المعلم:
                    </div>
                    <p className="leading-relaxed">{aiMessage}</p>
                </div>
            )}

            <button
                onClick={onRestart}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
            >
                <RefreshCcw size={20} /> العب مرة أخرى
            </button>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;