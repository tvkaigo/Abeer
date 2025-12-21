
import React, { useState, useEffect } from 'react';
import { UserStats, TeacherProfile, UserRole } from '../types';
import { 
  Home, User, Mail, UserCheck, Shield, Edit3, Save, 
  Loader2, AlertCircle, CheckCircle2, Award, X, HelpCircle,
  Star, Trophy, Target, Users, ChevronLeft
} from 'lucide-react';
import { updateUserProfileName, fetchTeacherInfo, getBadgeDefinitions, fetchTeacherStudents } from '../services/statsService';

interface ProfileScreenProps {
  onBack: () => void;
  playerData: UserStats | TeacherProfile | null;
  userId: string;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, playerData, userId }) => {
  const [displayName, setDisplayName] = useState(playerData?.displayName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [myStudents, setMyStudents] = useState<UserStats[]>([]);

  useEffect(() => {
    if (playerData?.role === UserRole.STUDENT && (playerData as UserStats).teacherId) {
        fetchTeacherInfo((playerData as UserStats).teacherId!).then(setTeacher);
    } else if (playerData?.role === UserRole.TEACHER) {
        const teacherData = playerData as TeacherProfile;
        if (teacherData.studentRefs && teacherData.studentRefs.length > 0) {
            setIsFetchingStudents(true);
            fetchTeacherStudents(teacherData.studentRefs).then(students => {
                setMyStudents(students);
                setIsFetchingStudents(false);
            });
        }
    }
  }, [playerData]);

  const handleSaveTrigger = () => {
    if (!displayName.trim()) {
        setError("يرجى إدخال اسم صحيح");
        return;
    }
    if (displayName.trim() === playerData?.displayName) {
        setIsEditing(false);
        return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
        const teacherId = playerData?.role === UserRole.TEACHER ? (playerData as TeacherProfile).teacherId : undefined;
        await updateUserProfileName(userId, displayName.trim(), playerData!.role, teacherId);
        setSuccess("تم تحديث اسمك بنجاح!");
        setIsEditing(false);
    } catch (err: any) {
        setError(err.message || "فشل تحديث الاسم");
    } finally {
        setIsLoading(false);
    }
  };

  if (!playerData) return (
      <div className="min-h-screen flex items-center justify-center p-4">
          <Loader2 size={48} className="text-indigo-600 animate-spin" />
      </div>
  );

  const isTeacher = playerData.role === UserRole.TEACHER;
  const initials = (displayName || playerData.displayName).substring(0, 1).toUpperCase();
  const badges = getBadgeDefinitions(playerData.totalCorrect || 0);
  const unlockedBadges = badges.filter(b => b.unlocked);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-8 font-sans relative overflow-y-auto">
      <div className="w-full max-w-2xl animate-fade-in-up pb-20">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="bg-white p-4 rounded-3xl shadow-sm text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all active:scale-95"
          >
            <Home size={24} />
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800">الملف الشخصي</h1>
          <div className="w-14 h-14"></div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-[3rem] shadow-xl border border-white p-6 md:p-10 relative overflow-hidden mb-8">
            <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${isTeacher ? 'from-purple-500 to-pink-500' : 'from-indigo-500 to-blue-500'}`}></div>
            
            <div className="flex flex-col items-center mb-8">
                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-2xl mb-4 border-8 border-white ${isTeacher ? 'bg-purple-600' : 'bg-indigo-600'}`}>
                    {initials}
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${isTeacher ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                    {isTeacher ? 'معلم معتمد' : 'طالب متميز'}
                </div>
            </div>

            <div className="space-y-6 mb-8">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                        <User size={14} /> الاسم المعروض
                    </label>
                    <div className="relative group">
                        <input 
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            disabled={!isEditing || isLoading}
                            className={`w-full px-6 py-4 rounded-2xl border-2 transition-all font-bold text-lg
                                ${isEditing 
                                    ? 'bg-white border-indigo-500 shadow-lg ring-4 ring-indigo-50' 
                                    : 'bg-slate-50 border-transparent text-slate-700 cursor-not-allowed'}`}
                        />
                        {!isEditing ? (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            >
                                <Edit3 size={20} />
                            </button>
                        ) : (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button 
                                    onClick={() => { setDisplayName(playerData.displayName); setIsEditing(false); }}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                                <button 
                                    onClick={handleSaveTrigger}
                                    disabled={isLoading}
                                    className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all"
                                >
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                        <Mail size={14} /> البريد الإلكتروني
                    </label>
                    <div className="px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent text-slate-500 font-medium flex items-center gap-3">
                        <span dir="ltr" className="truncate">{playerData.email}</span>
                        <Shield size={16} className="text-slate-300 flex-shrink-0" />
                    </div>
                </div>

                {!isTeacher && (
                    <div className="space-y-2 animate-fade-in">
                        <label className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                            <UserCheck size={14} /> معلم الفصل
                        </label>
                        <div className="px-6 py-4 rounded-2xl bg-indigo-50 border-2 border-indigo-100 text-indigo-700 font-black flex items-center justify-between">
                            <span>{teacher?.displayName || 'جاري تحميل بيانات المعلم...'}</span>
                            <div className="bg-white p-1.5 rounded-lg text-indigo-400 shadow-sm">
                                <Award size={18} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100">
                    <Star className="mx-auto mb-2 text-yellow-500" size={20} fill="currentColor" />
                    <div className="text-xl font-black text-slate-800">{playerData.totalCorrect}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">نقطة</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100">
                    <Trophy className="mx-auto mb-2 text-indigo-500" size={20} />
                    <div className="text-xl font-black text-slate-800">{unlockedBadges.length}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">أوسمة</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100">
                    <Target className="mx-auto mb-2 text-green-500" size={20} />
                    <div className="text-xl font-black text-slate-800">{playerData.streak}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">يوم</div>
                </div>
            </div>
        </div>

        {/* Teacher's Students Section (New) */}
        {isTeacher && (
            <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-4 mr-4">
                    <div className="bg-purple-600 p-2 rounded-xl text-white shadow-lg">
                        <Users size={20} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">قائمة طلاب فصلي</h2>
                    <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-black">
                        {myStudents.length} {myStudents.length === 1 ? 'بطل' : 'أبطال'}
                    </span>
                </div>

                <div className="space-y-3">
                    {isFetchingStudents ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                            <Loader2 size={32} className="text-purple-600 animate-spin mb-3" />
                            <p className="text-slate-400 font-bold">جاري تحضير قائمة المبدعين...</p>
                        </div>
                    ) : myStudents.length > 0 ? (
                        myStudents.map((student, idx) => (
                            <div key={student.uid} className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md hover:border-purple-200 transition-all animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                        {student.displayName.substring(0,1)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-700">{student.displayName}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{student.email.split('@')[0]}</p>
                                    </div>
                                </div>
                                <div className="text-left flex items-center gap-4">
                                    <div className="hidden sm:flex items-center gap-1">
                                        <Award size={14} className="text-yellow-500" fill="currentColor" />
                                        <span className="text-xs font-black text-slate-400">{student.badgesCount || 0}</span>
                                    </div>
                                    <div className="bg-purple-50 px-4 py-2 rounded-xl text-purple-700 font-black min-w-[60px] text-center">
                                        {student.totalCorrect}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400">
                            <Users size={48} className="mx-auto mb-3 opacity-20" />
                            <p className="font-bold">لا يوجد طلاب مسجلون في فصلك بعد.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-sm-w-sm w-full text-center border-4 border-indigo-50 animate-pop-in">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <HelpCircle size={48} className="animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-4">تأكيد تغيير الاسم</h2>
            <p className="text-slate-600 leading-relaxed mb-8 font-medium">
                هل أنت متأكد من تغيير اسمك المعروض من <span className="text-indigo-600 font-bold">"{playerData.displayName}"</span> إلى <span className="text-green-600 font-bold">"{displayName}"</span>؟
            </p>
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="py-4 rounded-2xl text-slate-500 font-bold border-2 border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
                >
                    إلغاء
                </button>
                <button 
                    onClick={handleConfirmSave}
                    className="py-4 rounded-2xl text-white font-black bg-indigo-600 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    نعم، متأكد
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
