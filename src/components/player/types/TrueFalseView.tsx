import React, { useEffect } from 'react';
import { Question } from '../../../types/quiz';
import { HandDrawnIcon } from '../../common/HandDrawnIcon';

interface TrueFalseViewProps {
  question: Question;
  userAnswer: boolean | undefined;
  onSelectAnswer: (val: boolean) => void;
  isLocked: boolean;
  showFeedback: boolean;
}

export const TrueFalseView: React.FC<TrueFalseViewProps> = ({
  question,
  userAnswer,
  onSelectAnswer,
  isLocked,
  showFeedback
}) => {
  const correctAnswer = question.answer === true || question.answer === 'true';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return;
      const key = e.key.toUpperCase();
      if (key === 'T' || key === '1') onSelectAnswer(true);
      else if (key === 'F' || key === '2') onSelectAnswer(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, onSelectAnswer]);

  const getStyle = (isTrueButton: boolean) => {
    const isSelected = userAnswer === isTrueButton;
    const isCorrectChoice = isTrueButton === correctAnswer;

    let borderCol = 'var(--ink-border)';
    let bgCol = 'var(--bg-card)';
    let textCol = 'var(--ink-primary)';

    if (showFeedback) {
      if (isCorrectChoice) {
        borderCol = 'var(--green-tick)';
        bgCol = 'var(--green-tick-bg)';
        textCol = 'var(--green-tick)';
      } else if (isSelected && !isCorrectChoice) {
        borderCol = 'var(--red-pen)';
        bgCol = 'var(--red-pen-bg)';
        textCol = 'var(--red-pen)';
      }
    } else if (isSelected) {
      borderCol = isTrueButton ? 'var(--green-tick)' : 'var(--red-pen)';
      bgCol = isTrueButton ? 'var(--green-tick-bg)' : 'var(--red-pen-bg)';
      textCol = isTrueButton ? 'var(--green-tick)' : 'var(--red-pen)';
    }

    return { borderCol, bgCol, textCol, isSelected };
  };

  const trueStyle = getStyle(true);
  const falseStyle = getStyle(false);

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.2rem',
          marginTop: '0.5rem'
        }}
      >
        {/* TRUE BUTTON */}
        <button
          disabled={isLocked}
          onClick={() => onSelectAnswer(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            padding: '1.8rem 1rem',
            minHeight: '110px',
            borderRadius: 'var(--radius-card)',
            border: `2.5px solid ${trueStyle.borderCol}`,
            backgroundColor: trueStyle.bgCol,
            color: trueStyle.textCol,
            boxShadow: trueStyle.isSelected ? 'var(--shadow-paper-elevated)' : 'var(--shadow-paper)',
            transform: trueStyle.isSelected ? 'scale(1.02)' : 'none',
            transition: 'all 0.15s ease',
            cursor: isLocked ? 'default' : 'pointer'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(21, 128, 61, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <HandDrawnIcon name="check" size={24} color="var(--green-tick)" />
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>
            TRUE
          </span>
          <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>Press T</span>
        </button>

        {/* FALSE BUTTON */}
        <button
          disabled={isLocked}
          onClick={() => onSelectAnswer(false)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            padding: '1.8rem 1rem',
            minHeight: '110px',
            borderRadius: 'var(--radius-card)',
            border: `2.5px solid ${falseStyle.borderCol}`,
            backgroundColor: falseStyle.bgCol,
            color: falseStyle.textCol,
            boxShadow: falseStyle.isSelected ? 'var(--shadow-paper-elevated)' : 'var(--shadow-paper)',
            transform: falseStyle.isSelected ? 'scale(1.02)' : 'none',
            transition: 'all 0.15s ease',
            cursor: isLocked ? 'default' : 'pointer'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(220, 38, 38, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <HandDrawnIcon name="cross" size={24} color="var(--red-pen)" />
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>
            FALSE
          </span>
          <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>Press F</span>
        </button>
      </div>
    </div>
  );
};
