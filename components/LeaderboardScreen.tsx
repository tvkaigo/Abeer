import React, { useEffect, useState } from 'react';
import { Home, Trophy, Medal, Crown, Sparkles, Loader2, Globe2, TrendingUp, CloudOff, Award, UserCheck, Users } from 'lucide-react';
import { subscribeToLeaderboard, getBadgeDefinitions, isCloudEnabled, loadStats } from '../services/statsService';
import { LeaderboardEntry, UserRole, UserStats } from '../types';

interface LeaderboardScreenProps {
  onBack: () => void;
  currentUser?: string; 
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, currentUser }) => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [teacherId, setTeacherId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // If we have a current user, fetch their teacherId to filter results
    const checkUserRole = async () => {
        if (currentUser) {
            const data = await loadStats(currentUser);
            if (data && data.role === UserRole.STUDENT) {
                setTeacherId((data as UserStats).teacherId);
            } else if (data && data.role === UserRole.TEACHER) {
                setTeacherId(currentUser); // Teachers see their own students
            }
        }
    };
    
    checkUserRole();
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard((data) => {
      setLeaders(data);
      setIsLoading(false);
      setOffline(!isCloudEnabled());
    }, teacherId);
    
    return () => unsubscribe();
  }, [teacherId]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return (
        <div className="relative inline-block scale-110">
            <Crown size={36} className="text-yellow-400 drop-shadow-md animate-bounce" fill="currentColor" />
            <div className="absolute -top-1 -right-1 animate-pulse"><Sparkles size={14} className="text-yellow-200" /></div>
        </div>
      );
      case 1: return <Medal size={30} className="text-slate-400 drop-shadow-sm" fill="currentColor" />;
      case 2: return <Medal size={30} className="text-amber-700 drop-shadow-sm" fill="currentColor" />;
      default: return (
        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 font-black shadow-inner mx-auto text-lg border border-gray-50">
            {index + 1}
        </div>
      );
    }
  };

  const Podium = () => {
    if (leaders.length < 1) return null;
    const top3 = leaders.slice(0, 3);
    
    return (
      <div className="flex items-end justify-center gap-2 sm:gap-8 mb-16 mt-12 px-2">
        {top3[1] && (
          <div className="flex flex-col items-center animate-fade-in-up [animation-delay:200ms] order-1 sm:order-none">
            <div className="relative mb-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                 <span className="text-2xl font-black text-slate-400 uppercase">{top3[1].displayName.substring(0, 1)}</span>
              </div>
              <div className="absolute -top-3 -right-3 bg-slate-400 p-1.5 rounded-full shadow-lg border-2 border-white text-white">
                <Medal size={18} fill="currentColor" />
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-md px-3 py-4 rounded-t-3xl shadow-lg w-28 sm:w-36 text-center h-24 flex flex-col justify-center border-x border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">الثاني</div>
              <div className="text-xs font-black text-slate-700 truncate w-full">{top3[1].displayName}</div>
              <div className="text-xl font-black text-indigo-600">{top3[1].totalCorrect}</div>
            </div>
          </div>
        )}

        {top3[0] && (
          <div className="flex flex-col items-center animate-pop-in relative z-10 order-2 sm:order-none">
            <div className="relative mb-4 scale-125">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden">
                 <span className="text-3xl font-black text-yellow-900 uppercase">{top3[0].displayName.substring(0, 1)}</span>
              </div>
              <div className="absolute -top-6 -right-6 bg-yellow-400 p-2.5 rounded-full shadow-2xl border-4 border-white animate-bounce text-yellow-900">
                <Crown size={32} fill="currentColor" />
              </div>
            </div>
            <div className="bg-white px-5 py-6 rounded-t-[2.5rem] shadow-2xl w-36 sm:w-48 text-center h-40 flex flex-col justify-center ring-4 ring-yellow-400/10 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-500"><Sparkles size={24} /></div>
              <div className="text-[10px] font-bold text-yellow-600 uppercase mb-1">الأول</div>
              <div className="text-base font-black text-indigo-900 truncate w-full">{top3[0].displayName}</div>
              <div className="text-4xl font-black text-yellow-600 leading-none">{top3[0].totalCorrect}</div>
            </div>
          </div>
        )}

        {top3[2] && (
          <div className="flex flex-col items-center animate-fade-in-up [animation-delay:400ms] order-3 sm:order-none">
            <div className="relative mb-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                 <span className="text-2xl font-black text-amber-600 uppercase">{top3[2].displayName.substring(0, 1)}</span>
              </div>
              <div className="absolute -top-3 -right-3 bg-amber-700 p-1.5 rounded-full shadow-lg border-2 border-white text-white">
                <Medal size={18} fill="currentColor" />
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-md px-3 py-4 rounded-t-3xl shadow-lg w-28 sm:w-36 text-center h-20 flex flex-col justify-center border-x border-t border-amber-50">
              <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">الثالث</div>
              <div className="text-xs font-black text-amber-800 truncate w-full">{top3[2].displayName}</div>
              <div className="text-xl font-black text-indigo-600">{top3[2].totalCorrect}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-8 overflow-y-auto font-sans">
      <div className="w-full max-w-4xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button onClick={onBack} className="bg-white p-4 rounded-3xl shadow-sm text-gray-400 hover:text-indigo-600 hover:shadow-md transition-all active:scale-90">
            <Home size={24} />
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-800 flex items-center justify-center gap-3">
              <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl -rotate-2"><Trophy size={32} /></div>
              لوحة الأبطال
            </h1>
            <div className="mt-4 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${offline ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                        {offline ? <CloudOff size={12} /> : <Globe2 size={12} className="animate-spin-slow" />}
                        {offline ? 'الوضع المحلي' : 'مزامنة حية'}
                    </div>
                    {teacherId && (
                        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <Users size={12} /> قائمة فصلي فقط
                        </div>
                    )}
                </div>
            </div>
          </div>
          
          <div className="w-14 h-14 hidden sm:block"></div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] shadow-xl border border-indigo-50">
            <Loader2 size={64} className="text-indigo-600 animate-spin mb-4" />
            <p className="text-indigo-900 font-black text-xl animate-pulse">جاري جلب قائمة المبدعين...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <Podium />

            {/* List */}
            <div className="space-y-4 mb-24 px-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase px-8 mb-2 tracking-widest">
                  <span>الترتيب والاسم</span>
                  <div className="flex gap-16">
                      <span className="hidden md:block">الجوائز</span>
                      <span>النقاط</span>
                  </div>
              </div>

              {leaders.length === 0 ? (
                <div className="text-center p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400">
                    <Trophy size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold text-lg">لم ينضم أحد للمنافسة بعد!</p>
                </div>
              ) : (
                leaders.map((player, index) => {
                  const isCurrentUser = player.uid === currentUser;
                  const badges = getBadgeDefinitions(player.totalCorrect).filter(b => b.unlocked);

                  return (
                    <div 
                      key={player.uid} 
                      className={`group flex items-center gap-4 p-5 rounded-[2.5rem] transition-all duration-300 border-2 animate-fade-in-up [animation-delay:${index * 50}ms]
                        ${isCurrentUser 
                            ? 'bg-indigo-600 border-indigo-500 text-white scale-[1.02] shadow-2xl z-20' 
                            : 'bg-white border-white text-slate-700 shadow-sm hover:shadow-xl hover:border-indigo-100'
                        }`}
                    >
                      {/* Rank */}
                      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                        {getRankIcon(index)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-black text-lg truncate ${isCurrentUser ? 'text-white' : 'text-slate-800'}`}>
                            {player.displayName}
                          </h3>
                          {player.role === UserRole.TEACHER && (
                            <span className="bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold border border-purple-400 uppercase flex items-center gap-1">
                                <UserCheck size={10} /> معلم
                            </span>
                          )}
                          {isCurrentUser && (
                            <span className="bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-full font-bold border border-white/30 uppercase">أنت</span>
                          )}
                        </div>
                        <div className={`text-[10px] font-bold flex items-center gap-1.5 mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                          <TrendingUp size={12} /> آخر جولة: {player.lastActive}
                        </div>
                      </div>

                      {/* Awards / Badges */}
                      <div className="hidden md:flex gap-1.5 px-6 border-x border-slate-100/10">
                        {badges.length > 0 ? (
                            badges.slice(0, 4).map(b => (
                                <div 
                                    key={b.id} 
                                    className="text-2xl hover:scale-125 transition-transform cursor-help" 
                                    title={b.name}
                                >
                                    {b.icon}
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                                <Award size={14} className="opacity-30" /> لا جوائز بعد
                            </div>
                        )}
                      </div>

                      {/* Score */}
                      <div className="text-right min-w-[70px] sm:min-w-[90px]">
                        <div className={`text-2xl sm:text-3xl font-black leading-none ${isCurrentUser ? 'text-white' : 'text-indigo-600'}`}>
                          {player.totalCorrect}
                        </div>
                        <div className={`text-[9px] font-black uppercase mt-1 tracking-tighter ${isCurrentUser ? 'text-indigo-200' : 'text-slate-300'}`}>
                            إجابة صحيحة
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardScreen;