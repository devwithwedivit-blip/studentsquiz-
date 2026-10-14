import React, { useState, useEffect } from 'react';
import { getAvailableQuizzes, getMyAttempts, clearStudentSession } from '../../../services/studentApi';
import { StudentSession, OnlineQuiz, OnlineAttempt } from '../../../types/online';

interface StudentDashboardProps {
  session: StudentSession;
  onLogout: () => void;
  onStartQuiz: (quizId: string) => void;
  onViewAttempt: (attemptId: string) => void;
}

export function StudentDashboard({
  session,
  onLogout,
  onStartQuiz,
  onViewAttempt
}: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'history'>('quizzes');
  const [quizzes, setQuizzes] = useState<OnlineQuiz[]>([]);
  const [attempts, setAttempts] = useState<OnlineAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [qList, aList] = await Promise.all([
        getAvailableQuizzes(session.student.class),
        getMyAttempts(session.student.id)
      ]);
      setQuizzes(qList);
      setAttempts(aList);
    } catch (err: any) {
      setError(err.message || 'Error loading data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      clearStudentSession();
      onLogout();
    }
  };

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
              Class: <strong>Class {session.student.class}</strong> • Roll No / ID: {session.student.id}
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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem' }}>
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
          📜 Past Results ({attempts.length})
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
          <p style={{ color: 'var(--ink-secondary)' }}>Loading quiz list...</p>
        </div>
      ) : activeTab === 'quizzes' ? (
        /* Quizzes List */
        <div>
          {quizzes.length === 0 ? (
            <div className="notebook-sheet" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📭</div>
              <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>
                No active quizzes available
              </h4>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                When a teacher publishes a quiz for Class {session.student.class}, it will appear here.
              </p>
              <button onClick={loadData} className="paper-btn" style={{ marginTop: '0.8rem' }}>
                🔄 Refresh
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              {quizzes.map(quiz => {
                const existingAttempt = attempts.find(a => a.quiz_id === quiz.id);
                const isCompleted = existingAttempt && existingAttempt.status !== 'in_progress';
                const isInProgress = existingAttempt && existingAttempt.status === 'in_progress';

                return (
                  <div
                    key={quiz.id}
                    className="notebook-sheet"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: '5px solid var(--accent-color)'
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.25rem',
                            color: 'var(--ink-primary)'
                          }}
                        >
                          {quiz.title}
                        </h4>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isCompleted
                              ? 'var(--green-highlighter)'
                              : isInProgress
                              ? 'var(--yellow-sticky)'
                              : 'var(--paper-tag)',
                            color: isCompleted ? '#065f46' : 'var(--ink-primary)'
                          }}
                        >
                          {isCompleted ? '✓ Submitted' : isInProgress ? '⏳ In Progress' : 'Open'}
                        </span>
                      </div>

                      {quiz.description && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)', margin: '0.3rem 0 0.8rem 0' }}>
                          {quiz.description}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '1rem',
                          fontSize: '0.85rem',
                          color: 'var(--ink-secondary)',
                          margin: '0.8rem 0'
                        }}
                      >
                        <div>⏱️ Duration: <strong>{quiz.duration_minutes} mins</strong></div>
                        <div>❓ Questions: <strong>{quiz.question_count || 'Full Set'}</strong></div>
                        {quiz.negative_marking && (
                          <div style={{ color: 'var(--red-pen)', fontWeight: 600 }}>
                            ⚠️ Negative Marking (-0.25)
                          </div>
                        )}
                        {quiz.shuffle && <div>🔀 Shuffled Order</div>}
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
      ) : (
        /* History / Past Attempts */
        <div>
          {attempts.length === 0 ? (
            <div className="notebook-sheet" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-secondary)' }}>You have not taken any online quizzes yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem' }}>
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
                      {' • '} Status: <strong>{att.status === 'submitted' ? 'Completed' : att.status === 'timed_out' ? 'Timed Out' : 'Incomplete'}</strong>
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
      )}
    </div>
  );
}
