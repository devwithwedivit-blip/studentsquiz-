import React from 'react';
import { Question } from '../../../types/quiz';
import { HandDrawnIcon } from '../../common/HandDrawnIcon';

interface MultiSelectViewProps {
  question: Question;
  userAnswer: number[] | undefined;
  onToggleOption: (optionIndex: number) => void;
  onSubmit: () => void;
  isLocked: boolean;
  showFeedback: boolean;
}

export const MultiSelectView: React.FC<MultiSelectViewProps> = ({
  question,
  userAnswer = [],
  onToggleOption,
  onSubmit,
  isLocked,
  showFeedback
}) => {
  const options = question.options || [];
  const correctIndices = (Array.isArray(question.answer)
    ? question.answer
    : [Number(question.answer)]
  ).map(Number);
  const correctSet = new Set(correctIndices);
  const selectedSet = new Set(userAnswer);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: '#b45309',
          padding: '0.35rem 0.75rem',
          backgroundColor: 'var(--highlighter-soft)',
          borderRadius: '4px',
          width: 'fit-content'
        }}
      >
        <span>☑ SELECT ALL THAT APPLY (Multiple correct options)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {options.map((option, idx) => {
          const isSelected = selectedSet.has(idx);
          const isCorrect = correctSet.has(idx);

          let borderCol = 'var(--ink-border)';
          let bgCol = 'var(--bg-card)';

          if (showFeedback) {
            if (isCorrect && isSelected) {
              borderCol = 'var(--green-tick)';
              bgCol = 'var(--green-tick-bg)';
            } else if (!isCorrect && isSelected) {
              borderCol = 'var(--red-pen)';
              bgCol = 'var(--red-pen-bg)';
            } else if (isCorrect && !isSelected) {
              borderCol = '#0284c7'; // Missed correct option
              bgCol = '#f0f9ff';
            }
          } else if (isSelected) {
            borderCol = 'var(--ink-primary)';
            bgCol = 'var(--highlighter-soft)';
          }

          return (
            <button
              key={idx}
              disabled={isLocked}
              onClick={() => onToggleOption(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.85rem 1.1rem',
                minHeight: 'var(--min-touch-target)',
                borderRadius: 'var(--radius-card)',
                border: `2px solid ${borderCol}`,
                backgroundColor: bgCol,
                boxShadow: isSelected ? 'var(--shadow-paper-elevated)' : 'var(--shadow-paper)',
                textAlign: 'left',
                cursor: isLocked ? 'default' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Checkbox square */}
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '2px solid var(--ink-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? 'var(--ink-primary)' : 'transparent',
                  flexShrink: 0
                }}
              >
                {isSelected && <HandDrawnIcon name="check" size={16} color="#ffffff" />}
              </div>

              <span style={{ fontSize: '1.05rem', fontWeight: 500, flex: 1 }}>{option}</span>

              {showFeedback && isCorrect && isSelected && (
                <span className="stamp-correct" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>
                  Correct
                </span>
              )}
              {showFeedback && !isCorrect && isSelected && (
                <span className="stamp-wrong" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>
                  Wrong Pick
                </span>
              )}
              {showFeedback && isCorrect && !isSelected && (
                <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700 }}>
                  (Missed)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!isLocked && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
          <button
            className="paper-btn paper-btn-primary"
            onClick={onSubmit}
            disabled={userAnswer.length === 0}
            style={{ opacity: userAnswer.length === 0 ? 0.6 : 1 }}
          >
            <HandDrawnIcon name="check" size={16} />
            <span>Confirm Selections</span>
          </button>
        </div>
      )}
    </div>
  );
};
