import React, { useState, useEffect } from 'react';
import {
  QuizConfig,
  QuestionType,
  SubjectId,
  QuizPreset,
  Question,
  Difficulty
} from '../../types/quiz';
import { SUBJECTS, ALL_CLASSES } from '../../data/subjects';
import { HandDrawnIcon } from '../common/HandDrawnIcon';
import { getUserStats } from '../../services/db';

interface QuizBuilderProps {
  allQuestions: Question[];
  onStartQuiz: (config: QuizConfig) => void;
  onOpenManager: () => void;
}

const QUESTION_TYPES: { id: QuestionType; label: string; icon: string }[] = [
  { id: 'mcq', label: 'Multiple Choice (MCQ)', icon: 'A' },
  { id: 'truefalse', label: 'True / False', icon: '✓' },
  { id: 'fillblank', label: 'Fill in Blanks', icon: '____' },
  { id: 'match', label: 'Match the Following', icon: '⮂' },
  { id: 'numerical', label: 'Numerical Problem', icon: '#' },
  { id: 'image', label: 'Diagram / Image', icon: '🖼' },
  { id: 'short', label: 'Short Answer', icon: '✎' },
  { id: 'logic', label: 'Logic / Reasoning', icon: '💡' },
  { id: 'multiselect', label: 'Multi-Select', icon: '☑' },
  { id: 'ordering', label: 'Sequence / Ordering', icon: '1-2' }
];

