import React, { useState } from 'react';
import { Question, QuestionType, Difficulty, SubjectId } from '../../types/quiz';
import { SUBJECTS, ALL_CLASSES } from '../../data/subjects';
import { QuestionCard } from '../player/QuestionCard';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface QuestionEditorModalProps {
  question: Partial<Question> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => void;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  question,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(question?.id);

  // Form state
  const [cls, setCls] = useState<9 | 10 | 11 | 12>(question?.class || 9);
  const [subject, setSubject] = useState<SubjectId>(question?.subject || 'maths');
  const [chapter, setChapter] = useState(question?.chapter || '');
  const [type, setType] = useState<QuestionType>(question?.type || 'mcq');
  const [difficulty, setDifficulty] = useState<Difficulty>(question?.difficulty || 'medium');
  const [questionText, setQuestionText] = useState(question?.question || '');
  const [marks, setMarks] = useState(question?.marks || 1);
  const [explanation, setExplanation] = useState(question?.explanation || '');

  // Type specific fields
  const [mcqOptions, setMcqOptions] = useState<string[]>(
    question?.options && question.options.length === 4
      ? question.options
      : ['Option A', 'Option B', 'Option C', 'Option D']
  );
  const [mcqAnswer, setMcqAnswer] = useState<number>(
    typeof question?.answer === 'number' ? question.answer : 0
  );

  const [tfAnswer, setTfAnswer] = useState<boolean>(
    typeof question?.answer === 'boolean' ? question.answer : true
  );

  const [fillBlankAccepted, setFillBlankAccepted] = useState<string>(
    (question?.acceptedAnswers || [String(question?.answer || '')]).join(', ')
  );

  const [pairs, setPairs] = useState<[string, string][]>(
    question?.pairs || [
      ['Item A', 'Match A'],
      ['Item B', 'Match B'],
      ['Item C', 'Match C'],
      ['Item D', 'Match D']
    ]
  );

  const [numAnswer, setNumAnswer] = useState<string>(String(question?.answer || '0'));
  const [numTolerance, setNumTolerance] = useState<number>(question?.tolerance ?? 0.02);
  const [numUnit, setNumUnit] = useState<string>(question?.unit || '');

  const [imageKind, setImageKind] = useState<'svg' | 'data-url'>(question?.image?.kind || 'svg');
  const [imageSvg, setImageSvg] = useState<string>(
    question?.image?.src ||
      '<svg viewBox="0 0 200 120" width="100%" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#f8fafc" stroke="#1b2a4a" stroke-width="2"/><text x="100" y="65" font-size="14" text-anchor="middle" fill="#1b2a4a">Sample Diagram</text></svg>'
  );

  const [shortAccepted, setShortAccepted] = useState<string>(
    (question?.acceptedAnswers || [String(question?.answer || '')]).join(', ')
  );
  const [shortKeywords, setShortKeywords] = useState<string>(
    (question?.keywords || []).join(', ')
  );

  const [hint, setHint] = useState<string>(question?.hint || '');

  const [multiOptions, setMultiOptions] = useState<string[]>(
    question?.options && question.options.length >= 4
      ? question.options
      : ['Option 1', 'Option 2', 'Option 3', 'Option 4']
  );
  const [multiAnswers, setMultiAnswers] = useState<number[]>(
    Array.isArray(question?.answer) ? question.answer : [0, 1]
  );

  const [orderedItems, setOrderedItems] = useState<string[]>(
    question?.orderedItems || ['Step 1', 'Step 2', 'Step 3', 'Step 4']
  );

  const [showLivePreview, setShowLivePreview] = useState(true);

  // Build temporary question for live preview
  const previewQuestion: Question = {
    id: question?.id || 'preview_id',
    class: cls,
    subject,
    chapter: chapter || 'Sample Chapter',
    type,
    difficulty,
    question: questionText || 'Question statement will appear here...',
    marks,
    explanation: explanation || 'Step-by-step teacher explanation.',
    options: type === 'mcq' ? mcqOptions : type === 'multiselect' ? multiOptions : undefined,
    answer:
      type === 'mcq'
        ? mcqAnswer
        : type === 'truefalse'
        ? tfAnswer
        : type === 'fillblank'
        ? fillBlankAccepted.split(',')[0]?.trim() || ''
        : type === 'numerical'
        ? parseFloat(numAnswer) || 0
        : type === 'short'
        ? shortAccepted.split(',')[0]?.trim() || ''
        : type === 'multiselect'
        ? multiAnswers
        : 'matched',
    acceptedAnswers:
      type === 'fillblank'
        ? fillBlankAccepted.split(',').map(s => s.trim()).filter(Boolean)
        : type === 'short'
        ? shortAccepted.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
    keywords:
      type === 'short'
        ? shortKeywords.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
    pairs: type === 'match' ? pairs : undefined,
    orderedItems: type === 'ordering' ? orderedItems : undefined,
    image:
      type === 'image'
        ? {
            kind: imageKind,
            src: imageSvg
          }
        : undefined,
    tolerance: type === 'numerical' ? numTolerance : undefined,
    unit: type === 'numerical' ? numUnit : undefined,
    hint: type === 'logic' ? hint : undefined
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const result = evt.target?.result as string;
      if (file.type.includes('svg')) {
        setImageKind('svg');
        setImageSvg(result);
      } else {
        setImageKind('data-url');
        setImageSvg(
          `<svg viewBox="0 0 300 200" width="100%" height="200" xmlns="http://www.w3.org/2000/svg"><image href="${result}" width="300" height="200" /></svg>`
        );
      }
    };
    if (file.type.includes('svg')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const finalQ: Question = {
      ...previewQuestion,
      id: question?.id || `user-${subject}-${Date.now().toString().slice(-6)}`,
      isUserAdded: !question?.id,
      isUserEdited: Boolean(question?.id)
    };
    onSave(finalQ);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="notebook-sheet"
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          padding: '1.4rem',
          border: '2px solid var(--ink-primary)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '0.8rem',
            borderBottom: '1.5px solid var(--ink-border)',
            marginBottom: '1rem'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.4rem' }}>
              {isEditing ? 'Edit Question' : 'Add New Question'}
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
              Live student preview reflects all changes in real time
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              className="paper-btn"
              onClick={() => setShowLivePreview(!showLivePreview)}
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
            >
              {showLivePreview ? 'Hide Preview' : 'Show Live Preview'}
            </button>
            <button
              className="paper-btn paper-btn-primary"
              onClick={handleSave}
              disabled={!questionText.trim()}
            >
              <HandDrawnIcon name="check" size={16} />
              <span>Save Question</span>
            </button>
            <button className="paper-btn" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Two-Column Editor Layout: Form Left, Live Preview Right */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: showLivePreview ? '1.1fr 1fr' : '1fr',
            gap: '1.5rem',
            overflowY: 'auto',
            paddingRight: '0.5rem'
          }}
        >
          {/* FORM CONTROLS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Class, Subject, Type, Difficulty Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Class:</label>
                <select
                  value={cls}
                  onChange={e => setCls(Number(e.target.value) as any)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  {ALL_CLASSES.map(c => (
                    <option key={c} value={c}>Class {c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Subject:</label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  {Object.values(SUBJECTS).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Question Type:</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="mcq">MCQ (4 options)</option>
                  <option value="truefalse">True / False</option>
                  <option value="fillblank">Fill in Blank (____)</option>
                  <option value="match">Match Pairs</option>
                  <option value="numerical">Numerical Problem</option>
                  <option value="image">Diagram / SVG Image</option>
                  <option value="short">Short Answer</option>
                  <option value="logic">Logic / Puzzle</option>
                  <option value="multiselect">Multi-Select</option>
                  <option value="ordering">Ordering / Sequence</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Difficulty:</label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Chapter & Marks */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Chapter / Topic:</label>
                <input
                  type="text"
                  value={chapter}
                  onChange={e => setChapter(e.target.value)}
                  placeholder="e.g. Lines and Angles"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Marks:</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={marks}
                  onChange={e => setMarks(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            {/* Question Text */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Question Statement: {type === 'fillblank' && '(Use ____ for the blank)'}
              </label>
              <textarea
                rows={2}
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                placeholder="Type the full question text here..."
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            {/* TYPE SPECIFIC INPUTS */}
            {type === 'mcq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Options (Select the correct radio button):
                </label>
                {mcqOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name="mcqCorrect"
                      checked={mcqAnswer === i}
                      onChange={() => setMcqAnswer(i)}
                    />
                    <span style={{ fontWeight: 700, width: '20px' }}>{String.fromCharCode(65 + i)}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const next = [...mcqOptions];
                        next[i] = e.target.value;
                        setMcqOptions(next);
                      }}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {type === 'truefalse' && (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Correct Answer:</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input
                    type="radio"
                    name="tfVal"
                    checked={tfAnswer === true}
                    onChange={() => setTfAnswer(true)}
                  />
                  <span>True</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input
                    type="radio"
                    name="tfVal"
                    checked={tfAnswer === false}
                    onChange={() => setTfAnswer(false)}
                  />
                  <span>False</span>
                </label>
              </div>
            )}

            {type === 'fillblank' && (
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Accepted Spellings / Forms (comma-separated):</label>
                <input
                  type="text"
                  value={fillBlankAccepted}
                  onChange={e => setFillBlankAccepted(e.target.value)}
                  placeholder="e.g. 180 degrees, 180°, supplementary"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            )}

            {type === 'match' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Match Pairs (Left to Right):</label>
                {pairs.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={p[0]}
                      onChange={e => {
                        const next = [...pairs];
                        next[i] = [e.target.value, next[i][1]];
                        setPairs(next);
                      }}
                      placeholder={`Left Item ${i + 1}`}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input
                      type="text"
                      value={p[1]}
                      onChange={e => {
                        const next = [...pairs];
                        next[i] = [next[i][0], e.target.value];
                        setPairs(next);
                      }}
                      placeholder={`Right Item ${i + 1}`}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {type === 'numerical' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Numerical Answer:</label>
                  <input
                    type="number"
                    value={numAnswer}
                    onChange={e => setNumAnswer(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Tolerance (±):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={numTolerance}
                    onChange={e => setNumTolerance(parseFloat(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Unit:</label>
                  <input
                    type="text"
                    value={numUnit}
                    onChange={e => setNumUnit(e.target.value)}
                    placeholder="e.g. cm, m/s"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}

            {type === 'image' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Upload Image File or Paste Inline SVG:</label>
                <input type="file" accept="image/*,.svg" onChange={handleFileUpload} />
                <textarea
                  rows={4}
                  value={imageSvg}
                  onChange={e => {
                    setImageKind('svg');
                    setImageSvg(e.target.value);
                  }}
                  placeholder="Paste inline SVG code <svg>...</svg>"
                  style={{ width: '100%', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>
            )}

            {type === 'short' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Model Answer / Accepted Phrasings:</label>
                  <input
                    type="text"
                    value={shortAccepted}
                    onChange={e => setShortAccepted(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Keywords for Lenient Matching:</label>
                  <input
                    type="text"
                    value={shortKeywords}
                    onChange={e => setShortKeywords(e.target.value)}
                    placeholder="e.g. conservation, momentum, collision"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}

            {type === 'logic' && (
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Teacher Clue / Hint:</label>
                <input
                  type="text"
                  value={hint}
                  onChange={e => setHint(e.target.value)}
                  placeholder="e.g. Observe the difference between consecutive terms"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            )}

            {type === 'multiselect' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Options (Check all correct checkboxes):
                </label>
                {multiOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={multiAnswers.includes(i)}
                      onChange={e => {
                        if (e.target.checked) setMultiAnswers([...multiAnswers, i]);
                        else setMultiAnswers(multiAnswers.filter(x => x !== i));
                      }}
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const next = [...multiOptions];
                        next[i] = e.target.value;
                        setMultiOptions(next);
                      }}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {type === 'ordering' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Items in CORRECT chronological order:
                </label>
                {orderedItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700 }}>{i + 1}.</span>
                    <input
                      type="text"
                      value={item}
                      onChange={e => {
                        const next = [...orderedItems];
                        next[i] = e.target.value;
                        setOrderedItems(next);
                      }}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Explanation */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Teacher's Working & Explanation:</label>
              <textarea
                rows={2}
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                placeholder="Working steps and textbook rationale..."
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          {/* LIVE STUDENT PREVIEW */}
          {showLivePreview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--ink-secondary)',
                  textTransform: 'uppercase',
                  borderBottom: '1px dashed var(--ink-border)',
                  paddingBottom: '0.4rem'
                }}
              >
                👁 Live Student View Preview
              </div>

              <QuestionCard
                question={previewQuestion}
                questionNumber={1}
                totalQuestions={1}
                userAnswerRecord={undefined}
                onUpdateAnswer={() => {}}
                onSubmitAnswer={() => {}}
                onSelfGradeCorrect={() => {}}
                onUseHint={() => {}}
                onToggleFlag={() => {}}
                onOpenScratchpad={() => {}}
                quizMode="practice"
                isBookmarked={false}
                onToggleBookmark={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
