
import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import UserEntryModal from './components/UserEntryModal';
import { AppState, GameConfig, GameResult, Question, Difficulty, Operation, UserStats, UserRole, TeacherProfile } from './types';
import { generateQuestions } from './services/mathService';
import { updateUserStats, auth, createOrUpdatePlayerProfile, subscribeToUserStats } from './services/statsService';
import { onAuthStateChanged, type User } from 'firebase/auth';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.WELCOME);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [currentConfig, setCurrentConfig] = useState<GameConfig | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<UserStats | TeacherProfile | null>(null);
  const [timeLimit, setTimeLimit] = useState<number>(120);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // حالة خاصة للمعلم في حال الدخول بدون Firebase Auth (بالبريد فقط)
  const [manualTeacher, setManualTeacher] = useState<TeacherProfile | null>(null);

  useEffect(() => {
    let userSubUnsubscribe: () => void = () => {};

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      // إذا كان هناك معلم مسجل يدوياً، لا نمسح الحالة فوراً
      if (manualTeacher) return;

      setCurrentUser(user);
      if (user) {
        await createOrUpdatePlayerProfile(user.uid, user.email || '', user.displayName || '');
        
        userSubUnsubscribe = subscribeToUserStats(user.uid, (data) => {
          setCurrentUserData(data);
        });
      } else {
        setCurrentUserData(null);
        setHighScore(0);
        userSubUnsubscribe();
      }
      setIsAuthChecking(false);
    });

    return () => {
      authUnsubscribe();
      userSubUnsubscribe();
    };
  }, [manualTeacher]);

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
        if (currentUser && currentUserData?.role === UserRole.STUDENT) {
            await updateUserStats(result, currentUser.uid);
        }

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

  const handleTeacherLogin = (teacher: TeacherProfile) => {
      setManualTeacher(teacher);
      setCurrentUserData(teacher);
      setIsAuthChecking(false);
  };

  const handleLogout = () => {
      setManualTeacher(null);
      setCurrentUserData(null);
      setCurrentUser(null);
      auth.signOut();
  };

  if (isAuthChecking && !manualTeacher) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-50">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-indigo-900 font-bold">جاري التحميل...</p>
        </div>
    );
  }

  // المعرف الحالي سواء كان من Firebase أو يدوي
  const effectiveUid = manualTeacher ? manualTeacher.teacherId : currentUser?.uid;

  return (
    <div className="min-h-screen text-slate-800 font-sans">
      {!effectiveUid && (
          <UserEntryModal onSuccess={(teacher) => teacher ? handleTeacherLogin(teacher) : null} />
      )}
      
      {effectiveUid && (
        <>
            {appState === AppState.WELCOME && (
                <WelcomeScreen 
                    onStart={handleStartGame} 
                    onQuickStart={handleQuickStart}
                    onShowAnalytics={() => setAppState(AppState.ANALYTICS)}
                    onShowLeaderboard={() => setAppState(AppState.LEADERBOARD)}
                    highScore={highScore}
                    userName={currentUserData?.displayName || (currentUser ? (currentUser.displayName || currentUser.email) : (manualTeacher?.displayName || manualTeacher?.email)) || ''}
                    currentTotalScore={currentUserData?.role === UserRole.STUDENT ? (currentUserData as UserStats).totalCorrect : 0}
                    role={currentUserData?.role}
                    teacherId={currentUserData?.role === UserRole.STUDENT ? (currentUserData as UserStats).teacherId : (currentUserData?.role === UserRole.TEACHER ? (currentUserData as TeacherProfile).teacherId : undefined)}
                />
            )}
            
            {appState === AppState.ANALYTICS && effectiveUid && <AnalyticsScreen onBack={handleRestart} userName={effectiveUid} />}
            {appState === AppState.LEADERBOARD && effectiveUid && <LeaderboardScreen onBack={handleRestart} currentUser={effectiveUid} />}
            {appState === AppState.PLAYING && <GameScreen questions={questions} onEndGame={handleEndGame} onExit={handleRestart} initialTime={timeLimit} isSaving={isSaving} />}
            {appState === AppState.RESULTS && gameResult && currentConfig && (
                <ResultScreen 
                    result={gameResult} 
                    difficulty={currentConfig.difficulty}
                    onRestart={handleRestart} 
                    isNewHighScore={isNewHighScore}
                    userName={currentUserData?.displayName || (currentUser ? (currentUser.displayName || currentUser.email) : (manualTeacher?.displayName || manualTeacher?.email)) || ''}
                    totalCumulativeScore={currentUserData?.role === UserRole.STUDENT ? (currentUserData as UserStats).totalCorrect : 0}
                />
            )}
        </>
      )}
    </div>
  );
};

export default App;