export const QuizBuilder: React.FC<QuizBuilderProps> = ({
  allQuestions,
  onStartQuiz,
  onOpenManager
}) => {
  // Available classes in existing bank
  const availableClasses = Array.from(new Set(allQuestions.map(q => q.class))).sort() as (9 | 10 | 11 | 12)[];
  const initialClass = availableClasses[0] || 9;

  const [selectedClass, setSelectedClass] = useState<9 | 10 | 11 | 12>(initialClass);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectId[]>(['maths']);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [quizMode, setQuizMode] = useState<'practice' | 'exam'>('practice');
  const [timerMode, setTimerMode] = useState<'none' | 'per-question' | 'whole-quiz'>('none');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [mistakeIds, setMistakeIds] = useState<string[]>([]);
  const [includePassages, setIncludePassages] = useState<boolean>(true);
  const [passageCount, setPassageCount] = useState<number>(1);

  // Count stepper per question type
  const [typeCounts, setTypeCounts] = useState<Record<QuestionType, number>>({
    mcq: 2,
    truefalse: 1,
    fillblank: 1,
    match: 1,
    numerical: 1,
    image: 1,
    short: 1,
    logic: 1,
    multiselect: 1,
    ordering: 0
  });

  // Load user mistakes for "Retry My Mistakes" preset
  useEffect(() => {
    getUserStats().then(s => setMistakeIds(s.mistakeQuestionIds || []));
  }, []);

  // Update selected subjects when class changes
  const subjectsInClass = Array.from(
    new Set(allQuestions.filter(q => q.class === selectedClass).map(q => q.subject))
  ) as SubjectId[];

  useEffect(() => {
    if (subjectsInClass.length > 0 && !selectedSubjects.some(s => subjectsInClass.includes(s))) {
      setSelectedSubjects([subjectsInClass[0]]);
    }
  }, [selectedClass, subjectsInClass]);

  // Chapters available for currently selected class & subjects (including full subject list from metadata)
  const availableChapters = Array.from(
    new Set([
      ...allQuestions
        .filter(q => q.class === selectedClass && selectedSubjects.includes(q.subject))
        .map(q => q.chapter),
      ...selectedSubjects.flatMap(s => SUBJECTS[s]?.chaptersByClass?.[selectedClass] || [])
    ])
  );

  // Total questions count requested
  const totalCount = Object.values(typeCounts).reduce((a, b) => a + b, 0);

  // Filter pool matching current settings
  const matchingPool = allQuestions.filter(q => {
    if (q.class !== selectedClass) return false;
    if (!selectedSubjects.includes(q.subject)) return false;
    if (selectedChapters.length > 0 && !selectedChapters.includes(q.chapter)) return false;
    if (difficulty !== 'mixed' && q.difficulty !== difficulty) return false;
    return true;
  });

  // Presets definition
  const presets: QuizPreset[] = [
    {
      id: 'unseenPassage1',
      name: 'Unseen Passage: 1 passage (5 Qs)',
      description: '1 complete unseen passage with 5 contextual questions (MCQ, Fill, Short, T/F)',
      badge: '📄 1 Passage (5 Qs)',
      configPartial: {
        totalQuestions: 5,
        includePassages: true,
        passageCount: 1,
        selectedSubjects: ['hindi'],
        typeCounts: {
          mcq: 2,
          truefalse: 1,
          fillblank: 1,
          match: 0,
          numerical: 0,
          image: 0,
          short: 1,
          logic: 0,
          multiselect: 0,
          ordering: 0
        },
        quizMode: 'practice',
        timerMode: 'none'
      }
    },
    {
      id: 'unseenPassage2',
      name: 'Unseen Passage: 2 passages (10 Qs)',
      description: 'Comprehensive comprehension drill with 2 passages (10 questions in groups of 5)',
      badge: '📄 2 Passages (10 Qs)',
      configPartial: {
        totalQuestions: 10,
        includePassages: true,
        passageCount: 2,
        selectedSubjects: ['hindi'],
        typeCounts: {
          mcq: 4,
          truefalse: 1,
          fillblank: 1,
          match: 0,
          numerical: 0,
          image: 0,
          short: 3,
          logic: 0,
          multiselect: 1,
          ordering: 0
        },
        quizMode: 'exam',
        timerMode: 'whole-quiz',
        timerSeconds: 1200
      }
    },
    {
      id: 'vyakaranDrill',
      name: 'Vyakaran Drill',
      description: 'Pure Hindi grammar practice across all chapters without unseen passages',
      badge: '✍️ Grammar Only',
      configPartial: {
        totalQuestions: 15,
        includePassages: false,
        passageCount: 0,
        selectedSubjects: ['hindi'],
        typeCounts: {
          mcq: 4,
          truefalse: 1,
          fillblank: 2,
          match: 2,
          numerical: 1,
          image: 1,
          short: 1,
          logic: 1,
          multiselect: 1,
          ordering: 1
        },
        quizMode: 'practice',
        timerMode: 'none'
      }
    },
    {
      id: 'quick10',
      name: 'Quick 10',
      description: '10 rapid questions across multiple types for daily brush-up',
      badge: '⚡ 10 mins',
      configPartial: {
        totalQuestions: 10,
        typeCounts: {
          mcq: 3,
          truefalse: 2,
          fillblank: 1,
          match: 1,
          numerical: 1,
          image: 1,
          short: 1,
          logic: 0,
          multiselect: 0,
          ordering: 0
        },
        quizMode: 'practice',
        timerMode: 'none'
      }
    },
    {
      id: 'full30',
      name: 'Full Test (25-30)',
      description: 'Comprehensive board exam drill covering all 10 interaction types',
      badge: '📋 Exam Ready',
      configPartial: {
        totalQuestions: 25,
        typeCounts: {
          mcq: 5,
          truefalse: 3,
          fillblank: 3,
          match: 2,
          numerical: 3,
          image: 2,
          short: 2,
          logic: 2,
          multiselect: 2,
          ordering: 1
        },
        quizMode: 'exam',
        timerMode: 'whole-quiz',
        timerSeconds: 1800,
        negativeMarking: true
      }
    },
    {
      id: 'chapterDrill',
      name: 'Chapter Drill',
      description: 'Deep-dive into specific chapters with immediate teacher explanations',
      badge: '🎯 Targeted',
      configPartial: {
        quizMode: 'practice',
        timerMode: 'none',
        typeCounts: {
          mcq: 3,
          truefalse: 1,
          fillblank: 2,
          match: 1,
          numerical: 2,
          image: 1,
          short: 2,
          logic: 1,
          multiselect: 1,
          ordering: 1
        }
      }
    },
    {
      id: 'retryMistakes',
      name: 'Retry My Mistakes',
      description: `Re-attempt past questions you marked wrong (${mistakeIds.length} in notebook)`,
      badge: '🔄 Revision',
      configPartial: {
        quizMode: 'practice',
        timerMode: 'none'
      }
    }
  ];

  const applyPreset = (preset: QuizPreset) => {
    if (preset.configPartial.typeCounts) {
      setTypeCounts(preset.configPartial.typeCounts as Record<QuestionType, number>);
    }
    if (preset.configPartial.quizMode) {
      setQuizMode(preset.configPartial.quizMode);
    }
    if (preset.configPartial.timerMode) {
      setTimerMode(preset.configPartial.timerMode);
    }
    if (preset.configPartial.timerSeconds) {
      setTimerSeconds(preset.configPartial.timerSeconds);
    }
    if (preset.configPartial.negativeMarking !== undefined) {
      setNegativeMarking(preset.configPartial.negativeMarking);
    }
    if (preset.configPartial.includePassages !== undefined) {
      setIncludePassages(preset.configPartial.includePassages);
    }
    if (preset.configPartial.passageCount !== undefined) {
      setPassageCount(preset.configPartial.passageCount);
    }
    if (preset.configPartial.selectedSubjects) {
      setSelectedSubjects(preset.configPartial.selectedSubjects);
    }
  };

  const handleStart = () => {
    const isHindi = selectedSubjects.includes('hindi');
    const config: QuizConfig = {
      selectedClass,
      selectedSubjects,
      selectedChapters,
      typeCounts,
      difficulty,
      totalQuestions: totalCount,
      timerMode,
      timerSeconds: timerMode === 'per-question' ? 60 : timerMode === 'whole-quiz' ? 1800 : 0,
      shuffleQuestions,
      negativeMarking,
      quizMode,
      includePassages: isHindi ? includePassages : false,
      passageCount: isHindi && includePassages ? passageCount : 0
    };

    onStartQuiz(config);
  };


  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
      {/* Title & Stationery Welcome */}
      <div
        className="notebook-sheet"
        style={{
          padding: '1.8rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-card)'
        }}
      >
        <div>
          <span className="handwritten-note" style={{ color: 'var(--margin-line)', fontSize: '1.3rem' }}>
            CBSE & NCERT Test Generator
          </span>
          <h1 style={{ fontSize: '2rem', marginTop: '0.2rem' }}>
            Design Your Practice Test
          </h1>
          <p style={{ color: 'var(--ink-secondary)', marginTop: '0.3rem' }}>
            Pick your class, subject and question types. 100% offline with genuine NCERT questions.
          </p>
        </div>

        <button
          className="paper-btn"
          onClick={onOpenManager}
          style={{ borderColor: 'var(--ink-primary)' }}
        >
          <HandDrawnIcon name="edit" size={18} />
          <span>Question Bank Manager</span>
        </button>
      </div>

      {/* Quick Presets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
          Recommended Test Presets
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.9rem'
          }}
        >
          {presets.map(p => (
            <button
              key={p.id}
              className="paper-btn"
              onClick={() => applyPreset(p)}
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '1rem',
                minHeight: '85px',
                textAlign: 'left',
                backgroundColor: 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{p.name}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--highlighter-soft)',
                    color: '#854d0e',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px'
                  }}
                >
                  {p.badge}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '0.3rem' }}>
                {p.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Configuration Card */}
      <div
        className="notebook-sheet"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          padding: '1.8rem'
        }}
      >
        {/* 1. Class Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label style={{ fontWeight: 700, fontSize: '1rem' }}>1. Select Class:</label>
          <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
            {ALL_CLASSES.map(c => {
              const hasQuestions = allQuestions.some(q => q.class === c);
              const isSelected = selectedClass === c;
              return (
                <button
                  key={c}
                  className={`paper-btn ${isSelected ? 'paper-btn-primary' : ''}`}
                  onClick={() => setSelectedClass(c)}
                  style={{
                    minWidth: '100px',
                    opacity: hasQuestions ? 1 : 0.5
                  }}
                >
                  <span>Class {c}</span>
                  {!hasQuestions && (
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(Phase 2)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Subject Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label style={{ fontWeight: 700, fontSize: '1rem' }}>2. Select Subject(s):</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.8rem' }}>
            {subjectsInClass.map(sId => {
              const meta = SUBJECTS[sId];
              const isSelected = selectedSubjects.includes(sId);
              const count = allQuestions.filter(q => q.class === selectedClass && q.subject === sId).length;

              return (
                <button
                  key={sId}
                  onClick={() => {
                    if (isSelected) {
                      if (selectedSubjects.length > 1) {
                        setSelectedSubjects(selectedSubjects.filter(s => s !== sId));
                      }
                    } else {
                      setSelectedSubjects([...selectedSubjects, sId]);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-card)',
                    border: `2px solid ${isSelected ? meta?.themeColor || 'var(--ink-primary)' : 'var(--ink-border)'}`,
                    backgroundColor: isSelected ? meta?.lightBg || 'var(--highlighter-soft)' : 'var(--bg-card)',
                    boxShadow: isSelected ? 'var(--shadow-paper-elevated)' : 'var(--shadow-paper)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  <HandDrawnIcon name={sId} size={20} color={meta?.themeColor} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{meta?.name || sId}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{count} questions</div>
                  </div>
                  {isSelected && <HandDrawnIcon name="check" size={16} color={meta?.themeColor} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Chapters (Optional) */}
        {availableChapters.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={{ fontWeight: 700, fontSize: '1rem' }}>
                3. Filter Chapters ({selectedChapters.length === 0 ? 'All Chapters Included' : `${selectedChapters.length} Selected`}):
              </label>
              {selectedChapters.length > 0 && (
                <button
                  onClick={() => setSelectedChapters([])}
                  style={{ fontSize: '0.8rem', color: 'var(--margin-line)', fontWeight: 600 }}
                >
                  Clear filter (select all)
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto' }}>
              {availableChapters.map(chap => {
                const isSelected = selectedChapters.includes(chap);
                return (
                  <button
                    key={chap}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedChapters(selectedChapters.filter(c => c !== chap));
                      } else {
                        setSelectedChapters([...selectedChapters, chap]);
                      }
                    }}
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: 'var(--radius-pill)',
                      border: `1.5px solid ${isSelected ? 'var(--ink-primary)' : 'var(--ink-border)'}`,
                      backgroundColor: isSelected ? 'var(--highlighter-soft)' : 'var(--bg-card)',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {chap}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Question Type Stepper (All 10 Types) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label style={{ fontWeight: 700, fontSize: '1rem' }}>
            4. Question Types ({totalCount} Questions Selected):
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '0.8rem'
            }}
          >
            {QUESTION_TYPES.map(t => {
              const count = typeCounts[t.id] || 0;
              const availableOfType = matchingPool.filter(q => q.type === t.id).length;

              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-card)',
                    border: '1.5px solid var(--ink-border)',
                    backgroundColor: count > 0 ? 'var(--bg-card)' : 'var(--bg-paper-subtle)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{t.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                      Available in bank: {availableOfType}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      className="paper-btn"
                      style={{ padding: '0.1rem 0.5rem', minHeight: '28px', fontSize: '1rem' }}
                      disabled={count === 0}
                      onClick={() =>
                        setTypeCounts(prev => ({ ...prev, [t.id]: Math.max(0, count - 1) }))
                      }
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>
                      {count}
                    </span>
                    <button
                      className="paper-btn"
                      style={{ padding: '0.1rem 0.5rem', minHeight: '28px', fontSize: '1rem' }}
                      disabled={count >= availableOfType}
                      onClick={() =>
                        setTypeCounts(prev => ({ ...prev, [t.id]: count + 1 }))
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Mode, Difficulty & Timer Options */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.2rem',
            paddingTop: '0.8rem',
            borderTop: '1px dashed var(--ink-border)'
          }}
        >
          {/* Practice vs Exam Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Test Mode:</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`paper-btn ${quizMode === 'practice' ? 'paper-btn-primary' : ''}`}
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => setQuizMode('practice')}
              >
                Practice (Instant Explanation)
              </button>
              <button
                className={`paper-btn ${quizMode === 'exam' ? 'paper-btn-primary' : ''}`}
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => setQuizMode('exam')}
              >
                Exam (Score at End)
              </button>
            </div>
          </div>

          {/* Difficulty */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Difficulty Level:</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as any)}
              style={{
                padding: '0.6rem',
                borderRadius: 'var(--radius-card)',
                border: '1.5px solid var(--ink-border)',
                fontFamily: 'inherit',
                fontSize: '0.95rem'
              }}
            >
              <option value="mixed">Mixed (All Difficulties)</option>
              <option value="easy">Easy (Fundamentals)</option>
              <option value="medium">Medium (Standard NCERT)</option>
              <option value="hard">Hard (Advanced / Board Level)</option>
            </select>
          </div>

          {/* Timer Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Timer:</label>
            <select
              value={timerMode}
              onChange={e => setTimerMode(e.target.value as any)}
              style={{
                padding: '0.6rem',
                borderRadius: 'var(--radius-card)',
                border: '1.5px solid var(--ink-border)',
                fontFamily: 'inherit',
                fontSize: '0.95rem'
              }}
            >
              <option value="none">No Timer (Untimed Practice)</option>
              <option value="per-question">Per-Question Timer (60s)</option>
              <option value="whole-quiz">Whole Quiz Countdown (30m)</option>
            </select>
          </div>
        </div>

        {/* Checkbox Toggles: Shuffle & Negative Marking */}
        <div style={{ display: 'flex', gap: '1.4rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={e => setShuffleQuestions(e.target.checked)}
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Shuffle question order</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={negativeMarking}
              onChange={e => setNegativeMarking(e.target.checked)}
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Negative Marking (-0.25 mark per wrong answer)
            </span>
          </label>
        </div>

        {/* Unseen Passage Controls for Hindi */}
        {selectedSubjects.includes('hindi') && (
          <div
            style={{
              padding: '0.9rem 1.1rem',
              backgroundColor: 'var(--bg-paper-subtle)',
              border: '1.5px dashed var(--ink-border)',
              borderRadius: 'var(--radius-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.7rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includePassages}
                  onChange={e => setIncludePassages(e.target.checked)}
                />
                <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                  Include unseen-passage questions (अपठित बोध)
                </span>
              </label>

              {includePassages && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="passage-count-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Passages:</label>
                  <select
                    id="passage-count-select"
                    value={passageCount}
                    onChange={e => setPassageCount(Number(e.target.value))}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      border: '1.5px solid var(--ink-border)',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value={1}>1 passage (5 Qs)</option>
                    <option value={2}>2 passages (10 Qs)</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
              {includePassages
                ? `Requests for passage questions always pull whole groups of 5 questions per passage (currently: ${passageCount * 5} passage questions included).`
                : 'Vyakaran only: Unseen passage questions will be excluded.'}
            </div>
          </div>
        )}


        {/* Start Quiz Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '2px solid var(--ink-border)'
          }}
        >
          <div>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {totalCount} Questions Selected
            </span>
            <span style={{ color: 'var(--ink-muted)', marginLeft: '0.5rem', fontSize: '0.9rem' }}>
              ({matchingPool.length} available in pool)
            </span>
          </div>

          <button
            className="paper-btn paper-btn-accent"
            onClick={handleStart}
            disabled={totalCount === 0 || matchingPool.length === 0}
            style={{
              padding: '0.8rem 1.8rem',
              fontSize: '1.1rem',
              opacity: totalCount === 0 || matchingPool.length === 0 ? 0.5 : 1
            }}
          >
            <HandDrawnIcon name="pencil" size={20} />
            <span>Start Practice Quiz Now →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
