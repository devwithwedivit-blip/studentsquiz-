import React, { useState, useEffect } from 'react';
import { Student, StudentSession, StaffProfile } from '../../types/online';
import { getStudentsForClass, loginStudent } from '../../services/studentApi';
import { staffLogin } from '../../services/adminApi';
import { changeOwnPassword } from '../../services/teacherApi';

interface UnifiedLoginProps {
  onStudentLoginSuccess: (session: StudentSession) => void;
  onStaffLoginSuccess: (profile: StaffProfile) => void;
  defaultRoleCard?: 'student' | 'teacher' | 'admin';
}

export function UnifiedLogin({
  onStudentLoginSuccess,
  onStaffLoginSuccess,
  defaultRoleCard = 'student'
}: UnifiedLoginProps) {
  const [selectedCard, setSelectedCard] = useState<'student' | 'teacher' | 'admin'>(defaultRoleCard);

  // Student Form State
  const [selectedClass, setSelectedClass] = useState<9 | 10 | 11 | 12>(9);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentPin, setStudentPin] = useState<string>('');
  const [showStudentPin, setShowStudentPin] = useState<boolean>(false);
  const [studentLoading, setStudentLoading] = useState<boolean>(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Teacher Form State
  const [teacherEmail, setTeacherEmail] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [showTeacherPass, setShowTeacherPass] = useState<boolean>(false);
  const [teacherLoading, setTeacherLoading] = useState<boolean>(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // Admin Form State
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Password Change Modal State (for must_change_password)
  const [pendingStaffProfile, setPendingStaffProfile] = useState<StaffProfile | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changePassLoading, setChangePassLoading] = useState<boolean>(false);
  const [changePassError, setChangePassError] = useState<string | null>(null);

  // Load students when class changes
  useEffect(() => {
    let active = true;
    const fetchStudents = async () => {
      try {
        setStudentLoading(true);
        const data = await getStudentsForClass(selectedClass);
        if (active) {
          setStudentsList(data);
          setSelectedStudentId(data.length > 0 ? data[0].id : '');
        }
      } catch (err: any) {
        if (active) {
          setStudentError(err.message || 'विद्यार्थी सूची लोड नहीं हो सकी।');
        }
      } finally {
        if (active) setStudentLoading(false);
      }
    };
    fetchStudents();
    return () => { active = false; };
  }, [selectedClass]);

  // Handle Student Login
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);

    if (!selectedStudentId) {
      setStudentError('कृपया अपना नाम चुनें।');
      return;
    }
    if (!studentPin || studentPin.length < 4) {
      setStudentError('कृपया 4-अंकीय पिन दर्ज करें।');
      return;
    }

    try {
      setStudentLoading(true);
      const session = await loginStudent(selectedStudentId, selectedClass, studentPin);
      onStudentLoginSuccess(session);
    } catch (err: any) {
      setStudentError(err.message || 'लॉगिन विफल रहा। कृपया पुनः प्रयास करें।');
    } finally {
      setStudentLoading(false);
    }
  };

  // Handle Teacher Login
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);

    if (!teacherEmail.trim() || !teacherPassword) {
      setTeacherError('ईमेल और पासवर्ड आवश्यक हैं।');
      return;
    }

    try {
      setTeacherLoading(true);
      const profile = await staffLogin(teacherEmail, teacherPassword, 'teacher');
      if (profile.must_change_password) {
        setPendingStaffProfile(profile);
      } else {
        onStaffLoginSuccess(profile);
      }
    } catch (err: any) {
      setTeacherError(err.message || 'शिक्षक लॉगिन विफल रहा।');
    } finally {
      setTeacherLoading(false);
    }
  };

  // Handle Admin Login
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    if (!adminEmail.trim() || !adminPassword) {
      setAdminError('ईमेल और पासवर्ड आवश्यक हैं।');
      return;
    }

    try {
      setAdminLoading(true);
      const profile = await staffLogin(adminEmail, adminPassword, 'admin');
      if (profile.must_change_password) {
        setPendingStaffProfile(profile);
      } else {
        onStaffLoginSuccess(profile);
      }
    } catch (err: any) {
      setAdminError(err.message || 'व्यवस्थापक लॉगिन विफल रहा।');
    } finally {
      setAdminLoading(false);
    }
  };

  // Handle Password Change Submission
  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);

    if (!newPassword || newPassword.length < 10) {
      setChangePassError('पासवर्ड कम से कम 10 अक्षरों का होना चाहिए।');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePassError('दोनों पासवर्ड मेल नहीं खाते।');
      return;
    }

    try {
      setChangePassLoading(true);
      await changeOwnPassword(newPassword);
      if (pendingStaffProfile) {
        const updated = { ...pendingStaffProfile, must_change_password: false };
        setPendingStaffProfile(null);
        onStaffLoginSuccess(updated);
      }
    } catch (err: any) {
      setChangePassError(err.message || 'पासवर्ड बदलने में त्रुटि।');
    } finally {
      setChangePassLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/40 py-10 px-4 sm:px-6 flex flex-col justify-center items-center">
      {/* Title Header */}
      <div className="text-center mb-8 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
          <span>🎓</span> परीक्षा एवं अभ्यास मंच
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          विद्यालय परीक्षा पोर्टल
        </h1>
        <p className="text-stone-600 text-sm sm:text-base mt-2">
          कृपया अपनी भूमिका चुनें और सुरक्षित रूप से साइन इन करें
        </p>
      </div>

      {/* Role Selector Tabs (Mobile & Quick Switch) */}
      <div className="flex gap-2 p-1.5 bg-stone-200/70 rounded-xl mb-6 max-w-md w-full border border-stone-300">
        <button
          type="button"
          onClick={() => setSelectedCard('student')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            selectedCard === 'student'
              ? 'bg-white text-indigo-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>🎒</span> विद्यार्थी
        </button>
        <button
          type="button"
          onClick={() => setSelectedCard('teacher')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            selectedCard === 'teacher'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>👨‍🏫</span> शिक्षक
        </button>
        <button
          type="button"
          onClick={() => setSelectedCard('admin')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            selectedCard === 'admin'
              ? 'bg-white text-amber-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span>🛡️</span> एडमिन
        </button>
      </div>

      {/* Main Container Card Deck */}
      <div className="max-w-xl w-full">
        {/* STUDENT CARD */}
        {selectedCard === 'student' && (
          <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-xl overflow-hidden transition-all animate-fadeIn">
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 text-white px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>🎒</span> विद्यार्थी लॉगिन
                </h2>
                <p className="text-indigo-200 text-xs mt-0.5">
                  अपनी कक्षा, नाम और 4-अंकीय पिन से लॉगिन करें
                </p>
              </div>
              <span className="text-2xl bg-indigo-600/60 p-2 rounded-xl">✍️</span>
            </div>

            <form onSubmit={handleStudentSubmit} className="p-6 space-y-5">
              {studentError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <span className="text-red-500 font-bold">⚠️</span>
                  <span>{studentError}</span>
                </div>
              )}

              {/* Class Buttons */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  कक्षा चुनें
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([9, 10, 11, 12] as const).map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        setSelectedClass(cls);
                        setStudentError(null);
                      }}
                      className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                        selectedClass === cls
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      कक्षा {cls}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Dropdown */}
              <div>
                <label htmlFor="student-name-select" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  विद्यार्थी का नाम
                </label>
                <select
                  id="student-name-select"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={studentLoading || studentsList.length === 0}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-800 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {studentsList.length === 0 ? (
                    <option value="">
                      {studentLoading ? 'लोड हो रहा है...' : 'कोई विद्यार्थी उपलब्ध नहीं है'}
                    </option>
                  ) : (
                    studentsList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 4-digit PIN */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="student-pin-input" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    4-अंकीय गुप्त पिन (PIN)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowStudentPin(!showStudentPin)}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    {showStudentPin ? 'पिन छिपाएं' : 'पिन देखें'}
                  </button>
                </div>
                <input
                  id="student-pin-input"
                  type={showStudentPin ? 'text' : 'password'}
                  maxLength={6}
                  value={studentPin}
                  onChange={(e) => setStudentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-stone-50 focus:bg-white text-center"
                />
                <p className="text-xs text-stone-500 mt-1">
                  यदि आप अपना पिन भूल गए हैं, तो कृपया अपने कक्षा शिक्षक से संपर्क करें।
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={studentLoading || studentsList.length === 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {studentLoading ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span>
                    <span>प्रमाणीकरण हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <span>प्रवेश करें (Start Learning)</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TEACHER CARD */}
        {selectedCard === 'teacher' && (
          <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-xl overflow-hidden transition-all animate-fadeIn">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>👨‍🏫</span> शिक्षक लॉगिन
                </h2>
                <p className="text-emerald-200 text-xs mt-0.5">
                  अपने आधिकारिक ईमेल एवं पासवर्ड से लॉगिन करें
                </p>
              </div>
              <span className="text-2xl bg-emerald-600/60 p-2 rounded-xl">📚</span>
            </div>

            <form onSubmit={handleTeacherSubmit} className="p-6 space-y-5">
              {teacherError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <span className="text-red-500 font-bold">⚠️</span>
                  <span>{teacherError}</span>
                </div>
              )}

              <div>
                <label htmlFor="teacher-email-input" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  शिक्षक ईमेल (Email)
                </label>
                <input
                  id="teacher-email-input"
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="teacher@school.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50 focus:bg-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="teacher-password-input" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    पासवर्ड (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTeacherPass(!showTeacherPass)}
                    className="text-xs text-emerald-600 hover:underline font-medium"
                  >
                    {showTeacherPass ? 'छिपाएं' : 'देखें'}
                  </button>
                </div>
                <input
                  id="teacher-password-input"
                  type={showTeacherPass ? 'text' : 'password'}
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={teacherLoading}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {teacherLoading ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span>
                    <span>सत्यापन हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <span>शिक्षक पोर्टल में प्रवेश करें</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ADMIN CARD */}
        {selectedCard === 'admin' && (
          <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-xl overflow-hidden transition-all animate-fadeIn">
            <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>🛡️</span> व्यवस्थापक (एडमिन) लॉगिन
                </h2>
                <p className="text-amber-200 text-xs mt-0.5">
                  विद्यालय एडमिन क्रेडेंशियल्स से साइन इन करें
                </p>
              </div>
              <span className="text-2xl bg-amber-600/60 p-2 rounded-xl">🔑</span>
            </div>

            <form onSubmit={handleAdminSubmit} className="p-6 space-y-5">
              {adminError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <span className="text-red-500 font-bold">⚠️</span>
                  <span>{adminError}</span>
                </div>
              )}

              <div>
                <label htmlFor="admin-email-input" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  व्यवस्थापक ईमेल (Admin Email)
                </label>
                <input
                  id="admin-email-input"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@school.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 focus:bg-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="admin-password-input" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    पासवर्ड (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="text-xs text-amber-700 hover:underline font-medium"
                  >
                    {showAdminPass ? 'छिपाएं' : 'देखें'}
                  </button>
                </div>
                <input
                  id="admin-password-input"
                  type={showAdminPass ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-stone-50 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-3 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {adminLoading ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span>
                    <span>सत्यापन हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <span>एडमिन पोर्टल में प्रवेश करें</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* MANDATORY PASSWORD CHANGE MODAL */}
      {pendingStaffProfile && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border-2 border-amber-400 overflow-hidden animate-fadeIn">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>🔒</span> नया पासवर्ड सेट करना अनिवार्य है
              </h3>
              <p className="text-amber-100 text-xs mt-1">
                सुरक्षा कारणों से, प्रथम लॉगिन पर पासवर्ड बदलना आवश्यक है।
              </p>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="p-6 space-y-4">
              {changePassError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {changePassError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  नया सुरक्षित पासवर्ड (न्यूनतम 10 अक्षर)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={10}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  नए पासवर्ड की पुष्टि करें
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={10}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-lg border border-stone-200">
                💡 सुझाव: एक मजबूत पासवर्ड में अक्षर, संख्याएं और विशेष वर्ण (!@#$) शामिल करें।
              </div>

              <button
                type="submit"
                disabled={changePassLoading}
                className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl shadow transition-all disabled:opacity-50"
              >
                {changePassLoading ? 'अपडेट हो रहा है...' : 'पासवर्ड सहेजें और पोर्टल में प्रवेश करें'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
