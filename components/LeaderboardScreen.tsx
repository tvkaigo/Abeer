import React, { useEffect, useState } from 'react';
import { Home, Trophy, Medal, Award, Crown } from 'lucide-react';
import { getLeaderboard } from '../services/statsService';
import { LeaderboardEntry } from '../types';

interface LeaderboardScreenProps {
  onBack: () => void;
  currentUser?: string;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, currentUser }) => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Load fresh data every time screen opens
    setLeaders(getLeaderboard());
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown size={24} className="text-yellow-500" fill="currentColor" />;
      case 1: return <Medal size={24} className="text-gray-400" fill="currentColor" />;
      case 2: return <Medal size={24} className="text-amber-700" fill="currentColor" />;
      default: return <span className="font-bold text-gray-500 w-6 text-center">{index + 1}</span>;
    }
  };

  const getRowStyle = (index: number, isCurrentUser: boolean) => {
    let base = "border-b border-gray-100 hover:bg-indigo-50 transition-colors";
    if (isCurrentUser) base += " bg-indigo-50 border-indigo-200";
    
    if (index === 0) return `${base} bg-yellow-50/50`;
    if (index === 1) return `${base} bg-gray-50/50`;
    if (index === 2) return `${base} bg-orange-50/50`;
    
    return base;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl animate-pop-in">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="bg-white p-3 rounded-full shadow-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
          >
            <Home size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="bg-yellow-100 p-3 rounded-full mb-2 text-yellow-600 shadow-sm">
                <Trophy size={32} />
            </div>
            <h1 className="text-2xl font-black text-gray-800">قائمة الأبطال</h1>
            <p className="text-gray-500 text-sm">ترتيب جميع اللاعبين</p>
          </div>
          
          <div className="w-10"></div> {/* Spacer */}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-indigo-600 text-white">
                        <tr>
                            <th className="py-4 px-4 text-center w-16">#</th>
                            <th className="py-4 px-4 text-right">اللاعب</th>
                            <th className="py-4 px-4 text-center">المستوى</th>
                            <th className="py-4 px-4 text-center">إجابات صحيحة</th>
                            <th className="py-4 px-4 text-center">الجوائز</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaders.map((player, index) => {
                            const isCurrentUser = player.name === currentUser;
                            return (
                                <tr key={index} className={getRowStyle(index, isCurrentUser)}>
                                    <td className="py-4 px-4 flex justify-center items-center">
                                        {getRankIcon(index)}
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${isCurrentUser ? 'text-indigo-700' : 'text-gray-800'}`}>
                                                {player.name} {isCurrentUser && '(أنت)'}
                                            </span>
                                            <span className="text-xs text-gray-400">آخر ظهور: {player.lastActive}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className="bg-gray-100 text-gray-600 py-1 px-3 rounded-full text-sm font-medium">
                                            {player.grade}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-center font-bold text-lg text-indigo-900">
                                        {player.totalCorrect}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-yellow-500 font-bold">
                                            <Award size={18} fill="currentColor" />
                                            <span>{player.badgesCount}</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {leaders.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-500">
                                    لا يوجد لاعبين حتى الآن.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Motivation */}
        <div className="mt-6 text-center text-gray-500 text-sm">
            يتم تحديث القائمة تلقائياً بعد كل لعبة.
        </div>

      </div>
    </div>
  );
};

export default LeaderboardScreen;