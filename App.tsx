
import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import UserEntryModal from './components/UserEntryModal';
import { AppState, GameConfig, GameResult, Question, Difficulty, Operation } from './types';
import { generateQuestions } from './services/mathService';
import { updateUserStats, registerNewPlayer, loadStats } from './services/statsService';
import { Loader2, CloudDownload } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.WELCOME);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [currentConfig, setCurrentConfig] = useState<GameConfig | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [currentTotalScore, setCurrentTotalScore] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(120);

  const [userData, setUserData] = useState<{name: string} | null>(() => {
    try {
      const saved = localStorage.getItem('mathGeniusUserData');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    const syncUserProfile = async () => {
      if (userData?.name) {
        setIsSyncingProfile(true);
        try {
          const stats = await loadStats(userData.name);
          setCurrentTotalScore(stats.totalCorrect);
          await registerNewPlayer(userData.name);
        } catch (err) {
          console.error("Profile sync error", err);
        } finally {
          setTimeout(() => setIsSyncingProfile(false), 800);
        }
      }
    };
    syncUserProfile();
  }, [userData?.name]); 

  useEffect(() => {
    const savedScore = localStorage.getItem('mathGeniusHighScore');
    if (savedScore) setHighScore(parseInt(savedScore, 10));
  }, []);

  const handleUserEntry = async (name: string) => {
    const data = { name };
    setUserData(data);
    localStorage.setItem('mathGeniusUserData', JSON.stringify(data));
  };

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
    
    if (userData) {
        try {
            const stats = await updateUserStats(result, userData.name);
            setCurrentTotalScore(stats.totalCorrect);
        } catch (e) { console.error("Cloud update error", e); }
    }

    if (result.score > highScore) {
      setHighScore(result.score);
      setIsNewHighScore(true);
      localStorage.setItem('mathGeniusHighScore', result.score.toString());
    } else {
      setIsNewHighScore(false);
    }
    
    setIsSaving(false);
    setAppState(AppState.RESULTS);
  };

  const handleRestart = () => {
    setAppState(AppState.WELCOME);
    setGameResult(null);
    setIsNewHighScore(false);
  };

  if (isSyncingProfile) {
    return (
        <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl flex flex-col items-center animate-pop-in">
                <CloudDownload size={64} className="text-indigo-600 mb-4 animate-bounce" />
                <h2 className="text-xl font-bold text-indigo-900 mb-2 text-center">جاري استعادة بياناتك...</h2>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    <span>نبحث عن نقاطك في السحابة</span>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 font-sans">
      {appState === AppState.WELCOME && (
        <>
          <WelcomeScreen 
            onStart={handleStartGame} 
            onQuickStart={handleQuickStart}
            onShowAnalytics={() => setAppState(AppState.ANALYTICS)}
            onShowLeaderboard={() => setAppState(AppState.LEADERBOARD)}
            highScore={highScore}
            userName={userData?.name}
            currentTotalScore={currentTotalScore}
          />
          {!userData && <UserEntryModal onSubmit={handleUserEntry} />}
        </>
      )}
      
      {appState === AppState.ANALYTICS && <AnalyticsScreen onBack={handleRestart} userName={userData?.name} />}
      {appState === AppState.LEADERBOARD && <LeaderboardScreen onBack={handleRestart} currentUser={userData?.name} />}
      {appState === AppState.PLAYING && <GameScreen questions={questions} onEndGame={handleEndGame} onExit={handleRestart} initialTime={timeLimit} isSaving={isSaving} />}
      {appState === AppState.RESULTS && gameResult && currentConfig && (
        <ResultScreen 
          result={gameResult} 
          difficulty={currentConfig.difficulty}
          onRestart={handleRestart} 
          isNewHighScore={isNewHighScore}
          userName={userData?.name}
          totalCumulativeScore={currentTotalScore}
        />
      )}
    </div>
  );
};

export default App;
