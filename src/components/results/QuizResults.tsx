import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { QuizResult, Question } from '../../types/quiz';
import { SUBJECTS } from '../../data/subjects';
import { HandDrawnIcon } from '../common/HandDrawnIcon';
import { getUserStats } from '../../services/db';

interface QuizResultsProps {
  result: QuizResult;
  onRetryQuiz: () => void;
  onRetryMistakes: (wrongQuestions: Question[]) => void;
  onNewQuiz: () => void;
  onPrintWorksheet: () => void;
}

export const QuizResults: React.FC<QuizResultsProps> = ({
  result,
  onRetryQuiz,
  onRetryMistakes,
  onNewQuiz,
  onPrintWorksheet
}) => {
  const [filterReview, setFilterReview] = useState<'all' | 'wrong' | 'flagged'>('all');
  const [streakDays, setStreakDays] = useState(1);
  const [totalXp, setTotalXp] = useState(0);

  useEffect(() => {
    // Confetti only on 80%+ scores
    if (result.accuracyPercentage >= 80) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }

    getUserStats().then(s => {
      setStreakDays(s.currentStreakDays);
      setTotalXp(s.totalXp);
    });
  }, [result.accuracyPercentage]);

  // Breakdown calculations
  const breakdownByType: Record<string, { total: number; correct: number }> = {};
  const breakdownByChapter: Record<string, { total: number; correct: number }> = {};
  const wrongQuestions: Question[] = [];

  for (const q of result.questionList) {
    const ans = result.userAnswers[q.id];
    const isCorrect = Boolean(ans?.isCorrect);

    if (!isCorrect && !ans?.isSkipped) {
      wrongQuestions.push(q);
    }

    // By Type
    if (!breakdownByType[q.type]) {
      breakdownByType[q.type] = { total: 0, correct: 0 };
    }
    breakdownByType[q.type].total++;
    if (isCorrect) breakdownByType[q.type].correct++;

    // By Chapter
    if (!breakdownByChapter[q.chapter]) {
      breakdownByChapter[q.chapter] = { total: 0, correct: 0 };
    }
    breakdownByChapter[q.chapter].total++;
    if (isCorrect) breakdownByChapter[q.chapter].correct++;
  }

  // Find weak chapters (<60% accuracy)
  const weakChapters = Object.entries(breakdownByChapter)
    .filter(([_, stats]) => stats.total >= 1 && (stats.correct / stats.total) < 0.6)
    .map(([chap]) => chap);

  const avgTimePerQuestion = Math.round(
    result.totalTimeSpentSeconds / Math.max(1, result.attemptedQuestions)
  );

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
      {/* Score Summary Sheet */}
      <div
        className="notebook-sheet"
        style={{
          padding: '2rem',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1rem',
          border: '2.5px solid var(--ink-border)'
        }}
      >
        <span className="handwritten-note" style={{ fontSize: '1.3rem', color: 'var(--ink-secondary)' }}>
          {result.accuracyPercentage >= 80
            ? '★ Excellent Work, Scholar!'
            : result.accuracyPercentage >= 50
            ? 'Good Effort! Let\'s revise weak concepts'
            : 'Keep Practicing! Review the model answers below'}
        </span>

        {/* Score Stamp Display */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '4rem', fontWeight: 900, color: 'var(--ink-primary)' }}>
            {result.score}
          </span>
          <span style={{ fontSize: '1.8rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
            / {result.maxScore} marks
          </span>
        </div>

        {/* Big Accuracy & Stats Pill */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: result.accuracyPercentage >= 70 ? 'var(--green-tick)' : 'var(--red-pen)' }}>
              {result.accuracyPercentage}%
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Accuracy</span>
          </div>

          <div style={{ width: '1px', backgroundColor: 'var(--ink-border)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green-tick)' }}>
              {result.correctCount}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Correct</span>
          </div>

          <div style={{ width: '1px', backgroundColor: 'var(--ink-border)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--red-pen)' }}>
              {result.wrongCount}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Mistakes</span>
          </div>

          <div style={{ width: '1px', backgroundColor: 'var(--ink-border)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ca8a04' }}>
              {avgTimePerQuestion}s
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Avg Time / Q</span>
          </div>

          <div style={{ width: '1px', backgroundColor: 'var(--ink-border)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7c3aed' }}>
              +{result.xpEarned} XP
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Notebook XP</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.8rem' }}>
          <button className="paper-btn paper-btn-primary" onClick={onNewQuiz}>
            <HandDrawnIcon name="plus" size={16} />
            <span>New Practice Quiz</span>
          </button>

          {wrongQuestions.length > 0 && (
            <button
              className="paper-btn paper-btn-accent"
              onClick={() => onRetryMistakes(wrongQuestions)}
            >
              <HandDrawnIcon name="undo" size={16} />
              <span>Retry Mistake Questions ({wrongQuestions.length})</span>
            </button>
          )}

          <button className="paper-btn" onClick={onRetryQuiz}>
            <HandDrawnIcon name="reset" size={16} />
            <span>Retake This Exact Test</span>
          </button>

          <button className="paper-btn" onClick={onPrintWorksheet}>
            <HandDrawnIcon name="print" size={16} />
            <span>Print as Question Paper</span>
          </button>
        </div>
      </div>

      {/* Weak Areas & Revision Advice */}
      {weakChapters.length > 0 && (
        <div
          className="notebook-sheet"
          style={{
            padding: '1.2rem',
            backgroundColor: 'var(--red-pen-bg)',
            border: '2px dashed var(--red-pen)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--red-pen)' }}>
            <HandDrawnIcon name="cross" size={18} color="var(--red-pen)" />
            <span>Teacher's Note: Chapters to Revisit in NCERT</span>
          </div>
          <p style={{ fontSize: '0.95rem' }}>
            You scored under 60% in: <strong>{weakChapters.join(', ')}</strong>. Focus on revision of these textbook theorems and solved examples.
          </p>
        </div>
      )}

      {/* Breakdown by Question Type & Chapter */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.2rem'
        }}
      >
        {/* Type Breakdown */}
        <div className="notebook-sheet" style={{ padding: '1.2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>Breakdown by Question Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {Object.entries(breakdownByType).map(([type, stats]) => {
              const pct = Math.round((stats.correct / stats.total) * 100);
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{type}</span>
                    <span>
                      {stats.correct}/{stats.total} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-paper-subtle)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 70 ? 'var(--green-tick)' : '#ca8a04' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chapter Breakdown */}
        <div className="notebook-sheet" style={{ padding: '1.2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>Breakdown by Chapter</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {Object.entries(breakdownByChapter).map(([chapter, stats]) => {
              const pct = Math.round((stats.correct / stats.total) * 100);
              return (
                <div key={chapter}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600 }}>{chapter}</span>
                    <span>
                      {stats.correct}/{stats.total} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-paper-subtle)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 70 ? 'var(--green-tick)' : 'var(--red-pen)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full Question Review Sheet with Explanations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <h3 style={{ fontSize: '1.3rem' }}>Complete Question Review & Answer Key</h3>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              className={`paper-btn ${filterReview === 'all' ? 'paper-btn-primary' : ''}`}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
              onClick={() => setFilterReview('all')}
            >
              All ({result.questionList.length})
            </button>
            <button
              className={`paper-btn ${filterReview === 'wrong' ? 'paper-btn-primary' : ''}`}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
              onClick={() => setFilterReview('wrong')}
            >
              Mistakes Only ({result.wrongCount})
            </button>
          </div>
        </div>

        {/* Old bank version alert for past Hindi attempts */}
        {result.config?.selectedSubjects?.includes('hindi') && (result as any).bankVersion !== 'v2_hindi_rewrite' && (
          <div
            className="notebook-sheet"
            style={{
              padding: '0.9rem 1.2rem',
              backgroundColor: 'var(--red-pen-bg)',
              color: 'var(--red-pen)',
              border: '1.5px dashed var(--red-pen)',
              borderRadius: '6px',
              fontSize: '0.92rem',
              fontWeight: 600
            }}
          >
            ⚠️ This attempt used an older version of the Hindi bank.
          </div>
        )}

        {result.questionList
          .filter(q => {
            const ans = result.userAnswers[q.id];
            if (filterReview === 'wrong') return !ans?.isCorrect;
            return true;
          })
          .map((q, idx) => {
            const ans = result.userAnswers[q.id];
            const isCorrect = Boolean(ans?.isCorrect);

            return (
              <div
                key={q.id}
                className="notebook-sheet"
                style={{
                  padding: '1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                  borderLeft: `5px solid ${isCorrect ? 'var(--green-tick)' : 'var(--red-pen)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                    Q{idx + 1} • {q.chapter} ({q.type})
                  </span>
                  <span
                    className={isCorrect ? 'stamp-correct' : 'stamp-wrong'}
                    style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}
                  >
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                {/* Unseen Passage if linked to question */}
                {q.passage && (
                  <div
                    style={{
                      padding: '0.8rem 1rem',
                      backgroundColor: 'var(--bg-paper-subtle)',
                      borderRadius: '4px',
                      borderLeft: '3px solid var(--accent, #aa3bff)',
                      fontSize: '0.92rem',
                      lineHeight: '1.8',
                      fontFamily: "'Noto Sans Devanagari', sans-serif",
                      whiteSpace: q.passage.kind === 'padya' ? 'pre-line' : 'pre-wrap'
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--ink-secondary)' }}>
                      {q.passage.kind === 'padya' ? '📜 संबद्ध काव्यांश:' : '📄 संबद्ध गद्यांश:'}
                    </strong>
                    {q.passage.text}
                  </div>
                )}

                <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{q.question}</div>


                {q.image && (
                  <div
                    style={{ maxWidth: '280px', margin: '0.4rem auto' }}
                    dangerouslySetInnerHTML={{ __html: q.image.src }}
                  />
                )}

                <div style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
                  <strong>Your Answer:</strong>{' '}
                  <span style={{ color: isCorrect ? 'var(--green-tick)' : 'var(--red-pen)' }}>
                    {ans?.answer !== undefined ? JSON.stringify(ans.answer) : 'Skipped'}
                  </span>
                </div>

                <div
                  style={{
                    padding: '0.8rem',
                    backgroundColor: 'var(--bg-paper-subtle)',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    lineHeight: '1.6'
                  }}
                >
                  <strong style={{ color: 'var(--ink-primary)' }}>Working & Explanation: </strong>
                  {q.explanation}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
