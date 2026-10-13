import React, { useState, useEffect } from 'react';
import { StaffProfile, OnlineQuiz, Student, OnlineAttempt } from '../../../types/online';
import { Question } from '../../../types/quiz';
import {
  getTeacherQuizzes,
  getTeacherAssignedClasses,
  createTeacherQuiz,
  pushQuizToClass,
  unpublishTeacherQuiz,
  deleteTeacherQuiz,
  getTeacherQuestions,
  softDeleteTeacherQuestion,
  getTeacherRoster,
  getTeacherQuizAttempts
} from '../../../services/teacherApi';

interface TeacherPortalProps {
  teacher: StaffProfile;
  allQuestions: Question[];
  onLogout: () => void;
  onOpenLiveResults?: (quizId: string) => void;
}

export function TeacherPortal({
  teacher,
  allQuestions,
  onLogout,
  onOpenLiveResults
}: TeacherPortalProps) {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'create' | 'my_questions' | 'roster'>('quizzes');
  const [assignedClasses, setAssignedClasses] = useState<(9 | 10 | 11 | 12)[]>(
    (teacher.assignedClasses as (9 | 10 | 11 | 12)[]) || [9]
  );
  const [quizzes, setQuizzes] = useState<OnlineQuiz[]>([]);
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Push Modal State
  const [pushQuizTarget, setPushQuizTarget] = useState<OnlineQuiz | null>(null);
  const [pushSelectedClass, setPushSelectedClass] = useState<9 | 10 | 11 | 12>(9);
  const [pushSubmitting, setPushSubmitting] = useState<boolean>(false);

  // Undo soft-delete tracking
  const [recentlyDeletedQuestionId, setRecentlyDeletedQuestionId] = useState<string | null>(null);

  // Roster view state
  const [rosterClass, setRosterClass] = useState<9 | 10 | 11 | 12>(9);
  const [rosterStudents, setRosterStudents] = useState<Student[]>([]);
  const [rosterLoading, setRosterLoading] = useState<boolean>(false);

  // Quiz Attempts modal
  const [viewAttemptsQuiz, setViewAttemptsQuiz] = useState<OnlineQuiz | null>(null);
  const [attemptsList, setAttemptsList] = useState<OnlineAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState<boolean>(false);

  // Create Quiz Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newClass, setNewClass] = useState<9 | 10 | 11 | 12>(9);
  const [newDuration, setNewDuration] = useState<number>(30);
  const [newNegative, setNewNegative] = useState<boolean>(false);
  const [newShuffle, setNewShuffle] = useState<boolean>(true);
  const [newShowAnswers, setNewShowAnswers] = useState<'submit' | 'close' | 'never'>('submit');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);
  const [bankSubjectFilter, setBankSubjectFilter] = useState<string>('all');

  // Load teacher initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [clsList, qList, qTeacher] = await Promise.all([
        getTeacherAssignedClasses(),
        getTeacherQuizzes(),
        getTeacherQuestions()
      ]);
      const validClasses = clsList.length > 0 ? clsList : ((teacher.assignedClasses as any) || [9]);
      setAssignedClasses(validClasses);
      setQuizzes(qList);
      setMyQuestions(qTeacher);
      if (validClasses.length > 0) {
        setNewClass(validClasses[0]);
        setPushSelectedClass(validClasses[0]);
        setRosterClass(validClasses[0]);
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'डेटा लोड करने में त्रुटि।', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load roster when roster tab or selected class changes
  useEffect(() => {
    if (activeTab === 'roster' && rosterClass) {
      setRosterLoading(true);
      getTeacherRoster(rosterClass)
        .then(setRosterStudents)
        .catch((err) => setActionMessage({ text: err.message, type: 'error' }))
        .finally(() => setRosterLoading(false));
    }
  }, [activeTab, rosterClass]);

  // Handle Push Quiz to Class
  const handlePushSubmit = async () => {
    if (!pushQuizTarget) return;
    try {
      setPushSubmitting(true);
      await pushQuizToClass(pushQuizTarget.id, pushSelectedClass);
      setActionMessage({
        text: `परीक्षा सफलतापूर्वक कक्षा ${pushSelectedClass} के लिए प्रकाशित कर दी गई!`,
        type: 'success'
      });
      setPushQuizTarget(null);
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'परीक्षा प्रकाशित करने में त्रुटि।', type: 'error' });
    } finally {
      setPushSubmitting(false);
    }
  };

  // Handle Unpublish
  const handleUnpublish = async (quizId: string) => {
    try {
      await unpublishTeacherQuiz(quizId);
      setActionMessage({ text: 'परीक्षा ड्राफ्ट में वापस ले ली गई।', type: 'success' });
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  };

  // Handle Delete Quiz
  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (window.confirm(`क्या आप निश्चित रूप से परीक्षा "${title}" हटाना चाहते हैं?`)) {
      try {
        await deleteTeacherQuiz(quizId);
        setActionMessage({ text: 'ड्राफ्ट परीक्षा हटा दी गई।', type: 'success' });
        loadData();
      } catch (err: any) {
        setActionMessage({ text: err.message, type: 'error' });
      }
    }
  };

  // Handle Soft-delete Question
  const handleSoftDelete = async (qId: string) => {
    if (window.confirm('क्या आप इस प्रश्न को हटाना चाहते हैं?')) {
      try {
        await softDeleteTeacherQuestion(qId);
        setRecentlyDeletedQuestionId(qId);
        setActionMessage({
          text: 'प्रश्न हटा दिया गया। (रीसायकल बिन में स्थानांतरित)',
          type: 'success'
        });
        loadData();
      } catch (err: any) {
        setActionMessage({ text: err.message, type: 'error' });
      }
    }
  };

  // Handle View Attempts
  const handleViewAttempts = async (quiz: OnlineQuiz) => {
    setViewAttemptsQuiz(quiz);
    setAttemptsLoading(true);
    try {
      const attempts = await getTeacherQuizAttempts(quiz.id);
      setAttemptsList(attempts);
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    } finally {
      setAttemptsLoading(false);
    }
  };

  // Handle Create Quiz Submit
  const handleCreateQuizSubmit = async (e: React.FormEvent, directPublish: boolean = false) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setActionMessage({ text: 'कृपया परीक्षा का शीर्षक दर्ज करें।', type: 'error' });
      return;
    }
    if (selectedQuestionIds.size === 0) {
      setActionMessage({ text: 'कृपया कम से कम एक प्रश्न चुनें।', type: 'error' });
      return;
    }

    try {
      setCreateSubmitting(true);
      const questionArray = Array.from(selectedQuestionIds).map((id) => ({
        questionId: id,
        marks: 1
      }));

      const created = await createTeacherQuiz(
        {
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          class: newClass,
          status: directPublish ? 'published' : 'draft',
          duration_minutes: newDuration,
          negative_marking: newNegative,
          shuffle: newShuffle,
          show_answers_after: newShowAnswers,
          max_attempts: 1
        },
        questionArray
      );

      setActionMessage({
        text: directPublish
          ? `परीक्षा सफलतापूर्वक बनाई गई और कक्षा ${newClass} में प्रकाशित कर दी गई!`
          : 'परीक्षा ड्राफ्ट के रूप में सुरक्षित कर ली गई।',
        type: 'success'
      });

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setSelectedQuestionIds(new Set());
      setActiveTab('quizzes');
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'परीक्षा बनाने में त्रुटि।', type: 'error' });
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Filter available questions for quiz creation
  const filteredAvailableQuestions = allQuestions.filter((q) => {
    if (q.class !== newClass) return false;
    if (bankSubjectFilter !== 'all' && q.subject !== bankSubjectFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700 p-2 rounded-xl text-xl">👨‍🏫</div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight leading-tight">
                शिक्षक पोर्टल (Teacher Portal)
              </h1>
              <p className="text-emerald-200 text-xs">
                {teacher.name} • {teacher.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              <span className="text-xs text-emerald-200 font-semibold uppercase">असाइन कक्षाएं:</span>
              {assignedClasses.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 bg-emerald-700 text-emerald-100 rounded text-xs font-bold border border-emerald-600"
                >
                  कक्षा {c}
                </span>
              ))}
            </div>

            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 bg-emerald-900/80 hover:bg-emerald-950 text-white rounded-lg text-xs font-bold transition-all border border-emerald-700 flex items-center gap-1"
            >
              <span>🚪</span> बाहर निकलें
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="bg-emerald-900/60 border-t border-emerald-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'quizzes'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              <span>📋</span> मेरी परीक्षाएं ({quizzes.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              <span>➕</span> नई परीक्षा तैयार करें
            </button>
            <button
              onClick={() => setActiveTab('my_questions')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'my_questions'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              <span>✍️</span> मेरे प्रश्न ({myQuestions.length})
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'roster'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              <span>👥</span> कक्षा विद्यार्थी सूची
            </button>
          </div>
        </div>
      </header>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 py-3 w-full my-3 flex items-center justify-between rounded-xl shadow-sm text-sm font-medium ${
            actionMessage.type === 'success'
              ? 'bg-emerald-100 border border-emerald-300 text-emerald-900'
              : 'bg-red-100 border border-red-300 text-red-900'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-stone-500 hover:text-stone-800 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-500">
            <span className="animate-spin text-3xl mb-2">⏳</span>
            <span>डेटा लोड हो रहा है...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: QUIZZES */}
            {activeTab === 'quizzes' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">आपकी तैयार की गई परीक्षाएं</h2>
                    <p className="text-xs text-stone-500">
                      यहां आप अपनी ड्राफ्ट परीक्षाओं को कक्षा में भेज सकते हैं या परिणाम देख सकते हैं
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span>➕</span> नई परीक्षा बनाएं
                  </button>
                </div>

                {quizzes.length === 0 ? (
                  <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-500">
                    <p className="text-lg font-bold text-stone-700 mb-1">अभी तक कोई परीक्षा नहीं बनाई गई है</p>
                    <p className="text-xs mb-4">कक्षा के लिए पहली परीक्षा तैयार करने के लिए नीचे क्लिक करें।</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold shadow hover:bg-emerald-800"
                    >
                      नई परीक्षा बनाएं
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 flex flex-col justify-between hover:border-emerald-300 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-800 font-bold text-xs rounded border border-indigo-200">
                              कक्षा {quiz.class}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 text-xs font-bold rounded ${
                                quiz.status === 'published'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : quiz.status === 'closed'
                                  ? 'bg-stone-200 text-stone-700'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {quiz.status === 'published' ? '🟢 लाइव / प्रकाशित' : quiz.status === 'closed' ? '⚫ समाप्त' : '🟡 ड्राफ्ट'}
                            </span>
                          </div>

                          <h3 className="font-bold text-stone-900 text-base mb-1">{quiz.title}</h3>
                          {quiz.description && (
                            <p className="text-xs text-stone-600 line-clamp-2 mb-3">{quiz.description}</p>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 py-2 border-t border-stone-100">
                            <div>⏱️ {quiz.duration_minutes} मिनट</div>
                            <div>📝 {quiz.question_count || 0} प्रश्न</div>
                            <div>🎯 -ve: {quiz.negative_marking ? 'हाँ' : 'नहीं'}</div>
                            <div>🔀 शफ़ल: {quiz.shuffle ? 'हाँ' : 'नहीं'}</div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-stone-100 flex flex-wrap gap-2 mt-2">
                          {quiz.status === 'draft' ? (
                            <>
                              <button
                                onClick={() => {
                                  setPushQuizTarget(quiz);
                                  setPushSelectedClass(quiz.class);
                                }}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition shadow-sm"
                              >
                                🚀 कक्षा में भेजें (Push)
                              </button>
                              <button
                                onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-bold transition"
                              >
                                हटाएं
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleViewAttempts(quiz)}
                                className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-xs font-bold transition"
                              >
                                📊 परिणाम देखें
                              </button>
                              <button
                                onClick={() => handleUnpublish(quiz.id)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-bold transition"
                              >
                                वापस ड्राफ्ट
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CREATE QUIZ */}
            {activeTab === 'create' && (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 max-w-4xl mx-auto">
                <div className="mb-6 border-b border-stone-200 pb-4">
                  <h2 className="text-xl font-bold text-stone-900">नई परीक्षा तैयार करें (Quiz Creator)</h2>
                  <p className="text-xs text-stone-500 mt-1">
                    अपनी असाइन की गई कक्षाओं के लिए प्रश्नोत्तरी बनाएं और प्रश्न बैंक से प्रश्न चुनें
                  </p>
                </div>

                <form className="space-y-6">
                  {/* Title & Class */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                        परीक्षा का शीर्षक *
                      </label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="उदा: कक्षा 9 - विज्ञान आवधिक टेस्ट"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                        कक्षा (असाइन की गई) *
                      </label>
                      <select
                        value={newClass}
                        onChange={(e) => {
                          const cls = Number(e.target.value) as 9 | 10 | 11 | 12;
                          setNewClass(cls);
                          setSelectedQuestionIds(new Set());
                        }}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium bg-stone-50"
                      >
                        {assignedClasses.map((cls) => (
                          <option key={cls} value={cls}>
                            कक्षा {cls}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                      विवरण / निर्देश (वैकल्पिक)
                    </label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={2}
                      placeholder="विद्यार्थियों के लिए आवश्यक निर्देश..."
                      className="w-full px-3.5 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">अवधि (मिनट)</label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={newDuration}
                        onChange={(e) => setNewDuration(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded border border-stone-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">उत्तर दिखाना</label>
                      <select
                        value={newShowAnswers}
                        onChange={(e) => setNewShowAnswers(e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded border border-stone-300 text-xs"
                      >
                        <option value="submit">सबमिट करते ही</option>
                        <option value="close">परीक्षा समाप्त होने पर</option>
                        <option value="never">कभी नहीं</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="neg-check"
                        checked={newNegative}
                        onChange={(e) => setNewNegative(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <label htmlFor="neg-check" className="text-xs font-bold text-stone-700">
                        नेगेटिव मार्किंग (-0.25)
                      </label>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="shuf-check"
                        checked={newShuffle}
                        onChange={(e) => setNewShuffle(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <label htmlFor="shuf-check" className="text-xs font-bold text-stone-700">
                        प्रश्नों को शफ़ल करें
                      </label>
                    </div>
                  </div>

                  {/* Question Bank Picker */}
                  <div className="border border-stone-200 rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-stone-800 text-sm">
                          प्रश्न चुनें (कक्षा {newClass} के उपलब्ध प्रश्न)
                        </h3>
                        <p className="text-xs text-stone-500">
                          चुने गए: <strong className="text-emerald-700">{selectedQuestionIds.size} प्रश्न</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={bankSubjectFilter}
                          onChange={(e) => setBankSubjectFilter(e.target.value)}
                          className="px-2.5 py-1 rounded border border-stone-300 text-xs"
                        >
                          <option value="all">सभी विषय</option>
                          <option value="maths">गणित</option>
                          <option value="gk">सामान्य ज्ञान/विज्ञान</option>
                          <option value="hindi">हिंदी</option>
                          <option value="english">अंग्रेजी</option>
                          <option value="cs">कम्प्यूटर साइंस</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const newSet = new Set(selectedQuestionIds);
                            filteredAvailableQuestions.forEach((q) => newSet.add(q.id));
                            setSelectedQuestionIds(newSet);
                          }}
                          className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 rounded text-xs font-semibold"
                        >
                          सभी चुनें
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedQuestionIds(new Set())}
                          className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 rounded text-xs font-semibold"
                        >
                          हटाएं
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 border border-stone-100 rounded-lg">
                      {filteredAvailableQuestions.length === 0 ? (
                        <p className="text-xs text-stone-500 p-4 text-center">
                          इस कक्षा और विषय के लिए कोई प्रश्न नहीं मिला।
                        </p>
                      ) : (
                        filteredAvailableQuestions.map((q) => {
                          const isSelected = selectedQuestionIds.has(q.id);
                          return (
                            <div
                              key={q.id}
                              onClick={() => {
                                const next = new Set(selectedQuestionIds);
                                if (isSelected) next.delete(q.id);
                                else next.add(q.id);
                                setSelectedQuestionIds(next);
                              }}
                              className={`p-3 text-xs flex items-start gap-3 cursor-pointer hover:bg-stone-50 transition-all ${
                                isSelected ? 'bg-emerald-50/60' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="mt-0.5 rounded text-emerald-600"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-stone-600 uppercase text-[10px] bg-stone-200 px-1.5 py-0.5 rounded">
                                    {q.subject}
                                  </span>
                                  <span className="text-stone-400">|</span>
                                  <span className="text-stone-500">{q.chapter}</span>
                                </div>
                                <p className="text-stone-900 font-medium">{q.question}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Submission Buttons */}
                  <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={(e) => handleCreateQuizSubmit(e, false)}
                      disabled={createSubmitting}
                      className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-lg text-sm transition"
                    >
                      Draft के रूप में सहेजें
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCreateQuizSubmit(e, true)}
                      disabled={createSubmitting}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-sm shadow-md transition flex items-center gap-1.5"
                    >
                      <span>🚀</span> कक्षा {newClass} में सीधे प्रकाशित करें
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: MY QUESTIONS */}
            {activeTab === 'my_questions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-stone-200">
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">मेरे द्वारा जोड़े गए प्रश्न</h2>
                    <p className="text-xs text-stone-500">
                      यहां आप अपने बनाए गए प्रश्नों को संपादित कर सकते हैं या सुरक्षित रूप से हटा सकते हैं
                    </p>
                  </div>
                </div>

                {myQuestions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-500">
                    <p className="text-base font-bold text-stone-700 mb-1">आपने अभी तक कोई प्रश्न नहीं जोड़ा है</p>
                    <p className="text-xs">प्रश्नोत्तरी बनाते समय आप प्रश्न बैंक के मौजूदा 3,200+ प्रश्नों का उपयोग कर सकते हैं।</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200 bg-white rounded-xl border border-stone-200 overflow-hidden">
                    {myQuestions.map((q) => (
                      <div key={q.id} className="p-4 flex items-start justify-between gap-4 hover:bg-stone-50">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded font-bold text-[10px]">
                              कक्षा {q.class}
                            </span>
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded font-semibold text-[10px] uppercase">
                              {q.subject}
                            </span>
                            <span className="text-xs text-stone-500">{q.chapter}</span>
                          </div>
                          <p className="font-bold text-stone-900 text-sm">{q.question}</p>
                          {q.explanation && (
                            <p className="text-xs text-stone-500 bg-stone-50 p-2 rounded">
                              💡 व्याख्या: {q.explanation}
                            </p>
                          )}
                        </div>

                        <div>
                          <button
                            onClick={() => handleSoftDelete(q.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-bold transition"
                          >
                            हटाएं
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ROSTER */}
            {activeTab === 'roster' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200">
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">विद्यार्थी सूची एवं स्थिति</h2>
                    <p className="text-xs text-stone-500">केवल आपकी असाइन कक्षाओं के विद्यार्थी प्रदर्शित हैं</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-700">कक्षा चुनें:</span>
                    <select
                      value={rosterClass}
                      onChange={(e) => setRosterClass(Number(e.target.value) as 9 | 10 | 11 | 12)}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-bold bg-stone-50"
                    >
                      {assignedClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          कक्षा {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                  {rosterLoading ? (
                    <div className="p-8 text-center text-stone-500">लोड हो रहा है...</div>
                  ) : rosterStudents.length === 0 ? (
                    <div className="p-8 text-center text-stone-500">इस कक्षा में कोई विद्यार्थी पंजीकृत नहीं है।</div>
                  ) : (
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 uppercase font-bold text-[11px]">
                        <tr>
                          <th className="p-3">क्रमांक / ID</th>
                          <th className="p-3">विद्यार्थी का नाम</th>
                          <th className="p-3">कक्षा</th>
                          <th className="p-3">स्थिति</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {rosterStudents.map((st, idx) => (
                          <tr key={st.id} className="hover:bg-stone-50">
                            <td className="p-3 font-mono text-stone-500">{st.id}</td>
                            <td className="p-3 font-bold text-stone-900">{st.name}</td>
                            <td className="p-3 font-semibold text-stone-700">कक्षा {st.class}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  st.active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {st.active ? 'सक्रिय (Active)' : 'निष्क्रिय'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* PUSH TO CLASS MODAL */}
      {pushQuizTarget && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border-2 border-emerald-400 overflow-hidden">
            <div className="bg-emerald-700 text-white p-5">
              <h3 className="text-lg font-bold">🚀 परीक्षा को कक्षा में भेजें</h3>
              <p className="text-emerald-100 text-xs mt-1">"{pushQuizTarget.title}"</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  लक्ष्य कक्षा चुनें (केवल असाइन की गई कक्षाएं)
                </label>
                <select
                  value={pushSelectedClass}
                  onChange={(e) => setPushSelectedClass(Number(e.target.value) as 9 | 10 | 11 | 12)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm font-bold bg-stone-50"
                >
                  {assignedClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      कक्षा {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
                ⚠️ ध्यान दें: कक्षा में प्रकाशित करने के बाद, यह परीक्षा कक्षा {pushSelectedClass} के सभी विद्यार्थियों के डैशबोर्ड पर दिखाई देगी।
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setPushQuizTarget(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-lg text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handlePushSubmit}
                  disabled={pushSubmitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs shadow"
                >
                  {pushSubmitting ? 'भेजा जा रहा है...' : 'अभी प्रकाशित करें'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUIZ ATTEMPTS MODAL */}
      {viewAttemptsQuiz && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-300 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-indigo-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">📊 परीक्षा परिणाम</h3>
                <p className="text-indigo-200 text-xs">{viewAttemptsQuiz.title}</p>
              </div>
              <button
                onClick={() => setViewAttemptsQuiz(null)}
                className="text-white hover:text-indigo-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {attemptsLoading ? (
                <div className="text-center py-8 text-stone-500">परिणाम लोड हो रहे हैं...</div>
              ) : attemptsList.length === 0 ? (
                <div className="text-center py-8 text-stone-500">
                  अभी तक किसी विद्यार्थी ने यह परीक्षा सबमिट नहीं की है।
                </div>
              ) : (
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <tr>
                      <th className="p-2.5 text-left">विद्यार्थी का नाम</th>
                      <th className="p-2.5 text-center">प्राप्तांक</th>
                      <th className="p-2.5 text-center">प्रतिशत</th>
                      <th className="p-2.5 text-right">समय</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {attemptsList.map((att) => {
                      const pct = att.total && att.total > 0 ? Math.round(((att.score || 0) / att.total) * 100) : 0;
                      return (
                        <tr key={att.id} className="hover:bg-stone-50">
                          <td className="p-2.5 font-bold text-stone-900">{att.student_name || 'विद्यार्थी'}</td>
                          <td className="p-2.5 text-center font-bold text-indigo-700">
                            {att.score ?? '-'} / {att.total ?? '-'}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                pct >= 75
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pct >= 40
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                          <td className="p-2.5 text-right text-stone-500">
                            {att.submitted_at ? new Date(att.submitted_at).toLocaleTimeString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
