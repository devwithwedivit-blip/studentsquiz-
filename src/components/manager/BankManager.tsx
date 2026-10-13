import React, { useState, useEffect } from 'react';
import { Question, SubjectId, QuestionType, Difficulty } from '../../types/quiz';
import { SUBJECTS, ALL_CLASSES, ALL_SUBJECTS } from '../../data/subjects';
import { filterQuestions } from '../../data/bankLoader';
import { HandDrawnIcon } from '../common/HandDrawnIcon';
import { QuestionEditorModal } from './QuestionEditorModal';
import { ImportExportModal } from './ImportExportModal';

interface BankManagerProps {
  questions: Question[];
  onAddQuestion: (q: Question) => void;
  onEditQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onToggleHide: (id: string) => void;
  onResetBank: () => void;
  onImportQuestions: (imported: Question[]) => void;
  onBackToBuilder: () => void;
}

export const BankManager: React.FC<BankManagerProps> = ({
  questions,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onBulkDelete,
  onToggleHide,
  onResetBank,
  onImportQuestions,
  onBackToBuilder
}) => {
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
              This will safely remove all your custom added, edited, and deleted question overlays from IndexedDB and restore the clean original seed question bank.
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
                  showToast('Question bank reset to original seed data.');
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

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        questions={questions}
        onImportQuestions={imported => {
          onImportQuestions(imported);
        }}
      />
    </div>
  );
};
