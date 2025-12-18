
import React, { useEffect, useState } from 'react';
import { Home, Trophy, Medal, Crown, Sparkles, Loader2, RefreshCw, Globe2, Users, Star, Award, TrendingUp } from 'lucide-react';
import { subscribeToLeaderboard, getBadgeStatus } from '../services/statsService';
import { LeaderboardEntry } from '../types';

interface LeaderboardScreenProps {
  onBack: () => void;
  currentUser?: string;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, currentUser }) => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Subscribe to Firebase Real-time updates
    const unsubscribe = subscribeToLeaderboard((data) => {
      setLeaders(data);
      setIsLoading(false);
      setHasError(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return (
        <div className="relative inline-block">
            <Crown size={32} className="text-yellow-400 drop-shadow-sm animate-bounce" fill="currentColor" />
            <div className="absolute -top-1 -right-1 animate-pulse"><Sparkles size={12} className="text-yellow-300" /></div>
        </div>
      );
      case 1: return <Medal size={28} className="text-slate-400 drop-shadow-sm" fill="currentColor" />;
      case 2: return <Medal size={28} className="text-amber-700 drop-shadow-sm" fill="currentColor" />;
      default: return (
        <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 font-black shadow-inner mx-auto text-lg border border-gray-100">
            {index + 1}
        </div>
      );
    }
  };

  const Podium = () => {
    if (leaders.length < 1) return null;
    const top3 = leaders.slice(0, 3);
    
    return (
      <div className="flex items-end justify-center gap-2 sm:gap-6 mb-12 mt-4 px-2">
        {/* Silver - Rank 2 */}
        {top3[1] && (
          <div className="flex flex-col items-center animate-pop-in [animation-delay:200ms]">
            <div className="relative mb-2 group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden relative">
                 <span className="text-2xl font-black text-slate-500 uppercase">{top3[1].name.substring(0, 2)}</span>
                 <div className="absolute inset-0 bg-gradient-to-tr from-slate-400/20 to-transparent"></div>
              </div>
              <div className="absolute -top-3 -right-3 bg-slate-100 p-1.5 rounded-full shadow-lg border-2 border-white">
                <Medal size={20} className="text-slate-400" fill="currentColor" />
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-md px-3 py-4 rounded-t-2xl shadow-xl w-24 sm:w-32 text-center border-x border-t border-slate-100 h-24 flex flex-col justify-center">
              <div className="text-xs font-bold text-slate-400 truncate w-full">{top3[1].displayName}</div>
              <div className="text-xl font-black text-slate-700">{top3[1].totalCorrect}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">إجابة</div>
            </div>
          </div>
        )}

        {/* Gold - Rank 1 */}
        {top3[0] && (
          <div className="flex flex-col items-center animate-pop-in scale-110 relative z-10">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none">
                <Sparkles size={48} className="text-yellow-400 animate-pulse opacity-50" />
            </div>
            <div className="relative mb-2">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden">
                 <span className="text-3xl font-black text-yellow-900 uppercase">{top3[0].name.substring(0, 2)}</span>
                 <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
              <div className="absolute -top-5 -right-5 bg-yellow-400 p-2.5 rounded-full shadow-2xl border-4 border-white animate-bounce">
                <Crown size={28} className="text-yellow-900" fill="currentColor" />
              </div>
            </div>
            <div className="bg-white px-4 py-6 rounded-t-3xl shadow-2xl w-28 sm:w-40 text-center border-x border-t border-yellow-100 h-32 flex flex-col justify-center ring-4 ring-yellow-400/20">
              <div className="text-sm font-black text-yellow-700 truncate w-full mb-1">{top3[0].displayName}</div>
              <div className="text-3xl font-black text-indigo-900 leading-none">{top3[0].totalCorrect}</div>
              <div className="text-[10px] text-indigo-400 font-bold mt-1 uppercase tracking-widest">إجابة صحيحة</div>
            </div>
          </div>
        )}

        {/* Bronze - Rank 3 */}
        {top3[2] && (
          <div className="flex flex-col items-center animate-pop-in [animation-delay:400ms]">
            <div className="relative mb-2 group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                 <span className="text-2xl font-black text-amber-600 uppercase">{top3[2].name.substring(0, 2)}</span>
              </div>
              <div className="absolute -top-3 -right-3 bg-amber-50 p-1.5 rounded-full shadow-lg border-2 border-white">
                <Medal size={20} className="text-amber-700" fill="currentColor" />
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-md px-3 py-4 rounded-t-2xl shadow-xl w-24 sm:w-32 text-center border-x border-t border-amber-50 h-20 flex flex-col justify-center">
              <div className="text-xs font-bold text-amber-800 truncate w-full">{top3[2].displayName}</div>
              <div className="text-xl font-black text-amber-900">{top3[2].totalCorrect}</div>
              <div className="text-[10px] text-amber-600 font-bold uppercase">إجابة</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-gray-50 flex flex-col items-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl">
        
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="bg-white p-3.5 rounded-2xl shadow-sm text-gray-500 hover:text-indigo-600 hover:shadow-indigo-100 hover:shadow-md transition-all active:scale-95 border border-gray-100 group"
          >
            <Home size={24} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                <Trophy size={28} />
              </div>
              لوحة الأبطال
            </h1>
            <p className="text-slate-400 text-sm font-bold mt-2 flex items-center justify-center gap-2">
                <Globe2 size={14} className="animate-spin-slow text-indigo-500" />
                مزامنة فورية عبر Firebase Firestore
            </p>
          </div>
          
          <div className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100">
             <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] shadow-xl border border-indigo-50">
            <Loader2 size={64} className="text-indigo-600 animate-spin mb-4" />
            <p className="text-indigo-900 font-black text-xl animate-pulse">جاري جلب بيانات الأبطال...</p>
          </div>
        ) : (
          <>
            <Podium />
            <div className="space-y-4 mb-20">
              {leaders.map((player, index) => {
                const isCurrentUser = player.name === currentUser;
                const score = Number(player.totalCorrect || 0);
                const badges = getBadgeStatus(score).filter(b => b.unlocked);

                return (
                  <div 
                    key={player.name}
                    className={`group animate-fade-in-up [animation-delay:${index * 50}ms] flex items-center gap-4 p-5 rounded-[2rem] transition-all duration-500 border-2
                      ${isCurrentUser 
                          ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-200 text-white scale-[1.03] z-10' 
                          : 'bg-white border-white hover:border-indigo-100 hover:shadow-xl shadow-sm text-slate-700'
                      }`}
                  >
                    <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center">
                      {getRankIcon(index)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-black text-xl truncate ${isCurrentUser ? 'text-white' : 'text-slate-800'}`}>
                          {player.displayName}
                        </h3>
                        {isCurrentUser && (
                          <span className="bg-white/20 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">أنتِ</span>
                        )}
                      </div>
                      <div className={`text-xs font-bold flex items-center gap-1.5 mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                        <TrendingUp size={12} />
                        آخر نشاط: {player.lastActive}
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 px-6 border-x border-gray-100/10">
                      {badges.slice(0, 4).map(b => (
                        <div key={b.id} className="text-2xl filter drop-shadow-sm hover:scale-125 transition-transform cursor-default" title={b.name}>
                          {b.icon}
                        </div>
                      ))}
                    </div>

                    <div className="text-right min-w-[100px]">
                      <div className={`text-3xl font-black leading-none ${isCurrentUser ? 'text-white' : 'text-indigo-600'}`}>
                        {score}
                      </div>
                      <div className={`text-[10px] font-black uppercase mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-indigo-300'}`}>
                        إجابة صحيحة
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeaderboardScreen;
