
import { useState, useEffect, useRef } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import ProfileScreen from './components/ProfileScreen';
import UserEntryModal from './components/UserEntryModal';
import { AppState, GameConfig, GameResult, Question, Difficulty, Operation, UserStats, UserRole, TeacherProfile } from './types';
import { generateQuestions } from './services/mathService';
import { updateUserStats, auth, createOrUpdatePlayerProfile, subscribeToUserStats, loadStats, isTeacherByEmail } from './services/statsService';
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
  
  // استخدام useRef لتخزين دالة إلغاء الاشتراك (unsubscribe)
  const userSubRef = useRef<null | (() => void)>(null);
  
  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // إلغاء أي اشتراك قديم عند تغيير حالة تسجيل الدخول
      if (userSubRef.current) {
        userSubRef.current();
        userSubRef.current = null;
      }

      if (user) {
        setIsAuthChecking(true);
        
        try {
          // محاولة جلب البيانات الأولية فوراً
          const profile = await loadStats(user.uid);
          
          if (!profile) {
              // إذا لم يوجد بروفايل، نتحقق من حالة المعلم أولاً
              const teacherProfile = await isTeacherByEmail(user.email || '');
              if (!teacherProfile) {
                  // طالب جديد: نقوم بإنشاء ملفه
                  await createOrUpdatePlayerProfile(user.uid, user.email || '', user.displayName || '');
              }
              // سيقوم الاشتراك الحي بالباقي
          } else {
              setCurrentUserData(profile);
          }
          
          // البدء في الاشتراك الحي للبيانات لضمان التحديث اللحظي
          userSubRef.current = subscribeToUserStats(user.uid, (data) => {
            if (data) {
              setCurrentUserData(data);
              // ننتهي من حالة التحميل فقط عند وصول البيانات بنجاح من Firestore
              setIsAuthChecking(false);
            }
          });

        } catch (error) {
          console.error("Auth initialization error:", error);
          setIsAuthChecking(false);
        }
      } else {
        setCurrentUserData(null);
        setIsAuthChecking(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (userSubRef.current) {
        userSubRef.current();
      }
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
        try {
            await updateUserStats(result, currentUser.uid);
        } catch (e) {
            console.error("Failed to save stats:", e);
        }
    }
    setIsSaving(false);
    setAppState(AppState.RESULTS);
  };

  const handleRestart = () => setAppState(AppState.WELCOME);

  if (isAuthChecking) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-50 font-bold text-indigo-600 gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-xl animate-pulse">جاري تحضير فصل الأبطال...</p>
        <p className="text-xs text-indigo-400 font-medium tracking-widest">تحديث البيانات من السحابة</p>
      </div>
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
                    onShowProfile={() => setAppState(AppState.PROFILE)}
                    highScore={highScore}
                    userName={currentUserData?.displayName || currentUser.displayName || ''}
                    currentTotalScore={currentUserData?.role === UserRole.STUDENT ? (currentUserData as UserStats).totalCorrect : 0}
                    role={currentUserData?.role}
                    teacherId={currentUserData?.role === UserRole.STUDENT ? (currentUserData as UserStats).teacherId : (currentUserData?.role === UserRole.TEACHER ? (currentUserData as TeacherProfile).teacherId : undefined)}
                />
            )}
            {appState === AppState.PROFILE && (
              <ProfileScreen 
                onBack={handleRestart} 
                playerData={currentUserData} 
                userId={currentUser.uid} 
              />
            )}
            {appState === AppState.ANALYTICS && (
              <AnalyticsScreen 
                onBack={handleRestart} 
                playerData={currentUserData} 
                userId={currentUser.uid} 
              />
            )}
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
