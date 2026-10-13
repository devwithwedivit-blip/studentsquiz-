import React, { useState, useEffect } from 'react';
import {
  Question,
  QuizConfig,
  QuizResult,
  UserStats,
  ActiveQuizSession,
  UserAnswer
} from './types/quiz';
import { getEffectiveQuestions } from './data/bankLoader';
import {
  saveOverlayQuestion,
  deleteOverlayQuestion,
  resetToOriginalBank,
  getUserStats,
  getBookmarks,
  toggleBookmark,
  getActiveQuizSession,
  clearActiveQuizSession
} from './services/db';
import { NotebookHeader } from './components/common/NotebookHeader';
import { QuizBuilder } from './components/builder/QuizBuilder';
import { QuizPlayer } from './components/player/QuizPlayer';
import { QuizResults } from './components/results/QuizResults';
import { WorksheetPrintView } from './components/results/WorksheetPrintView';
import { BankManager } from './components/manager/BankManager';
import { BookmarksView } from './components/results/BookmarksView';
import { PastAttemptsView } from './components/results/PastAttemptsView';

export function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [activeTab, setActiveTab] = useState<'builder' | 'manager' | 'bookmarks' | 'history'>('builder');
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[] | null>(null);
  const [activeQuizConfig, setActiveQuizConfig] = useState<QuizConfig | null>(null);
  const [latestResult, setLatestResult] = useState<QuizResult | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Mid-quiz resume and storage alerts
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

  // Reload bank
  const reloadBank = async () => {
    try {
      const qs = await getEffectiveQuestions();
      setQuestions(qs);
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

    // Check for mid-quiz recovery session
    const savedSession = getActiveQuizSession();
    if (savedSession && savedSession.questions && savedSession.questions.length > 0) {
      setPendingResumeSession(savedSession);
    }

    // Storage warning listener
    const handleStorageWarn = (e: any) => {
      setStorageWarning(e.detail?.message || 'Storage limit warning');
    };
    window.addEventListener('quizforge:storage-warning', handleStorageWarn);
    return () => window.removeEventListener('quizforge:storage-warning', handleStorageWarn);
  }, []);

  // START QUIZ
  const handleStartQuiz = (config: QuizConfig) => {
    // Select questions according to config
    const pool = questions.filter(q => {
      if (q.isHidden) return false;
      if (q.class !== config.selectedClass) return false;
      if (!config.selectedSubjects.includes(q.subject)) return false;
      if (config.selectedChapters.length > 0 && !config.selectedChapters.includes(q.chapter)) return false;
      if (config.difficulty !== 'mixed' && q.difficulty !== config.difficulty) return false;
      return true;
    });

    // Select questions for each type according to count stepper
    const selected: Question[] = [];
    for (const [t, targetCount] of Object.entries(config.typeCounts)) {
      if (targetCount <= 0) continue;
      const ofType = pool.filter(q => q.type === t && !selected.some(s => s.id === q.id));
      const shuffledOfType = config.shuffleQuestions
        ? [...ofType].sort(() => Math.random() - 0.5)
        : ofType;
      selected.push(...shuffledOfType.slice(0, targetCount));
    }

    // If pool of requested types was smaller, fill with remaining pool
    if (selected.length < config.totalQuestions) {
      const remaining = pool.filter(q => !selected.some(s => s.id === q.id));
      const needed = config.totalQuestions - selected.length;
      selected.push(...remaining.slice(0, needed));
    }

    const finalQuestions = config.shuffleQuestions
      ? [...selected].sort(() => Math.random() - 0.5)
      : selected;

    if (finalQuestions.length === 0) {
      alert('No questions match this selection in the question bank. Please adjust your filters.');
      return;
    }

    // Prompt user if fewer questions are available than requested
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

  // PRACTICE SAVED / WRONG QUESTIONS
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

  // QUESTION BANK ACTIONS
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
      // Mark as deleted in overlay
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
          <p style={{ color: 'var(--ink-secondary)', marginTop: '0.4rem' }}>Loading offline curriculum question bank.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
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
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            ⚠️ {storageWarning}
          </div>
          <button
            className="paper-btn"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
            onClick={() => setStorageWarning(null)}
          >
            ✕
          </button>
        </div>
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
              <span>Unfinished Quiz Session Detected</span>
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
              Class {pendingResumeSession.config.selectedClass} • {pendingResumeSession.questions.length} Questions • {Object.keys(pendingResumeSession.userAnswers || {}).length} answered • Resumes at Question {pendingResumeSession.currentIndex + 1}
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

      {/* VIEW ROUTING */}
      {/* 1. Active Quiz Player */}
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
        /* 2. Results or Printable Question Paper */
        isPrintMode ? (
          <WorksheetPrintView
            questions={latestResult.questionList}
            config={latestResult.config}
            onBack={() => setIsPrintMode(false)}
          />
        ) : (
          <QuizResults
            result={latestResult}
            onRetryQuiz={() => {
              handleStartQuiz(latestResult.config);
            }}
            onRetryMistakes={wrongQs => {
              handlePracticeQuestions(wrongQs);
            }}
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
        /* 3. Quiz Builder */
        <QuizBuilder
          allQuestions={questions}
          onStartQuiz={handleStartQuiz}
          onOpenManager={() => setActiveTab('manager')}
        />
      ) : activeTab === 'manager' ? (
        /* 4. Question Bank Manager */
        <BankManager
          questions={questions}
          onAddQuestion={handleAddQuestion}
          onEditQuestion={handleEditQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onBulkDelete={handleBulkDelete}
          onToggleHide={handleToggleHide}
          onResetBank={handleResetBank}
          onImportQuestions={handleImportQuestions}
          onBackToBuilder={() => setActiveTab('builder')}
        />
      ) : activeTab === 'bookmarks' ? (
        /* 5. Bookmarks / Saved Revision Notes */
        <BookmarksView
          questions={questions}
          bookmarkedIds={bookmarkedIds}
          onToggleBookmark={handleToggleBookmark}
          onPracticeSaved={handlePracticeQuestions}
          onNewQuiz={() => setActiveTab('builder')}
        />
      ) : (
        /* 6. Past Attempts & Badges */
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
  );
}

export default App;
