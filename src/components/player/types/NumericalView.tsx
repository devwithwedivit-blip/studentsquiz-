import React, { useState, useEffect } from 'react';
import { Question } from '../../../types/quiz';
import { HandDrawnIcon } from '../../common/HandDrawnIcon';

interface NumericalViewProps {
  question: Question;
  userAnswer: string | number | undefined;
  onChangeAnswer: (val: string) => void;
  onSubmit: () => void;
  isLocked: boolean;
  showFeedback: boolean;
  isCorrect?: boolean;
  onOpenScratchpad: () => void;
}

export const NumericalView: React.FC<NumericalViewProps> = ({
  question,
  userAnswer = '',
  onChangeAnswer,
  onSubmit,
  isLocked,
  showFeedback,
  isCorrect,
  onOpenScratchpad
}) => {
  const [val, setVal] = useState(String(userAnswer));
  const [selectedUnit, setSelectedUnit] = useState(question.unit || '');

  useEffect(() => {
    setVal(String(userAnswer || ''));
  }, [userAnswer]);

  const handleKeypadPress = (char: string) => {
    if (isLocked) return;
    if (char === 'CLEAR') {
      setVal('');
      onChangeAnswer('');
    } else if (char === 'BACK') {
      const next = val.slice(0, -1);
      setVal(next);
      onChangeAnswer(next);
    } else {
      // Prevent multiple decimals
      if (char === '.' && val.includes('.')) return;
      // Prevent multiple minuses
      if (char === '-' && val.length > 0) return;
      const next = val + char;
      setVal(next);
      onChangeAnswer(next);
    }
  };

  const keypadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.', 'BACK', 'CLEAR'];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Input row + unit + Scratchpad button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            disabled={isLocked}
            value={val}
            onChange={e => {
              setVal(e.target.value);
              onChangeAnswer(e.target.value);
            }}
            placeholder="Type value..."
            style={{
              padding: '0.8rem 1rem',
              fontFamily: 'monospace',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--ink-primary)',
              backgroundColor: 'var(--bg-card)',
              border: showFeedback
                ? isCorrect
                  ? '2.5px solid var(--green-tick)'
                  : '2.5px solid var(--red-pen)'
                : '2px solid var(--ink-border)',
              borderRadius: 'var(--radius-card)',
              width: '100%',
              minHeight: 'var(--min-touch-target)',
              outline: 'none',
              boxShadow: 'var(--shadow-paper)'
            }}
          />
          {question.unit && (
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--ink-secondary)',
                padding: '0.2rem 0.5rem',
                backgroundColor: 'var(--highlighter-soft)',
                borderRadius: '4px',
                border: '1px solid var(--ink-border)'
              }}
            >
              {question.unit}
            </span>
          )}
        </div>

        {/* Rough work Scratchpad button */}
        <button
          className="paper-btn"
          onClick={onOpenScratchpad}
          title="Open rough work canvas"
          style={{
            backgroundColor: '#fef08a',
            borderColor: '#b45309',
            color: '#78350f'
          }}
        >
          <HandDrawnIcon name="scratchpad" size={18} color="#78350f" />
          <span>Rough Work Scratchpad</span>
        </button>
      </div>

      {/* On-screen tactile numeric pad */}
      {!isLocked && (
        <div
          className="notebook-sheet"
          style={{
            padding: '0.8rem',
            maxWidth: '380px',
            backgroundColor: 'var(--bg-paper-subtle)'
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--ink-muted)',
              marginBottom: '0.4rem',
              textTransform: 'uppercase'
            }}
          >
            Tactile Numeric Keypad
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem'
            }}
          >
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.'].map(k => (
              <button
                key={k}
                className="paper-btn"
                style={{ padding: '0.6rem', fontSize: '1.15rem', fontWeight: 700, minHeight: '44px' }}
                onClick={() => handleKeypadPress(k)}
              >
                {k}
              </button>
            ))}
            <button
              className="paper-btn"
              style={{ padding: '0.6rem', fontSize: '1rem', fontWeight: 700, minHeight: '44px' }}
              onClick={() => handleKeypadPress('BACK')}
            >
              ⌫ Back
            </button>
            <button
              className="paper-btn paper-btn-danger"
              style={{ padding: '0.6rem', fontSize: '0.9rem', fontWeight: 700, minHeight: '44px' }}
              onClick={() => handleKeypadPress('CLEAR')}
            >
              Clear
            </button>
            <button
              className="paper-btn paper-btn-primary"
              style={{ padding: '0.6rem', fontSize: '1rem', fontWeight: 700, minHeight: '44px' }}
              onClick={onSubmit}
              disabled={!val.trim()}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {showFeedback && (
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-card)',
            backgroundColor: isCorrect ? 'var(--green-tick-bg)' : 'var(--red-pen-bg)',
            border: `1.5px solid ${isCorrect ? 'var(--green-tick)' : 'var(--red-pen)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <HandDrawnIcon
              name={isCorrect ? 'check' : 'cross'}
              size={20}
              color={isCorrect ? 'var(--green-tick)' : 'var(--red-pen)'}
            />
            <span style={{ color: isCorrect ? 'var(--green-tick)' : 'var(--red-pen)' }}>
              {isCorrect ? 'Correct calculation!' : 'Incorrect answer.'}
            </span>
            <span>
              Expected: <strong>{question.answer} {question.unit || ''}</strong> (±{question.tolerance ?? 0.02})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
