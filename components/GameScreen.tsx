import React, { useState, useEffect, useRef } from 'react';
import { Question, GameResult } from '../types';
import { getOperationSymbol } from '../services/mathService';
import { Timer, SkipForward, Send, CheckCircle2, XCircle, RotateCcw, AlarmClockOff, Home } from 'lucide-react';
import { playCorrect, playIncorrect, playTick, playCompletion } from '../services/soundService';

interface GameScreenProps {
  questions: Question[];
  onEndGame: (result: GameResult) => void;
  onExit: () => void;
}

const TOTAL_TIME_SECONDS = 2 * 60; // 2 minutes

const GameScreen: React.FC<GameScreenProps> = ({ questions, onEndGame, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_SECONDS);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [history, setHistory] = useState<Question[]>([]);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (inputRef.current && !isTimeUp) {
      inputRef.current.focus();
    }
  }, [currentIndex, attempts, isTimeUp]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!isTimeUp) {
        setIsTimeUp(true);
        playCompletion(false);
      }
      return;
    }
    
    if (isTimeUp) return; // Stop timer if time is up state is active

    const timer = setInterval(() => {
      // Play tick sound (urgent if last 10 seconds)
      playTick(timeLeft <= 10);
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isTimeUp]);

  const finishGame = (finalHistory?: Question[]) => {
    // Calculate final score based on history
    const currentHistory = finalHistory || history;
    const correctCount = currentHistory.filter(q => q.isCorrect).length;
    
    // Play completion sound based on score >= 4 (Good or better)
    playCompletion(correctCount >= 4);

    onEndGame({
      score: correctCount,
      totalQuestions: 10,
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
    // Play sound for skip? Using incorrect for consistency
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
    setTimeLeft(TOTAL_TIME_SECONDS);
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
  const timeElapsed = TOTAL_TIME_SECONDS - timeLeft;
  // Fills up as time runs out
  const strokeDashoffset = circumference - (timeElapsed / TOTAL_TIME_SECONDS) * circumference;
  const isUrgent = timeLeft <= 10;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Top Bar */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-8 px-4">
        
        {/* Home Button (Start/Right in RTL) */}
        <button 
            onClick={onExit}
            className="bg-white p-3 rounded-full shadow-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all hover:scale-105"
            title="العودة للقائمة الرئيسية"
        >
            <Home size={28} />
        </button>

        {/* Visual Countdown Timer (Center) */}
        <div className={`relative flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg ${isUrgent && !isTimeUp ? 'animate-pulse ring-4 ring-red-200' : ''}`}>
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
                    disabled={isTimeUp || feedback === 'correct' || (feedback === 'incorrect' && attempts > 1)}
                    className={`w-full text-center text-4xl font-bold py-4 rounded-2xl border-4 outline-none transition-all
                        ${feedback === 'correct' ? 'border-green-500 bg-green-50 text-green-700' : 
                          feedback === 'incorrect' ? 'border-red-400 bg-red-50 text-red-700 placeholder-red-300' : 
                          'border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-gray-800'}`}
                />
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
                    disabled={feedback === 'correct' || isTimeUp}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    تحقق <Send size={20} className="rtl:rotate-180" />
                </button>
                
                {attempts > 0 && feedback !== 'correct' && (
                    <button
                        type="button"
                        onClick={handleSkip}
                        disabled={isTimeUp}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xl font-bold py-4 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        تخطي <SkipForward size={20} className="rtl:rotate-180" />
                    </button>
                )}
            </div>
        </form>
      </div>

      {/* Time Up Modal */}
      {isTimeUp && (
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