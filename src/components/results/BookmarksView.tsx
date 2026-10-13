import React from 'react';
import { Question } from '../../types/quiz';
import { SUBJECTS } from '../../data/subjects';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface BookmarksViewProps {
  questions: Question[];
  bookmarkedIds: Set<string>;
  onToggleBookmark: (qId: string) => void;
  onPracticeSaved: (savedQuestions: Question[]) => void;
  onNewQuiz: () => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  questions,
  bookmarkedIds,
  onToggleBookmark,
  onPracticeSaved,
  onNewQuiz
}) => {
  const savedQuestions = questions.filter(q => bookmarkedIds.has(q.id));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <div
        className="notebook-sheet"
        style={{
          padding: '1.6rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>Saved Revision Notes</h1>
          <p style={{ color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
            Questions you bookmarked during tests for targeted last-minute review.
          </p>
        </div>

        {savedQuestions.length > 0 && (
          <button
            className="paper-btn paper-btn-accent"
            onClick={() => onPracticeSaved(savedQuestions)}
          >
            <HandDrawnIcon name="pencil" size={16} />
            <span>Practice These {savedQuestions.length} Questions</span>
          </button>
        )}
      </div>

      {savedQuestions.length === 0 ? (
        <div className="notebook-sheet" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.1rem', color: 'var(--ink-secondary)' }}>
            No questions bookmarked yet. Tap the <strong>Save</strong> button on any question during a quiz to add it to your revision notebook!
          </p>
          <button className="paper-btn paper-btn-primary" onClick={onNewQuiz} style={{ marginTop: '1rem' }}>
            Start a Practice Test
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {savedQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="notebook-sheet"
              style={{
                padding: '1.2rem 1.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
                borderLeft: '4px solid #b45309'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                    #{idx + 1}
                  </span>
                  <span
                    style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '3px',
                      backgroundColor: 'var(--bg-paper-subtle)',
                      fontWeight: 700,
                      fontSize: '0.78rem'
                    }}
                  >
                    Class {q.class} • {SUBJECTS[q.subject]?.name || q.subject}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
                    {q.chapter}
                  </span>
                </div>

                <button
                  className="paper-btn"
                  onClick={() => onToggleBookmark(q.id)}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem', minHeight: '28px' }}
                >
                  ✕ Remove
                </button>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{q.question}</div>

              {q.image && (
                <div
                  style={{ maxWidth: '280px', margin: '0.3rem auto' }}
                  dangerouslySetInnerHTML={{ __html: q.image.src }}
                />
              )}

              <div
                style={{
                  padding: '0.8rem',
                  backgroundColor: 'var(--bg-paper-subtle)',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}
              >
                <strong>Answer & Explanation: </strong>
                <span>{q.explanation}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
