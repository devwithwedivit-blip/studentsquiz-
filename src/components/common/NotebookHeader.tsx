import React, { useState, useEffect } from 'react';
import { HandDrawnIcon } from './HandDrawnIcon';
import { isSoundMuted, setSoundMuted } from '../../services/audio';

interface NotebookHeaderProps {
  activeTab: 'builder' | 'manager' | 'bookmarks' | 'history';
  onSelectTab: (tab: 'builder' | 'manager' | 'bookmarks' | 'history') => void;
  streakDays: number;
  totalXp: number;
}

export const NotebookHeader: React.FC<NotebookHeaderProps> = ({
  activeTab,
  onSelectTab,
  streakDays,
  totalXp
}) => {
  const [muted, setMuted] = useState(isSoundMuted());
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setDarkMode(isDark);
  }, []);

  const handleToggleSound = () => {
    const next = !muted;
    setSoundMuted(next);
    setMuted(next);
  };

  const handleToggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  return (
    <header
      className="notebook-sheet"
      style={{
        padding: '0.9rem 1.4rem',
        marginBottom: '1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.8rem',
        borderBottom: '2.5px solid var(--ink-primary)'
      }}
    >
      {/* Brand & Nib Logo */}
      <div
        onClick={() => onSelectTab('builder')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', cursor: 'pointer' }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '6px',
            backgroundColor: 'var(--highlighter-yellow)',
            border: '2px solid var(--ink-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-paper)'
          }}
        >
          <HandDrawnIcon name="quill" size={22} color="#1b2a4a" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', fontWeight: 900, lineHeight: 1.1 }}>
            QuizForge
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)', letterSpacing: '0.04em' }}>
            CBSE / NCERT STUDENT NOTEBOOK
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          className={`paper-btn ${activeTab === 'builder' ? 'paper-btn-primary' : ''}`}
          onClick={() => onSelectTab('builder')}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          <HandDrawnIcon name="pencil" size={15} />
          <span>Practice Test</span>
        </button>

        <button
          className={`paper-btn ${activeTab === 'manager' ? 'paper-btn-primary' : ''}`}
          onClick={() => onSelectTab('manager')}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          <HandDrawnIcon name="edit" size={15} />
          <span>Question Bank</span>
        </button>

        <button
          className={`paper-btn ${activeTab === 'bookmarks' ? 'paper-btn-primary' : ''}`}
          onClick={() => onSelectTab('bookmarks')}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          <HandDrawnIcon name="bookmark" size={15} />
          <span>Saved Notes</span>
        </button>

        <button
          className={`paper-btn ${activeTab === 'history' ? 'paper-btn-primary' : ''}`}
          onClick={() => onSelectTab('history')}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          <HandDrawnIcon name="badge" size={15} />
          <span>Progress & Badges</span>
        </button>
      </nav>

      {/* Student Badges, Sound & Theme Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {/* Streak indicator */}
        <div
          title={`${streakDays} days study streak`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.3rem 0.6rem',
            backgroundColor: 'var(--highlighter-soft)',
            border: '1.5px solid #ca8a04',
            borderRadius: 'var(--radius-pill)',
            fontWeight: 700,
            fontSize: '0.82rem',
            color: '#854d0e'
          }}
        >
          <HandDrawnIcon name="fire" size={15} color="#ca8a04" />
          <span>{streakDays}d streak</span>
        </div>

        {/* XP Points */}
        <div
          title={`${totalXp} XP points earned`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.3rem 0.6rem',
            backgroundColor: '#f5f3ff',
            border: '1.5px solid #7c3aed',
            borderRadius: 'var(--radius-pill)',
            fontWeight: 700,
            fontSize: '0.82rem',
            color: '#6d28d9'
          }}
        >
          <span>⭐ {totalXp} XP</span>
        </div>

        {/* Sound toggle */}
        <button
          className="paper-btn"
          onClick={handleToggleSound}
          style={{ padding: '0.4rem', minHeight: '34px', minWidth: '34px' }}
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          <HandDrawnIcon name={muted ? 'sound-off' : 'sound-on'} size={16} />
        </button>

        {/* Dark mode toggle */}
        <button
          className="paper-btn"
          onClick={handleToggleTheme}
          style={{ padding: '0.4rem', minHeight: '34px', minWidth: '34px' }}
          title={darkMode ? 'Switch to light notebook' : 'Switch to dark slate'}
        >
          <HandDrawnIcon name={darkMode ? 'sun' : 'moon'} size={16} />
        </button>
      </div>
    </header>
  );
};
