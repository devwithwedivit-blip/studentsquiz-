import React, { useEffect } from 'react';
import { Question } from '../../../types/quiz';
import { HandDrawnIcon } from '../../common/HandDrawnIcon';

interface MCQViewProps {
  question: Question;
  userAnswer: number | undefined;
  onSelectOption: (optionIndex: number) => void;
  isLocked: boolean; // locked in practice mode after answering
  showFeedback: boolean;
  isPractice: boolean;
}

export const MCQView: React.FC<MCQViewProps> = ({
  question,
  userAnswer,
  onSelectOption,
  isLocked,
  showFeedback
}) => {
  const options = question.options || [];
  const labels = ['A', 'B', 'C', 'D'];

  // Keyboard accessibility: A, B, C, D or 1, 2, 3, 4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return;
      const key = e.key.toUpperCase();
      if (key === 'A' || key === '1') onSelectOption(0);
      else if (key === 'B' || key === '2') onSelectOption(1);
      else if (key === 'C' || key === '3') onSelectOption(2);
      else if (key === 'D' || key === '4') onSelectOption(3);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, onSelectOption]);

  const correctIndex = Number(question.answer);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', width: '100%' }}>
      {options.map((option, idx) => {
        const isSelected = userAnswer === idx;
        const isCorrectOpt = idx === correctIndex;

        let borderCol = 'var(--ink-border)';
        let bgCol = 'var(--bg-card)';
        let textCol = 'var(--ink-primary)';

        if (showFeedback) {
          if (isCorrectOpt) {
            borderCol = 'var(--green-tick)';
            bgCol = 'var(--green-tick-bg)';
            textCol = 'var(--green-tick)';
          } else if (isSelected && !isCorrectOpt) {
            borderCol = 'var(--red-pen)';
            bgCol = 'var(--red-pen-bg)';
            textCol = 'var(--red-pen)';
          }
        } else if (isSelected) {
          borderCol = 'var(--ink-primary)';
          bgCol = 'var(--highlighter-soft)';
        }

        return (
          <button
            key={idx}
            disabled={isLocked}
            onClick={() => onSelectOption(idx)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.9rem 1.2rem',
              minHeight: 'var(--min-touch-target)',
              borderRadius: 'var(--radius-card)',
              border: `2px solid ${borderCol}`,
              backgroundColor: bgCol,
              color: textCol,
              boxShadow: isSelected ? 'var(--shadow-paper-elevated)' : 'var(--shadow-paper)',
              transform: isSelected ? 'translate(0, -2px)' : 'none',
              transition: 'all 0.15s ease',
              textAlign: 'left',
              width: '100%',
              cursor: isLocked ? 'default' : 'pointer'
            }}
          >
            {/* Option Badge A, B, C, D */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                border: '1.5px solid currentColor',
                fontWeight: 700,
                fontSize: '0.95rem',
                flexShrink: 0,
                backgroundColor: isSelected ? 'var(--highlighter-yellow)' : 'transparent',
                color: isSelected ? '#0f172a' : 'inherit'
              }}
            >
              {labels[idx]}
            </span>

            <span style={{ fontSize: '1.05rem', fontWeight: 500, flex: 1 }}>{option}</span>

            {/* Stamp / icon on feedback */}
            {showFeedback && isCorrectOpt && (
              <span className="stamp-correct" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                <HandDrawnIcon name="check" size={14} /> Correct
              </span>
            )}
            {showFeedback && isSelected && !isCorrectOpt && (
              <span className="stamp-wrong" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                <HandDrawnIcon name="cross" size={14} /> Incorrect
              </span>
            )}
          </button>
        );
      })}

      <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: '0.2rem' }}>
        Tip: Press <kbd style={{ padding: '0.1rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}>A</kbd>, <kbd style={{ padding: '0.1rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}>B</kbd>, <kbd style={{ padding: '0.1rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}>C</kbd>, <kbd style={{ padding: '0.1rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '3px' }}>D</kbd> on your keyboard to select
      </div>
    </div>
  );
};
