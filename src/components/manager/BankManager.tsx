import React, { useState, useEffect } from 'react';
import { Question, SubjectId, QuestionType, Difficulty, Passage } from '../../types/quiz';
import { SUBJECTS, ALL_CLASSES, ALL_SUBJECTS } from '../../data/subjects';
import { filterQuestions } from '../../data/bankLoader';
import { HandDrawnIcon } from '../common/HandDrawnIcon';
import { QuestionEditorModal } from './QuestionEditorModal';
import { ImportExportModal } from './ImportExportModal';
import { PassageEditorModal } from './PassageEditorModal';

interface BankManagerProps {
  questions: Question[];
  passages?: Passage[];
  onAddQuestion: (q: Question) => void;
  onEditQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onToggleHide: (id: string) => void;
  onResetBank: () => void;
  onImportQuestions: (imported: Question[]) => void;
  onImportPassages?: (imported: Passage[]) => void;
  onAddPassage?: (p: Passage) => void;
  onEditPassage?: (p: Passage) => void;
  onDeletePassage?: (id: string, deleteLinkedQuestions: boolean) => void;
  onDuplicatePassage?: (p: Passage) => void;
  onBackToBuilder: () => void;
}

export const BankManager: React.FC<BankManagerProps> = ({
  questions,
  passages = [],
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onBulkDelete,
  onToggleHide,
  onResetBank,
  onImportQuestions,
  onImportPassages,
  onAddPassage,
  onEditPassage,
  onDeletePassage,
  onDuplicatePassage,
  onBackToBuilder
}) => {
  // Active manager section: questions or passages
  const [activeSection, setActiveSection] = useState<'questions' | 'passages'>('questions');

  // Passage editor & delete warning modal state
  const [editingPassage, setEditingPassage] = useState<Partial<Passage> | null>(null);
  const [isPassageModalOpen, setIsPassageModalOpen] = useState(false);
  const [passagePendingDelete, setPassagePendingDelete] = useState<Passage | null>(null);
  const [filterPassageClass, setFilterPassageClass] = useState<number | 'all'>('all');
  // Filters
  const [filterClass, setFilterClass] = useState<number | undefined>(undefined);
  const [filterSubject, setFilterSubject] = useState<SubjectId | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state (50 questions per page ensures silky 60 FPS scrolling)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Modals state
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Undo delete toast state
  const [undoDeletedQuestion, setUndoDeletedQuestion] = useState<Question | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered questions
  const filtered = filterQuestions(questions, {
    class: filterClass,
    subject: filterSubject,
    type: filterType,
    difficulty: filterDifficulty,
    search: searchQuery
  });

  // Reset to first page whenever filter or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterClass, filterSubject, filterType, filterDifficulty, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginatedQuestions = filtered.slice(startIndex, endIndex);

  const handleOpenAdd = () => {
    setEditingQuestion({
      class: (filterClass as any) || 9,
      subject: filterSubject !== 'all' ? filterSubject : 'maths',
      type: 'mcq',
      difficulty: 'medium',
      marks: 1
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setIsEditorOpen(true);
  };

  const handleDuplicate = (q: Question) => {
    const copy: Question = {
      ...q,
      id: `copy-${q.subject}-${Date.now().toString().slice(-6)}`,
      question: `${q.question} (Copy)`,
      isUserAdded: true
    };
    onAddQuestion(copy);
    showToast(`Duplicated question as "${copy.id}"`);
  };

  const handleDeleteWithUndo = (q: Question) => {
    setUndoDeletedQuestion(q);
    onDeleteQuestion(q.id);
    showToast(`Deleted question "${q.id}".`, true);
  };

  const handleUndo = () => {
    if (undoDeletedQuestion) {
      onAddQuestion(undoDeletedQuestion);
      setUndoDeletedQuestion(null);
      setToastMessage(null);
    }
  };

  const showToast = (msg: string, hasUndo = false) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      if (hasUndo) setUndoDeletedQuestion(null);
    }, 6000);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(q => q.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExecuteBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Delete ${selectedIds.size} selected questions?`)) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      showToast(`Bulk deleted ${selectedIds.size} questions.`);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {/* Top Header & Breadcrumb */}
      <div
        className="notebook-sheet"
        style={{
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <button
            className="paper-btn"
            onClick={onBackToBuilder}
            style={{ marginBottom: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.82rem' }}
          >
            ← Back to Quiz Generator
          </button>
          <h1 style={{ fontSize: '1.8rem' }}>Question Bank Manager</h1>
          <span className="handwritten-note" style={{ fontSize: '1.05rem', color: 'var(--ink-secondary)' }}>
            Teacher / Admin repository ({questions.length} total questions active)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="paper-btn paper-btn-accent" onClick={handleOpenAdd}>
            <HandDrawnIcon name="plus" size={16} />
            <span>Add New Question</span>
          </button>
          <button className="paper-btn" onClick={() => setIsImportExportOpen(true)}>
            <HandDrawnIcon name="import" size={16} />
            <span>Import / Export</span>
          </button>
          <button
            className="paper-btn paper-btn-danger"
            onClick={() => setShowResetConfirm(true)}
            title="Reset to original read-only seed files"
          >
            <HandDrawnIcon name="reset" size={16} />
            <span>Reset to Original Bank</span>
          </button>
        </div>
      </div>

      {/* Class × Subject Progress Counters Matrix */}
      <div
        className="notebook-sheet"
        style={{
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem',
          backgroundColor: 'var(--bg-paper-subtle)'
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
          Curriculum Bank Progress (Target: 100 questions per class + subject)
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.6rem'
          }}
        >
          {ALL_CLASSES.map(cls => {
            const classCount = questions.filter(q => q.class === cls).length;
            return (
              <div
                key={cls}
                style={{
                  padding: '0.6rem 0.8rem',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-card)',
                  border: '1.5px solid var(--ink-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Class {cls}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: classCount >= 50 ? 'var(--green-tick)' : '#b45309' }}>
                  {classCount} questions
                </div>
                <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, classCount)}%`, height: '100%', backgroundColor: 'var(--ink-primary)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtab Switcher: Questions vs Passages */}
      <div style={{ display: 'flex', gap: '0.6rem', borderBottom: '2px solid var(--ink-border)', paddingBottom: '0.4rem' }}>
        <button
          type="button"
          className={`paper-btn ${activeSection === 'questions' ? 'paper-btn-primary' : ''}`}
          onClick={() => setActiveSection('questions')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.95rem', fontWeight: 700 }}
        >
          📝 Questions ({questions.length})
        </button>
        <button
          type="button"
          className={`paper-btn ${activeSection === 'passages' ? 'paper-btn-primary' : ''}`}
          onClick={() => setActiveSection('passages')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.95rem', fontWeight: 700 }}
        >
          📄 Passages ({passages.length})
        </button>
      </div>

      {activeSection === 'passages' ? (
        /* PASSAGES MANAGEMENT VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Passage Toolbar */}
          <div
            className="notebook-sheet"
            style={{
              padding: '1.2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.8rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700 }}>Filter Class:</label>
              <select
                value={filterPassageClass}
                onChange={e => setFilterPassageClass(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
              >
                <option value="all">All Classes</option>
                <option value={9}>Class 9</option>
                <option value={10}>Class 10</option>
                <option value={11}>Class 11</option>
                <option value={12}>Class 12</option>
              </select>
            </div>

            <button
              type="button"
              className="paper-btn paper-btn-accent"
              onClick={() => {
                setEditingPassage({ class: (filterPassageClass === 'all' ? 9 : filterPassageClass) as any, subject: 'hindi', kind: 'gadya' });
                setIsPassageModalOpen(true);
              }}
            >
              <HandDrawnIcon name="plus" size={16} />
              <span>Add New Passage</span>
            </button>
          </div>

          {/* Passages List */}
          {passages.filter(p => filterPassageClass === 'all' || p.class === filterPassageClass).length === 0 ? (
            <div className="notebook-sheet" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '1rem', marginBottom: '1rem' }}>
                No passages found for this class.
              </p>
              <button
                type="button"
                className="paper-btn paper-btn-primary"
                onClick={() => {
                  setEditingPassage({ class: (filterPassageClass === 'all' ? 9 : filterPassageClass) as any, subject: 'hindi', kind: 'gadya' });
                  setIsPassageModalOpen(true);
                }}
              >
                Add Your First Passage
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {passages
                .filter(p => filterPassageClass === 'all' || p.class === filterPassageClass)
                .map(p => {
                  const linkedQs = questions.filter(q => q.passageId === p.id);
                  const wordCount = p.wordCount || p.text.trim().split(/\s+/).filter(Boolean).length;
                  const lineCount = p.text.split('\n').filter(Boolean).length;
                  const isPoem = p.kind === 'padya';

                  return (
                    <div
                      key={p.id}
                      className="notebook-sheet"
                      style={{
                        padding: '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.7rem',
                        borderLeft: `4px solid ${isPoem ? '#a855f7' : '#0284c7'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Class {p.class}</span>
                            <span
                              style={{
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                backgroundColor: isPoem ? '#f3e8ff' : '#e0f2fe',
                                color: isPoem ? '#7e22ce' : '#0369a1'
                              }}
                            >
                              {isPoem ? '📜 Poetry' : '📄 Prose'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>
                              ({p.id})
                            </span>
                          </div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '0.3rem' }}>
                            {p.title} <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', fontWeight: 400 }}>(Teacher-only)</span>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: linkedQs.length === 5 ? 'var(--green-tick-bg)' : '#fef3c7',
                            color: linkedQs.length === 5 ? 'var(--green-tick)' : '#b45309'
                          }}
                        >
                          {linkedQs.length}/5 Questions
                        </span>
                      </div>

                      {/* Excerpt */}
                      <div
                        style={{
                          fontSize: '0.88rem',
                          lineHeight: '1.6',
                          color: 'var(--ink-primary)',
                          fontFamily: "'Noto Sans Devanagari', sans-serif",
                          maxHeight: '80px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          backgroundColor: 'var(--bg-paper-subtle)',
                          padding: '0.5rem',
                          borderRadius: '4px'
                        }}
                      >
                        {p.text}
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>
                        <span>
                          {isPoem ? `${lineCount} Lines` : `${wordCount} Words`} • Theme: {p.theme || 'General'}
                        </span>
                        {linkedQs.length > 0 && (
                          <span title={linkedQs.map(q => q.id).join(', ')}>
                            {linkedQs.map(q => q.passageOrder || '?').sort().join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.3rem', borderTop: '1px dashed var(--ink-border)', paddingTop: '0.5rem' }}>
                        <button
                          type="button"
                          className="paper-btn"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                          onClick={() => {
                            setEditingPassage(p);
                            setIsPassageModalOpen(true);
                          }}
                        >
                          <HandDrawnIcon name="edit" size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="paper-btn"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                          onClick={() => {
                            if (onDuplicatePassage) {
                              onDuplicatePassage(p);
                              showToast(`Duplicated passage "${p.id}"`);
                            }
                          }}
                        >
                          <HandDrawnIcon name="copy" size={13} />
                          <span>Duplicate</span>
                        </button>
                        <button
                          type="button"
                          className="paper-btn paper-btn-danger"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                          onClick={() => {
                            if (linkedQs.length > 0) {
                              setPassagePendingDelete(p);
                            } else {
                              if (window.confirm(`Delete passage "${p.id}"?`)) {
                                onDeletePassage && onDeletePassage(p.id, false);
                                showToast(`Deleted passage "${p.id}"`);
                              }
                            }
                          }}
                        >
                          <HandDrawnIcon name="trash" size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* QUESTIONS MANAGEMENT VIEW */
        <>
          {/* Filter and Search Bar */}
          <div
            className="notebook-sheet"
            style={{
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem'
            }}
          >

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem' }}>
          {/* Class Filter */}
          <select
            value={filterClass === undefined ? 'all' : filterClass}
            onChange={e => setFilterClass(e.target.value === 'all' ? undefined : Number(e.target.value))}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">All Classes</option>
            {ALL_CLASSES.map(c => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value as any)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">All Subjects</option>
            {ALL_SUBJECTS.map(sId => (
              <option key={sId} value={sId}>{SUBJECTS[sId]?.name || sId}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">All Question Types</option>
            <option value="mcq">MCQ</option>
            <option value="truefalse">True/False</option>
            <option value="fillblank">Fill Blank</option>
            <option value="match">Match</option>
            <option value="numerical">Numerical</option>
            <option value="image">Image / SVG</option>
            <option value="short">Short Answer</option>
            <option value="logic">Logic</option>
            <option value="multiselect">Multi-Select</option>
            <option value="ordering">Ordering</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Search input */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search questions by keyword, topic, or question ID..."
            style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '4px', border: '1.5px solid var(--ink-border)' }}
          />
          {searchQuery && (
            <button className="paper-btn" onClick={() => setSearchQuery('')}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={handleToggleSelectAll}
            />
            <span>Select All Filtered ({filtered.length})</span>
          </label>
          <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
            Showing {filtered.length === 0 ? 0 : startIndex + 1}–{endIndex} of {filtered.length} (Page {safePage}/{totalPages})
          </span>
          {selectedIds.size > 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-primary)', fontWeight: 700 }}>
              ({selectedIds.size} selected)
            </span>
          )}
        </div>

        {selectedIds.size > 0 && (
          <button className="paper-btn paper-btn-danger" onClick={handleExecuteBulkDelete}>
            <HandDrawnIcon name="trash" size={16} />
            <span>Delete Selected ({selectedIds.size})</span>
          </button>
        )}
      </div>

      {/* Questions Table / Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {filtered.length === 0 ? (
          <div className="notebook-sheet" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '1.1rem' }}>
              No questions found matching your filter criteria.
            </p>
          </div>
        ) : (
          paginatedQuestions.map((q, idx) => {
            const isSelected = selectedIds.has(q.id);
            const isHidden = q.isHidden;

            return (
              <div
                key={q.id}
                className="notebook-sheet"
                style={{
                  padding: '1.1rem 1.4rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  opacity: isHidden ? 0.6 : 1,
                  border: isSelected ? '2px solid var(--ink-primary)' : '1.5px solid var(--ink-border)'
                }}
              >
                {/* Selection checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelect(q.id)}
                  style={{ marginTop: '0.3rem', width: 18, height: 18 }}
                />

                {/* Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                      #{q.id}
                    </span>
                    <span
                      style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '3px',
                        backgroundColor: 'var(--bg-paper-subtle)',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      Class {q.class} • {SUBJECTS[q.subject]?.name || q.subject}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>
                      {q.chapter}
                    </span>
                    <span
                      style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '3px',
                        backgroundColor: 'var(--highlighter-soft)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}
                    >
                      {q.type}
                    </span>
                    {q.isUserAdded && (
                      <span style={{ fontSize: '0.72rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                        User Added
                      </span>
                    )}
                    {q.isUserEdited && (
                      <span style={{ fontSize: '0.72rem', backgroundColor: '#fef3c7', color: '#b45309', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                        Edited
                      </span>
                    )}
                    {isHidden && (
                      <span style={{ fontSize: '0.72rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                        Hidden from quizzes
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{q.question}</div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                    <strong>Answer:</strong>{' '}
                    <span>
                      {q.type === 'mcq' && q.options
                        ? `(${String.fromCharCode(65 + Number(q.answer))}) ${q.options[Number(q.answer)]}`
                        : String(q.answer)}
                    </span>
                  </div>
                </div>

                {/* Operations buttons */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button
                    className="paper-btn"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', minHeight: '32px' }}
                    onClick={() => onToggleHide(q.id)}
                    title={isHidden ? 'Unhide question' : 'Hide question from quizzes'}
                  >
                    {isHidden ? '👁 Show' : '👁‍🗨 Hide'}
                  </button>

                  <button
                    className="paper-btn"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', minHeight: '32px' }}
                    onClick={() => handleDuplicate(q)}
                    title="Duplicate question"
                  >
                    <HandDrawnIcon name="plus" size={14} />
                    <span>Copy</span>
                  </button>

                  <button
                    className="paper-btn"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', minHeight: '32px' }}
                    onClick={() => handleOpenEdit(q)}
                    title="Edit question"
                  >
                    <HandDrawnIcon name="edit" size={14} />
                    <span>Edit</span>
                  </button>

                  <button
                    className="paper-btn paper-btn-danger"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', minHeight: '32px' }}
                    onClick={() => handleDeleteWithUndo(q)}
                    title="Delete question"
                  >
                    <HandDrawnIcon name="trash" size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Navigation Bar */}
      {totalPages > 1 && (
        <div
          className="notebook-sheet"
          style={{
            padding: '0.9rem 1.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.8rem'
          }}
        >
          <div style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
            Showing <strong>{startIndex + 1}–{endIndex}</strong> of <strong>{filtered.length}</strong> questions
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              className="paper-btn"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', opacity: safePage <= 1 ? 0.4 : 1 }}
            >
              ← Previous 50
            </button>

            <span style={{ fontSize: '0.9rem', fontWeight: 700, padding: '0 0.4rem' }}>
              Page {safePage} of {totalPages}
            </span>

            <button
              className="paper-btn"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem', opacity: safePage >= totalPages ? 0.4 : 1 }}
            >
              Next 50 →
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Undo Delete Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'var(--ink-primary)',
            color: '#ffffff',
            padding: '0.8rem 1.4rem',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-paper-elevated)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            zIndex: 10000
          }}
        >
          <span>{toastMessage}</span>
          {undoDeletedQuestion && (
            <button
              className="paper-btn paper-btn-accent"
              onClick={handleUndo}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.82rem', minHeight: '28px' }}
            >
              <HandDrawnIcon name="undo" size={14} />
              <span>Undo Delete</span>
            </button>
          )}
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="notebook-sheet"
            style={{
              maxWidth: '450px',
              padding: '1.8rem',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', color: 'var(--red-pen)' }}>
              Reset to Original Question Bank?
            </h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.95rem' }}>
              This will safely remove all your custom added, edited, and deleted question and passage overlays from IndexedDB and restore the clean original seed bank.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button className="paper-btn" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
              <button
                className="paper-btn paper-btn-danger"
                onClick={() => {
                  onResetBank();
                  setShowResetConfirm(false);
                  showToast('Question bank and passages reset to original seed data.');
                }}
              >
                Yes, Reset Bank
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        question={editingQuestion}
        passages={passages}
        onClose={() => setIsEditorOpen(false)}
        onSave={q => {
          if (editingQuestion?.id) {
            onEditQuestion(q);
            showToast(`Updated question "${q.id}"`);
          } else {
            onAddQuestion(q);
            showToast(`Created new question "${q.id}"`);
          }
        }}
      />

      {/* Add / Edit Passage Modal */}
      <PassageEditorModal
        isOpen={isPassageModalOpen}
        passage={editingPassage}
        onClose={() => setIsPassageModalOpen(false)}
        onSave={p => {
          if (editingPassage?.id) {
            onEditPassage && onEditPassage(p);
            showToast(`Updated passage "${p.id}"`);
          } else {
            onAddPassage && onAddPassage(p);
            showToast(`Created new passage "${p.id}"`);
          }
        }}
      />

      {/* Delete Passage Warning Modal (Check linked questions) */}
      {passagePendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setPassagePendingDelete(null)}
        >
          <div
            className="notebook-sheet"
            style={{
              maxWidth: '520px',
              padding: '1.8rem',
              backgroundColor: '#ffffff',
              border: '2.5px solid var(--red-pen)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', color: 'var(--red-pen)', margin: 0 }}>
              ⚠️ Passage Has Linked Questions
            </h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.95rem', margin: 0 }}>
              Passage <strong>"{passagePendingDelete.id}"</strong> has{' '}
              <strong>{questions.filter(q => q.passageId === passagePendingDelete.id).length} linked questions</strong> in the question bank.
              Deleting this passage may affect those questions.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button
                className="paper-btn paper-btn-danger"
                onClick={() => {
                  onDeletePassage && onDeletePassage(passagePendingDelete.id, true);
                  showToast(`Deleted passage "${passagePendingDelete.id}" and its linked questions.`);
                  setPassagePendingDelete(null);
                }}
              >
                Delete Questions Too (Remove passage & all linked questions)
              </button>
              <button
                className="paper-btn"
                onClick={() => {
                  onDeletePassage && onDeletePassage(passagePendingDelete.id, false);
                  showToast(`Unlinked questions and deleted passage "${passagePendingDelete.id}".`);
                  setPassagePendingDelete(null);
                }}
              >
                Unlink Questions (Keep questions, remove passage link)
              </button>
              <button className="paper-btn" onClick={() => setPassagePendingDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        questions={questions}
        passages={passages}
        onImportQuestions={imported => {
          onImportQuestions(imported);
        }}
        onImportPassages={importedPs => {
          onImportPassages && onImportPassages(importedPs);
        }}
      />
    </div>
  );
};

