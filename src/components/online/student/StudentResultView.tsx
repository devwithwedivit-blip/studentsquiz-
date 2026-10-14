import React from 'react';
import { SubmitAttemptResponse } from '../../../types/online';

interface StudentResultViewProps {
  result: SubmitAttemptResponse;
  onBackToDashboard: () => void;
}

export function StudentResultView({ result, onBackToDashboard }: StudentResultViewProps) {
  const { score, total, percentage, timeTakenSeconds, answersVisible, review, status } = result;

  const mins = Math.floor(timeTakenSeconds / 60);
  const secs = timeTakenSeconds % 60;

  const getPraiseMessage = (pct: number) => {
    if (pct >= 90) return { text: '🌟 Outstanding performance!', color: '#059669' };
    if (pct >= 75) return { text: '👏 Great job! Well done.', color: '#0284c7' };
    if (pct >= 50) return { text: '👍 Good effort! Keep practicing.', color: '#d97706' };
    return { text: '📚 More practice needed. Keep working hard!', color: '#dc2626' };
  };

  const praise = getPraiseMessage(percentage);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '1rem' }}>
      {/* Result Card */}
      <div
        className="notebook-sheet"
        style={{
          padding: '2.5rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
          borderTop: '6px solid var(--accent-color)'
        }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '0.4rem' }}>
          {percentage >= 75 ? '🏆' : percentage >= 50 ? '🎯' : '📖'}
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontSize: '1.8rem' }}>
          Exam Result
        </h2>
        <div
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: praise.color,
            margin: '0.5rem 0 1.5rem 0'
          }}
        >
          {praise.text}
        </div>

        {status === 'timed_out' && (
          <div
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--red-pen-bg)',
              color: 'var(--red-pen)',
              borderRadius: '6px',
              display: 'inline-block',
              fontWeight: 600,
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            ⏱️ Auto-submitted as time expired
          </div>
        )}

        {status === 'abrupt' && (
          <div
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: 'var(--red-pen-bg)',
              border: '1.5px solid var(--red-pen)',
              color: 'var(--red-pen)',
              borderRadius: '6px',
              display: 'inline-block',
              fontWeight: 700,
              fontSize: '0.88rem',
              marginBottom: '1rem'
            }}
          >
            ⚠️ Terminated due to tab-switch violations (Auto-submitted as Abrupt with 0 score)
          </div>
        )}

        {/* Score Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            margin: '1.5rem 0'
          }}
        >
          <div
            style={{
              padding: '1.2rem',
              backgroundColor: 'var(--paper-card)',
              borderRadius: '8px',
              border: '1.5px solid var(--paper-line)'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>Total Score</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: '0.2rem' }}>
              {score} <span style={{ fontSize: '1.1rem', color: 'var(--ink-secondary)' }}>/ {total}</span>
            </div>
          </div>

          <div
            style={{
              padding: '1.2rem',
              backgroundColor: 'var(--paper-card)',
              borderRadius: '8px',
              border: '1.5px solid var(--paper-line)'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>Percentage</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: praise.color, marginTop: '0.2rem' }}>
              {percentage}%
            </div>
          </div>

          <div
            style={{
              padding: '1.2rem',
              backgroundColor: 'var(--paper-card)',
              borderRadius: '8px',
              border: '1.5px solid var(--paper-line)'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>Time Taken</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ink-primary)', marginTop: '0.2rem' }}>
              {mins}m {secs}s
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
          <button
            onClick={onBackToDashboard}
            className="paper-btn paper-btn-accent"
            style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={handlePrint}
            className="paper-btn"
            style={{ padding: '0.6rem 1.2rem', fontWeight: 600 }}
          >
            🖨️ Print Result
          </button>
        </div>
      </div>

      {/* Answer Review Section */}
      {answersVisible ? (
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', margin: '1.5rem 0 1rem 0' }}>
            🔍 Review & Explanations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {review.map((item, idx) => {
              const isFull = item.isCorrect;
              const isPartial = !isFull && (item.marksAwarded > 0);

              return (
                <div
                  key={item.questionId}
                  className="notebook-sheet"
                  style={{
                    padding: '1.2rem',
                    borderLeft: `5px solid ${isFull ? '#059669' : isPartial ? '#d97706' : '#dc2626'}`
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.6rem'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      Question {idx + 1} ({item.type})
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        backgroundColor: isFull ? '#d1fae5' : isPartial ? '#fef3c7' : '#fee2e2',
                        color: isFull ? '#065f46' : isPartial ? '#92400e' : '#991b1b'
                      }}
                    >
                      {item.marksAwarded} / {item.marks} marks
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <strong>Your Answer:</strong>{' '}
                    <span style={{ color: isFull ? '#065f46' : '#991b1b', fontWeight: 600 }}>
                      {typeof item.userResponse === 'object'
                        ? JSON.stringify(item.userResponse)
                        : String(item.userResponse ?? '(Unanswered)')}
                    </span>
                  </div>

                  {item.correctAnswer !== undefined && (
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.4rem', color: '#065f46' }}>
                      <strong>Correct Answer:</strong>{' '}
                      <span style={{ fontWeight: 600 }}>
                        {typeof item.correctAnswer === 'object'
                          ? JSON.stringify(item.correctAnswer)
                          : String(item.correctAnswer)}
                      </span>
                    </div>
                  )}

                  {item.explanation && (
                    <div
                      style={{
                        marginTop: '0.6rem',
                        padding: '0.6rem 0.8rem',
                        backgroundColor: 'var(--yellow-sticky)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        lineHeight: '1.5'
                      }}
                    >
                      💡 <strong>Explanation:</strong> {item.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="notebook-sheet" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
          <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>
            Detailed Review is Locked
          </h4>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            According to the exam settings, correct answers and detailed explanations will be visible only after the exam window ends.
          </p>
        </div>
      )}
    </div>
  );
}
