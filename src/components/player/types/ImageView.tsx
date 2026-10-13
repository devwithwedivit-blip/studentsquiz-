import React, { useState } from 'react';
import { Question } from '../../../types/quiz';
import { HandDrawnIcon } from '../../common/HandDrawnIcon';
import { MCQView } from './MCQView';

interface ImageViewProps {
  question: Question;
  userAnswer: any;
  onSelectOption: (optionIndex: number) => void;
  onTypeAnswer: (text: string) => void;
  onSubmit: () => void;
  isLocked: boolean;
  showFeedback: boolean;
  isPractice: boolean;
  isCorrect?: boolean;
}

export const ImageView: React.FC<ImageViewProps> = ({
  question,
  userAnswer,
  onSelectOption,
  onTypeAnswer,
  onSubmit,
  isLocked,
  showFeedback,
  isPractice,
  isCorrect
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [typedText, setTypedText] = useState(typeof userAnswer === 'string' ? userAnswer : '');

  const hasOptions = question.options && question.options.length > 0;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Diagram container */}
      <div
        className="notebook-sheet"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.2rem',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '0.4rem',
            zIndex: 10
          }}
        >
          <button
            className="paper-btn"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', minHeight: '32px' }}
            onClick={() => setIsZoomed(!isZoomed)}
            title="Toggle diagram zoom"
          >
            🔍 {isZoomed ? 'Fit Diagram' : 'Zoom In'}
          </button>
        </div>

        {/* Inline SVG render */}
        <div
          style={{
            width: '100%',
            maxWidth: isZoomed ? '600px' : '380px',
            transition: 'max-width 0.2s ease',
            display: 'flex',
            justifyContent: 'center'
          }}
          dangerouslySetInnerHTML={{ __html: question.image?.src || '' }}
        />
      </div>

      {/* Answer controls */}
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
              placeholder="Type your answer based on the diagram..."
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
              Expected answer: <strong>{String(question.answer)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
