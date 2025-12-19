
import React, { useState, useEffect, useRef } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import UserEntryModal from './components/UserEntryModal';
import { AppState, GameConfig, GameResult, Question, Difficulty, Operation, UserStats, UserRole, TeacherProfile } from './types';
import { generateQuestions } from './services/mathService';
import { updateUserStats, auth, createOrUpdatePlayerProfile, subscribeToUserStats, checkIsSignInLink, completeSignInWithLink, loadStats, isTeacherByEmail } from './services/statsService';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const isLinkSigningIn = useRef(false);
  
  useEffect(() => {
    const handleLinkSignIn = async () => {
        if (checkIsSignInLink()) {
            try {
                isLinkSigningIn.current = true;
                setIsAuthChecking(true);
                await completeSignInWithLink();
                // تنظيف الرابط بعد النجاح للعودة للمسار الرئيسي
                window.history.replaceState({}, document.title, window.location.origin + '/');
            } catch (error: any) {
                console.error("خطأ في تسجيل الدخول عبر الرابط:", error);
                alert(error.message || "الرابط غير صالح أو حدث خطأ في الصلاحيات.");
            } finally {
                isLinkSigningIn.current = false;
                setIsAuthChecking(false);
            }
        } else {
          setIsAuthChecking(false);
        }
    };
    handleLinkSignIn();
  }, []);

  useEffect(() => {
    let userSubUnsubscribe: () => void = () => {};
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isLinkSigningIn.current) return;

      setCurrentUser(user);
      if (user) {
        // طباعة UID المطلوبة للتحقق
        console.log("UID:", user.uid);

        const existingProfile = await loadStats(user.uid);
        
        if (!existingProfile) {
            const isTeacher = await isTeacherByEmail(user.email || '');
            if (!isTeacher) {
                // طالب جديد
                await createOrUpdatePlayerProfile(user.uid, user.email || '', user.displayName || '');
            }
        }
        
        userSubUnsubscribe = subscribeToUserStats(user.uid, (data) => {
          setCurrentUserData(data);
        });
      } else {
        setCurrentUserData(null);
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
    setQuestions(generateQuestions(config.difficulty, config.operation));
    setAppState(AppState.PLAYING);
  };

  const handleQuickStart = () => {
    const config = { difficulty: Difficulty.BEGINNER, operation: Operation.MIXED };
    setCurrentConfig(config);
    setQuestions(generateQuestions(config.difficulty, config.operation, 5));
    setAppState(AppState.PLAYING);
  };

  const handleEndGame = async (result: GameResult) => {
    setIsSaving(true);
    setGameResult(result);
    if (currentUser && currentUserData?.role === UserRole.STUDENT) {
        await updateUserStats(result, currentUser.uid);
    }
    setIsSaving(false);
    setAppState(AppState.RESULTS);
  };

  const handleRestart = () => setAppState(AppState.WELCOME);

  if (isAuthChecking) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-50 font-bold text-indigo-600 gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      جاري التحقق من الهوية...
    </div>
  );

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
                    userName={currentUserData?.displayName || currentUser.displayName || ''}
                    currentTotalScore={currentUserData?.role === UserRole.STUDENT ? (currentUserData as UserStats).totalCorrect : 0}
                    role={currentUserData?.role}
                    teacherId={currentUserData?.role === UserRole.STUDENT ? (currentUserData as UserStats).teacherId : (currentUserData?.role === UserRole.TEACHER ? (currentUserData as TeacherProfile).teacherId : undefined)}
                />
            )}
            {appState === AppState.ANALYTICS && <AnalyticsScreen onBack={handleRestart} userName={currentUser.uid} />}
            {appState === AppState.LEADERBOARD && <LeaderboardScreen onBack={handleRestart} currentUser={currentUser.uid} />}
            {appState === AppState.PLAYING && <GameScreen questions={questions} onEndGame={handleEndGame} onExit={handleRestart} isSaving={isSaving} />}
            {appState === AppState.RESULTS && gameResult && currentConfig && (
                <ResultScreen 
                    result={gameResult} 
                    difficulty={currentConfig.difficulty}
                    onRestart={handleRestart} 
                    isNewHighScore={isNewHighScore}
                    userName={currentUserData?.displayName || ''}
                    totalCumulativeScore={currentUserData?.role === UserRole.STUDENT ? (currentUserData as UserStats).totalCorrect : 0}
                />
            )}
        </>
      )}
    </div>
  );
};

export default App;
