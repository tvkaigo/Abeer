import React, { useEffect, useState } from 'react';
import { Home, Trophy, Medal, Crown, Sparkles, Loader2 } from 'lucide-react';
import { getLeaderboard, getBadgeStatus } from '../services/statsService';
import { LeaderboardEntry } from '../types';

interface LeaderboardScreenProps {
  onBack: () => void;
  currentUser?: string;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, currentUser }) => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
        setIsLoading(true);
        const data = await getLeaderboard();
        setLeaders(data);
        setIsLoading(false);
    };
    fetchLeaders();
    
    // Optional: Poll for updates every 10 seconds to keep it live
    const interval = setInterval(async () => {
         const data = await getLeaderboard();
         setLeaders(data);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown size={24} className="text-yellow-500 animate-bounce" fill="currentColor" />;
      case 1: return <Medal size={24} className="text-gray-400" fill="currentColor" />;
      case 2: return <Medal size={24} className="text-amber-700" fill="currentColor" />;
      default: return <span className="font-bold text-gray-500 w-6 text-center">{index + 1}</span>;
    }
  };

  const getRowStyle = (index: number, isCurrentUser: boolean) => {
    let base = "border-b border-gray-100 hover:bg-indigo-50 transition-colors duration-300";
    if (isCurrentUser) base += " bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100 ring-inset";
    
    if (index === 0) return `${base} bg-gradient-to-r from-yellow-50 to-white`;
    if (index === 1) return `${base} bg-gradient-to-r from-gray-50 to-white`;
    if (index === 2) return `${base} bg-gradient-to-r from-orange-50 to-white`;
    
    return base;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl animate-pop-in">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="bg-white p-3 rounded-full shadow-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all hover:scale-110"
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
            <h1 className="text-2xl font-black text-gray-800">قائمة الأبطال</h1>
            <p className="text-gray-500 text-sm">ترتيب جميع اللاعبين (عالمياً)</p>
          </div>
          
          <div className="w-10"></div> {/* Spacer */}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden min-h-[300px] relative">
            {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                    <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">جاري تحديث النتائج...</p>
                </div>
            ) : null}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-indigo-600 text-white">
                        <tr>
                            <th className="py-5 px-4 text-center w-16">#</th>
                            <th className="py-5 px-4 text-right">اللاعب</th>
                            <th className="py-5 px-4 text-center">مجموع النقاط</th>
                            <th className="py-5 px-4 text-center">الجوائز المكتسبة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaders.map((player, index) => {
                            const isCurrentUser = player.name === currentUser;
                            // Calculate badges dynamically based on current score
                            const unlockedBadges = getBadgeStatus(player.totalCorrect).filter(b => b.unlocked);

                            return (
                                <tr key={index} className={getRowStyle(index, isCurrentUser)}>
                                    <td className="py-4 px-4 flex justify-center items-center h-full">
                                        {getRankIcon(index)}
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex flex-col">
                                            <span className={`font-bold text-lg ${isCurrentUser ? 'text-indigo-700' : 'text-gray-800'}`}>
                                                {player.name} {isCurrentUser && <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full mr-1">أنت</span>}
                                            </span>
                                            <span className="text-xs text-gray-400">آخر ظهور: {player.lastActive}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <div className="inline-block bg-indigo-50 px-4 py-1 rounded-xl">
                                            <span className="font-black text-xl text-indigo-600">
                                                {player.totalCorrect}
                                            </span>
                                            <span className="text-xs text-indigo-400 block -mt-1">نقطة</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <div className="flex items-center justify-center gap-2 flex-wrap max-w-[200px] mx-auto">
                                            {unlockedBadges.length > 0 ? (
                                                unlockedBadges.map((badge) => (
                                                    <div key={badge.id} className="group relative cursor-help">
                                                        <span className="text-2xl filter drop-shadow-sm hover:scale-125 transition-transform block" role="img" aria-label={badge.name}>
                                                            {badge.icon}
                                                        </span>
                                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                            {badge.name}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-gray-300">لا يوجد جوائز بعد</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {leaders.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                                    <Trophy size={48} className="text-gray-200" />
                                    <p>لا يوجد لاعبين في القائمة حتى الآن.</p>
                                    <p className="text-sm text-gray-400">كن أول من يلعب!</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Motivation */}
        <div className="mt-8 text-center bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm">
            <p className="text-indigo-800 font-medium">
                💡 يتم تحديث النتائج تلقائياً من جميع الأجهزة.
            </p>
        </div>

      </div>
    </div>
  );
};

export default LeaderboardScreen;