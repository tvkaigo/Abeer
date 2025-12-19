import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import UserEntryModal from './components/UserEntryModal';
import { AppState, GameConfig, GameResult, Question, Difficulty, Operation, UserStats } from './types';
import { generateQuestions } from './services/mathService';
import { updateUserStats, loadStats, auth, createOrUpdatePlayerProfile, subscribeToUserStats } from './services/statsService';
import { onAuthStateChanged, User } from 'firebase/auth';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.WELCOME);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [currentConfig, setCurrentConfig] = useState<GameConfig | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserStats, setCurrentUserStats] = useState<UserStats | null>(null);
  const [timeLimit, setTimeLimit] = useState<number>(120);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Monitor Auth State and User Data Subscription
  useEffect(() => {
    let userSubUnsubscribe: () => void = () => {};

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Sync/Create profile in Firestore
        await createOrUpdatePlayerProfile(user.uid, user.email || '', user.displayName || 'لاعب');
        
        // Subscribe to real-time updates for this user from /Users/{uid}
        userSubUnsubscribe = subscribeToUserStats(user.uid, (stats) => {
          setCurrentUserStats(stats);
        });
      } else {
        setCurrentUserStats(null);
        setHighScore(0);
        userSubUnsubscribe();
      }
      setIsAuthChecking(false);
    });

    return () => {
      authUnsubscribe();
      userSubUnsubscribe();
    };
  }, []);

  const handleStartGame = (config: GameConfig) => {
    setCurrentConfig(config);
    setTimeLimit(120);
    setQuestions(generateQuestions(config.difficulty, config.operation));
    setAppState(AppState.PLAYING);
  };

  const handleQuickStart = () => {
    const config = { difficulty: Difficulty.BEGINNER, operation: Operation.MIXED };
    setCurrentConfig(config);
    setTimeLimit(60);
    setQuestions(generateQuestions(config.difficulty, config.operation, 5));
    setAppState(AppState.PLAYING);
  };

  const handleEndGame = async (result: GameResult) => {
    setIsSaving(true);
    setGameResult(result);
    
    try {
        if (currentUser) {
            // يتم حفظ وتحديث كافة الحقول في الفايربيس هنا مباشرة بعد اللعب
            await updateUserStats(result, currentUser.uid);
        }

        // Track session high score
        if (result.score > highScore) {
            setHighScore(result.score);
            setIsNewHighScore(true);
        } else {
            setIsNewHighScore(false);
        }
    } catch (e) {
        console.error("Save failed", e);
    } finally {
        setTimeout(() => {
            setIsSaving(false);
            setAppState(AppState.RESULTS);
        }, 300);
    }
  };

  const handleRestart = () => {
    setAppState(AppState.WELCOME);
    setGameResult(null);
    setIsNewHighScore(false);
  };

  if (isAuthChecking) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-50">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-indigo-900 font-bold">جاري التأكد من الحساب...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 font-sans">
      {!currentUser && <UserEntryModal onSuccess={() => {}} />}
      
      {currentUser && (
        <>
            {appState === AppState.WELCOME && (
                <WelcomeScreen 
                    onStart={handleStartGame} 
                    onQuickStart={handleQuickStart}
                    onShowAnalytics={() => setAppState(AppState.ANALYTICS)}
                    onShowLeaderboard={() => setAppState(AppState.LEADERBOARD)}
                    highScore={highScore}
                    userName={currentUserStats?.displayName || currentUser.displayName || currentUser.email || ''}
                    currentTotalScore={currentUserStats?.totalCorrect || 0}
                />
            )}
            
            {appState === AppState.ANALYTICS && <AnalyticsScreen onBack={handleRestart} userName={currentUser.uid} />}
            {appState === AppState.LEADERBOARD && <LeaderboardScreen onBack={handleRestart} currentUser={currentUser.uid} />}
            {appState === AppState.PLAYING && <GameScreen questions={questions} onEndGame={handleEndGame} onExit={handleRestart} initialTime={timeLimit} isSaving={isSaving} />}
            {appState === AppState.RESULTS && gameResult && currentConfig && (
                <ResultScreen 
                    result={gameResult} 
                    difficulty={currentConfig.difficulty}
                    onRestart={handleRestart} 
                    isNewHighScore={isNewHighScore}
                    userName={currentUserStats?.displayName || currentUser.displayName || currentUser.email || ''}
                    totalCumulativeScore={currentUserStats?.totalCorrect || 0}
                />
            )}
        </>
      )}
    </div>
  );
};

export default App;