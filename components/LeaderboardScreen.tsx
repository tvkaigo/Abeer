
import React, { useEffect, useState } from 'react';
import { Home, Trophy, Medal, Crown, Sparkles, Loader2, Globe2, TrendingUp, CloudOff, Info } from 'lucide-react';
import { subscribeToLeaderboard, getBadgeDefinitions, isCloudEnabled } from '../services/statsService';
import { LeaderboardEntry } from '../types';

interface LeaderboardScreenProps {
  onBack: () => void;
  currentUser?: string;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, currentUser }) => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard((data) => {
      setLeaders(data);
      setIsLoading(false);
      setOffline(!isCloudEnabled());
    });
    return () => unsubscribe();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return (
        <div className="relative inline-block">
            <Crown size={36} className="text-yellow-400 drop-shadow-md animate-bounce" fill="currentColor" />
            <div className="absolute -top-1 -right-1 animate-pulse"><Sparkles size={14} className="text-yellow-200" /></div>
        </div>
      );
      case 1: return <Medal size={30} className="text-slate-400 drop-shadow-sm" fill="currentColor" />;
      case 2: return <Medal size={30} className="text-amber-700 drop-shadow-sm" fill="currentColor" />;
      default: return (
        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 font-black shadow-inner mx-auto text-lg border border-gray-50">
            {index + 1}
        </div>
      );
    }
  };

  const Podium = () => {
    if (leaders.length < 1) return null;
    // We only show podium if we have at least 1 player
    const top3 = leaders.slice(0, 3);
    
    return (
      <div className="flex items-end justify-center gap-3 sm:gap-8 mb-16 mt-8 px-2">
        {/* Silver Rank */}
        {top3[1] && (
          <div className="flex flex-col items-center animate-fade-in-up [animation-delay:200ms]">
            <div className="relative mb-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden ring-4 ring-slate-100/30">
                 <span className="text-2xl font-black text-slate-400 uppercase">{top3[1].name.substring(0, 2)}</span>
              </div>
              <div className="absolute -top-3 -right-3 bg-slate-400 p-1.5 rounded-full shadow-lg border-2 border-white text-white">
                <Medal size={18} fill="currentColor" />
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-md px-4 py-4 rounded-t-3xl shadow-lg w-24 sm:w-36 text-center border-x border-t border-slate-100 h-24 flex flex-col justify-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">المركز الثاني</div>
              <div className="text-xs font-black text-slate-700 truncate w-full mb-1">{top3[1].displayName}</div>
              <div className="text-xl font-black text-indigo-600">{top3[1].totalCorrect}</div>
            </div>
          </div>
        )}

        {/* Gold Rank */}
        {top3[0] && (
          <div className="flex flex-col items-center animate-pop-in relative z-10">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                <Sparkles size={40} className="text-yellow-400 animate-pulse opacity-60" />
            </div>
            <div className="relative mb-4 scale-110">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden ring-8 ring-yellow-400/20">
                 <span className="text-3xl font-black text-yellow-900 uppercase">{top3[0].name.substring(0, 2)}</span>
              </div>
              <div className="absolute -top-6 -right-6 bg-yellow-400 p-2.5 rounded-full shadow-2xl border-4 border-white animate-bounce text-yellow-900">
                <Crown size={32} fill="currentColor" />
              </div>
            </div>
            <div className="bg-white px-5 py-6 rounded-t-[2.5rem] shadow-2xl w-32 sm:w-48 text-center border-x border-t border-yellow-100 h-36 flex flex-col justify-center ring-4 ring-yellow-400/10">
              <div className="text-[10px] font-bold text-yellow-600 uppercase mb-1 tracking-widest">البطل الذهبي</div>
              <div className="text-base font-black text-indigo-900 truncate w-full mb-1">{top3[0].displayName}</div>
              <div className="text-3xl font-black text-yellow-600 leading-none">{top3[0].totalCorrect}</div>
              <div className="text-[9px] font-bold text-indigo-300 mt-2">إجابة صحيحة</div>
            </div>
          </div>
        )}

        {/* Bronze Rank */}
        {top3[2] && (
          <div className="flex flex-col items-center animate-fade-in-up [animation-delay:400ms]">
            <div className="relative mb-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden ring-4 ring-amber-50/30">
                 <span className="text-2xl font-black text-amber-600 uppercase">{top3[2].name.substring(0, 2)}</span>
              </div>
              <div className="absolute -top-3 -right-3 bg-amber-700 p-1.5 rounded-full shadow-lg border-2 border-white text-white">
                <Medal size={18} fill="currentColor" />
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-md px-4 py-4 rounded-t-3xl shadow-lg w-24 sm:w-36 text-center border-x border-t border-amber-50 h-20 flex flex-col justify-center">
              <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">المركز الثالث</div>
              <div className="text-xs font-black text-amber-800 truncate w-full mb-1">{top3[2].displayName}</div>
              <div className="text-xl font-black text-indigo-600">{top3[2].totalCorrect}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-gray-50 flex flex-col items-center p-4 sm:p-8 overflow-y-auto">
      <div className="w-full max-w-4xl">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={onBack} 
            className="bg-white p-4 rounded-3xl shadow-sm text-gray-500 hover:text-indigo-600 hover:shadow-indigo-100 transition-all border border-gray-100 active:scale-90"
          >
            <Home size={24} />
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-800 flex items-center justify-center gap-3 tracking-tight">
              <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl rotate-3">
                <Trophy size={32} />
              </div>
              لوحة الأبطال
            </h1>
            <div className="mt-4 flex items-center justify-center gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${offline ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    {offline ? <CloudOff size={12} /> : <Globe2 size={12} className="animate-spin-slow" />}
                    {offline ? 'الوضع المحلي' : 'مزامنة مباشرة'}
                </div>
            </div>
          </div>
          
          <div className="w-14 h-14 hidden sm:flex items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100">
             <div className={`w-3 h-3 rounded-full animate-pulse ${offline ? 'bg-orange-400' : 'bg-green-500'}`}></div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] shadow-xl border border-indigo-50">
            <Loader2 size={64} className="text-indigo-600 animate-spin mb-4" />
            <p className="text-indigo-900 font-black text-xl animate-pulse">جاري جلب بيانات المتفوقات...</p>
          </div>
        ) : (
          <>
            <Podium />
            
            {offline && (
                <div className="mb-6 bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3 animate-fade-in-up">
                    <Info className="text-orange-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-orange-800 font-medium leading-relaxed">
                        أنتِ الآن تشاهدين الترتيب في وضع "عدم الاتصال" أو "الصلاحيات المحدودة". سيتم عرض نتائجكِ المحلية فقط حتى يتم استعادة المزامنة مع السحابة.
                    </p>
                </div>
            )}

            <div className="space-y-4 mb-24">
              {leaders.length === 0 ? (
                <div className="text-center p-16 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-400">
                    <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-lg">لا توجد بيانات حالياً.</p>
                    <p className="text-sm">كوني أول بطلة تتصدر القائمة اليوم!</p>
                </div>
              ) : (
                leaders.map((player, index) => {
                  const isCurrentUser = player.name === currentUser;
                  const score = player.totalCorrect;
                  const badges = getBadgeDefinitions(score).filter(b => b.unlocked);

                  return (
                    <div 
                      key={player.name} 
                      className={`group flex items-center gap-4 p-6 rounded-[2.5rem] transition-all duration-500 border-2 animate-fade-in-up [animation-delay:${index * 100}ms]
                        ${isCurrentUser 
                            ? 'bg-indigo-600 border-indigo-400 text-white scale-[1.02] shadow-2xl z-20' 
                            : 'bg-white border-white text-slate-700 shadow-sm hover:shadow-xl hover:border-indigo-100'
                        }`}
                    >
                      <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                        {getRankIcon(index)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-black text-xl truncate ${isCurrentUser ? 'text-white' : 'text-slate-800'}`}>
                            {player.displayName}
                          </h3>
                          {isCurrentUser && (
                            <span className="bg-white/20 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase">أنتِ</span>
                          )}
                        </div>
                        <div className={`text-[10px] font-bold flex items-center gap-1.5 mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                          <TrendingUp size={12} />
                          آخر نشاط: {player.lastActive}
                        </div>
                      </div>

                      <div className="hidden sm:flex gap-1.5 px-4 border-x border-gray-100/10">
                        {badges.slice(0, 4).map(b => (
                          <div key={b.id} className="text-2xl filter drop-shadow-sm hover:scale-125 transition-transform" title={b.name}>
                            {b.icon}
                          </div>
                        ))}
                      </div>

                      <div className="text-right min-w-[100px]">
                        <div className={`text-4xl font-black leading-none ${isCurrentUser ? 'text-white' : 'text-indigo-600'}`}>
                          {score}
                        </div>
                        <div className={`text-[9px] font-black uppercase mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-indigo-300'}`}>
                          نقطة
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeaderboardScreen;
