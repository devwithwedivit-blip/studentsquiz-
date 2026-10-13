import React, { useState, useEffect } from 'react';
import { QuizResult, UserStats } from '../../types/quiz';
import { getAllQuizResults, getUserStats } from '../../services/db';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface PastAttemptsViewProps {
  onSelectAttempt: (res: QuizResult) => void;
  onNewQuiz: () => void;
}

interface BadgeMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const ALL_BADGES: BadgeMeta[] = [
  { id: 'first_step', name: 'Notebook Opener', description: 'Started your revision journey with QuizForge', icon: '📖' },
  { id: 'scholar_honor', name: 'Scholar Honor', description: 'Scored 80% or higher in any comprehensive test', icon: '🎖️' },
  { id: 'centum_master', name: 'Centum Master', description: 'Achieved a perfect 100% score on a 10+ question test', icon: '💯' },
  { id: 'ten_in_a_row', name: '10 In a Row', description: 'Answered 10 questions correctly in a single quiz', icon: '🎯' },
  { id: 'drill_sergeant', name: 'Drill Master', description: 'Completed 5 full practice tests', icon: '⚡' },
  { id: 'streak_fire', name: 'Consistency Fire', description: 'Maintained a 3-day continuous study streak', icon: '🔥' }
];

export const PastAttemptsView: React.FC<PastAttemptsViewProps> = ({
  onSelectAttempt,
  onNewQuiz
}) => {
  const [attempts, setAttempts] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    getAllQuizResults().then(setAttempts);
    getUserStats().then(setStats);
  }, []);

  const unlockedBadgeIds = new Set(stats?.badges || []);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
      {/* Overview Stats */}
      <div
        className="notebook-sheet"
        style={{
          padding: '1.8rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.2rem',
          textAlign: 'center'
        }}
      >
        <div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--ink-primary)' }}>
            {stats?.totalQuizzesTaken || 0}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
            Tests Completed
          </div>
        </div>

        <div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--green-tick)' }}>
            {stats?.correctAnswers || 0}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
            Correct Answers
          </div>
        </div>

        <div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ca8a04' }}>
            {stats?.currentStreakDays || 1} Days
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
            Active Streak
          </div>
        </div>

        <div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#7c3aed' }}>
            {stats?.totalXp || 100} XP
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
            Earned Experience
          </div>
        </div>
      </div>

      {/* Badges Showcase */}
      <div className="notebook-sheet" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.3rem' }}>Notebook Badges & Milestones</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
          {ALL_BADGES.map(badge => {
            const isUnlocked = unlockedBadgeIds.has(badge.id);
            return (
              <div
                key={badge.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-card)',
                  border: `2px solid ${isUnlocked ? 'var(--ink-primary)' : 'var(--ink-border)'}`,
                  backgroundColor: isUnlocked ? 'var(--bg-card)' : 'var(--bg-paper-subtle)',
                  opacity: isUnlocked ? 1 : 0.6,
                  boxShadow: isUnlocked ? 'var(--shadow-paper)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem'
                }}
              >
                <span style={{ fontSize: '1.8rem' }}>{badge.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{badge.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                    {badge.description}
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: isUnlocked ? 'var(--green-tick)' : 'var(--ink-muted)'
                    }}
                  >
                    {isUnlocked ? '✓ Unlocked' : 'Locked'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past Attempts List */}
      <div className="notebook-sheet" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.3rem' }}>Attempt History</h2>
          <button className="paper-btn paper-btn-accent" onClick={onNewQuiz}>
            <HandDrawnIcon name="plus" size={16} />
            <span>Take New Quiz</span>
          </button>
        </div>

        {attempts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-muted)' }}>
            No past test attempts recorded yet. Take your first practice quiz!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {attempts.map(att => {
              const dateStr = new Date(att.timestamp).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={att.id}
                  style={{
                    padding: '1rem 1.2rem',
                    borderRadius: 'var(--radius-card)',
                    border: '1.5px solid var(--ink-border)',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.8rem',
                    boxShadow: 'var(--shadow-paper)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                      Class {att.config.selectedClass} • {att.config.selectedSubjects.join(', ')}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
                      {dateStr} • {att.totalQuestions} questions • Mode: {att.config.quizMode}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--ink-primary)' }}>
                        {att.score} / {att.maxScore}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: att.accuracyPercentage >= 70 ? 'var(--green-tick)' : 'var(--red-pen)', fontWeight: 700 }}>
                        {att.accuracyPercentage}% Accuracy
                      </div>
                    </div>

                    <button
                      className="paper-btn"
                      onClick={() => onSelectAttempt(att)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    >
                      <span>Review Test</span>
                      <HandDrawnIcon name="chevron-right" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
