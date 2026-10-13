import React, { useState, useEffect } from 'react';
import { Question } from '../../../types/quiz';
import { HandDrawnIcon } from '../../common/HandDrawnIcon';

interface OrderingViewProps {
  question: Question;
  userAnswer: string[] | undefined;
  onChangeOrder: (orderedItems: string[]) => void;
  onSubmit: () => void;
  isLocked: boolean;
  showFeedback: boolean;
}

export const OrderingView: React.FC<OrderingViewProps> = ({
  question,
  userAnswer,
  onChangeOrder,
  onSubmit,
  isLocked,
  showFeedback
}) => {
  const targetItems = question.orderedItems || [];
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    if (userAnswer && userAnswer.length === targetItems.length) {
      setItems(userAnswer);
    } else {
      // Shuffle initially on question load
      const shuffled = [...targetItems].sort(() => Math.random() - 0.5);
      setItems(shuffled);
      onChangeOrder(shuffled);
    }
  }, [question.id, targetItems]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (isLocked) return;
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    setItems(newItems);
    onChangeOrder(newItems);
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
        Arrange the items below in the correct order (from step 1 to last) using the <strong>▲ Up</strong> and <strong>▼ Down</strong> buttons or drag:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {items.map((item, idx) => {
          const isCorrectPos = targetItems[idx] === item;

          let borderCol = 'var(--ink-border)';
          let bgCol = 'var(--bg-card)';

          if (showFeedback) {
            borderCol = isCorrectPos ? 'var(--green-tick)' : 'var(--red-pen)';
            bgCol = isCorrectPos ? 'var(--green-tick-bg)' : 'var(--red-pen-bg)';
          }

          return (
            <div
              key={item + idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.9rem',
                padding: '0.75rem 1rem',
                minHeight: 'var(--min-touch-target)',
                borderRadius: 'var(--radius-card)',
                border: `2px solid ${borderCol}`,
                backgroundColor: bgCol,
                boxShadow: 'var(--shadow-paper)',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Position step badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--ink-primary)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  flexShrink: 0
                }}
              >
                {idx + 1}
              </span>

              {/* Item text */}
              <span style={{ flex: 1, fontSize: '0.98rem', fontWeight: 500 }}>
                {item}
              </span>

              {/* Status stamp on feedback */}
              {showFeedback && (
                <HandDrawnIcon
                  name={isCorrectPos ? 'check' : 'cross'}
                  size={18}
                  color={isCorrectPos ? 'var(--green-tick)' : 'var(--red-pen)'}
                />
              )}

              {/* Up & Down action buttons for phone and keyboard usability */}
              {!isLocked && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    className="paper-btn"
                    onClick={() => moveItem(idx, 'up')}
                    disabled={idx === 0}
                    style={{
                      padding: '0.2rem 0.5rem',
                      minHeight: '26px',
                      opacity: idx === 0 ? 0.35 : 1
                    }}
                    title="Move Up"
                  >
                    <HandDrawnIcon name="chevron-up" size={14} />
                  </button>
                  <button
                    className="paper-btn"
                    onClick={() => moveItem(idx, 'down')}
                    disabled={idx === items.length - 1}
                    style={{
                      padding: '0.2rem 0.5rem',
                      minHeight: '26px',
                      opacity: idx === items.length - 1 ? 0.35 : 1
                    }}
                    title="Move Down"
                  >
                    <HandDrawnIcon name="chevron-down" size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isLocked && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
          <button className="paper-btn paper-btn-primary" onClick={onSubmit}>
            <HandDrawnIcon name="check" size={16} />
            <span>Confirm Order</span>
          </button>
        </div>
      )}
    </div>
  );
};
