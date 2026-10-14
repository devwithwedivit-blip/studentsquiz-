import React, { useState, useEffect } from 'react';
import {
  Question,
  QuizConfig,
  QuizResult,
  UserStats,
  ActiveQuizSession,
  UserAnswer,
  Passage
} from './types/quiz';
import {
  StudentSession,
  StartAttemptResponse,
  SubmitAttemptResponse,
  StaffProfile
} from './types/online';
import { getEffectiveQuestions, getEffectivePassages } from './data/bankLoader';
import {
  saveOverlayQuestion,
  deleteOverlayQuestion,
  resetToOriginalBank,
  getUserStats,
  getBookmarks,
  toggleBookmark,
  getActiveQuizSession,
  clearActiveQuizSession,
  saveOverlayPassage,
  markOverlayPassageDeleted,
  addOverlayPassage,
  updateOverlayPassage
} from './services/db';
import { isSupabaseConfigured } from './services/supabase';
import { getStoredStudentSession, startOnlineAttempt, clearStudentSession } from './services/studentApi';
import { getCurrentStaff, staffLogout, AdminProfile } from './services/adminApi';

// Common & Mode
import { ModeSelector, AppMode } from './components/common/ModeSelector';
import { NotebookHeader } from './components/common/NotebookHeader';

// Practice Components
import { QuizBuilder } from './components/builder/QuizBuilder';
import { QuizPlayer } from './components/player/QuizPlayer';
import { QuizResults } from './components/results/QuizResults';
import { WorksheetPrintView } from './components/results/WorksheetPrintView';
import { BankManager } from './components/manager/BankManager';
import { BookmarksView } from './components/results/BookmarksView';
import { PastAttemptsView } from './components/results/PastAttemptsView';

// Auth & Online Components
import { UnifiedLogin } from './components/auth/UnifiedLogin';
import { StudentDashboard } from './components/online/student/StudentDashboard';
import { OnlineQuizPlayer } from './components/online/student/OnlineQuizPlayer';
import { StudentResultView } from './components/online/student/StudentResultView';
import { TeacherPortal } from './components/online/teacher/TeacherPortal';
import { AdminPortal } from './components/online/admin/AdminPortal';
import { LiveResultsView } from './components/online/results/LiveResultsView';

