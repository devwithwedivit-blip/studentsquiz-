import React, { useState } from 'react';
import { Question } from '../../../types/quiz';
import { HandDrawnIcon } from '../../common/HandDrawnIcon';
import { MCQView } from './MCQView';

interface LogicViewProps {
  question: Question;
  userAnswer: any;
  onSelectOption: (optionIndex: number) => void;
  onTypeAnswer: (text: string) => void;
  onSubmit: () => void;
  onUseHint: () => void;
  hintUsed: boolean;
  isLocked: boolean;
  showFeedback: boolean;
  isPractice: boolean;
  isCorrect?: boolean;
}

export const LogicView: React.FC<LogicViewProps> = ({
  question,
  userAnswer,
  onSelectOption,
  onTypeAnswer,
  onSubmit,
  onUseHint,
  hintUsed,
  isLocked,
  showFeedback,
  isPractice,
  isCorrect
}) => {
  const [typedText, setTypedText] = useState(typeof userAnswer === 'string' ? userAnswer : '');
  const [showHintModal, setShowHintModal] = useState(false);

  const hasOptions = question.options && question.options.length > 0;

  const handleRevealHint = () => {
    setShowHintModal(true);
    onUseHint();
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Hint trigger bar */}
      {question.hint && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.6rem 0.9rem',
            backgroundColor: 'var(--highlighter-soft)',
            borderRadius: 'var(--radius-card)',
            border: '1.5px dashed #ca8a04'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HandDrawnIcon name="hint" size={18} color="#854d0e" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#854d0e' }}>
              Puzzled? You can request a teacher's clue.
            </span>
          </div>

          <button
            className="paper-btn"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.85rem',
              minHeight: '34px',
              backgroundColor: hintUsed ? '#ffffff' : '#fef08a'
            }}
            onClick={handleRevealHint}
          >
            {hintUsed ? 'View Clue' : 'Reveal Clue (-0.5 mark)'}
          </button>
        </div>
      )}

      {/* Revealed Hint Alert */}
      {showHintModal && question.hint && (
        <div
          className="notebook-sheet"
          style={{
            padding: '0.9rem 1.2rem',
            backgroundColor: '#fffbeb',
            border: '2px solid #f59e0b',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem'
          }}
        >
          <div style={{ fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <HandDrawnIcon name="hint" size={16} color="#b45309" />
            <span>Teacher's Clue:</span>
          </div>
          <p style={{ fontStyle: 'italic', color: '#78350f' }}>{question.hint}</p>
        </div>
      )}

      {/* Answer selection */}
      {hasOptions ? (
        <MCQView
          question={question}
          userAnswer={typeof userAnswer === 'number' ? userAnswer : undefined}
          onSelectOption={onSelectOption}
          isLocked={isLocked}
          showFeedback={showFeedback}
          isPractice={isPractice}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <input
              type="text"
              disabled={isLocked}
              value={typedText}
              onChange={e => {
                setTypedText(e.target.value);
                onTypeAnswer(e.target.value);
              }}
              placeholder="Type your logical solution..."
              style={{
                flex: 1,
                padding: '0.8rem 1rem',
                fontSize: '1.1rem',
                borderRadius: 'var(--radius-card)',
                border: '2px solid var(--ink-border)',
                outline: 'none'
              }}
            />
            {!isLocked && (
              <button
                className="paper-btn paper-btn-primary"
                onClick={onSubmit}
                disabled={!typedText.trim()}
              >
                <HandDrawnIcon name="check" size={16} />
                <span>Submit</span>
              </button>
            )}
          </div>
          {showFeedback && (
            <div
              style={{
                padding: '0.8rem 1rem',
                borderRadius: 'var(--radius-card)',
                backgroundColor: isCorrect ? 'var(--green-tick-bg)' : 'var(--red-pen-bg)',
                border: `1.5px solid ${isCorrect ? 'var(--green-tick)' : 'var(--red-pen)'}`
              }}
            >
              Correct logic: <strong>{String(question.answer)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
