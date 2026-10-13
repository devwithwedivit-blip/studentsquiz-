import React, { useState, useEffect } from 'react';
import { Question } from '../../../types/quiz';
import { HandDrawnIcon } from '../../common/HandDrawnIcon';

interface FillBlankViewProps {
  question: Question;
  userAnswer: string | undefined;
  onChangeAnswer: (val: string) => void;
  onSubmit: () => void;
  isLocked: boolean;
  showFeedback: boolean;
  isCorrect?: boolean;
}

export const FillBlankView: React.FC<FillBlankViewProps> = ({
  question,
  userAnswer = '',
  onChangeAnswer,
  onSubmit,
  isLocked,
  showFeedback,
  isCorrect
}) => {
  const [localVal, setLocalVal] = useState(userAnswer);

  useEffect(() => {
    setLocalVal(userAnswer);
  }, [userAnswer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value);
    onChangeAnswer(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLocked) {
      onSubmit();
    }
  };

  // Split question by "____" to render inline input
  const parts = question.question.split('____');

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div
        className="notebook-sheet"
        style={{
          padding: '1.4rem',
          fontSize: '1.25rem',
          lineHeight: '2.2',
          border: '1.5px solid var(--ink-border)',
          backgroundColor: 'var(--bg-card)'
        }}
      >
        <span>{parts[0]}</span>

        {/* Inline handwritten input */}
        <span style={{ display: 'inline-block', position: 'relative', margin: '0 0.4rem' }}>
          <input
            type="text"
            disabled={isLocked}
            value={localVal}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="fill in blank"
            autoFocus
            style={{
              fontFamily: 'var(--font-handwritten)',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--ink-primary)',
              backgroundColor: isLocked ? 'transparent' : 'var(--highlighter-soft)',
              border: 'none',
              borderBottom: showFeedback
                ? isCorrect
                  ? '3px solid var(--green-tick)'
                  : '3px solid var(--red-pen)'
                : '2.5px solid var(--ink-primary)',
              borderRadius: '2px',
              padding: '0.1rem 0.6rem',
              minWidth: '150px',
              maxWidth: '240px',
              outline: 'none',
              textAlign: 'center'
            }}
          />
        </span>

        {parts.length > 1 && <span>{parts.slice(1).join('____')}</span>}
      </div>

      {!isLocked && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="paper-btn paper-btn-primary"
            onClick={onSubmit}
            disabled={!localVal.trim()}
            style={{ opacity: !localVal.trim() ? 0.6 : 1 }}
          >
            <HandDrawnIcon name="check" size={16} />
            <span>Check Answer</span>
          </button>
        </div>
      )}

      {showFeedback && (
        <div
          style={{
            padding: '0.8rem 1rem',
            borderRadius: 'var(--radius-card)',
            backgroundColor: isCorrect ? 'var(--green-tick-bg)' : 'var(--red-pen-bg)',
            border: `1.5px solid ${isCorrect ? 'var(--green-tick)' : 'var(--red-pen)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}
        >
          <HandDrawnIcon
            name={isCorrect ? 'check' : 'cross'}
            size={20}
            color={isCorrect ? 'var(--green-tick)' : 'var(--red-pen)'}
          />
          <div>
            <span style={{ fontWeight: 700, color: isCorrect ? 'var(--green-tick)' : 'var(--red-pen)' }}>
              {isCorrect ? 'Correct! ' : 'Incorrect. '}
            </span>
            <span style={{ fontSize: '0.95rem' }}>
              Accepted answers: <strong>{question.acceptedAnswers?.join(' / ') || String(question.answer)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
