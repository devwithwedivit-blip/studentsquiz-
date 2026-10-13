import React from 'react';

export type AppMode = 'practice' | 'student' | 'admin' | 'results';

interface ModeSelectorProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  isOnlineConfigured: boolean;
}

export function ModeSelector({ currentMode, onSelectMode, isOnlineConfigured }: ModeSelectorProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.8rem',
        marginBottom: '1rem',
        padding: '0.6rem 1rem',
        backgroundColor: 'var(--paper-card)',
        borderRadius: '8px',
        border: '1.5px solid var(--paper-line)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1.3rem' }}>📓</span>
        <div>
          <span style={{ fontWeight: 800, fontFamily: 'var(--font-heading)', fontSize: '1.05rem', color: 'var(--ink-primary)' }}>
            QUIZFORGE
          </span>
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.75rem',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              backgroundColor: isOnlineConfigured ? '#d1fae5' : 'var(--paper-tag)',
              color: isOnlineConfigured ? '#065f46' : 'var(--ink-secondary)',
              fontWeight: 700
            }}
          >
            {isOnlineConfigured ? '🟢 SUPABASE ONLINE' : '⚪ LOCAL OFFLINE'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onSelectMode('practice')}
          className={`paper-btn ${currentMode === 'practice' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: currentMode === 'practice' ? 700 : 500 }}
        >
          📖 अभ्यास मोड (Practice)
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('student')}
          className={`paper-btn ${currentMode === 'student' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: currentMode === 'student' ? 700 : 500 }}
        >
          🎓 विद्यार्थी परीक्षा (Student)
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('admin')}
          className={`paper-btn ${currentMode === 'admin' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: currentMode === 'admin' ? 700 : 500 }}
        >
          🛠️ शिक्षक / एडमिन (Admin)
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('results')}
          className={`paper-btn ${currentMode === 'results' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: currentMode === 'results' ? 700 : 500 }}
        >
          📊 लाइव परिणाम (Results)
        </button>
      </div>
    </div>
  );
}
