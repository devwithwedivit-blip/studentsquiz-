import React, { useState, useEffect } from 'react';
import { Question } from '../../../types/quiz';
import { HandDrawnIcon } from '../../common/HandDrawnIcon';

interface ShortAnswerViewProps {
  question: Question;
  userAnswer: string | undefined;
  onChangeAnswer: (val: string) => void;
  onSubmit: () => void;
  onSelfGradeCorrect: () => void;
  isLocked: boolean;
  showFeedback: boolean;
  isCorrect?: boolean;
}

export const ShortAnswerView: React.FC<ShortAnswerViewProps> = ({
  question,
  userAnswer = '',
  onChangeAnswer,
  onSubmit,
  onSelfGradeCorrect,
  isLocked,
  showFeedback,
  isCorrect
}) => {
  const [val, setVal] = useState(userAnswer);

  useEffect(() => {
    setVal(userAnswer);
  }, [userAnswer]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <textarea
          rows={3}
          disabled={isLocked}
          value={val}
          onChange={e => {
            setVal(e.target.value);
            onChangeAnswer(e.target.value);
          }}
          placeholder="Write your answer in 1-3 concise lines..."
          style={{
            width: '100%',
            padding: '1rem',
            fontFamily: 'var(--font-body)',
            fontSize: '1.1rem',
            lineHeight: '1.6',
            color: 'var(--ink-primary)',
            backgroundColor: 'var(--bg-card)',
            border: showFeedback
              ? isCorrect
                ? '2.5px solid var(--green-tick)'
                : '2.5px solid var(--red-pen)'
              : '2px solid var(--ink-border)',
            borderRadius: 'var(--radius-card)',
            outline: 'none',
            resize: 'vertical',
            boxShadow: 'var(--shadow-paper)'
          }}
        />
        <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
          Checked leniently against key curriculum keywords and standard CBSE phrasing.
        </div>
      </div>

      {!isLocked && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="paper-btn paper-btn-primary"
            onClick={onSubmit}
            disabled={!val.trim()}
            style={{ opacity: !val.trim() ? 0.6 : 1 }}
          >
            <HandDrawnIcon name="check" size={16} />
            <span>Submit Answer</span>
          </button>
        </div>
      )}

      {/* Feedback & Model Answer with Self-Grade Fallback */}
      {showFeedback && (
        <div
          className="notebook-sheet"
          style={{
            padding: '1.2rem',
            backgroundColor: isCorrect ? 'var(--green-tick-bg)' : 'var(--red-pen-bg)',
            border: `2px solid ${isCorrect ? 'var(--green-tick)' : 'var(--red-pen)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <HandDrawnIcon
              name={isCorrect ? 'check' : 'cross'}
              size={20}
              color={isCorrect ? 'var(--green-tick)' : 'var(--red-pen)'}
            />
            <span style={{ fontSize: '1.1rem', color: isCorrect ? 'var(--green-tick)' : 'var(--red-pen)' }}>
              {isCorrect ? 'Marked Correct!' : 'Needs Review'}
            </span>
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
              Model Answer:
            </div>
            <p style={{ fontWeight: 600, marginTop: '0.2rem' }}>
              {String(question.answer)}
            </p>
          </div>

          {question.keywords && question.keywords.length > 0 && (
            <div style={{ fontSize: '0.85rem' }}>
              <strong>Key terms expected:</strong> {question.keywords.join(', ')}
            </div>
          )}

          {/* Self-Grade "I was close / mark me correct" button */}
          {!isCorrect && (
            <div
              style={{
                marginTop: '0.4rem',
                paddingTop: '0.6rem',
                borderTop: '1px dashed var(--ink-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.6rem'
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                Did you express the right concept in your own words?
              </span>
              <button
                className="paper-btn paper-btn-accent"
                onClick={onSelfGradeCorrect}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                <HandDrawnIcon name="check" size={14} />
                <span>I was close / Mark me correct</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
