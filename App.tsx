import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import UserEntryModal from './components/UserEntryModal';
import { AppState, GameConfig, GameResult, Question } from './types';
import { generateQuestions } from './services/mathService';
import { updateUserStats } from './services/statsService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.WELCOME);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [currentConfig, setCurrentConfig] = useState<GameConfig | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  
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

  const handleUserEntry = (name: string, grade: string) => {
    const data = { name, grade };
    setUserData(data);
    localStorage.setItem('mathGeniusUserData', JSON.stringify(data));
  };

  const handleStartGame = (config: GameConfig) => {
    setCurrentConfig(config);
    const newQuestions = generateQuestions(config.difficulty, config.operation);
    setQuestions(newQuestions);
    setAppState(AppState.PLAYING);
  };

  const handleEndGame = (result: GameResult) => {
    setGameResult(result);
    
    // Update Persistent Stats (Analytics)
    updateUserStats(result);

    // Update Local Session High Score
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

  const handleBackFromAnalytics = () => {
    setAppState(AppState.WELCOME);
  };

  return (
    <div className="min-h-screen text-slate-800 font-sans">
      {appState === AppState.WELCOME && (
        <>
          <WelcomeScreen 
            onStart={handleStartGame} 
            onShowAnalytics={handleShowAnalytics}
            highScore={highScore}
            userName={userData?.name}
          />
          {!userData && <UserEntryModal onSubmit={handleUserEntry} />}
        </>
      )}
      
      {appState === AppState.ANALYTICS && (
        <AnalyticsScreen 
          onBack={handleBackFromAnalytics}
        />
      )}

      {appState === AppState.PLAYING && (
        <GameScreen 
          questions={questions} 
          onEndGame={handleEndGame}
          onExit={handleRestart}
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