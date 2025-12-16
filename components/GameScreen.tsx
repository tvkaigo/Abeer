import React, { useState, useEffect, useRef } from 'react';
import { Question, GameResult } from '../types';
import { getOperationSymbol } from '../services/mathService';
import { Timer, SkipForward, Send, CheckCircle2, XCircle, RotateCcw, AlarmClockOff, Home, Loader2, Save } from 'lucide-react';
import { playCorrect, playIncorrect, playTick, playCompletion } from '../services/soundService';

interface GameScreenProps {
  questions: Question[];
  onEndGame: (result: GameResult) => void;
  onExit: () => void;
  initialTime?: number; // Optional prop for custom time
  isSaving?: boolean;
}

const DEFAULT_TIME = 2 * 60; // 2 minutes default

const GameScreen: React.FC<GameScreenProps> = ({ questions, onEndGame, onExit, initialTime = DEFAULT_TIME, isSaving = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [history, setHistory] = useState<Question[]>([]);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentIndex];

  // Focus management
  useEffect(() => {
    if (inputRef.current && !isTimeUp && !isSaving) {
      inputRef.current.focus();
    }
  }, [currentIndex, attempts, isTimeUp, isSaving, feedback]);

  // Timer Logic - Decoupled from render cycle for stability
  useEffect(() => {
    if (isSaving || isTimeUp) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        // Play tick sound (urgent if last 10 seconds)
        // Check prevTime - 1 because we are about to decrement
        playTick((prevTime - 1) <= 10);
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSaving, isTimeUp]);

  // Handle Time End
  useEffect(() => {
    if (timeLeft === 0 && !isTimeUp) {
      setIsTimeUp(true);
      playCompletion(false);
    }
  }, [timeLeft, isTimeUp]);

  const finishGame = (finalHistory?: Question[]) => {
    // Calculate final score based on history
    const currentHistory = finalHistory || history;
    const correctCount = currentHistory.filter(q => q.isCorrect).length;
    
    // Play completion sound based on score >= 40% (Good or better)
    playCompletion(correctCount >= Math.ceil(questions.length * 0.4));

    onEndGame({
      score: correctCount,
      totalQuestions: questions.length,
      history: currentHistory
    });
  };

  const moveToNextQuestion = (currentHistory?: Question[]) => {
    if (currentIndex >= questions.length - 1) {
      finishGame(currentHistory);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setAttempts(0);
      setFeedback('none');
      setUserAnswer('');
    }
  };

  const handleSkip = () => {
    // Record as skipped/wrong
    const newHistory = [...history, { ...currentQuestion, userAnswer: parseInt(userAnswer) || 0, isCorrect: false }];
    setHistory(newHistory);
    playIncorrect();
    moveToNextQuestion(newHistory);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer) return;

    const numAns = parseInt(userAnswer);
    const isCorrect = numAns === currentQuestion.correctAnswer;

    if (isCorrect) {
      setFeedback('correct');
      playCorrect();
      // Record success
      const newHistory = [...history, { ...currentQuestion, userAnswer: numAns, isCorrect: true }];
      setHistory(newHistory);
      
      // Delay slightly for visual feedback then next
      setTimeout(() => {
        moveToNextQuestion(newHistory);
      }, 1000);
    } else {
      setFeedback('incorrect');
      if (attempts === 0) {
        // First wrong attempt
        playIncorrect();
        setAttempts(1);
        // User stays on same question, but now Skip button appears
        if (inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.focus();
        }
        setUserAnswer('');
      } else {
        // Second wrong attempt
        playIncorrect();
        const newHistory = [...history, { ...currentQuestion, userAnswer: numAns, isCorrect: false }];
        setHistory(newHistory);
        setTimeout(() => {
          moveToNextQuestion(newHistory);
        }, 1000);
      }
    }
  };

  const handleTimeUpRestart = () => {
    setIsTimeUp(false);
    setCurrentIndex(0);
    setAttempts(0);
    setFeedback('none');
    setUserAnswer('');
    setHistory([]);
    setTimeLeft(initialTime);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((currentIndex) / questions.length) * 100;

  // Timer Circle config
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const timeElapsed = initialTime - timeLeft;
  
  // FIXED: Logic to make it COUNT DOWN (Start full, End empty)
  // Offset 0 = Full Line
  // Offset Circumference = Empty Line
  const strokeDashoffset = (timeElapsed / initialTime) * circumference;
  
  const isUrgent = timeLeft <= 10;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Saving Overlay */}
      {isSaving && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
            <div className="relative">
                <Loader2 size={64} className="text-indigo-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Save size={24} className="text-indigo-600" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-indigo-900 mt-6 animate-pulse">جاري حفظ نتيجتك...</h2>
            <p className="text-gray-500 mt-2">وتحديث قائمة الأبطال</p>
        </div>
      )}

      {/* Top Bar */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-8 px-2 md:px-4 gap-2">
        
        {/* Home Button (Start/Right in RTL) */}
        <button 
            onClick={onExit}
            className="bg-white px-4 py-3 rounded-full shadow-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all hover:scale-105 flex items-center gap-2"
            title="العودة للقائمة الرئيسية"
        >
            <Home size={20} />
            <span className="font-bold text-sm hidden sm:inline">العودة للقائمة الرئيسية</span>
            <span className="font-bold text-sm sm:hidden">خروج</span>
        </button>

        {/* Visual Countdown Timer (Center) */}
        <div className={`relative flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg flex-shrink-0 ${isUrgent && !isTimeUp ? 'animate-pulse ring-4 ring-red-200' : ''}`}>
             <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 60 60">
                <circle
                  cx="30"
                  cy="30"
                  r={radius}
                  stroke="#e2e8f0"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="30"
                  cy="30"
                  r={radius}
                  stroke={isUrgent ? "#ef4444" : "#6366f1"}
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-linear"
                />
             </svg>
             <div className={`absolute flex flex-col items-center justify-center ${isUrgent ? 'text-red-600' : 'text-indigo-600'}`}>
                 <Timer size={14} className="mb-0.5 opacity-80" />
                 <span className="text-sm font-bold font-mono tracking-tighter">{formatTime(timeLeft)}</span>
             </div>
        </div>

        {/* Question Counter (End/Left in RTL) */}
        <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-full shadow-md text-gray-600 font-medium h-fit text-lg">
          <span className="hidden sm:inline">السؤال</span> <span className="text-indigo-600 font-bold">{currentIndex + 1}</span> <span className="text-gray-400">/</span> {questions.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-2xl h-3 bg-gray-200 rounded-full mb-8 overflow-hidden">
        <div 
          className="h-full bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl p-8 md:p-12 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <div className="text-center mb-10">
          <div className="text-6xl md:text-8xl font-black text-gray-800 tracking-wider flex items-center justify-center gap-4 font-mono">
            <span>{currentQuestion.num1}</span>
            <span className="text-indigo-600">{getOperationSymbol(currentQuestion.operation)}</span>
            <span>{currentQuestion.num2}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="number"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="؟"
                    // FIXED: Use readOnly instead of disabled to prevent keyboard jumping on mobile
                    readOnly={isTimeUp || feedback === 'correct' || (feedback === 'incorrect' && attempts > 1) || isSaving}
                    className={`w-full text-center text-4xl font-bold py-4 rounded-2xl border-4 outline-none transition-all
                        ${feedback === 'correct' ? 'border-green-500 bg-green-50 text-green-700' : 
                          feedback === 'incorrect' ? 'border-red-400 bg-red-50 text-red-700 placeholder-red-300' : 
                          'border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-gray-800'}
                        ${(isTimeUp || isSaving) ? 'opacity-50' : ''}  
                    `}
                />
                
                {/* Visual Feedback Icons */}
                {feedback === 'correct' && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 animate-pop-in">
                        <CheckCircle2 size={36} strokeWidth={3} />
                    </div>
                )}
                {feedback === 'incorrect' && (
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 animate-pop-in">
                        <XCircle size={36} strokeWidth={3} />
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="h-8 text-center">
                {feedback === 'correct' && (
                    <div className="text-green-600 font-bold flex items-center justify-center gap-2 animate-bounce">
                        <CheckCircle2 /> إجابتك صحيحة!
                    </div>
                )}
                {feedback === 'incorrect' && (
                    <div className="text-red-600 font-bold flex items-center justify-center gap-2 animate-shake">
                        <XCircle /> {attempts === 1 ? 'إجابتك غير صحيحة، حاول مرة أخرى' : 'إجابتك غير صحيحة'}
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={feedback === 'correct' || isTimeUp || isSaving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    تحقق <Send size={20} className="rtl:rotate-180" />
                </button>
                
                {attempts > 0 && feedback !== 'correct' && (
                    <button
                        type="button"
                        onClick={handleSkip}
                        disabled={isTimeUp || isSaving}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xl font-bold py-4 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        تخطي <SkipForward size={20} className="rtl:rotate-180" />
                    </button>
                )}
            </div>
        </form>
      </div>

      {/* Time Up Modal */}
      {isTimeUp && !isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-pop-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-red-100">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 animate-pulse">
              <AlarmClockOff size={40} />
            </div>
            <h2 className="text-3xl font-black text-gray-800 mb-2">اوه انتهى الوقت!</h2>
            <p className="text-gray-500 mb-8 text-lg">لا تقلق، يمكنك المحاولة مرة أخرى.</p>
            <button
              onClick={handleTimeUpRestart}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} /> حاول مرة أخرى
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;