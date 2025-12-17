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
  
  // Stores the cumulative score fetched from cloud/local storage
  const [currentTotalScore, setCurrentTotalScore] = useState<number>(0);
  
  // Track custom time limit (e.g., 60s for Quick Test)
  const [timeLimit, setTimeLimit] = useState<number>(120);

  // Initialize user data from localStorage if available
  const [userData, setUserData] = useState<{name: string, grade: string} | null>(() => {
    try {
      const saved = localStorage.getItem('mathGeniusUserData');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse user data", e);
      return null;
    }
  });

  // Synchronization Effect: Runs on mount AND when user logs in
  // This ensures that if I played on Device A, then open Device B, 
  // Device B fetches my latest stats immediately.
  useEffect(() => {
    const syncUserProfile = async () => {
      if (userData?.name) {
        try {
          // loadStats handles the merge logic (Cloud vs Local)
          const stats = await loadStats(userData.name);
          setCurrentTotalScore(stats.totalCorrect);
          
          // Also ensure they are registered/updated in the background
          registerNewPlayer(userData.name, userData.grade);
        } catch (err) {
          console.error("Background profile sync failed:", err);
        }
      }
    };
    
    syncUserProfile();
  }, [userData]); 

  useEffect(() => {
    const savedScore = localStorage.getItem('mathGeniusHighScore');
    if (savedScore) {
      setHighScore(parseInt(savedScore, 10));
    }
  }, []);

  const handleUserEntry = async (name: string) => {
    const grade = "-";
    const data = { name, grade };
    
    // 1. Set Local Data Immediately
    setUserData(data);
    localStorage.setItem('mathGeniusUserData', JSON.stringify(data));
    
    // 2. We don't need to manually call sync here because the useEffect [userData] 
    // will trigger immediately after setUserData, performing the cloud fetch.
  };

  const handleStartGame = (config: GameConfig) => {
    setCurrentConfig(config);
    // Standard game: 2 minutes
    setTimeLimit(120);
    const newQuestions = generateQuestions(config.difficulty, config.operation);
    setQuestions(newQuestions);
    setAppState(AppState.PLAYING);
  };

  const handleQuickStart = () => {
    // Quick Test: Beginner, Mixed Operations, 5 Questions, 60 seconds
    const difficulty = Difficulty.BEGINNER;
    const operation = Operation.MIXED;
    const config = { difficulty, operation };
    
    setCurrentConfig(config);
    setTimeLimit(60); // 1 Minute only
    
    const newQuestions = generateQuestions(difficulty, operation, 5);
    setQuestions(newQuestions);
    setAppState(AppState.PLAYING);
  };

  const handleEndGame = async (result: GameResult) => {
    setIsSaving(true);
    setGameResult(result);
    
    // Update Persistent Stats (Cloud & Analytics) - only if user is logged in
    if (userData) {
        try {
            const stats = await updateUserStats(result, userData.name);
            setCurrentTotalScore(stats.totalCorrect);
        } catch (e) {
            console.error("Failed to update cloud stats", e);
        }
    }

    // Update Local Session High Score (only for standard 10 question games usually, but we can track all or segment)
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
    setQuestions([]);
    setIsNewHighScore(false);
  };

  const handleShowAnalytics = () => {
    setAppState(AppState.ANALYTICS);
  };

  const handleShowLeaderboard = () => {
    setAppState(AppState.LEADERBOARD);
  };

  const handleBackToWelcome = () => {
    setAppState(AppState.WELCOME);
  };

  return (
    <div className="min-h-screen text-slate-800 font-sans">
      {appState === AppState.WELCOME && (
        <>
          <WelcomeScreen 
            onStart={handleStartGame} 
            onQuickStart={handleQuickStart}
            onShowAnalytics={handleShowAnalytics}
            onShowLeaderboard={handleShowLeaderboard}
            highScore={highScore}
            userName={userData?.name}
            currentTotalScore={currentTotalScore}
          />
          {!userData && <UserEntryModal onSubmit={handleUserEntry} />}
        </>
      )}
      
      {appState === AppState.ANALYTICS && (
        <AnalyticsScreen 
          onBack={handleBackToWelcome}
          userName={userData?.name}
        />
      )}

      {appState === AppState.LEADERBOARD && (
        <LeaderboardScreen 
          onBack={handleBackToWelcome}
          currentUser={userData?.name}
        />
      )}

      {appState === AppState.PLAYING && (
        <GameScreen 
          questions={questions} 
          onEndGame={handleEndGame}
          onExit={handleRestart}
          initialTime={timeLimit}
          isSaving={isSaving}
        />
      )}

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