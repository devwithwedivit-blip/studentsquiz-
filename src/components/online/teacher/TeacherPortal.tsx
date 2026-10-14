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
import {
  getTeacherTestsForTeacher,
  createTeacherTest,
  getTeacherTestResults
} from '../../../services/teacherTestApi';
import {
  TeacherTest,
  CreateTeacherTestQuestionInput,
  TeacherTestSubmissionRow
} from '../../../types/teacherTest';

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
  const [activeTab, setActiveTab] = useState<'quizzes' | 'create' | 'assign_test' | 'my_questions' | 'roster'>('quizzes');
  const [assignedClasses, setAssignedClasses] = useState<(9 | 10 | 11 | 12)[]>(
    (teacher.assignedClasses as (9 | 10 | 11 | 12)[]) || [9]
  );
  const [quizzes, setQuizzes] = useState<OnlineQuiz[]>([]);
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // --- Teacher Assigned Tests State ---
  const [teacherTests, setTeacherTests] = useState<TeacherTest[]>([]);
  const [testViewMode, setTestViewMode] = useState<'create' | 'results'>('create');
  const [selectedResultTestId, setSelectedResultTestId] = useState<string>('');
  const [testSubmissions, setTestSubmissions] = useState<TeacherTestSubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState<boolean>(false);

  // Create Test Form State
  const [testTitle, setTestTitle] = useState<string>('');
  const [testSubject, setTestSubject] = useState<string>('mathematics');
  const [testClass, setTestClass] = useState<9 | 10 | 11 | 12>(9);
  const [testDuration, setTestDuration] = useState<number>(30);
  const [testDueAt, setTestDueAt] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [testQuestions, setTestQuestions] = useState<CreateTeacherTestQuestionInput[]>([
    {
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      marks: 1
    }
  ]);
  const [testCreating, setTestCreating] = useState<boolean>(false);

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
      const [clsList, qList, qTeacher, tTests] = await Promise.all([
        getTeacherAssignedClasses(),
        getTeacherQuizzes(),
        getTeacherQuestions(),
        getTeacherTestsForTeacher(teacher.id)
      ]);
      const validClasses = clsList.length > 0 ? clsList : ((teacher.assignedClasses as any) || [9]);
      setAssignedClasses(validClasses);
      setQuizzes(qList);
      setMyQuestions(qTeacher);
      setTeacherTests(tTests);
      if (tTests.length > 0 && !selectedResultTestId) {
        setSelectedResultTestId(tTests[0].id);
      }
      if (validClasses.length > 0) {
        setNewClass(validClasses[0]);
        setPushSelectedClass(validClasses[0]);
        setRosterClass(validClasses[0]);
        setTestClass(validClasses[0]);
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

  // Auto-refresh results when viewing test results
  const loadTestResults = async (tId: string) => {
    if (!tId) return;
    setSubmissionsLoading(true);
    try {
      const rows = await getTeacherTestResults(tId);
      setTestSubmissions(rows);
    } catch (err: any) {
      console.error('Error loading test submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'assign_test' && testViewMode === 'results' && selectedResultTestId) {
      loadTestResults(selectedResultTestId);
      const interval = setInterval(() => {
        loadTestResults(selectedResultTestId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, testViewMode, selectedResultTestId]);

  const handleAddQuestion = () => {
    setTestQuestions(prev => [
      ...prev,
      {
        question: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        marks: 1
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (testQuestions.length <= 1) return;
    setTestQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    setTestQuestions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], question: text };
      return copy;
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    setTestQuestions(prev => {
      const copy = [...prev];
      const opts = [...copy[qIndex].options];
      opts[optIndex] = text;
      copy[qIndex] = { ...copy[qIndex], options: opts };
      return copy;
    });
  };

  const handleCorrectAnswerChange = (qIndex: number, optIndex: number) => {
    setTestQuestions(prev => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], correct_answer: optIndex };
      return copy;
    });
  };

  const handleMarksChange = (qIndex: number, marks: number) => {
    setTestQuestions(prev => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], marks: Math.max(1, marks) };
      return copy;
    });
  };

  const handleCreateTestSubmit = async (isPublished: boolean) => {
    if (!testTitle.trim()) {
      alert('Please enter a test title.');
      return;
    }
    for (let i = 0; i < testQuestions.length; i++) {
      const q = testQuestions[i];
      if (!q.question.trim()) {
        alert(`Question ${i + 1} statement cannot be empty.`);
        return;
      }
      for (let o = 0; o < 4; o++) {
        if (!q.options[o].trim()) {
          alert(`Question ${i + 1}, Option ${String.fromCharCode(65 + o)} cannot be empty.`);
          return;
        }
      }
    }

    setTestCreating(true);
    try {
      const created = await createTeacherTest(
        {
          title: testTitle.trim(),
          subject: testSubject,
          class: testClass,
          duration_minutes: testDuration,
          due_at: new Date(testDueAt).toISOString(),
          is_published: isPublished,
          questions: testQuestions
        },
        { id: teacher.id, name: teacher.name }
      );

      setActionMessage({
        text: isPublished
          ? `Test "${created.title}" successfully published to Class ${created.class}!`
          : `Draft test "${created.title}" saved.`,
        type: 'success'
      });

      // Reset form
      setTestTitle('');
      setTestQuestions([
        {
          question: '',
          options: ['', '', '', ''],
          correct_answer: 0,
          marks: 1
        }
      ]);

      // Refresh tests list
      const tests = await getTeacherTestsForTeacher(teacher.id);
      setTeacherTests(tests);
      setSelectedResultTestId(created.id);
      setTestViewMode('results');
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error creating test.', type: 'error' });
    } finally {
      setTestCreating(false);
    }
  };

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
              onClick={() => setActiveTab('assign_test')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'assign_test'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              <span>📝</span> Create &amp; Assign Test ({teacherTests.length})
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

            {/* TAB: CREATE & ASSIGN CLASS TEST & RESULTS */}
            {activeTab === 'assign_test' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                {/* Header Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">Class Tests &amp; Live Submissions</h2>
                    <p className="text-xs text-stone-500">
                      Create class-specific tests with MCQs and view live student submissions
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTestViewMode('create')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5 ${
                        testViewMode === 'create'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      <span>➕</span> Create &amp; Assign Test
                    </button>
                    <button
                      onClick={() => {
                        setTestViewMode('results');
                        if (teacherTests.length > 0 && !selectedResultTestId) {
                          setSelectedResultTestId(teacherTests[0].id);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5 ${
                        testViewMode === 'results'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      <span>📊</span> Test Results ({teacherTests.length})
                    </button>
                  </div>
                </div>

                {/* SUB-VIEW 1: CREATE & ASSIGN TEST FORM */}
                {testViewMode === 'create' ? (
                  <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-6">
                    <div className="border-b border-stone-200 pb-3">
                      <h3 className="font-bold text-stone-900 text-base">New Class Test Details</h3>
                      <p className="text-xs text-stone-500">
                        Assigned students will see this test in their &quot;📋 Teacher Tests&quot; tab.
                      </p>
                    </div>

                    {/* Metadata Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                          Test Title *
                        </label>
                        <input
                          type="text"
                          value={testTitle}
                          onChange={(e) => setTestTitle(e.target.value)}
                          placeholder="e.g. Unit Test 1: Polynomials &amp; Linear Equations"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                          Subject *
                        </label>
                        <select
                          value={testSubject}
                          onChange={(e) => setTestSubject(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm font-medium bg-stone-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="mathematics">Mathematics</option>
                          <option value="science">Science</option>
                          <option value="english">English</option>
                          <option value="hindi">Hindi</option>
                          <option value="social_science">Social Science</option>
                          <option value="gk">General Knowledge</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                          Assigned Class (9–12) *
                        </label>
                        <select
                          value={testClass}
                          onChange={(e) => setTestClass(Number(e.target.value) as 9 | 10 | 11 | 12)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm font-bold bg-stone-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value={9}>Class 9</option>
                          <option value={10}>Class 10</option>
                          <option value={11}>Class 11</option>
                          <option value={12}>Class 12</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                          Duration (Minutes) *
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={180}
                          value={testDuration}
                          onChange={(e) => setTestDuration(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                          Due Date &amp; Time (Deadline) *
                        </label>
                        <input
                          type="datetime-local"
                          value={testDueAt}
                          onChange={(e) => setTestDueAt(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-bold bg-stone-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Question Builder Section */}
                    <div className="space-y-4 pt-4 border-t border-stone-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm">
                            Question Builder (MCQs with 4 Options &amp; Marks)
                          </h4>
                          <p className="text-xs text-stone-500">
                            Select the radio button next to the correct answer for automated server-side grading.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                        >
                          <span>➕</span> Add Question
                        </button>
                      </div>

                      <div className="space-y-4">
                        {testQuestions.map((q, qIdx) => (
                          <div
                            key={qIdx}
                            className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded border border-emerald-300">
                                Question {qIdx + 1}
                              </span>
                              <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-stone-600 flex items-center gap-1">
                                  Marks:
                                  <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={q.marks}
                                    onChange={(e) => handleMarksChange(qIdx, Number(e.target.value))}
                                    className="w-16 px-2 py-1 bg-white border border-stone-300 rounded text-center text-xs font-bold"
                                  />
                                </label>
                                {testQuestions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestion(qIdx)}
                                    className="text-red-600 hover:text-red-800 text-xs font-bold"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Question Prompt */}
                            <div>
                              <textarea
                                rows={2}
                                value={q.question}
                                onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                                placeholder={`Enter question ${qIdx + 1} text here...`}
                                className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>

                            {/* 4 MCQ Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                              {q.options.map((opt, optIdx) => {
                                const isCorrect = q.correct_answer === optIdx;
                                const letter = String.fromCharCode(65 + optIdx);
                                return (
                                  <div
                                    key={optIdx}
                                    className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-400'
                                        : 'bg-white border-stone-200'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`correct-ans-${qIdx}`}
                                      checked={isCorrect}
                                      onChange={() => handleCorrectAnswerChange(qIdx, optIdx)}
                                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      title="Mark as correct answer"
                                    />
                                    <span className="font-bold text-xs text-stone-500 w-4">
                                      {letter}.
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                      placeholder={`Option ${letter}`}
                                      className="flex-1 px-2 py-1 text-xs font-medium bg-transparent focus:outline-none"
                                    />
                                    {isCorrect && (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                        Correct
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary and Submission Action Bar */}
                    <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-xs font-bold text-stone-600">
                        <div>
                          Total Questions: <span className="text-emerald-700">{testQuestions.length}</span>
                        </div>
                        <div>
                          Total Marks:{' '}
                          <span className="text-emerald-700">
                            {testQuestions.reduce((sum, q) => sum + Number(q.marks || 1), 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={testCreating}
                          onClick={() => handleCreateTestSubmit(false)}
                          className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-lg text-xs transition"
                        >
                          Save as Draft
                        </button>
                        <button
                          type="button"
                          disabled={testCreating}
                          onClick={() => handleCreateTestSubmit(true)}
                          className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-lg text-xs shadow-md transition flex items-center gap-1.5"
                        >
                          <span>🚀</span> {testCreating ? 'Publishing...' : 'Publish to class'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SUB-VIEW 2: TEST RESULTS & SUBMISSIONS TABLE */
                  <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
                      <div>
                        <h3 className="font-bold text-stone-900 text-base">Select Test for Results</h3>
                        <p className="text-xs text-stone-500">
                          Submissions update live in real-time as students submit.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedResultTestId}
                          onChange={(e) => setSelectedResultTestId(e.target.value)}
                          className="px-3.5 py-2 border border-stone-300 rounded-lg text-xs font-bold bg-stone-50 focus:outline-none"
                        >
                          {teacherTests.map((t) => (
                            <option key={t.id} value={t.id}>
                              Class {t.class} • {t.title} ({t.is_published ? 'Live' : 'Draft'})
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => loadTestResults(selectedResultTestId)}
                          className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg text-xs transition flex items-center gap-1"
                        >
                          <span>🔄</span> Refresh
                        </button>
                      </div>
                    </div>

                    {/* Selected Test Summary Card */}
                    {(() => {
                      const currentTest = teacherTests.find((t) => t.id === selectedResultTestId);
                      if (!currentTest) {
                        return (
                          <div className="text-center py-12 text-stone-500 text-sm font-medium">
                            No tests created yet. Use &quot;Create &amp; Assign Test&quot; above to assign one.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                            <div>
                              <div className="font-bold text-sm text-emerald-950">{currentTest.title}</div>
                              <div className="text-emerald-700 mt-0.5">
                                Class {currentTest.class} • Subject: {currentTest.subject.toUpperCase()} • Duration: {currentTest.duration_minutes} mins
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div>
                                Total Marks: <strong>{currentTest.total_marks}</strong>
                              </div>
                              <div>
                                Due:{' '}
                                <strong>
                                  {new Date(currentTest.due_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </strong>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  currentTest.is_published
                                    ? 'bg-emerald-200 text-emerald-900'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {currentTest.is_published ? '🟢 Published' : '🟡 Draft'}
                              </span>
                            </div>
                          </div>

                          {/* Submissions Table */}
                          <div className="border border-stone-200 rounded-xl overflow-hidden">
                            {submissionsLoading ? (
                              <div className="text-center py-12 text-stone-500 text-sm">
                                ⏳ Fetching live test submissions...
                              </div>
                            ) : testSubmissions.length === 0 ? (
                              <div className="text-center py-12 text-stone-500 text-sm">
                                📭 No students have submitted this test yet.
                                <p className="text-xs text-stone-400 mt-1">
                                  When a student from Class {currentTest.class} finishes their test, their score and status will appear here.
                                </p>
                              </div>
                            ) : (
                              <table className="w-full text-xs sm:text-sm">
                                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                                  <tr>
                                    <th className="p-3 text-left">Student Name</th>
                                    <th className="p-3 text-left">Roll No / ID</th>
                                    <th className="p-3 text-center">Score</th>
                                    <th className="p-3 text-center">Percentage</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-right">Submitted At</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                  {testSubmissions.map((row) => {
                                    const pct =
                                      row.total_marks > 0
                                        ? Math.round((row.score / row.total_marks) * 100)
                                        : 0;

                                    return (
                                      <tr key={row.id} className="hover:bg-stone-50">
                                        <td className="p-3 font-bold text-stone-900">{row.student_name}</td>
                                        <td className="p-3 font-mono text-stone-500 text-xs">{row.student_id}</td>
                                        <td className="p-3 text-center font-bold text-emerald-700">
                                          {row.score} / {row.total_marks}
                                        </td>
                                        <td className="p-3 text-center">
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
                                        <td className="p-3 text-center">
                                          {row.status === 'submitted' && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                              Submitted
                                            </span>
                                          )}
                                          {row.status === 'in_progress' && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                              In progress
                                            </span>
                                          )}
                                          {row.status === 'abrupt' && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                              Abrupt Exit
                                            </span>
                                          )}
                                          {row.status === 'timed_out' && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700 border border-stone-300">
                                              Timed Out
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-3 text-right text-stone-500 text-xs">
                                          {row.submitted_at
                                            ? new Date(row.submitted_at).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })
                                            : '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
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