export function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(true);

  // Online Sessions state
  const [studentSession, setStudentSession] = useState<StudentSession | null>(() => getStoredStudentSession());
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(() => {
    try {
      const stored = localStorage.getItem('quizforge_staff_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // App Mode ('login' | 'student' | 'teacher' | 'admin' | 'practice' | 'results')
  const [appMode, setAppMode] = useState<AppMode>(() => {
    const path = window.location.pathname.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    const m = search.get('mode');

    const hasStudent = Boolean(getStoredStudentSession());
    let staffRole: 'teacher' | 'admin' | null = null;
    try {
      const stored = localStorage.getItem('quizforge_staff_profile');
      if (stored) staffRole = JSON.parse(stored).role;
    } catch {}

    if (m === 'results' || path.startsWith('/results')) return 'results';
    if (m === 'admin' || path.startsWith('/admin')) {
      return staffRole === 'admin' ? 'admin' : 'login';
    }
    if (m === 'teacher' || path.startsWith('/teacher')) {
      return staffRole === 'teacher' || staffRole === 'admin' ? 'teacher' : 'login';
    }
    if (m === 'student' || path.startsWith('/student')) {
      return hasStudent ? 'student' : 'login';
    }
    if (m === 'practice' || path.startsWith('/practice')) {
      return hasStudent ? 'practice' : 'login';
    }

    // Default visit to '/' or other route: if logged in, go to dashboard, else /login
    if (hasStudent) return 'student';
    if (staffRole === 'admin') return 'admin';
    if (staffRole === 'teacher') return 'teacher';
    return 'login';
  });

  // Practice View state
  const [activeTab, setActiveTab] = useState<'builder' | 'manager' | 'bookmarks' | 'history'>('builder');
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[] | null>(null);
  const [activeQuizConfig, setActiveQuizConfig] = useState<QuizConfig | null>(null);
  const [latestResult, setLatestResult] = useState<QuizResult | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Mid-quiz resume and storage alerts (offline practice)
  const [pendingResumeSession, setPendingResumeSession] = useState<ActiveQuizSession | null>(null);
  const [resumeState, setResumeState] = useState<{
    initialAnswers?: Record<string, UserAnswer>;
    initialIndex?: number;
    initialTimeElapsed?: number;
  } | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  // User stats & bookmarks
  const [stats, setStats] = useState<UserStats>({
    totalQuizzesTaken: 0,
    totalQuestionsAnswered: 0,
    correctAnswers: 0,
    currentStreakDays: 1,
    lastActiveDate: '',
    totalXp: 100,
    badges: ['first_step'],
    mistakeQuestionIds: [],
    bookmarkedQuestionIds: []
  });
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const [activeOnlineQuiz, setActiveOnlineQuiz] = useState<StartAttemptResponse | null>(null);
  const [onlineResult, setOnlineResult] = useState<SubmitAttemptResponse | null>(null);
  const [targetQuizId, setTargetQuizId] = useState<string>('');

  // Reload bank
  const reloadBank = async () => {
    try {
      const qs = await getEffectiveQuestions();
      setQuestions(qs);
      const ps = await getEffectivePassages();
      setPassages(ps);
      const s = await getUserStats();
      setStats(s);
      const b = await getBookmarks();
      setBookmarkedIds(new Set(b));
    } catch (err) {
      console.error('Failed to load question bank:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadBank();

    // Check for mid-quiz recovery session in practice mode
    const savedSession = getActiveQuizSession();
    if (savedSession && savedSession.questions && savedSession.questions.length > 0) {
      setPendingResumeSession(savedSession);
    }

    // Check existing staff auth if Supabase online
    getCurrentStaff().then(st => {
      if (st) setStaffProfile(st);
    });

    // Handle popstate for browser back/forward buttons
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/admin')) {
        setAppMode(staffProfile?.role === 'admin' ? 'admin' : 'login');
      } else if (path.startsWith('/teacher')) {
        setAppMode(staffProfile?.role === 'teacher' || staffProfile?.role === 'admin' ? 'teacher' : 'login');
      } else if (path.startsWith('/student')) {
        setAppMode(studentSession ? 'student' : 'login');
      } else if (path.startsWith('/practice')) {
        setAppMode(studentSession ? 'practice' : 'login');
      } else if (path.startsWith('/results')) {
        setAppMode('results');
      } else {
        setAppMode(studentSession ? 'student' : staffProfile ? (staffProfile.role === 'admin' ? 'admin' : 'teacher') : 'login');
      }
    };
    window.addEventListener('popstate', handlePopState);

    // Storage warning listener
    const handleStorageWarn = (e: any) => {
      setStorageWarning(e.detail?.message || 'Storage limit warning');
    };
    window.addEventListener('quizforge:storage-warning', handleStorageWarn);
    return () => {
      window.removeEventListener('quizforge:storage-warning', handleStorageWarn);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Update browser history/URL smoothly when switching mode
  const handleSelectMode = (mode: AppMode) => {
    setAppMode(mode);
    const newUrl = mode === 'login' ? '/login' : `/${mode}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleLogout = async () => {
    clearStudentSession();
    await staffLogout();
    setStudentSession(null);
    setStaffProfile(null);
    setActiveOnlineQuiz(null);
    setOnlineResult(null);
    setAppMode('login');
    window.history.pushState({}, '', '/login');
  };

  const handleStudentLoginSuccess = (sess: StudentSession) => {
    setStudentSession(sess);
    setAppMode('student');
    window.history.pushState({}, '', '/student');
  };

  const handleStaffLoginSuccess = (prof: StaffProfile) => {
    setStaffProfile(prof);
    if (prof.role === 'admin') {
      setAppMode('admin');
      window.history.pushState({}, '', '/admin');
    } else {
      setAppMode('teacher');
      window.history.pushState({}, '', '/teacher');
    }
  };

  // --- ONLINE STUDENT ACTIONS ---
  const handleStartOnlineQuiz = async (quizId: string) => {
    try {
      const data = await startOnlineAttempt(quizId);
      setActiveOnlineQuiz(data);
      setOnlineResult(null);
    } catch (err: any) {
      alert(err.message || 'Unable to start exam.');
    }
  };

  const handleFinishOnlineQuiz = (res: SubmitAttemptResponse) => {
    setActiveOnlineQuiz(null);
    setOnlineResult(res);
  };

  // --- PRACTICE MODE ACTIONS (UNCHANGED) ---
  const handleStartQuiz = (config: QuizConfig) => {
    const pool = questions.filter(q => {
      if (q.isHidden) return false;
      if (q.class !== config.selectedClass) return false;
      if (!config.selectedSubjects.includes(q.subject)) return false;
      if (config.selectedChapters.length > 0 && !config.selectedChapters.includes(q.chapter)) return false;
      if (config.difficulty !== 'mixed' && q.difficulty !== config.difficulty) return false;
      return true;
    });

    const selected: Question[] = [];

    if (config.selectedSubjects.includes('hindi') && config.includePassages !== false && config.passageCount && config.passageCount > 0) {
      const passageQuestions = pool.filter(q => q.passageId);
      const uniquePassageIds = Array.from(new Set(passageQuestions.map(q => q.passageId!)));
      const chosenPassageIds = (config.shuffleQuestions ? [...uniquePassageIds].sort(() => Math.random() - 0.5) : uniquePassageIds)
        .slice(0, config.passageCount);

      for (const pId of chosenPassageIds) {
        const pQs = passageQuestions
          .filter(q => q.passageId === pId)
          .sort((a, b) => (a.passageOrder || 0) - (b.passageOrder || 0));
        selected.push(...pQs);
      }
    }

    const remainingPool = pool.filter(q => {
      if (selected.some(s => s.id === q.id)) return false;
      if (config.includePassages === false && q.passageId) return false;
      return true;
    });

    for (const [t, targetCount] of Object.entries(config.typeCounts)) {
      if (targetCount <= 0) continue;
      const alreadyOfThisType = selected.filter(q => q.type === t).length;
      const stillNeeded = Math.max(0, targetCount - alreadyOfThisType);
      if (stillNeeded <= 0) continue;

      const ofType = remainingPool.filter(q => q.type === t && !selected.some(s => s.id === q.id));
      const shuffledOfType = config.shuffleQuestions
        ? [...ofType].sort(() => Math.random() - 0.5)
        : ofType;
      selected.push(...shuffledOfType.slice(0, stillNeeded));
    }

    if (selected.length < config.totalQuestions) {
      const rest = remainingPool.filter(q => !selected.some(s => s.id === q.id));
      const needed = config.totalQuestions - selected.length;
      selected.push(...rest.slice(0, needed));
    }

    const groups: Question[][] = [];
    const passageMap = new Map<string, Question[]>();

    for (const q of selected) {
      if (q.passageId) {
        if (!passageMap.has(q.passageId)) {
          passageMap.set(q.passageId, []);
        }
        passageMap.get(q.passageId)!.push(q);
      } else {
        groups.push([q]);
      }
    }

    for (const pGroup of passageMap.values()) {
      pGroup.sort((a, b) => (a.passageOrder || 0) - (b.passageOrder || 0));
      groups.push(pGroup);
    }

    const shuffledGroups = config.shuffleQuestions
      ? [...groups].sort(() => Math.random() - 0.5)
      : groups;

    const finalQuestions = shuffledGroups.flat();

    if (finalQuestions.length === 0) {
      alert('No questions match this selection in the question bank. Please adjust your filters.');
      return;
    }

    if (finalQuestions.length < config.totalQuestions) {
      const proceed = window.confirm(
        `Only ${finalQuestions.length} questions match your filter criteria (requested: ${config.totalQuestions}). Would you like to proceed with these ${finalQuestions.length} questions?`
      );
      if (!proceed) return;
    }

    setActiveQuizConfig(config);
    setActiveQuizQuestions(finalQuestions);
    setResumeState(null);
    setLatestResult(null);
    setIsPrintMode(false);
  };

  const handlePracticeQuestions = (targetQuestions: Question[]) => {
    const config: QuizConfig = {
      selectedClass: targetQuestions[0]?.class || 9,
      selectedSubjects: Array.from(new Set(targetQuestions.map(q => q.subject))),
      selectedChapters: [],
      typeCounts: {
        mcq: 0,
        truefalse: 0,
        fillblank: 0,
        match: 0,
        numerical: 0,
        image: 0,
        short: 0,
        logic: 0,
        multiselect: 0,
        ordering: 0
      },
      difficulty: 'mixed',
      totalQuestions: targetQuestions.length,
      timerMode: 'none',
      timerSeconds: 0,
      shuffleQuestions: true,
      negativeMarking: false,
      quizMode: 'practice'
    };

    setActiveQuizConfig(config);
    setActiveQuizQuestions(targetQuestions);
    setLatestResult(null);
    setIsPrintMode(false);
  };

  const handleAddQuestion = async (q: Question) => {
    await saveOverlayQuestion(q);
    await reloadBank();
  };

  const handleEditQuestion = async (q: Question) => {
    await saveOverlayQuestion(q);
    await reloadBank();
  };

  const handleDeleteQuestion = async (id: string) => {
    const target = questions.find(q => q.id === id);
    if (target) {
      await saveOverlayQuestion({ ...target, isUserDeleted: true });
      await reloadBank();
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    for (const id of ids) {
      const target = questions.find(q => q.id === id);
      if (target) {
        await saveOverlayQuestion({ ...target, isUserDeleted: true });
      }
    }
    await reloadBank();
  };

  const handleToggleHide = async (id: string) => {
    const target = questions.find(q => q.id === id);
    if (target) {
      await saveOverlayQuestion({ ...target, isHidden: !target.isHidden });
      await reloadBank();
    }
  };

  const handleResetBank = async () => {
    await resetToOriginalBank();
    await reloadBank();
  };

  const handleImportQuestions = async (imported: Question[]) => {
    for (const q of imported) {
      await saveOverlayQuestion({ ...q, isUserAdded: true });
    }
    await reloadBank();
  };

  const handleAddPassage = async (p: Passage) => {
    await addOverlayPassage(p);
    await reloadBank();
  };

  const handleEditPassage = async (p: Passage) => {
    await updateOverlayPassage(p);
    await reloadBank();
  };

  const handleDeletePassage = async (id: string, deleteLinkedQuestions: boolean) => {
    await markOverlayPassageDeleted(id);
    if (deleteLinkedQuestions) {
      const linked = questions.filter(q => q.passageId === id);
      for (const q of linked) {
        await saveOverlayQuestion({ ...q, isUserDeleted: true });
      }
    } else {
      const linked = questions.filter(q => q.passageId === id);
      for (const q of linked) {
        const { passageId, passageOrder, passage, ...rest } = q;
        await saveOverlayQuestion({ ...rest, passageId: undefined, passageOrder: undefined });
      }
    }
    await reloadBank();
  };

  const handleDuplicatePassage = async (p: Passage) => {
    const newId = `${p.id}-copy-${Date.now()}`;
    const newPassage: Passage = {
      ...p,
      id: newId,
      title: `${p.title} (Copy)`
    };
    await addOverlayPassage(newPassage);
    await reloadBank();
  };

  const handleImportPassages = async (imported: Passage[]) => {
    for (const p of imported) {
      await addOverlayPassage(p);
    }
    await reloadBank();
  };

  const handleToggleBookmark = async (qId: string) => {
    const isNow = await toggleBookmark(qId);
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (isNow) next.add(qId);
      else next.delete(qId);
      return next;
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="notebook-sheet" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)' }}>Opening QuizForge Notebook...</h2>
          <p style={{ color: 'var(--ink-secondary)', marginTop: '0.4rem' }}>Loading question bank and offline curriculum.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Application Mode Selector */}
      {!activeQuizQuestions && !activeOnlineQuiz && appMode !== 'login' && (
        <ModeSelector
          currentMode={appMode}
          onSelectMode={handleSelectMode}
          isOnlineConfigured={isSupabaseConfigured}
          studentSession={studentSession}
          staffProfile={staffProfile}
          onLogout={handleLogout}
        />
      )}

      {/* Storage Warning Alert */}
      {storageWarning && (
        <div
          className="notebook-sheet"
          style={{
            marginBottom: '1rem',
            padding: '0.8rem 1.2rem',
            backgroundColor: 'var(--red-pen-bg)',
            border: '1.5px solid var(--red-pen)',
            color: 'var(--red-pen)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.8rem'
          }}
        >
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>⚠️ {storageWarning}</div>
          <button
            className="paper-btn"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
            onClick={() => setStorageWarning(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. UNIFIED LOGIN SCREEN (/login)                         */}
      {/* ======================================================== */}
      {appMode === 'login' ? (
        <UnifiedLogin
          onStudentLoginSuccess={handleStudentLoginSuccess}
          onStaffLoginSuccess={handleStaffLoginSuccess}
          defaultRoleCard={
            window.location.pathname.toLowerCase().startsWith('/admin')
              ? 'admin'
              : window.location.pathname.toLowerCase().startsWith('/teacher')
              ? 'teacher'
              : 'student'
          }
        />
      ) : appMode === 'student' ? (
        /* ======================================================== */
        /* 2. STUDENT PORTAL (/student)                             */
        /* ======================================================== */
        !studentSession ? (
          <UnifiedLogin
            onStudentLoginSuccess={handleStudentLoginSuccess}
            onStaffLoginSuccess={handleStaffLoginSuccess}
            defaultRoleCard="student"
          />
        ) : activeOnlineQuiz ? (
          <OnlineQuizPlayer
            quizData={activeOnlineQuiz}
            onFinish={handleFinishOnlineQuiz}
            onQuit={() => {
              if (window.confirm('Are you sure you want to exit the exam? Your progress has already been saved.')) {
                setActiveOnlineQuiz(null);
              }
            }}
          />
        ) : onlineResult ? (
          <StudentResultView
            result={onlineResult}
            onBackToDashboard={() => setOnlineResult(null)}
          />
        ) : (
          <StudentDashboard
            session={studentSession}
            onLogout={handleLogout}
            onStartQuiz={handleStartOnlineQuiz}
            onViewAttempt={() => {}}
          />
        )
      ) : appMode === 'teacher' ? (
        /* ======================================================== */
        /* 3. TEACHER PORTAL (/teacher)                             */
        /* ======================================================== */
        !staffProfile || (staffProfile.role !== 'teacher' && staffProfile.role !== 'admin') ? (
          <UnifiedLogin
            onStudentLoginSuccess={handleStudentLoginSuccess}
            onStaffLoginSuccess={handleStaffLoginSuccess}
            defaultRoleCard="teacher"
          />
        ) : (
          <TeacherPortal
            teacher={staffProfile}
            allQuestions={questions}
            onLogout={handleLogout}
            onOpenLiveResults={id => {
              setTargetQuizId(id);
              handleSelectMode('results');
            }}
          />
        )
      ) : appMode === 'admin' ? (
        /* ======================================================== */
        /* 4. ADMIN PORTAL (/admin)                                 */
        /* ======================================================== */
        !staffProfile || staffProfile.role !== 'admin' ? (
          <UnifiedLogin
            onStudentLoginSuccess={handleStudentLoginSuccess}
            onStaffLoginSuccess={handleStaffLoginSuccess}
            defaultRoleCard="admin"
          />
        ) : (
          <AdminPortal
            admin={staffProfile}
            allQuestions={questions}
            onLogout={handleLogout}
            onOpenLiveResults={id => {
              setTargetQuizId(id);
              handleSelectMode('results');
            }}
          />
        )
      ) : appMode === 'results' ? (
        /* ======================================================== */
        /* 5. LIVE RESULTS VIEWER (/results)                        */
        /* ======================================================== */
        <LiveResultsView
          initialQuizId={targetQuizId}
          onBackToAdmin={() => handleSelectMode(staffProfile?.role === 'teacher' ? 'teacher' : 'admin')}
          onBackToHome={() => handleSelectMode(studentSession ? 'student' : 'login')}
        />
      ) : (
        /* ======================================================== */
        /* 6. PRACTICE MODE (GATED BEHIND STUDENT SIGN-IN)          */
        /* ======================================================== */
        !studentSession ? (
          <div className="space-y-4">
            <div
              className="notebook-sheet"
              style={{
                padding: '1rem',
                backgroundColor: '#fef3c7',
                border: '1.5px solid #d97706',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: 600,
                color: '#92400e'
              }}
            >
              ⚠️ Please sign in as a student first to start practice mode.
            </div>
            <UnifiedLogin
              onStudentLoginSuccess={handleStudentLoginSuccess}
              onStaffLoginSuccess={handleStaffLoginSuccess}
              defaultRoleCard="student"
            />
          </div>
        ) : (
        /* ======================================================== */
        /* 4. OFFLINE PRACTICE MODE (DEFAULT PHASE 1-7)             */
        /* ======================================================== */
        <div>
          {/* Notebook Header */}
          {!activeQuizQuestions && (
            <NotebookHeader
              activeTab={activeTab}
              onSelectTab={tab => {
                setActiveTab(tab);
                setLatestResult(null);
                setIsPrintMode(false);
              }}
              streakDays={stats.currentStreakDays}
              totalXp={stats.totalXp}
            />
          )}

          {/* Mid-Quiz Session Recovery Sticky Note */}
          {pendingResumeSession && !activeQuizQuestions && (
            <div
              className="notebook-sheet"
              style={{
                marginBottom: '1rem',
                padding: '1rem 1.4rem',
                backgroundColor: 'var(--yellow-sticky)',
                border: '2px dashed var(--yellow-sticky-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.8rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📌</span>
                  <span>Unfinished Practice Session Detected</span>
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                  Class {pendingResumeSession.config.selectedClass} • {pendingResumeSession.questions.length} Questions • {Object.keys(pendingResumeSession.userAnswers || {}).length} answered
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  className="paper-btn paper-btn-accent"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.88rem' }}
                  onClick={() => {
                    setActiveQuizConfig(pendingResumeSession.config);
                    setActiveQuizQuestions(pendingResumeSession.questions);
                    setResumeState({
                      initialAnswers: pendingResumeSession.userAnswers,
                      initialIndex: pendingResumeSession.currentIndex,
                      initialTimeElapsed: pendingResumeSession.totalTimeElapsed
                    });
                    setPendingResumeSession(null);
                    setLatestResult(null);
                  }}
                >
                  Resume Quiz
                </button>
                <button
                  className="paper-btn"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.88rem' }}
                  onClick={() => {
                    clearActiveQuizSession();
                    setPendingResumeSession(null);
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Practice View Routing */}
          {activeQuizQuestions && activeQuizConfig && !latestResult ? (
            <QuizPlayer
              questions={activeQuizQuestions}
              config={activeQuizConfig}
              initialAnswers={resumeState?.initialAnswers}
              initialIndex={resumeState?.initialIndex}
              initialTimeElapsed={resumeState?.initialTimeElapsed}
              onFinishQuiz={res => {
                setLatestResult(res);
                setResumeState(null);
                reloadBank();
              }}
              onQuitQuiz={() => {
                if (window.confirm('Are you sure you want to exit this test session?')) {
                  setActiveQuizQuestions(null);
                  setActiveQuizConfig(null);
                  setResumeState(null);
                }
              }}
            />
          ) : latestResult ? (
            isPrintMode ? (
              <WorksheetPrintView
                questions={latestResult.questionList}
                config={latestResult.config}
                onBack={() => setIsPrintMode(false)}
              />
            ) : (
              <QuizResults
                result={latestResult}
                onRetryQuiz={() => handleStartQuiz(latestResult.config)}
                onRetryMistakes={wrongQs => handlePracticeQuestions(wrongQs)}
                onNewQuiz={() => {
                  setLatestResult(null);
                  setActiveQuizQuestions(null);
                  setActiveQuizConfig(null);
                  setActiveTab('builder');
                }}
                onPrintWorksheet={() => setIsPrintMode(true)}
              />
            )
          ) : activeTab === 'builder' ? (
            <QuizBuilder
              allQuestions={questions}
              onStartQuiz={handleStartQuiz}
              onOpenManager={() => setActiveTab('manager')}
            />
          ) : activeTab === 'manager' ? (
            <BankManager
              questions={questions}
              passages={passages}
              onAddQuestion={handleAddQuestion}
              onEditQuestion={handleEditQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onBulkDelete={handleBulkDelete}
              onToggleHide={handleToggleHide}
              onResetBank={handleResetBank}
              onImportQuestions={handleImportQuestions}
              onImportPassages={handleImportPassages}
              onAddPassage={handleAddPassage}
              onEditPassage={handleEditPassage}
              onDeletePassage={handleDeletePassage}
              onDuplicatePassage={handleDuplicatePassage}
              onBackToBuilder={() => setActiveTab('builder')}
            />
          ) : activeTab === 'bookmarks' ? (
            <BookmarksView
              questions={questions}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              onPracticeSaved={handlePracticeQuestions}
              onNewQuiz={() => setActiveTab('builder')}
            />
          ) : (
            <PastAttemptsView
              onSelectAttempt={att => {
                setLatestResult(att);
                setActiveQuizConfig(att.config);
                setActiveQuizQuestions(att.questionList);
              }}
              onNewQuiz={() => setActiveTab('builder')}
            />
          )}
        </div>
        )
      )}
    </div>
  );
}

export default App;
