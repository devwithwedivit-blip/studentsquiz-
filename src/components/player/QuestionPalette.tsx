import { UserAnswer, Question } from '../../types/quiz';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface QuestionPaletteProps {
  totalQuestions: number;
  currentIndex: number;
  answers: Record<string, UserAnswer>;
  questionIds: string[];
  questions?: Question[];
  onSelectIndex: (idx: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  totalQuestions,
  currentIndex,
  answers,
  questionIds,
  questions,
  onSelectIndex,
  isOpen,
  onToggle
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <button
        className="paper-btn"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.6rem 0.9rem',
          fontSize: '0.9rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HandDrawnIcon name="ruler" size={16} />
          <span style={{ fontWeight: 700 }}>Question Sheet Navigator</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
          {isOpen ? '▲ Hide Sheet' : '▼ View Sheet (All Questions)'}
        </span>
      </button>

      {isOpen && (
        <div
          className="notebook-sheet"
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-paper-subtle)'
          }}
        >
          {/* Legend */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.8rem',
              fontSize: '0.78rem',
              color: 'var(--ink-secondary)',
              marginBottom: '0.8rem',
              paddingBottom: '0.6rem',
              borderBottom: '1px dashed var(--ink-border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'var(--ink-primary)' }} />
              <span>Answered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'var(--highlighter-yellow)', border: '1px solid #ca8a04' }} />
              <span>Flagged</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'var(--red-pen-bg)', border: '1px solid var(--red-pen)' }} />
              <span>Skipped</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'var(--bg-card)', border: '1px solid var(--ink-border)' }} />
              <span>Not Visited</span>
            </div>
          </div>

          {/* Question buttons, grouped by passage if passages exist */}
          {(() => {
            const hasAnyPassage = questions?.some(q => q.passageId);

            const renderButton = (qId: string, idx: number) => {
              const ans = answers[qId];
              const isCurrent = idx === currentIndex;
              const isAnswered = ans && ans.answer !== undefined && ans.answer !== '' && !ans.isSkipped;
              const isFlagged = ans?.isFlagged;
              const isSkipped = ans?.isSkipped;

              let bg = 'var(--bg-card)';
              let textCol = 'var(--ink-primary)';
              let border = '1.5px solid var(--ink-border)';

              if (isAnswered) {
                bg = 'var(--ink-primary)';
                textCol = '#ffffff';
                border = '1.5px solid var(--ink-primary)';
              } else if (isFlagged) {
                bg = 'var(--highlighter-yellow)';
                textCol = '#1e293b';
                border = '1.5px solid #ca8a04';
              } else if (isSkipped) {
                bg = 'var(--red-pen-bg)';
                textCol = 'var(--red-pen)';
                border = '1.5px dashed var(--red-pen)';
              }

              if (isCurrent) {
                border = '2.5px solid var(--highlighter-yellow)';
              }

              return (
                <button
                  key={qId}
                  onClick={() => onSelectIndex(idx)}
                  style={{
                    height: '38px',
                    borderRadius: '4px',
                    backgroundColor: bg,
                    color: textCol,
                    border,
                    fontWeight: isCurrent ? 800 : 600,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    boxShadow: isCurrent ? 'var(--shadow-paper-elevated)' : 'none',
                    transform: isCurrent ? 'scale(1.08)' : 'none',
                    transition: 'all 0.12s ease'
                  }}
                  title={`Question ${idx + 1}`}
                  aria-label={`Question ${idx + 1}: ${isAnswered ? 'answered' : isFlagged ? 'flagged' : isSkipped ? 'skipped' : 'not visited'}`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: '#ca8a04'
                      }}
                    />
                  )}
                </button>
              );
            };

            if (!hasAnyPassage || !questions) {
              return (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
                    gap: '0.45rem'
                  }}
                >
                  {questionIds.map((qId, idx) => renderButton(qId, idx))}
                </div>
              );
            }

            // Build contiguous groups
            type Group = { passageId?: string; kind?: string; items: { qId: string; idx: number }[] };
            const groups: Group[] = [];
            let currentGroup: Group | null = null;
            let passageCounter = 0;
            const passageNumberMap: Record<string, number> = {};

            questions.forEach((q, idx) => {
              const pId = q.passageId;
              if (pId && !passageNumberMap[pId]) {
                passageCounter++;
                passageNumberMap[pId] = passageCounter;
              }

              if (!currentGroup || currentGroup.passageId !== pId) {
                currentGroup = {
                  passageId: pId,
                  kind: q.passage?.kind,
                  items: [{ qId: q.id, idx }]
                };
                groups.push(currentGroup);
              } else {
                currentGroup.items.push({ qId: q.id, idx });
              }
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {groups.map((group, gIdx) => {
                  const firstIdx = group.items[0].idx + 1;
                  const lastIdx = group.items[group.items.length - 1].idx + 1;
                  const title = group.passageId
                    ? `Passage ${passageNumberMap[group.passageId]}: Q${firstIdx}-Q${lastIdx}`
                    : `General Grammar Questions (Q${firstIdx}-Q${lastIdx})`;

                  return (
                    <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: 'var(--ink-secondary)',
                          borderLeft: '3px solid var(--ink-secondary)',
                          paddingLeft: '0.4rem'
                        }}
                      >
                        {title}
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
                          gap: '0.45rem'
                        }}
                      >
                        {group.items.map(item => renderButton(item.qId, item.idx))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
