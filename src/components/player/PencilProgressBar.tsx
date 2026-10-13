import React from 'react';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface PencilProgressBarProps {
  current: number;
  total: number;
  percent: number;
}

export const PencilProgressBar: React.FC<PencilProgressBarProps> = ({
  current,
  total,
  percent
}) => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--ink-secondary)'
        }}
      >
        <span>
          Question <strong>{current}</strong> of {total}
        </span>
        <span className="handwritten-note" style={{ fontSize: '1rem' }}>
          {Math.round(percent)}% completed
        </span>
      </div>

      {/* Pencil drawn line container */}
      <div
        style={{
          position: 'relative',
          height: '14px',
          display: 'flex',
          alignItems: 'center',
          width: '100%'
        }}
      >
        {/* Background ruled guide */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: 'var(--ruled-line)',
            borderBottom: '1px dashed #cbd5e1'
          }}
        />

        {/* Drawn graphite pencil stroke */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${Math.min(100, Math.max(0, percent))}%`,
            height: '3px',
            backgroundColor: '#1b2a4a',
            borderRadius: '2px',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />

        {/* Moving Pencil Nib */}
        <div
          style={{
            position: 'absolute',
            left: `calc(${Math.min(99, Math.max(1, percent))}% - 10px)`,
            top: '-6px',
            transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.15))',
            pointerEvents: 'none'
          }}
        >
          <HandDrawnIcon name="pencil" size={18} color="#b45309" />
        </div>
      </div>
    </div>
  );
};
