import React from 'react';
import { Question, UserAnswer, QuizMode } from '../../types/quiz';
import { SUBJECTS } from '../../data/subjects';
import { HandDrawnIcon } from '../common/HandDrawnIcon';
import { MCQView } from './types/MCQView';
import { TrueFalseView } from './types/TrueFalseView';
import { FillBlankView } from './types/FillBlankView';
import { MatchView } from './types/MatchView';
import { NumericalView } from './types/NumericalView';
import { ImageView } from './types/ImageView';
import { ShortAnswerView } from './types/ShortAnswerView';
import { LogicView } from './types/LogicView';
import { MultiSelectView } from './types/MultiSelectView';
import { OrderingView } from './types/OrderingView';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  userAnswerRecord: UserAnswer | undefined;
  onUpdateAnswer: (ans: any) => void;
  onSubmitAnswer: () => void;
  onSelfGradeCorrect: () => void;
  onUseHint: () => void;
  onToggleFlag: () => void;
  onOpenScratchpad: () => void;
  quizMode: QuizMode;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  userAnswerRecord,
  onUpdateAnswer,
  onSubmitAnswer,
  onSelfGradeCorrect,
  onUseHint,
  onToggleFlag,
  onOpenScratchpad,
  quizMode,
  isBookmarked,
  onToggleBookmark
}) => {
  const subjectMeta = SUBJECTS[question.subject];
  const isPractice = quizMode === 'practice';
  const isAnswered = userAnswerRecord !== undefined && userAnswerRecord.answer !== undefined;
  const showFeedback = isPractice && isAnswered;
  const isLocked = showFeedback;

  return (
    <div
      className="notebook-sheet"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
        padding: '1.6rem',
        border: '2px solid var(--ink-border)',
        boxShadow: 'var(--shadow-paper-elevated)',
        backgroundColor: 'var(--bg-card)'
      }}
    >
      {/* Top Meta Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.6rem',
          paddingBottom: '0.8rem',
          borderBottom: '1.5px dashed var(--ink-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Subject Tab */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-subtle)',
              backgroundColor: subjectMeta?.lightBg || 'var(--bg-paper-subtle)',
              border: `1.5px solid ${subjectMeta?.themeColor || 'var(--ink-border)'}`,
              color: subjectMeta?.themeColor || 'var(--ink-primary)',
              fontWeight: 700,
              fontSize: '0.82rem'
            }}
          >
            <HandDrawnIcon name={question.subject} size={15} color={subjectMeta?.themeColor} />
            <span>Class {question.class} • {subjectMeta?.name || question.subject}</span>
          </span>

          {/* Chapter */}
          <span
            style={{
              padding: '0.25rem 0.6rem',
              borderRadius: 'var(--radius-subtle)',
              backgroundColor: 'var(--bg-paper-subtle)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--ink-secondary)',
              border: '1px solid var(--ink-border)'
            }}
          >
            {question.chapter}
          </span>

          {/* Question Type */}
          <span
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--radius-subtle)',
              backgroundColor: 'var(--highlighter-soft)',
              color: '#854d0e',
              border: '1px solid #fef08a',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}
          >
            {question.type}
          </span>

          {/* Difficulty */}
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color:
                question.difficulty === 'hard'
                  ? 'var(--red-pen)'
                  : question.difficulty === 'medium'
                  ? '#b45309'
                  : 'var(--green-tick)',
              textTransform: 'capitalize'
            }}
          >
            • {question.difficulty} ({question.marks} mark{question.marks > 1 ? 's' : ''})
          </span>
        </div>

        {/* Action icons: Flag & Bookmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            className={`paper-btn ${userAnswerRecord?.isFlagged ? 'paper-btn-accent' : ''}`}
            onClick={onToggleFlag}
            style={{ padding: '0.35rem 0.65rem', minHeight: '34px', fontSize: '0.82rem' }}
            title="Flag question to review later"
          >
            <span>{userAnswerRecord?.isFlagged ? '🚩 Flagged' : '🏳️ Flag'}</span>
          </button>

          <button
            className="paper-btn"
            onClick={onToggleBookmark}
            style={{ padding: '0.35rem 0.65rem', minHeight: '34px', fontSize: '0.82rem' }}
            title="Bookmark question in revision notebook"
          >
            <HandDrawnIcon
              name={isBookmarked ? 'bookmark-filled' : 'bookmark'}
              size={15}
              color={isBookmarked ? '#b45309' : 'currentColor'}
            />
            <span>{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Question Text */}
      <div style={{ margin: '0.4rem 0' }}>
        <h2
          style={{
            fontSize: '1.25rem',
            lineHeight: 1.5,
            fontWeight: 700,
            color: 'var(--ink-primary)'
          }}
          className={question.subject === 'hindi' ? 'devanagari-text' : ''}
        >
          <span style={{ color: 'var(--ink-muted)', marginRight: '0.4rem', fontFamily: 'var(--font-heading)' }}>
            Q{questionNumber}.
          </span>
          {question.type !== 'fillblank' && question.question}
        </h2>
      </div>

      {/* Purpose-Built Type View */}
      <div style={{ width: '100%', margin: '0.2rem 0' }}>
        {question.type === 'mcq' && (
          <MCQView
            question={question}
            userAnswer={userAnswerRecord?.answer}
            onSelectOption={idx => {
              onUpdateAnswer(idx);
              if (isPractice) onSubmitAnswer();
            }}
            isLocked={isLocked}
            showFeedback={showFeedback}
            isPractice={isPractice}
          />
        )}

        {question.type === 'truefalse' && (
          <TrueFalseView
            question={question}
            userAnswer={userAnswerRecord?.answer}
            onSelectAnswer={val => {
              onUpdateAnswer(val);
              if (isPractice) onSubmitAnswer();
            }}
            isLocked={isLocked}
            showFeedback={showFeedback}
          />
        )}

        {question.type === 'fillblank' && (
          <FillBlankView
            question={question}
            userAnswer={userAnswerRecord?.answer}
            onChangeAnswer={val => onUpdateAnswer(val)}
            onSubmit={onSubmitAnswer}
            isLocked={isLocked}
            showFeedback={showFeedback}
            isCorrect={userAnswerRecord?.isCorrect}
          />
        )}

        {question.type === 'match' && (
          <MatchView
            question={question}
            userAnswer={userAnswerRecord?.answer}
            onChangeMatches={matches => onUpdateAnswer(matches)}
            onSubmit={onSubmitAnswer}
            isLocked={isLocked}
            showFeedback={showFeedback}
          />
        )}

        {question.type === 'numerical' && (
          <NumericalView
            question={question}
            userAnswer={userAnswerRecord?.answer}
            onChangeAnswer={val => onUpdateAnswer(val)}
            onSubmit={onSubmitAnswer}
            isLocked={isLocked}
            showFeedback={showFeedback}
            isCorrect={userAnswerRecord?.isCorrect}
            onOpenScratchpad={onOpenScratchpad}
          />
        )}

        {question.type === 'image' && (
          <ImageView
            question={question}
            userAnswer={userAnswerRecord?.answer}
            onSelectOption={idx => {
              onUpdateAnswer(idx);
              if (isPractice) onSubmitAnswer();
            }}
            onTypeAnswer={val => onUpdateAnswer(val)}
            onSubmit={onSubmitAnswer}
            isLocked={isLocked}
            showFeedback={showFeedback}
            isPractice={isPractice}
            isCorrect={userAnswerRecord?.isCorrect}
          />
        )}

        {question.type === 'short' && (
          <ShortAnswerView
            question={question}
            userAnswer={userAnswerRecord?.answer}
            onChangeAnswer={val => onUpdateAnswer(val)}
            onSubmit={onSubmitAnswer}
            onSelfGradeCorrect={onSelfGradeCorrect}
            isLocked={isLocked}
            showFeedback={showFeedback}
            isCorrect={userAnswerRecord?.isCorrect}
          />
        )}

        {question.type === 'logic' && (
          <LogicView
            question={question}
            userAnswer={userAnswerRecord?.answer}
            onSelectOption={idx => {
              onUpdateAnswer(idx);
              if (isPractice) onSubmitAnswer();
            }}
            onTypeAnswer={val => onUpdateAnswer(val)}
            onSubmit={onSubmitAnswer}
            onUseHint={onUseHint}
            hintUsed={Boolean(userAnswerRecord?.hintUsed)}
            isLocked={isLocked}
            showFeedback={showFeedback}
            isPractice={isPractice}
            isCorrect={userAnswerRecord?.isCorrect}
          />
        )}

        {question.type === 'multiselect' && (
          <MultiSelectView
            question={question}
            userAnswer={userAnswerRecord?.answer}
            onToggleOption={idx => {
              const current = userAnswerRecord?.answer || [];
              const next = current.includes(idx)
                ? current.filter((x: number) => x !== idx)
                : [...current, idx];
              onUpdateAnswer(next);
            }}
            onSubmit={onSubmitAnswer}
            isLocked={isLocked}
            showFeedback={showFeedback}
          />
        )}

        {question.type === 'ordering' && (
          <OrderingView
            question={question}
            userAnswer={userAnswerRecord?.answer}
            onChangeOrder={items => onUpdateAnswer(items)}
            onSubmit={onSubmitAnswer}
            isLocked={isLocked}
            showFeedback={showFeedback}
          />
        )}
      </div>

      {/* Explanation Box (shown in practice mode after answering, or in review) */}
      {showFeedback && (
        <div
          className="notebook-sheet"
          style={{
            marginTop: '0.8rem',
            padding: '1.2rem',
            backgroundColor: 'var(--bg-paper-subtle)',
            borderLeft: '4px solid var(--ink-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--ink-secondary)',
              textTransform: 'uppercase'
            }}
          >
            <HandDrawnIcon name="quill" size={16} />
            <span>Teacher's Working & Explanation:</span>
          </div>
          <p style={{ fontSize: '1rem', lineHeight: '1.65', color: 'var(--ink-primary)' }}>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
