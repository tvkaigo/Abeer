
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
import { updateUserStats, auth, subscribeToUserStats, onAuthStateChanged, type User } from './services/statsService';

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
  
  const userSubRef = useRef<null | (() => void)>(null);
  
  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (userSubRef.current) {
        userSubRef.current();
        userSubRef.current = null;
      }

      if (user && !user.isAnonymous) {
        setIsAuthChecking(true);
        try {
          userSubRef.current = subscribeToUserStats(user.uid, (data) => {
            if (data) {
              setCurrentUserData(data);
              setHighScore(data.bestSession || 0);
              setIsAuthChecking(false);
            }
          });
        } catch (error) {
          setIsAuthChecking(false);
        }
      } else {
        setCurrentUserData(null);
        setIsAuthChecking(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (userSubRef.current) userSubRef.current();
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
    
    // التحقق من الرقم القياسي الجديد
    if (result.score > highScore) {
        setIsNewHighScore(true);
        setHighScore(result.score);
    } else {
        setIsNewHighScore(false);
    }

    if (currentUser && !currentUser.isAnonymous && currentUserData) {
        try {
            await updateUserStats(result, currentUser.uid, currentUserData.role);
        } catch (e) {
            console.error("Failed to save stats:", e);
        }
    }
    setIsSaving(false);
    setAppState(AppState.RESULTS);
  };

  const handleRestart = () => setAppState(AppState.WELCOME);

  if (isAuthChecking) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-50 font-bold text-indigo-600 gap-6 text-center p-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
      </div>
      <p className="text-xl animate-pulse">جاري تحضير فصل الأبطال...</p>
    </div>
  );

  const isRealUser = currentUser && !currentUser.isAnonymous;

  return (
    <div className="min-h-screen text-slate-800 font-sans">
      {!isRealUser && <UserEntryModal onSuccess={() => {}} />}
      {isRealUser && (
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
                    currentTotalScore={currentUserData?.totalCorrect || 0}
                    role={currentUserData?.role}
                    teacherId={currentUserData?.role === UserRole.STUDENT ? (currentUserData as UserStats).teacherId : (currentUserData?.role === UserRole.TEACHER ? (currentUserData as TeacherProfile).teacherId : undefined)}
                />
            )}
            {appState === AppState.PROFILE && <ProfileScreen onBack={handleRestart} playerData={currentUserData} userId={currentUser.uid} />}
            {appState === AppState.ANALYTICS && <AnalyticsScreen onBack={handleRestart} playerData={currentUserData} userId={currentUser.uid} />}
            {appState === AppState.LEADERBOARD && <LeaderboardScreen onBack={handleRestart} currentUser={currentUser.uid} />}
            {appState === AppState.PLAYING && <GameScreen questions={questions} onEndGame={handleEndGame} onExit={handleRestart} isSaving={isSaving} />}
            {appState === AppState.RESULTS && gameResult && currentConfig && (
                <ResultScreen 
                    result={gameResult} 
                    difficulty={currentConfig.difficulty}
                    onRestart={handleRestart} 
                    isNewHighScore={isNewHighScore}
                    userName={currentUserData?.displayName || ''}
                    totalCumulativeScore={currentUserData?.totalCorrect || 0}
                />
            )}
        </>
      )}
    </div>
  );
};

export default App;
