
import React, { useEffect, useState } from 'react';
import { Home, TrendingUp, Calendar, Award, CheckCircle2, Percent, Loader2, RefreshCw, Trophy, UserCog } from 'lucide-react';
import { loadStats, getLast7DaysStatsValue, subscribeToLeaderboard } from '../services/statsService';
import { UserStats, LeaderboardEntry, UserRole, TeacherProfile } from '../types';

interface AnalyticsScreenProps {
  onBack: () => void;
  userName?: string; // هذا هو الـ UID الخاص بالمستخدم الحالي
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onBack, userName }) => {
  const [player, setPlayer] = useState<UserStats | TeacherProfile | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (userName) {
      setIsLoading(true);
      try {
        // الدالة loadStats المحدثة ستبحث في كلا المجموعتين Users و Teachers
        const userData = await loadStats(userName);
        setPlayer(userData);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    
    // الاشتراك في الترتيب إذا كان طالباً
    if (userName) {
      const unsub = subscribeToLeaderboard((leaders) => {
          const userRank = leaders.findIndex(u => u.uid === userName) + 1;
          setRank(userRank > 0 ? userRank : null);
      });
      return () => unsub();
    }
  }, [userName]);

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <Loader2 size={48} className="text-indigo-600 animate-spin" />
      <p className="text-gray-500 font-bold animate-pulse">جاري مزامنة بيانات البطل...</p>
    </div>
  );

  if (!player) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 p-6 text-center">
      <Trophy size={64} className="text-gray-300 mb-2" />
      <h2 className="text-xl font-bold text-gray-700">عذراً، لم نتمكن من العثور على بياناتك</h2>
      <p className="text-gray-500 max-w-xs">يرجى التأكد من تسجيل الدخول بشكل صحيح والمحاولة مرة أخرى.</p>
      <button onClick={onBack} className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg">العودة للرئيسية</button>
    </div>
  );

  const totalCorrect = player.totalCorrect ?? 0;
  const totalIncorrect = player.totalIncorrect ?? 0;
  const streak = player.streak ?? 0;
  const totalAttempts = totalCorrect + totalIncorrect;
  const accuracy = totalAttempts > 0 
    ? Math.round((totalCorrect / totalAttempts) * 100) 
    : 0;

  const weeklyData = getLast7DaysStatsValue(player);
  const maxWeeklyValue = Math.max(...weeklyData.map(d => d.correct + d.incorrect), 5);

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
          
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-indigo-600" />
              ملف {player.role === UserRole.TEACHER ? 'المعلم' : 'اللاعب'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-indigo-500 font-bold bg-indigo-50 px-4 py-1 rounded-full text-sm truncate max-w-[200px]">
                  {player.displayName}
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                    player.role === UserRole.TEACHER 
                    ? 'bg-purple-100 text-purple-700 border-purple-200' 
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                    <UserCog size={10} />
                    {player.role === UserRole.TEACHER ? 'معلم' : 'طالب'}
                </span>
            </div>
          </div>

          <button 
            onClick={fetchData}
            className="bg-white p-3 rounded-2xl shadow-sm text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all active:scale-95"
          >
            <RefreshCw size={24} />
          </button>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-3xl shadow-sm border border-yellow-200 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-2">
              <Trophy size={20} />
            </div>
            <div className="text-3xl font-black text-slate-800 z-10 flex items-baseline">
                {rank ? <><span className="text-lg text-slate-400 mr-1">#</span>{rank}</> : '-'}
            </div>
            <div className="text-xs text-slate-400 font-bold">الترتيب بالفصل</div>
          </div>

          <div className="bg-white p-4 rounded-3xl shadow-sm border border-green-100 flex flex-col items-center justify-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
              <CheckCircle2 size={20} />
            </div>
            <div className="text-3xl font-black text-slate-800">{totalCorrect}</div>
            <div className="text-xs text-slate-400 font-bold">إجابة صحيحة</div>
          </div>

          <div className="bg-white p-4 rounded-3xl shadow-sm border border-orange-100 flex flex-col items-center justify-center">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-2">
              <Calendar size={20} />
            </div>
            <div className="text-3xl font-black text-slate-800">{streak}</div>
            <div className="text-xs text-slate-400 font-bold">أيام متتالية</div>
          </div>

          <div className="bg-white p-4 rounded-3xl shadow-sm border border-blue-100 flex flex-col items-center justify-center">
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

          {weeklyData.length > 0 ? (
            <div className="flex items-end justify-between h-48 gap-3 px-2">
              {weeklyData.map((day, idx) => {
                const total = day.correct + day.incorrect;
                const barHeight = total === 0 ? 5 : (total / maxWeeklyValue) * 100;
                const correctHeight = total === 0 ? 0 : (day.correct / total) * 100;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative">
                     <div 
                       className="w-full max-w-[40px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col-reverse relative transition-all duration-500"
                       style={{ height: `${Math.min(100, barHeight)}%` }}
                     >
                        {total > 0 && (
                             <div className="bg-green-400 w-full transition-all duration-700" style={{ height: `${correctHeight}%` }}></div>
                        )}
                     </div>
                     <span className="text-xs font-bold text-slate-400 mt-3 truncate w-full text-center">
                       {day.label}
                     </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 font-bold">لا توجد بيانات مسجلة لهذا الأسبوع</div>
          )}
        </div>

        {/* Badges Section */}
        {player.badges && player.badges.length > 0 && (
          <div className="bg-white rounded-[2rem] shadow-lg shadow-indigo-500/5 p-6 border border-white">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600">
                 <Award size={20} fill="currentColor" />
              </div>
              <h2 className="text-lg font-bold text-slate-700">لوحة الجوائز</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {player.badges.map((badge) => {
                 const progress = Math.min(100, (player.totalCorrect / badge.required) * 100);
                 return (
                  <div 
                    key={badge.id} 
                    className={`relative p-5 rounded-3xl border-2 transition-all duration-300 flex items-center gap-4
                      ${badge.unlocked ? `${badge.color} border-transparent shadow-md` : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                  >
                    <div className={`text-4xl filter ${badge.unlocked ? 'drop-shadow-sm' : 'grayscale opacity-50'}`}>
                      {badge.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-lg">{badge.name}</h3>
                      <div className="text-xs font-medium mt-1 opacity-90">
                        {badge.unlocked ? 'تم الحصول عليها!' : `باقي ${Math.max(0, badge.required - player.totalCorrect)} إجابة`}
                      </div>
                      {!badge.unlocked && (
                        <div className="mt-3 w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                 );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AnalyticsScreen;
