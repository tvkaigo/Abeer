import React, { useEffect, useState } from 'react';
import { Home, TrendingUp, Calendar, Award, CheckCircle2, XCircle } from 'lucide-react';
import { loadStats, getLast7DaysStats, getBadgeStatus } from '../services/statsService';
import { UserStats } from '../types';

interface AnalyticsScreenProps {
  onBack: () => void;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onBack }) => {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  if (!stats) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;

  const weeklyData = getLast7DaysStats(stats);
  const badges = getBadgeStatus(stats.totalCorrect);

  // Find max value for chart scaling
  const maxVal = Math.max(
    ...weeklyData.map(d => d.correct + d.incorrect), 
    10 // Minimum scale
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={onBack}
            className="bg-white p-3 rounded-full shadow-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
          >
            <Home size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" />
            تحليلات الأداء
          </h1>
          <div className="w-10"></div> {/* Spacer for center alignment */}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col items-center justify-center text-center">
            <div className="bg-indigo-100 p-2 rounded-full mb-2 text-indigo-600">
                <CheckCircle2 size={24} />
            </div>
            <div className="text-3xl font-black text-gray-800">{stats.totalCorrect}</div>
            <div className="text-xs text-gray-500 font-bold">مجموع الإجابات الصحيحة</div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col items-center justify-center text-center">
            <div className="bg-orange-100 p-2 rounded-full mb-2 text-orange-600">
                <Calendar size={24} />
            </div>
            <div className="text-3xl font-black text-gray-800">{stats.streak} <span className="text-sm text-gray-400">أيام</span></div>
            <div className="text-xs text-gray-500 font-bold">أيام متتالية</div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
             <div className="bg-pink-100 p-2 rounded-full mb-2 text-pink-600">
                <Award size={24} fill="currentColor" />
            </div>
            <div className="text-xl font-black text-gray-800">
                {badges.filter(b => b.unlocked).length} / 4
            </div>
            <div className="text-xs text-gray-500 font-bold">الجوائز المكتسبة</div>
          </div>
        </div>

        {/* Weekly Activity Chart */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            نشاطك في أسبوع
          </h2>
          
          <div className="flex items-end justify-between h-48 gap-2">
            {weeklyData.map((day, idx) => {
              const total = day.correct + day.incorrect;
              const heightPercent = total === 0 ? 0 : (total / maxVal) * 100;
              const correctPercent = total === 0 ? 0 : (day.correct / total) * 100;
              const wrongPercent = total === 0 ? 0 : (day.incorrect / total) * 100;

              return (
                <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                  {/* Tooltip */}
                  <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-16 bg-gray-800 text-white text-xs p-2 rounded pointer-events-none whitespace-nowrap z-10">
                     ✅ {day.correct} | ❌ {day.incorrect}
                  </div>

                  <div 
                    className="w-full max-w-[30px] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-500 relative bg-gray-100"
                    style={{ height: `${heightPercent || 5}%` }} // Min height 5% for visual
                  >
                    {/* Only show colored bars if there is actual data */}
                    {total > 0 && (
                        <>
                            <div className="bg-green-400 w-full transition-all duration-500" style={{ height: `${correctPercent}%` }}></div>
                            <div className="bg-red-300 w-full transition-all duration-500" style={{ height: `${wrongPercent}%` }}></div>
                        </>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-bold mt-2">{day.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs font-bold text-gray-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-400 rounded-full"></div> إجابات صحيحة</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-300 rounded-full"></div> إجابات خاطئة</div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
            <Award size={20} className="text-yellow-500" fill="currentColor" />
            الجوائز والأوسمة
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            {badges.map((badge) => (
              <div 
                key={badge.id} 
                className={`relative p-4 rounded-2xl border-2 flex flex-col items-center text-center transition-all duration-300
                  ${badge.unlocked 
                    ? `${badge.color} shadow-md scale-100` 
                    : 'bg-gray-50 border-gray-100 text-gray-400 grayscale opacity-70'}`}
              >
                <div className="text-4xl mb-2">{badge.icon}</div>
                <div className="font-bold text-lg mb-1">{badge.name}</div>
                <div className="text-xs font-medium opacity-80">
                  {badge.unlocked ? 'تم الحصول عليها!' : `تحتاج ${badge.required} إجابة صحيحة`}
                </div>
                {!badge.unlocked && (
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="h-full bg-gray-400" 
                            style={{ width: `${Math.min(100, (stats.totalCorrect / badge.required) * 100)}%` }}
                        ></div>
                    </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsScreen;