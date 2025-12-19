
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

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.WELCOME);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [currentConfig, setCurrentConfig] = useState<GameConfig | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTotalScore, setCurrentTotalScore] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(120);

  const [userData, setUserData] = useState<{name: string} | null>(() => {
    try {
      const saved = localStorage.getItem('mathGeniusUserData');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Background sync on component mount or user change
  useEffect(() => {
    if (userData?.name) {
      loadStats(userData.name).then(stats => {
          setCurrentTotalScore(stats.totalCorrect);
      }).catch(() => {});
      registerNewPlayer(userData.name).catch(() => {});
    }
  }, [userData?.name]); 

  useEffect(() => {
    const savedScore = localStorage.getItem('mathGeniusHighScore');
    if (savedScore) setHighScore(parseInt(savedScore, 10));
  }, []);

  const handleUserEntry = (name: string) => {
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
    
    try {
        if (userData) {
            // FIRE AND FORGET: Update local immediately, let cloud happen in background
            updateUserStats(result, userData.name).then(stats => {
                setCurrentTotalScore(stats.totalCorrect);
            }).catch(() => {});
        }

        if (result.score > highScore) {
            setHighScore(result.score);
            setIsNewHighScore(true);
            localStorage.setItem('mathGeniusHighScore', result.score.toString());
        } else {
            setIsNewHighScore(false);
        }
    } catch (e) {
        console.warn("Local storage update failed", e);
    } finally {
        // Instant transition to result screen (no waiting for Firebase)
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
