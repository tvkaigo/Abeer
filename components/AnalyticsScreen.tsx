import React, { useEffect, useState } from 'react';
import { Home, TrendingUp, Calendar, Award, CheckCircle2, XCircle, Percent, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { loadStats, getLast7DaysStats, getLeaderboard } from '../services/statsService';
import { UserStats } from '../types';

interface AnalyticsScreenProps {
  onBack: () => void;
  userName?: string;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onBack, userName }) => {
  // المتغير الأساسي لتخزين بيانات اللاعب القادمة من السحابة
  const [player, setPlayer] = useState<UserStats | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // دالة لجلب البيانات
  const fetchData = async () => {
    if (userName) {
      setIsLoading(true);
      try {
        // Fetch both User Stats and Leaderboard to calculate Rank
        const [userData, leaderboardData] = await Promise.all([
            loadStats(userName),
            getLeaderboard(false) // Use cached if available for speed, or force sync
        ]);
        
        setPlayer(userData);

        // Calculate Rank
        const userRank = leaderboardData.findIndex(u => u.name === userName) + 1;
        setRank(userRank > 0 ? userRank : null);

      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [userName]);

  if (!userName) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm">
        <p className="text-gray-600 font-bold mb-6 text-lg">يرجى تسجيل الدخول أولاً لعرض التحليلات.</p>
        <button onClick={onBack} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-3 rounded-xl font-bold transition-all">
          العودة للقائمة
        </button>
      </div>
    </div>
  );

  if (isLoading || !player) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <Loader2 size={48} className="text-indigo-600 animate-spin" />
      <p className="text-gray-500 font-bold animate-pulse">جاري جلب بيانات البطل...</p>
    </div>
  );

  // حساب الإحصائيات المشتقة
  const totalAttempts = player.totalCorrect + player.totalIncorrect;
  const accuracy = totalAttempts > 0 
    ? Math.round((player.totalCorrect / totalAttempts) * 100) 
    : 0;

  const weeklyData = getLast7DaysStats(player);
  const maxWeeklyValue = Math.max(...weeklyData.map(d => d.correct + d.incorrect), 5); // Minimum 5 for scale

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 overflow-y-auto font-sans">
      <div className="w-full max-w-3xl animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="bg-white p-3 rounded-2xl shadow-sm text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all active:scale-95"
          >
            <Home size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-indigo-600" />
              ملف اللاعب
            </h1>
            <span className="text-indigo-500 font-bold bg-indigo-50 px-4 py-1 rounded-full text-sm mt-1">
              {player.name}
            </span>
          </div>

          <button 
            onClick={fetchData}
            className="bg-white p-3 rounded-2xl shadow-sm text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all active:scale-95"
            title="تحديث البيانات"
          >
            <RefreshCw size={24} />
          </button>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            
          {/* Card 1: Rank (New) */}
          <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-3xl shadow-sm border border-yellow-200 flex flex-col items-center justify-center hover:scale-[1.02] transition-transform relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-10">
                <Trophy size={60} className="text-yellow-500" />
             </div>
             <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-2 z-10">
              <Trophy size={20} />
            </div>
            <div className="text-3xl font-black text-slate-800 z-10 flex items-baseline">
                {rank ? (
                    <>
                        <span className="text-lg text-slate-400 mr-1">#</span>{rank}
                    </>
                ) : '-'}
            </div>
            <div className="text-xs text-slate-400 font-bold z-10">ترتيبك الحالي</div>
          </div>

          {/* Card 2: Correct Answers */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-green-100 flex flex-col items-center justify-center hover:scale-[1.02] transition-transform">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
              <CheckCircle2 size={20} />
            </div>
            <div className="text-3xl font-black text-slate-800">{player.totalCorrect}</div>
            <div className="text-xs text-slate-400 font-bold">إجابة صحيحة</div>
          </div>

          {/* Card 3: Streak */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-orange-100 flex flex-col items-center justify-center hover:scale-[1.02] transition-transform">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-2">
              <Calendar size={20} />
            </div>
            <div className="text-3xl font-black text-slate-800">{player.streak}</div>
            <div className="text-xs text-slate-400 font-bold">أيام متتالية</div>
          </div>

          {/* Card 4: Accuracy */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-blue-100 flex flex-col items-center justify-center hover:scale-[1.02] transition-transform">
             <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
              <Percent size={20} />
            </div>
            <div className="text-3xl font-black text-slate-800" dir="ltr">{accuracy}%</div>
            <div className="text-xs text-slate-400 font-bold">دقة الإجابات</div>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="bg-white rounded-[2rem] shadow-lg shadow-indigo-500/5 p-6 mb-8 border border-white">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
               <TrendingUp size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-700">النشاط الأسبوعي</h2>
          </div>

          <div className="flex items-end justify-between h-48 gap-3 px-2">
            {weeklyData.map((day, idx) => {
              const total = day.correct + day.incorrect;
              const barHeight = total === 0 ? 5 : (total / maxWeeklyValue) * 100; // Min 5% height
              const correctHeight = total === 0 ? 0 : (day.correct / total) * 100;
              const incorrectHeight = total === 0 ? 0 : (day.incorrect / total) * 100;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                   {/* Tooltip on Hover */}
                   <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded-lg whitespace-nowrap z-10 pointer-events-none">
                      ✅{day.correct} ❌{day.incorrect}
                   </div>

                   <div 
                     className="w-full max-w-[40px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col-reverse relative transition-all duration-500 hover:bg-slate-200"
                     style={{ height: `${Math.min(100, barHeight)}%` }}
                   >
                      {total > 0 && (
                        <>
                           <div className="bg-green-400 w-full transition-all duration-700" style={{ height: `${correctHeight}%` }}></div>
                           <div className="bg-red-300 w-full transition-all duration-700" style={{ height: `${incorrectHeight}%` }}></div>
                        </>
                      )}
                   </div>
                   <span className="text-xs font-bold text-slate-400 mt-3 truncate w-full text-center">
                     {day.label}
                   </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Badges Section */}
        <div className="bg-white rounded-[2rem] shadow-lg shadow-indigo-500/5 p-6 border border-white">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600">
               <Award size={20} fill="currentColor" />
            </div>
            <h2 className="text-lg font-bold text-slate-700">لوحة الجوائز</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {player.badges.map((badge) => {
               // Calculate Progress Percentage for this specific badge
               const progress = Math.min(100, (player.totalCorrect / badge.required) * 100);
               
               return (
                <div 
                  key={badge.id} 
                  className={`relative p-5 rounded-3xl border-2 transition-all duration-300 flex items-center gap-4
                    ${badge.unlocked 
                      ? `${badge.color} border-transparent shadow-md` 
                      : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <div className={`text-4xl filter ${badge.unlocked ? 'drop-shadow-sm' : 'grayscale opacity-50'}`}>
                    {badge.icon}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-black text-lg">{badge.name}</h3>
                    <div className="text-xs font-medium mt-1 opacity-90">
                      {badge.unlocked 
                        ? 'تم الحصول عليها!' 
                        : `باقي ${Math.max(0, badge.required - player.totalCorrect)} إجابة`
                      }
                    </div>
                    
                    {/* Progress Bar for Locked Badges */}
                    {!badge.unlocked && (
                      <div className="mt-3 w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-400 rounded-full transition-all duration-1000" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>

                  {badge.unlocked && (
                    <div className="absolute top-3 left-3 text-current opacity-20">
                      <Award size={40} />
                    </div>
                  )}
                </div>
               );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsScreen;