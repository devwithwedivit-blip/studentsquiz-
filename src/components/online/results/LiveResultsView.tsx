import React, { useState, useEffect } from 'react';
import {
  getQuizResultsOverview,
  subscribeToQuizAttempts,
  getAttemptDetail,
  formatQuizResultsCSV,
  QuizResultsOverview,
  DetailedStudentAttempt
} from '../../../services/resultsApi';
import { getAdminQuizzes } from '../../../services/adminApi';
import { OnlineQuiz } from '../../../types/online';

interface LiveResultsViewProps {
  initialQuizId?: string;
  onBackToAdmin?: () => void;
  onBackToHome?: () => void;
}

export function LiveResultsView({ initialQuizId, onBackToAdmin, onBackToHome }: LiveResultsViewProps) {
  const [quizzes, setQuizzes] = useState<OnlineQuiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>(initialQuizId || '');
  const [overview, setOverview] = useState<QuizResultsOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAttemptDetail, setSelectedAttemptDetail] = useState<DetailedStudentAttempt | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);

  // Load available quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const list = await getAdminQuizzes();
        setQuizzes(list);
        if (!selectedQuizId && list.length > 0) {
          setSelectedQuizId(list[0].id);
        }
      } catch (e) {
        console.error('Failed to load quizzes for results:', e);
      }
    };
    fetchQuizzes();
  }, []);

  // Fetch overview & subscribe to realtime updates
  useEffect(() => {
    if (!selectedQuizId) return;

    let active = true;
    const fetchOverview = async () => {
      setLoading(true);
      try {
        const data = await getQuizResultsOverview(selectedQuizId);
        if (active) setOverview(data);
      } catch (err) {
        console.error('Error fetching results overview:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchOverview();

    // Realtime subscription
    const unsubscribe = subscribeToQuizAttempts(selectedQuizId, () => {
      fetchOverview();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [selectedQuizId]);

  const handleOpenDetail = async (attemptId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await getAttemptDetail(attemptId);
      setSelectedAttemptDetail(detail);
    } catch (err: any) {
      alert(err.message || 'Unable to load details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!overview) return;
    const csvContent = formatQuizResultsCSV(overview);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${overview.quiz.title.replace(/\s+/g, '_')}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isPrintMode && overview) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#fff', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Class Result Sheet</h2>
            <p style={{ margin: '0.3rem 0', color: '#555' }}>
              {overview.quiz.title} • Class {overview.quiz.class}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button
              onClick={() => window.print()}
              className="paper-btn paper-btn-accent"
              style={{ padding: '0.4rem 0.8rem' }}
            >
              Print
            </button>
            <button
              onClick={() => setIsPrintMode(false)}
              className="paper-btn"
              style={{ padding: '0.4rem 0.8rem' }}
            >
              Back
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #999' }}>
              <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>S.No.</th>
              <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Student Name</th>
              <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Class</th>
              <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Status</th>
              <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Score</th>
              <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Percentage (%)</th>
              <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>Time Taken</th>
            </tr>
          </thead>
          <tbody>
            {overview.attempts.map((att, idx) => (
              <tr key={att.id} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: '0.5rem', border: '1px solid #ccc', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ padding: '0.5rem', border: '1px solid #ccc', fontWeight: 600 }}>{att.student_name}</td>
                <td style={{ padding: '0.5rem', border: '1px solid #ccc', textAlign: 'center' }}>{att.student_class}</td>
                <td style={{ padding: '0.5rem', border: '1px solid #ccc', textAlign: 'center' }}>{att.status}</td>
                <td style={{ padding: '0.5rem', border: '1px solid #ccc', textAlign: 'center' }}>
                  {att.score ?? '-'} / {att.total ?? overview.maxPossibleScore}
                </td>
                <td style={{ padding: '0.5rem', border: '1px solid #ccc', textAlign: 'center' }}>
                  {att.total ? Math.round(((att.score || 0) / att.total) * 100) : 0}%
                </td>
                <td style={{ padding: '0.5rem', border: '1px solid #ccc', textAlign: 'center' }}>
                  {att.time_taken_seconds ? Math.round(att.time_taken_seconds / 60) + ' min' : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem' }}>
      {/* Top Bar with Quiz Selector and Navigation */}
      <div
        className="notebook-sheet"
        style={{
          padding: '1.2rem 1.6rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '6px solid #059669'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>
            📊 Live Exam Results (Realtime)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>Select Exam:</span>
            <select
              value={selectedQuizId}
              onChange={e => setSelectedQuizId(e.target.value)}
              className="paper-input"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.9rem', fontWeight: 600 }}
            >
              {quizzes.map(q => (
                <option key={q.id} value={q.id}>
                  {q.title} (Class {q.class})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {onBackToAdmin && (
            <button onClick={onBackToAdmin} className="paper-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              ← Admin Portal
            </button>
          )}
          {onBackToHome && (
            <button onClick={onBackToHome} className="paper-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              🏠 Home
            </button>
          )}
          <button
            onClick={handleDownloadCSV}
            disabled={!overview}
            className="paper-btn"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            📥 Download CSV
          </button>
          <button
            onClick={() => setIsPrintMode(true)}
            disabled={!overview}
            className="paper-btn paper-btn-accent"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 700 }}
          >
            🖨️ Result Sheet
          </button>
        </div>
      </div>

      {loading || !overview ? (
        <div className="notebook-sheet" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-secondary)' }}>Loading live data...</p>
        </div>
      ) : (
        <div>
          {/* Live Counter Pulse Banner */}
          <div
            className="notebook-sheet"
            style={{
              padding: '1.2rem 1.6rem',
              marginBottom: '1.5rem',
              backgroundColor: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.3)'
                }}
              />
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46' }}>
                  {overview.submittedCount} of {overview.totalStudentsInClass || overview.attempts.length} submitted (
                  {overview.totalStudentsInClass > 0
                    ? Math.round((overview.submittedCount / overview.totalStudentsInClass) * 100)
                    : 0}
                  %)
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857' }}>
                  {overview.inProgressCount} students taking exam • {overview.timedOutCount} timed out
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
              ⚡ Live auto-updates via Supabase Realtime
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            <div
              className="notebook-sheet"
              style={{ padding: '1.2rem', textAlign: 'center', borderTop: '4px solid var(--accent-color)' }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>Average Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: '0.2rem' }}>
                {overview.averageScore} <span style={{ fontSize: '1rem', color: 'var(--ink-secondary)' }}>/ {overview.maxPossibleScore}</span>
              </div>
            </div>

            <div
              className="notebook-sheet"
              style={{ padding: '1.2rem', textAlign: 'center', borderTop: '4px solid #059669' }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>Highest Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
                {overview.highestScore}
              </div>
            </div>

            <div
              className="notebook-sheet"
              style={{ padding: '1.2rem', textAlign: 'center', borderTop: '4px solid #dc2626' }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>Lowest Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>
                {overview.lowestScore}
              </div>
            </div>

            <div
              className="notebook-sheet"
              style={{ padding: '1.2rem', textAlign: 'center', borderTop: '4px solid #d97706' }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>Average Time</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ink-primary)', marginTop: '0.2rem' }}>
                {Math.round(overview.averageTimeSeconds / 60)} min
              </div>
            </div>
          </div>

          {/* Score Distribution Visual Bar */}
          <div className="notebook-sheet" style={{ padding: '1.4rem', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>
              📊 Score Range Distribution
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {(Object.entries(overview.scoreBuckets) as [string, number][]).map(([range, count]) => {
                const totalSubs = overview.submittedCount || 1;
                const pct = Math.round((count / totalSubs) * 100);

                return (
                  <div key={range} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>{range}</div>
                    <div
                      style={{
                        height: '100px',
                        backgroundColor: 'var(--paper-card)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        padding: '0.3rem',
                        border: '1px solid var(--paper-line)'
                      }}
                    >
                      <div
                        style={{
                          width: '80%',
                          height: `${Math.max(8, pct)}%`,
                          backgroundColor:
                            range === '81-100%'
                              ? '#059669'
                              : range === '61-80%'
                              ? '#0284c7'
                              : range === '41-60%'
                              ? '#d97706'
                              : '#dc2626',
                          borderRadius: '4px',
                          transition: 'height 0.4s ease'
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.4rem' }}>
                      {count} students ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Submissions Table */}
          <div className="notebook-sheet" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>
              Student Attempt Submissions
            </h4>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Student Name</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Score</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Percentage</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Time</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Submitted At</th>
                    <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.attempts.map(att => {
                    const isSub = att.status === 'submitted';
                    const isProg = att.status === 'in_progress';

                    return (
                      <tr key={att.id} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                        <td style={{ padding: '0.7rem 0.5rem', fontWeight: 600 }}>{att.student_name}</td>
                        <td style={{ padding: '0.7rem 0.5rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: isSub ? '#d1fae5' : isProg ? '#fef3c7' : '#fee2e2',
                              color: isSub ? '#065f46' : isProg ? '#92400e' : '#991b1b'
                            }}
                          >
                            {isSub ? '✓ Submitted' : isProg ? '⏳ In Progress' : 'Timed Out'}
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 0.5rem', fontWeight: 700, color: 'var(--accent-color)' }}>
                          {att.score ?? '-'} / {att.total ?? overview.maxPossibleScore}
                        </td>
                        <td style={{ padding: '0.7rem 0.5rem' }}>
                          {att.total ? Math.round(((att.score || 0) / att.total) * 100) + '%' : '-'}
                        </td>
                        <td style={{ padding: '0.7rem 0.5rem' }}>
                          {att.time_taken_seconds ? Math.round(att.time_taken_seconds / 60) + ' min' : '-'}
                        </td>
                        <td style={{ padding: '0.7rem 0.5rem', fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                          {att.submitted_at
                            ? new Date(att.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenDetail(att.id)}
                            className="paper-btn"
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                          >
                            Review Answers →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Student Attempt Detail Modal */}
      {selectedAttemptDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div
            className="notebook-sheet"
            style={{
              maxWidth: '750px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '2rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>
                  {selectedAttemptDetail.attempt.student_name}'s Answer Sheet
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                  Score: <strong>{selectedAttemptDetail.attempt.score}</strong> / {selectedAttemptDetail.attempt.total}
                </div>
              </div>
              <button
                onClick={() => setSelectedAttemptDetail(null)}
                className="paper-btn"
                style={{ padding: '0.3rem 0.6rem' }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {selectedAttemptDetail.answers.map((ans, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1rem',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${ans.isCorrect ? '#059669' : '#dc2626'}`,
                    backgroundColor: 'var(--paper-card)',
                    fontSize: '0.9rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <strong>Q{idx + 1}: {ans.questionText}</strong>
                    <span style={{ fontWeight: 700, color: ans.isCorrect ? '#059669' : '#dc2626' }}>
                      {ans.marksAwarded} / {ans.maxMarks} marks
                    </span>
                  </div>

                  <div style={{ marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--ink-secondary)' }}>Student's Answer:</span>{' '}
                    <strong>{typeof ans.userResponse === 'object' ? JSON.stringify(ans.userResponse) : String(ans.userResponse ?? '(Unanswered)')}</strong>
                  </div>

                  {ans.correctAnswer !== undefined && (
                    <div style={{ color: '#065f46', marginBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--ink-secondary)' }}>Correct Answer:</span>{' '}
                      <strong>{typeof ans.correctAnswer === 'object' ? JSON.stringify(ans.correctAnswer) : String(ans.correctAnswer)}</strong>
                    </div>
                  )}

                  {ans.explanation && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.3rem' }}>
                      💡 {ans.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
