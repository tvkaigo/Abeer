import React, { useEffect, useState, useCallback } from 'react';
import { Home, Trophy, Medal, Crown, Sparkles, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getLeaderboard, getBadgeStatus } from '../services/statsService';
import { LeaderboardEntry } from '../types';

interface LeaderboardScreenProps {
  onBack: () => void;
  currentUser?: string;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, currentUser }) => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLeaders = useCallback(async (showLoader = true) => {
    if (showLoader) setIsRefreshing(true);
    
    try {
        // Force fetch from cloud to get latest data
        const data = await getLeaderboard(true);
        setLeaders(data);
    } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
    } finally {
        setIsLoading(false);
        if (showLoader) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaders(false); // Initial load
    
    // Poll for updates every 10 seconds to keep data fresh without overwhelming
    const interval = setInterval(() => {
         fetchLeaders(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchLeaders]);

  const handleRefresh = () => {
      fetchLeaders(true);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return (
        <div className="relative inline-block">
            <Crown size={32} className="text-yellow-400 drop-shadow-sm animate-bounce" fill="currentColor" />
            <div className="absolute -top-1 -right-1 animate-pulse"><Sparkles size={12} className="text-yellow-300" /></div>
        </div>
      );
      case 1: return <Medal size={28} className="text-slate-400 drop-shadow-sm" fill="currentColor" />; // Silver
      case 2: return <Medal size={28} className="text-amber-700 drop-shadow-sm" fill="currentColor" />; // Bronze
      default: return (
        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 font-black shadow-inner mx-auto text-sm">
            {index + 1}
        </div>
      );
    }
  };

  const getRowStyle = (index: number, isCurrentUser: boolean) => {
    let base = "border-b border-gray-50 hover:bg-indigo-50/60 transition-all duration-300 group relative";
    
    if (isCurrentUser) {
        base += " bg-indigo-50/80 border-l-4 border-l-indigo-500";
    } else {
        // Subtle gradients for top 3
        if (index === 0) base += " bg-gradient-to-r from-yellow-50/60 via-white to-white";
        else if (index === 1) base += " bg-gradient-to-r from-slate-50/60 via-white to-white";
        else if (index === 2) base += " bg-gradient-to-r from-orange-50/60 via-white to-white";
        else base += " bg-white";
    }
    
    return base;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl animate-pop-in">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-2">
          <button 
            onClick={onBack}
            className="bg-white p-3 rounded-2xl shadow-sm text-gray-500 hover:text-indigo-600 hover:shadow-md transition-all hover:scale-105 active:scale-95 border border-gray-100"
          >
            <Home size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="bg-yellow-100 p-3 rounded-full mb-2 text-yellow-600 shadow-sm relative">
                <Trophy size={32} />
                <div className="absolute -top-1 -right-1">
                  <Sparkles size={16} className="text-yellow-500 animate-spin-slow" />
                </div>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">قائمة الأبطال</h1>
            <p className="text-slate-500 text-sm font-medium">الترتيب حسب مجموع الإجابات الصحيحة</p>
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`bg-white p-3 rounded-2xl shadow-sm text-indigo-600 hover:shadow-md transition-all border border-gray-100 ${isRefreshing ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
            title={isRefreshing ? "جاري التحديث..." : "تحديث القائمة"}
          >
            <RefreshCw size={24} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden min-h-[400px] relative">
            {isLoading && leaders.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 backdrop-blur-sm">
                    <Loader2 size={56} className="text-indigo-600 animate-spin mb-4" />
                    <p className="text-indigo-900 font-bold text-lg animate-pulse">جاري جلب أحدث النتائج...</p>
                </div>
            ) : null}

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md">
                            <th className="py-6 px-4 text-center w-24 font-bold text-lg opacity-95">#</th>
                            <th className="py-6 px-4 text-right font-bold text-lg opacity-95">اللاعب</th>
                            <th className="py-6 px-4 text-center font-bold text-lg opacity-95 w-48">الإجابات الصحيحة</th>
                            <th className="py-6 px-4 text-center font-bold text-lg opacity-95">الجوائز المكتسبة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {leaders.map((player, index) => {
                            const isCurrentUser = player.name === currentUser;
                            const unlockedBadges = getBadgeStatus(player.totalCorrect).filter(b => b.unlocked);

                            // Using player name as key for better reconciliation than index
                            return (
                                <tr key={player.name} className={getRowStyle(index, isCurrentUser)}>
                                    <td className="py-5 px-4 flex justify-center items-center h-full">
                                        {getRankIcon(index)}
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-xl ${isCurrentUser ? 'text-indigo-700' : 'text-slate-800'}`}>
                                                    {player.name}
                                                </span>
                                                {isCurrentUser && (
                                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                                                        أنت
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                                <span>آخر ظهور:</span>
                                                <span dir="ltr">{player.lastActive}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4 text-center">
                                        <div className="inline-flex flex-col items-center justify-center bg-indigo-50/80 px-6 py-2 rounded-2xl min-w-[100px] border border-indigo-100 shadow-sm transition-transform group-hover:scale-105">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-black text-2xl text-indigo-600 tracking-tight">
                                                    {player.totalCorrect}
                                                </span>
                                                <CheckCircle2 size={16} className="text-indigo-400" strokeWidth={2.5} />
                                            </div>
                                            <span className="text-[11px] text-indigo-400 font-bold -mt-1">إجابة صحيحة</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4 text-center">
                                        <div className="flex items-center justify-center gap-2 flex-wrap max-w-[240px] mx-auto min-h-[40px]">
                                            {unlockedBadges.length > 0 ? (
                                                unlockedBadges.map((badge) => (
                                                    <div key={badge.id} className="group/badge relative cursor-help">
                                                        <span className="text-2xl filter drop-shadow-sm hover:scale-125 transition-transform block" role="img" aria-label={badge.name}>
                                                            {badge.icon}
                                                        </span>
                                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 shadow-xl">
                                                            {badge.name}
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-gray-300 font-medium bg-gray-50 px-3 py-1 rounded-full flex items-center gap-1 border border-gray-100">
                                                    لا يوجد <span className="opacity-50">🔒</span>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {leaders.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={4} className="py-20 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="bg-gray-100 p-4 rounded-full">
                                            <Trophy size={48} className="text-gray-300" />
                                        </div>
                                        <p className="font-bold text-lg text-gray-600">القائمة فارغة حالياً</p>
                                        <p className="text-sm text-gray-400">كن أول من يسجل اسمه في لوحة الشرف!</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Footer/Motivation */}
        <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full border border-white shadow-sm text-indigo-800 font-medium text-sm">
                <Sparkles size={16} className="text-yellow-500" />
                 القائمة ترتب الأبطال حسب مجموع إجاباتهم الصحيحة المتراكمة. استمر في اللعب لتتصدر!
            </div>
        </div>

      </div>
    </div>
  );
};

export default LeaderboardScreen;