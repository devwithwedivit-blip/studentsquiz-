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
      setActionMessage({ text: err.message || 'Error loading data.', type: 'error' });
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
        text: `Exam published successfully for Class ${pushSelectedClass}!`,
        type: 'success'
      });
      setPushQuizTarget(null);
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error publishing exam.', type: 'error' });
    } finally {
      setPushSubmitting(false);
    }
  };

  // Handle Unpublish
  const handleUnpublish = async (quizId: string) => {
    try {
      await unpublishTeacherQuiz(quizId);
      setActionMessage({ text: 'Exam reverted to draft.', type: 'success' });
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  };

  // Handle Delete Quiz
  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete exam "${title}"?`)) {
      try {
        await deleteTeacherQuiz(quizId);
        setActionMessage({ text: 'Draft exam deleted.', type: 'success' });
        loadData();
      } catch (err: any) {
        setActionMessage({ text: err.message, type: 'error' });
      }
    }
  };

  // Handle Soft-delete Question
  const handleSoftDelete = async (qId: string) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await softDeleteTeacherQuestion(qId);
        setRecentlyDeletedQuestionId(qId);
        setActionMessage({
          text: 'Question deleted (moved to trash).',
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
      setActionMessage({ text: 'Please enter an exam title.', type: 'error' });
      return;
    }
    if (selectedQuestionIds.size === 0) {
      setActionMessage({ text: 'Please select at least one question.', type: 'error' });
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
          ? `Exam created and published to Class ${newClass} successfully!`
          : 'Exam saved as draft successfully.',
        type: 'success'
      });

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setSelectedQuestionIds(new Set());
      setActiveTab('quizzes');
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error creating exam.', type: 'error' });
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
                Teacher Portal
              </h1>
              <p className="text-emerald-200 text-xs">
                {teacher.name} • {teacher.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              <span className="text-xs text-emerald-200 font-semibold uppercase">Assigned Classes:</span>
              {assignedClasses.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 bg-emerald-700 text-emerald-100 rounded text-xs font-bold border border-emerald-600"
                >
                  Class {c}
                </span>
              ))}
            </div>

            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 bg-emerald-900/80 hover:bg-emerald-950 text-white rounded-lg text-xs font-bold transition-all border border-emerald-700 flex items-center gap-1"
            >
              <span>🚪</span> Sign Out
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
              <span>📋</span> My Exams ({quizzes.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              <span>➕</span> Create New Exam
            </button>
            <button
              onClick={() => setActiveTab('my_questions')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'my_questions'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              <span>✍️</span> My Questions ({myQuestions.length})
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'roster'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              <span>👥</span> Class Student List
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
            <span>Loading data...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: QUIZZES */}
            {activeTab === 'quizzes' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">Your Created Exams</h2>
                    <p className="text-xs text-stone-500">
                      Publish your draft exams to classes or view results here
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span>➕</span> Create Exam
                  </button>
                </div>

                {quizzes.length === 0 ? (
                  <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-500">
                    <p className="text-lg font-bold text-stone-700 mb-1">No exams created yet</p>
                    <p className="text-xs mb-4">Click below to create your first exam for the class.</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold shadow hover:bg-emerald-800"
                    >
                      Create Exam
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
                              Class {quiz.class}
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
                              {quiz.status === 'published' ? '🟢 Live / Published' : quiz.status === 'closed' ? '⚫ Closed' : '🟡 Draft'}
                            </span>
                          </div>

                          <h3 className="font-bold text-stone-900 text-base mb-1">{quiz.title}</h3>
                          {quiz.description && (
                            <p className="text-xs text-stone-600 line-clamp-2 mb-3">{quiz.description}</p>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 py-2 border-t border-stone-100">
                            <div>⏱️ {quiz.duration_minutes} mins</div>
                            <div>📝 {quiz.question_count || 0} questions</div>
                            <div>🎯 -ve: {quiz.negative_marking ? 'Yes' : 'No'}</div>
                            <div>🔀 Shuffle: {quiz.shuffle ? 'Yes' : 'No'}</div>
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
                                🚀 Push to Class
                              </button>
                              <button
                                onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-bold transition"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleViewAttempts(quiz)}
                                className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-xs font-bold transition"
                              >
                                📊 View Results
                              </button>
                              <button
                                onClick={() => handleUnpublish(quiz.id)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-bold transition"
                              >
                                Revert to Draft
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
                  <h2 className="text-xl font-bold text-stone-900">Create New Exam (Quiz Creator)</h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Create exams for your assigned classes and select questions from the question bank
                  </p>
                </div>

                <form className="space-y-6">
                  {/* Title & Class */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                        Exam Title *
                      </label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Class 9 - Science Periodic Test"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                        Class (Assigned) *
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
                            Class {cls}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                      Description / Instructions (Optional)
                    </label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={2}
                      placeholder="Instructions for students..."
                      className="w-full px-3.5 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Duration (Minutes)</label>
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
                      <label className="block text-xs font-bold text-stone-700 mb-1">Show Answers</label>
                      <select
                        value={newShowAnswers}
                        onChange={(e) => setNewShowAnswers(e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded border border-stone-300 text-xs"
                      >
                        <option value="submit">Immediately on Submit</option>
                        <option value="close">After Exam Window Closes</option>
                        <option value="never">Never</option>
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
                        Negative Marking (-0.25)
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
                        Shuffle Questions
                      </label>
                    </div>
                  </div>

                  {/* Question Bank Picker */}
                  <div className="border border-stone-200 rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-stone-800 text-sm">
                          Select Questions (Available for Class {newClass})
                        </h3>
                        <p className="text-xs text-stone-500">
                          Selected: <strong className="text-emerald-700">{selectedQuestionIds.size} questions</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={bankSubjectFilter}
                          onChange={(e) => setBankSubjectFilter(e.target.value)}
                          className="px-2.5 py-1 rounded border border-stone-300 text-xs"
                        >
                          <option value="all">All Subjects</option>
                          <option value="maths">Mathematics</option>
                          <option value="gk">Science / GK</option>
                          <option value="hindi">Hindi</option>
                          <option value="english">English</option>
                          <option value="cs">Computer Science</option>
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
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedQuestionIds(new Set())}
                          className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 rounded text-xs font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 border border-stone-100 rounded-lg">
                      {filteredAvailableQuestions.length === 0 ? (
                        <p className="text-xs text-stone-500 p-4 text-center">
                          No questions found for this class and subject.
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
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCreateQuizSubmit(e, true)}
                      disabled={createSubmitting}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-sm shadow-md transition flex items-center gap-1.5"
                    >
                      <span>🚀</span> Publish Directly to Class {newClass}
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
                    <h2 className="text-lg font-bold text-stone-900">Questions Added by Me</h2>
                    <p className="text-xs text-stone-500">
                      View, edit, or delete questions you created
                    </p>
                  </div>
                </div>

                {myQuestions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-500">
                    <p className="text-base font-bold text-stone-700 mb-1">You haven't added any questions yet</p>
                    <p className="text-xs">You can use any of the 3,200+ question bank questions when creating exams.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200 bg-white rounded-xl border border-stone-200 overflow-hidden">
                    {myQuestions.map((q) => (
                      <div key={q.id} className="p-4 flex items-start justify-between gap-4 hover:bg-stone-50">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded font-bold text-[10px]">
                              Class {q.class}
                            </span>
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded font-semibold text-[10px] uppercase">
                              {q.subject}
                            </span>
                            <span className="text-xs text-stone-500">{q.chapter}</span>
                          </div>
                          <p className="font-bold text-stone-900 text-sm">{q.question}</p>
                          {q.explanation && (
                            <p className="text-xs text-stone-500 bg-stone-50 p-2 rounded">
                              💡 Explanation: {q.explanation}
                            </p>
                          )}
                        </div>

                        <div>
                          <button
                            onClick={() => handleSoftDelete(q.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-xs font-bold transition"
                          >
                            Delete
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
                    <h2 className="text-lg font-bold text-stone-900">Student List & Status</h2>
                    <p className="text-xs text-stone-500">Students from your assigned classes only</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-700">Select Class:</span>
                    <select
                      value={rosterClass}
                      onChange={(e) => setRosterClass(Number(e.target.value) as 9 | 10 | 11 | 12)}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-bold bg-stone-50"
                    >
                      {assignedClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          Class {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                  {rosterLoading ? (
                    <div className="p-8 text-center text-stone-500">Loading...</div>
                  ) : rosterStudents.length === 0 ? (
                    <div className="p-8 text-center text-stone-500">No students enrolled in this class.</div>
                  ) : (
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 uppercase font-bold text-[11px]">
                        <tr>
                          <th className="p-3">Roll No / ID</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Class</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {rosterStudents.map((st, idx) => (
                          <tr key={st.id} className="hover:bg-stone-50">
                            <td className="p-3 font-mono text-stone-500">{st.id}</td>
                            <td className="p-3 font-bold text-stone-900">{st.name}</td>
                            <td className="p-3 font-semibold text-stone-700">Class {st.class}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  st.active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {st.active ? 'Active' : 'Inactive'}
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
              <h3 className="text-lg font-bold">🚀 Push Exam to Class</h3>
              <p className="text-emerald-100 text-xs mt-1">"{pushQuizTarget.title}"</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Select Target Class (Assigned classes only)
                </label>
                <select
                  value={pushSelectedClass}
                  onChange={(e) => setPushSelectedClass(Number(e.target.value) as 9 | 10 | 11 | 12)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm font-bold bg-stone-50"
                >
                  {assignedClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Class {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
                ⚠️ Note: Once published, this exam will appear on the dashboard of all students in Class {pushSelectedClass}.
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setPushQuizTarget(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePushSubmit}
                  disabled={pushSubmitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs shadow"
                >
                  {pushSubmitting ? 'Publishing...' : 'Publish Now'}
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
                <h3 className="text-base font-bold">📊 Exam Results</h3>
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
                <div className="text-center py-8 text-stone-500">Loading results...</div>
              ) : attemptsList.length === 0 ? (
                <div className="text-center py-8 text-stone-500">
                  No student has submitted this exam yet.
                </div>
              ) : (
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                    <tr>
                      <th className="p-2.5 text-left">Student Name</th>
                      <th className="p-2.5 text-center">Score</th>
                      <th className="p-2.5 text-center">Percentage</th>
                      <th className="p-2.5 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {attemptsList.map((att) => {
                      const pct = att.total && att.total > 0 ? Math.round(((att.score || 0) / att.total) * 100) : 0;
                      return (
                        <tr key={att.id} className="hover:bg-stone-50">
                          <td className="p-2.5 font-bold text-stone-900">{att.student_name || 'Student'}</td>
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
