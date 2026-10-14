import React, { useState, useEffect, useRef } from 'react';
import {
  SanitizedOnlineQuestion,
  OnlinePassage,
  StartAttemptResponse,
  SubmitAttemptResponse
} from '../../../types/online';
import { saveOnlineProgress, submitOnlineAttempt } from '../../../services/studentApi';

interface OnlineQuizPlayerProps {
  quizData: StartAttemptResponse;
  onFinish: (result: SubmitAttemptResponse) => void;
  onQuit: () => void;
}

export function OnlineQuizPlayer({ quizData, onFinish, onQuit }: OnlineQuizPlayerProps) {
  const { attemptId, durationMinutes, startedAt, title, questions, passages } = quizData;

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    Object.entries(quizData.savedProgress || {}).forEach(([qId, val]) => {
      initial[qId] = val.response;
    });
    return initial;
  });

  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const totalSec = durationMinutes * 60;
    return Math.max(0, totalSec - elapsed);
  });
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const questionTimesRef = useRef<Record<string, number>>({});
  const lastActiveTimestampRef = useRef<number>(Date.now());
  const isAutoSubmittingRef = useRef<boolean>(false);

  // Time remaining countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - new Date(startedAt).getTime()) / 1000);
      const remaining = Math.max(0, durationMinutes * 60 - elapsed);
      setTimeRemainingSeconds(remaining);

      // Track active question time
      const currentQ = questions[currentIndex];
      if (currentQ) {
        const delta = Math.floor((now - lastActiveTimestampRef.current) / 1000);
        if (delta > 0) {
          questionTimesRef.current[currentQ.id] = (questionTimesRef.current[currentQ.id] || 0) + delta;
          lastActiveTimestampRef.current = now;
        }
      }

      // Auto-submit when time expires
      if (remaining <= 0 && !isAutoSubmittingRef.current) {
        isAutoSubmittingRef.current = true;
        clearInterval(timer);
        handleFinalSubmit(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, durationMinutes, currentIndex, questions]);

  const currentQuestion: SanitizedOnlineQuestion = questions[currentIndex] || questions[0];
  const currentPassage: OnlinePassage | undefined = currentQuestion?.passageId
    ? passages.find(p => p.id === currentQuestion.passageId)
    : undefined;

  // Save answer to server
  const handleAnswerChange = async (newVal: any) => {
    const qId = currentQuestion.id;
    setAnswers(prev => ({ ...prev, [qId]: newVal }));
    setSaveStatus('saving');

    try {
      const timeSpent = questionTimesRef.current[qId] || 1;
      await saveOnlineProgress(attemptId, qId, newVal, timeSpent);
      setSaveStatus('saved');
    } catch (e) {
      console.error('Autosave error:', e);
      setSaveStatus('error');
    }
  };

  const handleClearAnswer = async () => {
    const qId = currentQuestion.id;
    setAnswers(prev => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
    setSaveStatus('saving');
    try {
      const timeSpent = questionTimesRef.current[qId] || 1;
      await saveOnlineProgress(attemptId, qId, null, timeSpent);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const handleToggleFlag = () => {
    const qId = currentQuestion.id;
    setFlaggedIds(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleFinalSubmit = async (isAutoTimeout = false) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitOnlineAttempt(attemptId, answers);
      onFinish(result);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission error. Please try again.');
      setSubmitting(false);
      if (isAutoTimeout) {
        alert('Time has expired. Recording submission on server...');
      }
    }
  };

  // Format MM:SS
  const mins = Math.floor(timeRemainingSeconds / 60);
  const secs = timeRemainingSeconds % 60;
  const isTimeCritical = timeRemainingSeconds < 180; // under 3 minutes

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = flaggedIds.size;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Test Header */}
      <div
        className="notebook-sheet"
        style={{
          padding: '1rem 1.4rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          position: 'sticky',
          top: '0.5rem',
          zIndex: 40,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>
            {title}
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
            Class: Class {currentQuestion?.class} • Question {currentIndex + 1} of {questions.length}
          </div>
        </div>

        {/* Timer & Autosave Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: saveStatus === 'error' ? 'var(--red-pen)' : 'var(--ink-secondary)'
            }}
          >
            {saveStatus === 'saving' && '🔄 Saving...'}
            {saveStatus === 'saved' && '✓ Saved to server'}
            {saveStatus === 'error' && '⚠️ Saving failed'}
          </div>

          <div
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '1.25rem',
              fontWeight: 800,
              backgroundColor: isTimeCritical ? 'var(--red-pen-bg)' : 'var(--paper-card)',
              color: isTimeCritical ? 'var(--red-pen)' : 'var(--ink-primary)',
              border: `1.5px solid ${isTimeCritical ? 'var(--red-pen)' : 'var(--paper-line)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>⏱️</span>
            <span>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="paper-btn paper-btn-accent"
            style={{ padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.9rem' }}
          >
            Finish Quiz
          </button>
        </div>
      </div>

      {/* Main Layout: Question Area + Question Palette */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1rem', alignItems: 'start' }}>
        {/* Left: Active Question and Passages */}
        <div>
          {/* Unseen Passage Viewer (if linked) */}
          {currentPassage && (
            <div
              className="notebook-sheet"
              style={{
                marginBottom: '1rem',
                padding: '1.2rem',
                backgroundColor: 'var(--yellow-sticky)',
                border: '1.5px solid var(--yellow-sticky-border)',
                maxHeight: '260px',
                overflowY: 'auto'
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--ink-primary)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>📜 Unseen {currentPassage.kind === 'padya' ? 'Poem' : 'Prose'} Passage</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                  (Question {(currentQuestion.passageOrder || 1)}/5)
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-body)'
                }}
              >
                {currentPassage.content}
              </div>
            </div>
          )}

          {/* Question Box */}
          <div className="notebook-sheet" style={{ padding: '1.6rem' }}>
            {/* Question Top Tags */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--paper-line)',
                paddingBottom: '0.6rem'
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span
                  style={{
                    backgroundColor: 'var(--paper-tag)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                >
                  Q{currentIndex + 1}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                  {currentQuestion.subject.toUpperCase()} • {currentQuestion.chapter}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    backgroundColor: 'var(--paper-card)',
                    border: '1px solid var(--paper-line)'
                  }}
                >
                  {currentQuestion.type}
                </span>
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-color)' }}>
                {currentQuestion.marks} Mark{currentQuestion.marks !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Question Text */}
            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 600,
                lineHeight: 1.6,
                marginBottom: '1.5rem',
                color: 'var(--ink-primary)'
              }}
            >
              {currentQuestion.question}
            </div>

            {/* Image Attachment (if any) */}
            {currentQuestion.image && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <img
                  src={currentQuestion.image.src}
                  alt={currentQuestion.image.alt || 'Question Image'}
                  style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px' }}
                />
              </div>
            )}

            {/* Dynamic Question Input according to 10 question types */}
            <div style={{ marginBottom: '2rem' }}>
              {/* Type 1: MCQ & Logic & Image */}
              {(currentQuestion.type === 'mcq' ||
                currentQuestion.type === 'logic' ||
                currentQuestion.type === 'image') &&
                currentQuestion.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {currentQuestion.options.map((opt, oIdx) => {
                      const isSelected = answers[currentQuestion.id] === oIdx;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleAnswerChange(oIdx)}
                          className="paper-btn"
                          style={{
                            textAlign: 'left',
                            padding: '0.9rem 1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            backgroundColor: isSelected ? 'var(--yellow-sticky)' : 'var(--paper-card)',
                            border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--paper-line)'}`,
                            borderRadius: '8px',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer'
                          }}
                        >
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--paper-line)'}`,
                              backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                              color: isSelected ? '#fff' : 'var(--ink-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              flexShrink: 0
                            }}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <span style={{ fontSize: '1rem', color: 'var(--ink-primary)' }}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

              {/* Type 2: True / False */}
              {currentQuestion.type === 'truefalse' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    { label: 'True', val: true },
                    { label: 'False', val: false }
                  ].map(item => {
                    const isSelected = answers[currentQuestion.id] === item.val;
                    return (
                      <button
                        key={String(item.val)}
                        type="button"
                        onClick={() => handleAnswerChange(item.val)}
                        className="paper-btn"
                        style={{
                          padding: '1.2rem',
                          textAlign: 'center',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          backgroundColor: isSelected ? 'var(--yellow-sticky)' : 'var(--paper-card)',
                          border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--paper-line)'}`,
                          borderRadius: '8px'
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Type 3: Fill in the blank & Numerical */}
              {(currentQuestion.type === 'fillblank' || currentQuestion.type === 'numerical') && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <input
                      type={currentQuestion.type === 'numerical' ? 'number' : 'text'}
                      value={answers[currentQuestion.id] ?? ''}
                      onChange={e => handleAnswerChange(e.target.value)}
                      placeholder="Type your answer here..."
                      className="paper-input"
                      style={{
                        padding: '0.8rem 1rem',
                        fontSize: '1.1rem',
                        borderRadius: '6px',
                        border: '2px solid var(--paper-line)',
                        flex: 1
                      }}
                    />
                    {currentQuestion.unit && (
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink-secondary)' }}>
                        {currentQuestion.unit}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Type 4: Multi-select */}
              {currentQuestion.type === 'multiselect' && currentQuestion.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {currentQuestion.options.map((opt, oIdx) => {
                    const currentSelected: number[] = Array.isArray(answers[currentQuestion.id])
                      ? answers[currentQuestion.id]
                      : [];
                    const isSelected = currentSelected.includes(oIdx);

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? currentSelected.filter(i => i !== oIdx)
                            : [...currentSelected, oIdx];
                          handleAnswerChange(next);
                        }}
                        className="paper-btn"
                        style={{
                          textAlign: 'left',
                          padding: '0.9rem 1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.8rem',
                          backgroundColor: isSelected ? 'var(--yellow-sticky)' : 'var(--paper-card)',
                          border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--paper-line)'}`,
                          borderRadius: '8px',
                          fontWeight: isSelected ? 700 : 500
                        }}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--paper-line)'}`,
                            backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            flexShrink: 0
                          }}
                        >
                          {isSelected ? '✓' : ''}
                        </div>
                        <span style={{ fontSize: '1rem', color: 'var(--ink-primary)' }}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Type 5: Short Answer */}
              {currentQuestion.type === 'short' && (
                <div>
                  <textarea
                    rows={4}
                    value={answers[currentQuestion.id] ?? ''}
                    onChange={e => handleAnswerChange(e.target.value)}
                    placeholder="Write your short answer (1-2 sentences) here..."
                    className="paper-input"
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      fontSize: '1rem',
                      lineHeight: '1.5',
                      borderRadius: '6px',
                      border: '2px solid var(--paper-line)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Type 6: Match pairs */}
              {currentQuestion.type === 'match' && currentQuestion.pairsLeft && (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.6rem' }}>
                    Match each item from the left column with the correct item on the right:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {currentQuestion.pairsLeft.map((leftItem, lIdx) => {
                      const userPairs: [string, string][] = Array.isArray(answers[currentQuestion.id])
                        ? answers[currentQuestion.id]
                        : [];
                      const matchedRight = userPairs.find(p => p[0] === leftItem)?.[1] || '';

                      return (
                        <div
                          key={lIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '0.6rem',
                            backgroundColor: 'var(--paper-card)',
                            borderRadius: '6px',
                            border: '1px solid var(--paper-line)'
                          }}
                        >
                          <div style={{ flex: 1, fontWeight: 600 }}>{leftItem}</div>
                          <div style={{ color: 'var(--ink-secondary)' }}>➔</div>
                          <select
                            value={matchedRight}
                            onChange={e => {
                              const newRight = e.target.value;
                              const updated = userPairs.filter(p => p[0] !== leftItem);
                              if (newRight) updated.push([leftItem, newRight]);
                              handleAnswerChange(updated);
                            }}
                            className="paper-input"
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px' }}
                          >
                            <option value="">-- Select match --</option>
                            {(currentQuestion.pairsRightShuffled || []).map((rItem, rIdx) => (
                              <option key={rIdx} value={rItem}>
                                {rItem}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Type 7: Ordering sequence */}
              {currentQuestion.type === 'ordering' && currentQuestion.itemsShuffled && (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.6rem' }}>
                    Arrange the items in correct order (use Up/Down buttons):
                  </p>
                  {(() => {
                    const currentOrder: string[] = Array.isArray(answers[currentQuestion.id])
                      ? answers[currentQuestion.id]
                      : currentQuestion.itemsShuffled;

                    const moveItem = (fromIdx: number, toIdx: number) => {
                      const next = [...currentOrder];
                      const [removed] = next.splice(fromIdx, 1);
                      next.splice(toIdx, 0, removed);
                      handleAnswerChange(next);
                    };

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {currentOrder.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.7rem 1rem',
                              backgroundColor: 'var(--paper-card)',
                              border: '1.5px solid var(--paper-line)',
                              borderRadius: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--paper-tag)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.8rem',
                                  fontWeight: 800
                                }}
                              >
                                {idx + 1}
                              </span>
                              <span style={{ fontWeight: 600 }}>{item}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveItem(idx, idx - 1)}
                                className="paper-btn"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === currentOrder.length - 1}
                                onClick={() => moveItem(idx, idx + 1)}
                                className="paper-btn"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.8rem',
                borderTop: '1px solid var(--paper-line)',
                paddingTop: '1rem'
              }}
            >
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={handleClearAnswer}
                  disabled={answers[currentQuestion.id] === undefined}
                  className="paper-btn"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  Clear Answer
                </button>
                <button
                  type="button"
                  onClick={handleToggleFlag}
                  className={`paper-btn ${flaggedIds.has(currentQuestion.id) ? 'paper-btn-accent' : ''}`}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  {flaggedIds.has(currentQuestion.id) ? '🚩 Flagged' : '🏳️ Flag for Review'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  className="paper-btn"
                  style={{ padding: '0.5rem 1rem', fontWeight: 600 }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className="paper-btn paper-btn-accent"
                  style={{ padding: '0.5rem 1.2rem', fontWeight: 700 }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Question Palette */}
        <div>
          <div className="notebook-sheet" style={{ padding: '1.2rem' }}>
            <h4
              style={{
                margin: '0 0 0.8rem 0',
                fontFamily: 'var(--font-heading)',
                fontSize: '1rem',
                borderBottom: '1px solid var(--paper-line)',
                paddingBottom: '0.4rem'
              }}
            >
              Question Palette
            </h4>

            {/* Legend */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.4rem',
                fontSize: '0.75rem',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#059669' }} />
                <span>Answered ({answeredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#e2e8f0' }} />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#eab308' }} />
                <span>Review ({flaggedCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid #2563eb' }} />
                <span>Active</span>
              </div>
            </div>

            {/* Grid of Question Numbers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '0.4rem',
                marginBottom: '1.2rem'
              }}
            >
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '';
                const isFlagged = flaggedIds.has(q.id);
                const isCurrent = currentIndex === idx;

                let bg = 'var(--paper-card)';
                let color = 'var(--ink-primary)';
                if (isFlagged) {
                  bg = '#fef08a';
                  color = '#854d0e';
                } else if (isAnswered) {
                  bg = '#d1fae5';
                  color = '#065f46';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      height: '38px',
                      borderRadius: '6px',
                      border: isCurrent ? '2px solid var(--accent-color)' : '1px solid var(--paper-line)',
                      backgroundColor: bg,
                      color,
                      fontWeight: isCurrent ? 800 : 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-2px',
                          fontSize: '0.65rem'
                        }}
                      >
                        🚩
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="paper-btn paper-btn-accent"
              style={{
                width: '100%',
                padding: '0.6rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                textAlign: 'center'
              }}
            >
              Submit Exam
            </button>
          </div>
        </div>
      </div>

      {/* Final Submit Confirmation Modal */}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div
            className="notebook-sheet"
            style={{ maxWidth: '440px', width: '100%', padding: '2rem', textAlign: 'center' }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>
              Submit Exam?
            </h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
              Please review your exam status before submitting:
            </p>

            {submitError && (
              <div
                style={{
                  padding: '0.6rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--red-pen-bg)',
                  border: '1.5px solid var(--red-pen)',
                  color: 'var(--red-pen)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  margin: '0.8rem 0'
                }}
              >
                ⚠️ {submitError}
              </div>
            )}

            <div
              style={{
                backgroundColor: 'var(--paper-card)',
                padding: '1rem',
                borderRadius: '8px',
                margin: '1.2rem 0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.8rem',
                textAlign: 'left',
                fontSize: '0.9rem'
              }}
            >
              <div>Total Questions: <strong>{questions.length}</strong></div>
              <div>Answered: <strong style={{ color: '#059669' }}>{answeredCount}</strong></div>
              <div>Unanswered: <strong style={{ color: '#dc2626' }}>{unansweredCount}</strong></div>
              <div>Marked for Review: <strong style={{ color: '#d97706' }}>{flaggedCount}</strong></div>
            </div>

            {unansweredCount > 0 && (
              <p style={{ color: 'var(--red-pen)', fontSize: '0.85rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
                Warning: You have {unansweredCount} unanswered questions!
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="paper-btn"
                style={{ padding: '0.6rem 1.2rem', fontWeight: 600 }}
              >
                Continue Exam
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalSubmit(false)}
                className="paper-btn paper-btn-accent"
                style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
