import React from 'react';
import { StudentSession, StaffProfile } from '../../types/online';

export type AppMode = 'login' | 'practice' | 'student' | 'teacher' | 'admin' | 'results';

interface ModeSelectorProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  isOnlineConfigured: boolean;
  studentSession: StudentSession | null;
  staffProfile: StaffProfile | null;
  onLogout: () => void;
}

export function ModeSelector({
  currentMode,
  onSelectMode,
  isOnlineConfigured,
  studentSession,
  staffProfile,
  onLogout
}: ModeSelectorProps) {
  // If not logged in, hide navbar or show minimal header
  if (!studentSession && !staffProfile) {
    return null;
  }

  const roleBadge = studentSession
    ? `🎒 Student (Class ${studentSession.student.class})`
    : staffProfile?.role === 'admin'
    ? '🛡️ Admin'
    : '👨‍🏫 Teacher';

  const userName = studentSession
    ? studentSession.student.name
    : staffProfile?.name || 'Staff';

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
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.75rem',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              backgroundColor: '#e0e7ff',
              color: '#3730a3',
              fontWeight: 700
            }}
          >
            {roleBadge}: {userName}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Student Navigation */}
        {studentSession && (
          <>
            <button
              type="button"
              onClick={() => onSelectMode('student')}
              className={`paper-btn ${currentMode === 'student' ? 'paper-btn-accent' : ''}`}
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: currentMode === 'student' ? 700 : 500 }}
            >
              🎒 Student Exam
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('practice')}
              className={`paper-btn ${currentMode === 'practice' ? 'paper-btn-accent' : ''}`}
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: currentMode === 'practice' ? 700 : 500 }}
            >
              📖 Practice Mode
            </button>
          </>
        )}

        {/* Teacher Navigation */}
        {staffProfile?.role === 'teacher' && (
          <button
            type="button"
            onClick={() => onSelectMode('teacher')}
            className={`paper-btn ${currentMode === 'teacher' ? 'paper-btn-accent' : ''}`}
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: currentMode === 'teacher' ? 700 : 500 }}
          >
            👨‍🏫 Teacher Portal
          </button>
        )}

        {/* Admin Navigation */}
        {staffProfile?.role === 'admin' && (
          <button
            type="button"
            onClick={() => onSelectMode('admin')}
            className={`paper-btn ${currentMode === 'admin' ? 'paper-btn-accent' : ''}`}
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: currentMode === 'admin' ? 700 : 500 }}
          >
            🛡️ Admin Portal
          </button>
        )}

        <button
          type="button"
          onClick={() => onSelectMode('results')}
          className={`paper-btn ${currentMode === 'results' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: currentMode === 'results' ? 700 : 500 }}
        >
          📊 Live Results
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="paper-btn"
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', color: '#dc2626', borderColor: '#fca5a5' }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
