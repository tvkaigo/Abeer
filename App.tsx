import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import UserEntryModal from './components/UserEntryModal';
import { AppState, GameConfig, GameResult, Question, Difficulty, Operation } from './types';
import { generateQuestions } from './services/mathService';
import { updateUserStats, registerNewPlayer } from './services/statsService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.WELCOME);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [currentConfig, setCurrentConfig] = useState<GameConfig | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  
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

  useEffect(() => {
    const savedScore = localStorage.getItem('mathGeniusHighScore');
    if (savedScore) {
      setHighScore(parseInt(savedScore, 10));
    }
  }, []);

  const handleUserEntry = async (name: string) => {
    // Grade is removed from input, using default placeholder
    const grade = "-";
    const data = { name, grade };
    setUserData(data);
    localStorage.setItem('mathGeniusUserData', JSON.stringify(data));
    
    // Register player in leaderboard asynchronously
    try {
        await registerNewPlayer(name, grade);
    } catch (e) {
        console.error("Failed to register player online", e);
    }
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
    setGameResult(result);
    
    // Update Persistent Stats (Cloud & Analytics) - only if user is logged in
    if (userData) {
        try {
            await updateUserStats(result, userData.name);
        } catch (e) {
            console.error("Failed to update cloud stats", e);
        }
    }

    // Update Local Session High Score (only for standard 10 question games usually, but we can track all or segment)
    // For simplicity, we just check absolute score, though getting 5/5 is less than 10/10.
    // If the game has fewer questions than the current highscore, it's impossible to beat it if highscore is > 5.
    if (result.score > highScore) {
      setHighScore(result.score);
      setIsNewHighScore(true);
      localStorage.setItem('mathGeniusHighScore', result.score.toString());
    } else {
      setIsNewHighScore(false);
    }
    
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
        />
      )}

      {appState === AppState.RESULTS && gameResult && currentConfig && (
        <ResultScreen 
          result={gameResult} 
          difficulty={currentConfig.difficulty}
          onRestart={handleRestart} 
          isNewHighScore={isNewHighScore}
          userName={userData?.name}
        />
      )}
    </div>
  );
};

export default App;