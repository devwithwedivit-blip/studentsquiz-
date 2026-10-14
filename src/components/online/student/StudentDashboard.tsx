import React, { useState, useEffect } from 'react';
import { getAvailableQuizzes, getMyAttempts, clearStudentSession } from '../../../services/studentApi';
import { getTeacherTestsForStudent, subscribeToTeacherTestUpdates } from '../../../services/teacherTestApi';
import { StudentSession, OnlineQuiz, OnlineAttempt } from '../../../types/online';
import { TeacherTestCardItem } from '../../../types/teacherTest';
import { formatClassLabel, normalizeClass } from '../../../utils/classNormalizer';

interface StudentDashboardProps {
  session: StudentSession;
  onLogout: () => void;
  onStartQuiz: (quizId: string) => void;
  onViewAttempt: (attemptId: string) => void;
  onStartTeacherTest?: (testId: string) => void;
  onViewTeacherTestResult?: (testId: string, submissionId: string) => void;
}

export function StudentDashboard({
  session,
  onLogout,
  onStartQuiz,
  onViewAttempt,
  onStartTeacherTest,
  onViewTeacherTestResult
}: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'history' | 'teacher_tests'>('quizzes');
  const [quizzes, setQuizzes] = useState<OnlineQuiz[]>([]);
  const [attempts, setAttempts] = useState<OnlineAttempt[]>([]);
  const [teacherTests, setTeacherTests] = useState<TeacherTestCardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherTestsError, setTeacherTestsError] = useState<string | null>(null);
  const [teacherTestsLoading, setTeacherTestsLoading] = useState<boolean>(false);

  const loadTeacherTests = async () => {
    setTeacherTestsLoading(true);
    setTeacherTestsError(null);
    try {
      const ttList = await getTeacherTestsForStudent(session.student.class, session.student.id);
      setTeacherTests(ttList);
    } catch (err: any) {
      console.error('Failed to load tests:', err);
      setTeacherTestsError(err?.message || "Couldn't load tests from server.");
    } finally {
      setTeacherTestsLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [qList, aList] = await Promise.all([
        getAvailableQuizzes(session.student.class).catch(e => {
          console.error('Failed to load practice quizzes:', e);
          return [];
        }),
        getMyAttempts(session.student.id).catch(e => {
          console.error('Failed to load past attempts:', e);
          return [];
        })
      ]);
      setQuizzes(qList);
      setAttempts(aList);
    } catch (err: any) {
      setError(err.message || 'Error loading data.');
    } finally {
      setLoading(false);
    }
    await loadTeacherTests();
  };

  const refreshTeacherTestsSilently = async () => {
    try {
      const ttList = await getTeacherTestsForStudent(session.student.class, session.student.id);
      setTeacherTests(ttList);
      setTeacherTestsError(null);
    } catch (err) {
      console.warn('Realtime refresh of teacher tests skipped:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Instant realtime synchronization when a teacher publishes a test
    const unsubscribe = subscribeToTeacherTestUpdates(session.student.class, () => {
      refreshTeacherTestsSilently();
    });

    // 3-second heartbeat polling for guaranteed cross-browser realtime sync
    const interval = setInterval(() => {
      refreshTeacherTestsSilently();
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [session.student.class, session.student.id]);

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      clearStudentSession();
      onLogout();
    }
  };

  // Pending tests for the tab badge: only 'new' or 'in_progress'
  const pendingTeacherTests = teacherTests.filter(t => t.status === 'new' || t.status === 'in_progress');
  const pendingTeacherTestsCount = pendingTeacherTests.length;

  // Submitted teacher tests to include in Past Results
  const submittedTeacherTests = teacherTests.filter(
    t => t.status === 'submitted' || t.submission?.status === 'submitted' || t.submission?.status === 'abrupt' || t.submission?.status === 'timed_out'
  );
  const totalPastResults = attempts.length + submittedTeacherTests.length;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      {/* Student Profile Ribbon */}
      <div
        className="notebook-sheet"
        style={{
          padding: '1.2rem 1.6rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--yellow-sticky)',
          border: '1.5px solid var(--yellow-sticky-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-color)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800
            }}
          >
            {session.student.name.charAt(0)}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
              {session.student.name}
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
              Class: <strong>{formatClassLabel(session.student.class)}</strong> • Roll No / ID: {session.student.id}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogoutClick}
          className="paper-btn"
          style={{
            padding: '0.4rem 0.9rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--red-pen)',
            borderColor: 'var(--red-pen)'
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`paper-btn ${activeTab === 'quizzes' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          📝 Available Quizzes ({quizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`paper-btn ${activeTab === 'history' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          📜 Past Results ({totalPastResults})
        </button>
        <button
          onClick={() => setActiveTab('teacher_tests')}
          className={`paper-btn ${activeTab === 'teacher_tests' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          📋 Teacher Tests ({pendingTeacherTestsCount})
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '0.8rem 1.2rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            backgroundColor: 'var(--red-pen-bg)',
            border: '1.5px solid var(--red-pen)',
            color: 'var(--red-pen)',
            fontWeight: 600
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="notebook-sheet" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-secondary)' }}>Loading tests and quizzes...</p>
        </div>
      ) : activeTab === 'quizzes' ? (
        /* ======================================================== */
        /* PANEL 1: Available Quizzes (Unchanged)                   */
        /* ======================================================== */
        <div>
          {quizzes.length === 0 ? (
            <div className="notebook-sheet" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📭</div>
              <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>
                No active quizzes available
              </h4>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                When a quiz is published for {formatClassLabel(session.student.class)}, it will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
              {quizzes.map(quiz => {
                const existingAttempt = attempts.find(a => a.quiz_id === quiz.id);
                const isInProgress = existingAttempt?.status === 'in_progress';
                const isCompleted = existingAttempt && existingAttempt.status !== 'in_progress';

                return (
                  <div
                    key={quiz.id}
                    className="notebook-sheet"
                    style={{
                      padding: '1.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: `5px solid ${isCompleted ? '#16a34a' : isInProgress ? '#ca8a04' : 'var(--accent-color)'}`
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            backgroundColor: 'var(--paper-card)',
                            border: '1px solid var(--paper-line)',
                            color: 'var(--ink-secondary)'
                          }}
                        >
                          Class {quiz.class}
                        </span>
                        {isCompleted ? (
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>
                            ✓ Completed
                          </span>
                        ) : isInProgress ? (
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ca8a04' }}>
                            ⏳ In Progress
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-color)' }}>
                            ● Ready to Start
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: '0.2rem 0 0.6rem 0', fontFamily: 'var(--font-heading)', fontSize: '1.25rem', lineHeight: 1.3 }}>
                        {quiz.title}
                      </h3>

                      {quiz.description && (
                        <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', margin: '0 0 0.8rem 0', lineHeight: 1.4 }}>
                          {quiz.description}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                          gap: '0.5rem',
                          padding: '0.8rem',
                          backgroundColor: 'var(--paper-card)',
                          borderRadius: '6px',
                          border: '1px solid var(--paper-line)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div>📝 <strong>{quiz.question_count || 10}</strong> Questions</div>
                        <div>⏱️ <strong>{quiz.duration_minutes}</strong> mins</div>
                        <div>🎯 <strong>{quiz.total_marks || (quiz.question_count || 10)}</strong> Marks</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                      {isCompleted ? (
                        <button
                          onClick={() => existingAttempt && onViewAttempt(existingAttempt.id)}
                          className="paper-btn"
                          style={{ padding: '0.5rem 1rem', fontWeight: 600 }}
                        >
                          View Score →
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartQuiz(quiz.id)}
                          className="paper-btn paper-btn-accent"
                          style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}
                        >
                          {isInProgress ? 'Resume Quiz →' : 'Start Quiz →'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'history' ? (
        /* ======================================================== */
        /* PANEL 2: Past Results (Includes Submitted Teacher Tests) */
        /* ======================================================== */
        <div>
          {totalPastResults === 0 ? (
            <div className="notebook-sheet" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-secondary)' }}>You have not taken any online quizzes or tests yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem' }}>
              {/* 1. Submitted Teacher Tests */}
              {submittedTeacherTests.map(tt => {
                const sub = tt.submission;
                const score = sub?.score ?? 0;
                const total = sub?.total_marks || tt.total_marks;
                const pct = total > 0 ? Math.round((score / total) * 100) : 0;
                const statusLabel =
                  sub?.status === 'abrupt'
                    ? 'Terminated (Abrupt)'
                    : sub?.status === 'timed_out'
                    ? 'Timed Out'
                    : 'Completed';

                return (
                  <div
                    key={`tt-hist-${tt.id}`}
                    className="notebook-sheet"
                    style={{
                      padding: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      borderLeft: '4px solid #16a34a'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #7dd3fc'
                          }}
                        >
                          📋 Teacher Test
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                          Teacher: {tt.teacher_name}
                        </span>
                      </div>
                      <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>
                        {tt.title}
                      </h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.3rem' }}>
                        Date:{' '}
                        {new Date(sub?.submitted_at || sub?.started_at || tt.due_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {' • '} Status: <strong>{statusLabel}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-color)' }}>
                          {score} / {total}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                          {pct}% Score
                        </div>
                      </div>

                      <button
                        onClick={() => onViewTeacherTestResult?.(tt.id, sub?.id || '')}
                        className="paper-btn"
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* 2. Regular Quiz Attempts */}
              {attempts.map(att => (
                <div
                  key={att.id}
                  className="notebook-sheet"
                  style={{
                    padding: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>
                      {att.quiz_title}
                    </h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.3rem' }}>
                      Date:{' '}
                      {new Date(att.started_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {' • '} Status:{' '}
                      <strong>
                        {att.status === 'submitted'
                          ? 'Completed'
                          : att.status === 'timed_out'
                          ? 'Timed Out'
                          : 'Incomplete'}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    {att.status !== 'in_progress' && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-color)' }}>
                          {att.score ?? 0} / {att.total ?? 0}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                          {att.total ? Math.round(((att.score || 0) / att.total) * 100) : 0}% Score
                        </div>
                      </div>
                    )}

                    {att.status === 'in_progress' ? (
                      <button
                        onClick={() => onStartQuiz(att.quiz_id)}
                        className="paper-btn paper-btn-accent"
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                      >
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={() => onViewAttempt(att.id)}
                        className="paper-btn"
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ======================================================== */
        /* PANEL 3: 📋 Teacher Tests (Assigned to Student's Class)   */
        /* ======================================================== */
        <div>
          {teacherTestsLoading ? (
            <div className="notebook-sheet" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-secondary)' }}>Loading tests from your teacher...</p>
            </div>
          ) : teacherTestsError ? (
            <div className="notebook-sheet" style={{ padding: '2.5rem', textAlign: 'center', border: '1.5px solid var(--red-pen)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', color: 'var(--red-pen)' }}>
                Couldn't load tests. Retry.
              </h4>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginTop: '0.4rem', marginBottom: '1.2rem' }}>
                {teacherTestsError}
              </p>
              <button
                onClick={loadTeacherTests}
                className="paper-btn paper-btn-accent"
                style={{ padding: '0.5rem 1.4rem', fontWeight: 700 }}
              >
                🔄 Retry
              </button>
            </div>
          ) : teacherTests.length === 0 ? (
            <div className="notebook-sheet" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📭</div>
              <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>
                No tests from your teacher yet. Check back soon.
              </h4>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                Class-specific tests assigned by your teacher for {formatClassLabel(session.student.class)} will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
              {teacherTests.map(tt => {
                return (
                  <div
                    key={tt.id}
                    className="notebook-sheet"
                    style={{
                      padding: '1.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: `5px solid ${
                        tt.status === 'submitted'
                          ? '#16a34a'
                          : tt.status === 'in_progress'
                          ? '#ca8a04'
                          : tt.status === 'expired'
                          ? '#9ca3af'
                          : 'var(--accent-color)'
                      }`
                    }}
                  >
                    <div>
                      {/* Top Badges Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          marginBottom: '0.6rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '4px',
                              backgroundColor: 'var(--paper-card)',
                              border: '1px solid var(--paper-line)',
                              color: 'var(--ink-secondary)'
                            }}
                          >
                            {tt.subject}
                          </span>
                          {tt.isDueSoon && tt.status !== 'submitted' && tt.status !== 'expired' && (
                            <span
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #f59e0b',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              ⏰ Due soon
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div>
                          {tt.status === 'new' && (
                            <span
                              style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: '4px',
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                border: '1.5px solid #0284c7',
                                fontSize: '0.8rem',
                                fontWeight: 700
                              }}
                            >
                              New
                            </span>
                          )}
                          {tt.status === 'in_progress' && (
                            <span
                              style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: '4px',
                                backgroundColor: '#fef9c3',
                                color: '#854d0e',
                                border: '1.5px solid #ca8a04',
                                fontSize: '0.8rem',
                                fontWeight: 700
                              }}
                            >
                              In progress
                            </span>
                          )}
                          {tt.status === 'submitted' && (
                            <span
                              style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: '4px',
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                border: '1.5px solid #16a34a',
                                fontSize: '0.8rem',
                                fontWeight: 700
                              }}
                            >
                              Submitted
                            </span>
                          )}
                          {tt.status === 'expired' && (
                            <span
                              style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: '4px',
                                backgroundColor: '#f3f4f6',
                                color: '#6b7280',
                                border: '1.5px solid #9ca3af',
                                fontSize: '0.8rem',
                                fontWeight: 700
                              }}
                            >
                              Expired
                            </span>
                          )}
                        </div>
                      </div>

                      <h3
                        style={{
                          margin: '0.2rem 0 0.4rem 0',
                          fontFamily: 'var(--font-heading)',
                          fontSize: '1.25rem',
                          lineHeight: 1.3
                        }}
                      >
                        {tt.title}
                      </h3>

                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--ink-secondary)',
                          marginBottom: '0.8rem'
                        }}
                      >
                        Teacher: <strong style={{ color: 'var(--ink-primary)' }}>{tt.teacher_name}</strong>
                      </div>

                      {/* Details Box */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '0.5rem',
                          padding: '0.8rem',
                          backgroundColor: 'var(--paper-card)',
                          borderRadius: '6px',
                          border: '1px solid var(--paper-line)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div>📝 <strong>{tt.question_count}</strong> Questions</div>
                        <div>⏱️ <strong>{tt.duration_minutes}</strong> mins</div>
                        <div>🎯 <strong>{tt.total_marks}</strong> Marks</div>
                        <div>
                          📅 Due:{' '}
                          <strong>
                            {new Date(tt.due_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                      {tt.status === 'new' && (
                        <button
                          onClick={() => onStartTeacherTest?.(tt.id)}
                          className="paper-btn paper-btn-accent"
                          style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}
                        >
                          Start Test →
                        </button>
                      )}
                      {tt.status === 'in_progress' && (
                        <button
                          onClick={() => onStartTeacherTest?.(tt.id)}
                          className="paper-btn paper-btn-accent"
                          style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}
                        >
                          Resume →
                        </button>
                      )}
                      {tt.status === 'submitted' && (
                        <button
                          onClick={() => onViewTeacherTestResult?.(tt.id, tt.submission?.id || '')}
                          className="paper-btn"
                          style={{ padding: '0.5rem 1rem', fontWeight: 600 }}
                        >
                          View Result →
                        </button>
                      )}
                      {tt.status === 'expired' && (
                        <button
                          disabled
                          className="paper-btn"
                          style={{
                            padding: '0.5rem 1rem',
                            opacity: 0.5,
                            cursor: 'not-allowed',
                            backgroundColor: '#e5e7eb'
                          }}
                        >
                          Expired
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
