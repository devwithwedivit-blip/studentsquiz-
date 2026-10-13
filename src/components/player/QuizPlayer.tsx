import React, { useState, useEffect, useRef } from 'react';
import {
  Question,
  QuizConfig,
  UserAnswer,
  QuizResult
} from '../../types/quiz';
import { evaluateAnswer } from '../../services/evaluator';
import {
  playPencilTick,
  playStampSound,
  playPaperFlip,
  playCelebrationChime
} from '../../services/audio';
import { toggleBookmark, getBookmarks, saveQuizResult, saveActiveQuizSession, clearActiveQuizSession } from '../../services/db';
import { PencilProgressBar } from './PencilProgressBar';
import { QuestionPalette } from './QuestionPalette';
import { QuestionCard } from './QuestionCard';
import { PassagePanel } from './PassagePanel';
import { ScratchpadModal } from '../common/ScratchpadModal';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface QuizPlayerProps {
  questions: Question[];
  config: QuizConfig;
  initialAnswers?: Record<string, UserAnswer>;
  initialIndex?: number;
  initialTimeElapsed?: number;
  onFinishQuiz: (result: QuizResult) => void;
  onQuitQuiz: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({
  questions,
  config,
  initialAnswers,
  initialIndex,
  initialTimeElapsed,
  onFinishQuiz,
  onQuitQuiz
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>(initialAnswers || {});
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [highlightsByPassage, setHighlightsByPassage] = useState<Record<string, string[]>>({});
  const [isMobilePassageOpen, setIsMobilePassageOpen] = useState(false);
  const [isMobilePassageExpanded, setIsMobilePassageExpanded] = useState(false);

  // Timing
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(initialTimeElapsed || 0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(config.timerSeconds || 60);
  const [quizTimeLeft, setQuizTimeLeft] = useState(
    config.timerSeconds ? Math.max(1, config.timerSeconds - (initialTimeElapsed || 0)) : 1800
  );
  const questionStartTimeRef = useRef<number>(Date.now());

  // Auto-save in-progress quiz session to survive tab reload / accidental close
  useEffect(() => {
    if (questions && questions.length > 0) {
      saveActiveQuizSession({
        config,
        questions,
        userAnswers: answers,
        currentIndex,
        totalTimeElapsed,
        timestamp: Date.now()
      });
    }
  }, [config, questions, answers, currentIndex, totalTimeElapsed]);

  // Load bookmarks on mount
  useEffect(() => {
    getBookmarks().then(b => setBookmarkedIds(new Set(b)));
  }, []);

  // Main Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTotalTimeElapsed(prev => prev + 1);

      if (config.timerMode === 'whole-quiz') {
        setQuizTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoFinish();
            return 0;
          }
          return prev - 1;
        });
      } else if (config.timerMode === 'per-question') {
        setQuestionTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeOutNext();
            return config.timerSeconds || 60;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, config.timerMode, config.timerSeconds]);

  const currentQ = questions[currentIndex];
  const questionIds = questions.map(q => q.id);

  // Switch question
  const goToQuestion = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    playPaperFlip();
    setCurrentIndex(index);
    questionStartTimeRef.current = Date.now();
    if (config.timerMode === 'per-question') {
      setQuestionTimeLeft(config.timerSeconds || 60);
    }
  };

  const handleUpdateCurrentAnswer = (newVal: any) => {
    playPencilTick();
    const existing = answers[currentQ.id] || {
      questionId: currentQ.id,
      answer: undefined,
      isCorrect: false,
      timeSpentSeconds: 0,
      isFlagged: false,
      isSkipped: false
    };

    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        ...existing,
        answer: newVal,
        isSkipped: false
      }
    }));
  };

  const handleSubmitCurrentAnswer = () => {
    const curr = answers[currentQ.id];
    const val = curr?.answer;
    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000));

    const evalResult = evaluateAnswer(currentQ, val);
    playStampSound(evalResult.isCorrect);

    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        questionId: currentQ.id,
        answer: val,
        isCorrect: evalResult.isCorrect,
        partialScore: evalResult.score,
        timeSpentSeconds: (curr?.timeSpentSeconds || 0) + timeSpent,
        isFlagged: curr?.isFlagged || false,
        isSkipped: false,
        hintUsed: curr?.hintUsed || false
      }
    }));
  };

  const handleSelfGrade = () => {
    playStampSound(true);
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        isCorrect: true,
        partialScore: 1.0,
        selfGradedCorrect: true
      }
    }));
  };

  const handleUseHint = () => {
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        hintUsed: true
      }
    }));
  };

  const handleToggleFlag = () => {
    const existing = answers[currentQ.id];
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        ...(existing || {
          questionId: currentQ.id,
          answer: undefined,
          isCorrect: false,
          timeSpentSeconds: 0,
          isSkipped: false
        }),
        isFlagged: !existing?.isFlagged
      }
    }));
  };

  const handleToggleBookmark = async () => {
    const isNow = await toggleBookmark(currentQ.id);
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (isNow) next.add(currentQ.id);
      else next.delete(currentQ.id);
      return next;
    });
  };

  const handleSkipQuestion = () => {
    const existing = answers[currentQ.id];
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        ...(existing || {
          questionId: currentQ.id,
          answer: undefined,
          isCorrect: false,
          timeSpentSeconds: 0,
          isFlagged: false
        }),
        isSkipped: true
      }
    }));

    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const handleTimeOutNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    } else {
      handleAutoFinish();
    }
  };

  const handleAutoFinish = () => {
    buildAndSubmitResult();
  };

  const buildAndSubmitResult = async () => {
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let totalScore = 0;
    let maxScore = 0;

    const evaluatedAnswers: Record<string, UserAnswer> = {};

    for (const q of questions) {
      maxScore += q.marks;
      const userAns = answers[q.id];

      if (!userAns || userAns.answer === undefined || userAns.isSkipped) {
        skippedCount++;
        evaluatedAnswers[q.id] = {
          questionId: q.id,
          answer: undefined,
          isCorrect: false,
          partialScore: 0,
          timeSpentSeconds: userAns?.timeSpentSeconds || 0,
          isFlagged: userAns?.isFlagged || false,
          isSkipped: true
        };
      } else {
        const evalRes = evaluateAnswer(q, userAns.answer, userAns.selfGradedCorrect);
        let qScore = evalRes.score * q.marks;

        // Apply hint penalty if applicable
        if (userAns.hintUsed) {
          qScore = Math.max(0, qScore - 0.5);
        }

        // Apply negative marking penalty if wrong and enabled
        if (!evalRes.isCorrect && config.negativeMarking) {
          qScore = -0.25;
        }

        if (evalRes.isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }

        totalScore += qScore;

        evaluatedAnswers[q.id] = {
          ...userAns,
          isCorrect: evalRes.isCorrect,
          partialScore: evalRes.score
        };
      }
    }

    const accuracy =
      correctCount + wrongCount > 0
        ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
        : 0;

    // XP calculation: 10 XP per correct + streak bonuses
    const xpEarned = correctCount * 15 + Math.round(accuracy / 2);

    if (accuracy >= 80) {
      playCelebrationChime();
    }

    const finalResult: QuizResult = {
      id: `attempt_${Date.now()}`,
      timestamp: Date.now(),
      config,
      totalQuestions: questions.length,
      attemptedQuestions: correctCount + wrongCount,
      correctCount,
      wrongCount,
      skippedCount,
      score: Math.max(0, Math.round(totalScore * 10) / 10),
      maxScore,
      accuracyPercentage: accuracy,
      totalTimeSpentSeconds: totalTimeElapsed,
      userAnswers: evaluatedAnswers,
      questionList: questions,
      xpEarned,
      badgesUnlocked: [],
      bankVersion: 'v2_hindi_rewrite'
    };

    await saveQuizResult(finalResult);
    clearActiveQuizSession();
    onFinishQuiz(finalResult);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  const handleQuit = () => {
    clearActiveQuizSession();
    onQuitQuiz();
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {/* Top Header Bar: Quit, Progress, Timer */}
      <div
        className="notebook-sheet"
        style={{
          padding: '1rem 1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
          <button
            className="paper-btn"
            onClick={handleQuit}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            ← Quit Test
          </button>

          {/* Mode Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.8rem',
                backgroundColor: config.quizMode === 'practice' ? 'var(--green-tick-bg)' : 'var(--highlighter-soft)',
                color: config.quizMode === 'practice' ? 'var(--green-tick)' : '#78350f',
                border: '1px solid currentColor'
              }}
            >
              {config.quizMode === 'practice' ? '📝 PRACTICE MODE' : '⏱ EXAM MODE'}
            </span>

            {/* Timer Display */}
            {config.timerMode !== 'none' && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  backgroundColor: 'var(--red-pen-bg)',
                  color: 'var(--red-pen)',
                  border: '1px solid var(--red-pen)'
                }}
              >
                <HandDrawnIcon name="clock" size={15} color="var(--red-pen)" />
                {config.timerMode === 'whole-quiz'
                  ? formatTime(quizTimeLeft)
                  : `${formatTime(questionTimeLeft)} / Q`}
              </span>
            )}
          </div>

          {/* Finish Quiz Button */}
          <button
            className="paper-btn paper-btn-accent"
            onClick={buildAndSubmitResult}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
          >
            Finish & Review
          </button>
        </div>

        {/* Drawn Pencil Progress Bar */}
        <PencilProgressBar
          current={currentIndex + 1}
          total={questions.length}
          percent={progressPercent}
        />
      </div>

      {/* Split view if passage is present; otherwise single column */}
      <div className={`quiz-split-container ${currentQ.passage ? 'has-passage' : ''}`}>
        {/* Desktop Passage Column (sticky on left) */}
        {currentQ.passage && (
          <div className="desktop-passage-col">
            <PassagePanel
              passage={currentQ.passage}
              passageOrder={currentQ.passageOrder}
              highlights={highlightsByPassage[currentQ.passage.id] || []}
              onAddHighlight={phrase => {
                setHighlightsByPassage(prev => ({
                  ...prev,
                  [currentQ.passage!.id]: prev[currentQ.passage!.id]?.includes(phrase)
                    ? prev[currentQ.passage!.id]
                    : [...(prev[currentQ.passage!.id] || []), phrase]
                }));
              }}
              onClearHighlights={() => {
                setHighlightsByPassage(prev => ({
                  ...prev,
                  [currentQ.passage!.id]: []
                }));
              }}
            />
          </div>
        )}

        {/* Question + Controls Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', width: '100%' }}>
          {/* Mobile Passage Trigger Bar (visible on <=859px) */}
          {currentQ.passage && (
            <div className="mobile-passage-trigger" style={{ flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button
                  type="button"
                  className="paper-btn paper-btn-accent"
                  onClick={() => setIsMobilePassageOpen(true)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.8rem',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span>📖 Read Passage ({currentQ.passage.kind === 'padya' ? 'काव्यांश' : 'गद्यांश'})</span>
                </button>
                <button
                  type="button"
                  className="paper-btn"
                  onClick={() => setIsMobilePassageExpanded(p => !p)}
                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                  aria-label="Toggle passage preview"
                >
                  {isMobilePassageExpanded ? '▲ Hide' : '▼ Preview'}
                </button>
              </div>

              {isMobilePassageExpanded && (
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <PassagePanel
                    passage={currentQ.passage}
                    passageOrder={currentQ.passageOrder}
                    highlights={highlightsByPassage[currentQ.passage.id] || []}
                    onAddHighlight={phrase => {
                      setHighlightsByPassage(prev => ({
                        ...prev,
                        [currentQ.passage!.id]: prev[currentQ.passage!.id]?.includes(phrase)
                          ? prev[currentQ.passage!.id]
                          : [...(prev[currentQ.passage!.id] || []), phrase]
                      }));
                    }}
                    onClearHighlights={() => {
                      setHighlightsByPassage(prev => ({
                        ...prev,
                        [currentQ.passage!.id]: []
                      }));
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Main Question Card */}
          <QuestionCard
            question={currentQ}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            userAnswerRecord={answers[currentQ.id]}
            onUpdateAnswer={handleUpdateCurrentAnswer}
            onSubmitAnswer={handleSubmitCurrentAnswer}
            onSelfGradeCorrect={handleSelfGrade}
            onUseHint={handleUseHint}
            onToggleFlag={handleToggleFlag}
            onOpenScratchpad={() => setIsScratchpadOpen(true)}
            quizMode={config.quizMode}
            isBookmarked={bookmarkedIds.has(currentQ.id)}
            onToggleBookmark={handleToggleBookmark}
          />

          {/* Bottom Navigation Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.8rem'
            }}
          >
            <button
              className="paper-btn"
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              style={{ opacity: currentIndex === 0 ? 0.4 : 1 }}
            >
              <HandDrawnIcon name="chevron-left" size={18} />
              <span>Previous</span>
            </button>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button className="paper-btn" onClick={handleSkipQuestion}>
                <span>Skip</span>
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  className="paper-btn paper-btn-primary"
                  onClick={() => goToQuestion(currentIndex + 1)}
                >
                  <span>Next</span>
                  <HandDrawnIcon name="chevron-right" size={18} />
                </button>
              ) : (
                <button className="paper-btn paper-btn-accent" onClick={buildAndSubmitResult}>
                  <span>Submit Final Test</span>
                  <HandDrawnIcon name="check" size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Passage Fullscreen Modal / Bottom Sheet */}
      {isMobilePassageOpen && currentQ.passage && (
        <PassagePanel
          passage={currentQ.passage}
          passageOrder={currentQ.passageOrder}
          mode="modal"
          onCloseModal={() => setIsMobilePassageOpen(false)}
          highlights={highlightsByPassage[currentQ.passage.id] || []}
          onAddHighlight={phrase => {
            setHighlightsByPassage(prev => ({
              ...prev,
              [currentQ.passage!.id]: prev[currentQ.passage!.id]?.includes(phrase)
                ? prev[currentQ.passage!.id]
                : [...(prev[currentQ.passage!.id] || []), phrase]
            }));
          }}
          onClearHighlights={() => {
            setHighlightsByPassage(prev => ({
              ...prev,
              [currentQ.passage!.id]: []
            }));
          }}
        />
      )}

      {/* Question Sheet Navigator (Palette) */}
      <QuestionPalette
        totalQuestions={questions.length}
        currentIndex={currentIndex}
        answers={answers}
        questionIds={questionIds}
        questions={questions}
        onSelectIndex={goToQuestion}
        isOpen={isPaletteOpen}
        onToggle={() => setIsPaletteOpen(!isPaletteOpen)}
      />

      {/* Rough Work Scratchpad Canvas */}
      <ScratchpadModal
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
      />
    </div>
  );
};

