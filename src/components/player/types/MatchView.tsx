import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Question } from '../../../types/quiz';
import { HandDrawnIcon } from '../../common/HandDrawnIcon';

interface MatchViewProps {
  question: Question;
  userAnswer: Record<string, string> | undefined; // { [left]: right }
  onChangeMatches: (matches: Record<string, string>) => void;
  onSubmit: () => void;
  isLocked: boolean;
  showFeedback: boolean;
}

export const MatchView: React.FC<MatchViewProps> = ({
  question,
  userAnswer = {},
  onChangeMatches,
  onSubmit,
  isLocked,
  showFeedback
}) => {
  const originalPairs = question.pairs || [];
  const leftItems = useMemo(() => originalPairs.map(p => p[0]), [originalPairs]);

  // Shuffle right items once on question load
  const [rightItems, setRightItems] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rights = originalPairs.map(p => p[1]);
    // Deterministic pseudo-shuffle based on question ID
    const shuffled = [...rights].sort(() => Math.random() - 0.5);
    setRightItems(shuffled);
  }, [question.id, originalPairs]);

  const handleLeftClick = (left: string) => {
    if (isLocked) return;
    if (selectedLeft === left) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(left);
    }
  };

  const handleRightClick = (right: string) => {
    if (isLocked) return;
    if (!selectedLeft) return;

    // Check if right is already matched to another left
    const newMatches = { ...userAnswer };
    for (const [l, r] of Object.entries(newMatches)) {
      if (r === right) {
        delete newMatches[l];
      }
    }

    newMatches[selectedLeft] = right;
    onChangeMatches(newMatches);
    setSelectedLeft(null);
  };

  const handleUnpair = (left: string) => {
    if (isLocked) return;
    const newMatches = { ...userAnswer };
    delete newMatches[left];
    onChangeMatches(newMatches);
  };

  const isMatchedRight = (right: string) => {
    return Object.values(userAnswer).includes(right);
  };

  const allMatched = leftItems.length > 0 && Object.keys(userAnswer).length === leftItems.length;

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
        Tap an item on the <strong>Left Column</strong>, then tap its match on the <strong>Right Column</strong> to connect them:
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          position: 'relative'
        }}
      >
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
            Column A
          </div>
          {leftItems.map((left, idx) => {
            const isSelected = selectedLeft === left;
            const matchedRight = userAnswer[left];
            const isCorrect = originalPairs.find(p => p[0] === left)?.[1] === matchedRight;

            let borderCol = 'var(--ink-border)';
            let bgCol = 'var(--bg-card)';

            if (showFeedback && matchedRight) {
              borderCol = isCorrect ? 'var(--green-tick)' : 'var(--red-pen)';
              bgCol = isCorrect ? 'var(--green-tick-bg)' : 'var(--red-pen-bg)';
            } else if (isSelected) {
              borderCol = 'var(--ink-primary)';
              bgCol = 'var(--highlighter-yellow)';
            } else if (matchedRight) {
              borderCol = '#0284c7';
              bgCol = '#f0f9ff';
            }

            return (
              <button
                key={idx}
                disabled={isLocked}
                onClick={() => handleLeftClick(left)}
                style={{
                  padding: '0.8rem 1rem',
                  minHeight: 'var(--min-touch-target)',
                  borderRadius: 'var(--radius-card)',
                  border: `2px solid ${borderCol}`,
                  backgroundColor: bgCol,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  boxShadow: 'var(--shadow-paper)',
                  cursor: isLocked ? 'default' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{left}</span>
                {matchedRight && !showFeedback && (
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      handleUnpair(left);
                    }}
                    title="Remove match"
                    style={{
                      fontSize: '0.75rem',
                      color: '#0284c7',
                      border: '1px solid #7dd3fc',
                      borderRadius: '3px',
                      padding: '0.1rem 0.35rem',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    Matched ✕
                  </span>
                )}
                {showFeedback && matchedRight && (
                  <HandDrawnIcon
                    name={isCorrect ? 'check' : 'cross'}
                    size={16}
                    color={isCorrect ? 'var(--green-tick)' : 'var(--red-pen)'}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
            Column B
          </div>
          {rightItems.map((right, idx) => {
            const isMatched = isMatchedRight(right);
            const matchedLeft = Object.keys(userAnswer).find(l => userAnswer[l] === right);
            const isCorrect = originalPairs.find(p => p[0] === matchedLeft)?.[1] === right;

            let borderCol = 'var(--ink-border)';
            let bgCol = 'var(--bg-card)';

            if (showFeedback && matchedLeft) {
              borderCol = isCorrect ? 'var(--green-tick)' : 'var(--red-pen)';
              bgCol = isCorrect ? 'var(--green-tick-bg)' : 'var(--red-pen-bg)';
            } else if (isMatched) {
              borderCol = '#0284c7';
              bgCol = '#f0f9ff';
            }

            return (
              <button
                key={idx}
                disabled={isLocked || !selectedLeft}
                onClick={() => handleRightClick(right)}
                style={{
                  padding: '0.8rem 1rem',
                  minHeight: 'var(--min-touch-target)',
                  borderRadius: 'var(--radius-card)',
                  border: `2px solid ${borderCol}`,
                  backgroundColor: bgCol,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-paper)',
                  cursor: isLocked || !selectedLeft ? (isLocked ? 'default' : 'not-allowed') : 'pointer',
                  opacity: !selectedLeft && !isMatched ? 0.8 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '0.95rem' }}>{right}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!isLocked && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            className="paper-btn paper-btn-primary"
            onClick={onSubmit}
            disabled={!allMatched}
            style={{ opacity: !allMatched ? 0.6 : 1 }}
          >
            <HandDrawnIcon name="check" size={16} />
            <span>Submit Matches</span>
          </button>
        </div>
      )}
    </div>
  );
};
