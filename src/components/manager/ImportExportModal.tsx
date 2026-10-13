import React, { useState } from 'react';
import { Question } from '../../types/quiz';
import { validateQuestionBank, BankValidationReport } from '../../services/validator';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onImportQuestions: (imported: Question[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  questions,
  onImportQuestions
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [validationReport, setValidationReport] = useState<BankValidationReport | null>(null);

  // EXPORT JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `quizforge_bank_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // EXPORT CSV
  const handleExportCSV = () => {
    const headers = ['id', 'class', 'subject', 'chapter', 'type', 'difficulty', 'question', 'marks', 'explanation'];
    const rows = questions.map(q => [
      `"${q.id}"`,
      q.class,
      `"${q.subject}"`,
      `"${q.chapter.replace(/"/g, '""')}"`,
      `"${q.type}"`,
      `"${q.difficulty}"`,
      `"${q.question.replace(/"/g, '""')}"`,
      q.marks,
      `"${q.explanation.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `quizforge_bank_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // IMPORT FILE
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setImportText(content);
      validateAndPreview(content);
    };
    reader.readAsText(file);
  };

  const validateAndPreview = (rawContent: string) => {
    try {
      const parsed = JSON.parse(rawContent);
      if (!Array.isArray(parsed)) {
        alert('Invalid format: Root element must be a JSON array of questions.');
        return;
      }
      const report = validateQuestionBank(parsed, 'import_upload');
      setValidationReport(report);
    } catch (err: any) {
      alert(`JSON Parse Error: ${err.message}`);
    }
  };

  const handleConfirmImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (Array.isArray(parsed)) {
        onImportQuestions(parsed);
        alert(`Successfully imported ${parsed.length} questions into your question bank!`);
        onClose();
      }
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
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
          maxWidth: '650px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          border: '2px solid var(--ink-primary)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.4rem' }}>Import / Export Question Bank</h2>
          <button className="paper-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem' }}>
          <button
            className={`paper-btn ${activeTab === 'export' ? 'paper-btn-primary' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            <HandDrawnIcon name="export" size={16} />
            <span>Export Bank</span>
          </button>
          <button
            className={`paper-btn ${activeTab === 'import' ? 'paper-btn-primary' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <HandDrawnIcon name="import" size={16} />
            <span>Import Bank</span>
          </button>
        </div>

        {activeTab === 'export' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.95rem' }}>
              Download your current active question bank ({questions.length} questions) including all custom additions and edits:
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="paper-btn paper-btn-accent" onClick={handleExportJSON}>
                <HandDrawnIcon name="export" size={16} />
                <span>Download as JSON (.json)</span>
              </button>
              <button className="paper-btn" onClick={handleExportCSV}>
                <HandDrawnIcon name="export" size={16} />
                <span>Download as CSV (.csv)</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.95rem' }}>
              Upload a JSON file containing curriculum questions. The validator will automatically inspect all structural rules before saving:
            </p>

            <input type="file" accept=".json,.csv" onChange={handleFileUpload} />

            <textarea
              rows={4}
              value={importText}
              onChange={e => {
                setImportText(e.target.value);
                validateAndPreview(e.target.value);
              }}
              placeholder="Or paste JSON array content here..."
              style={{ width: '100%', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}
            />

            {/* Validation Feedback Report */}
            {validationReport && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '4px',
                  backgroundColor: validationReport.isValid ? 'var(--green-tick-bg)' : 'var(--red-pen-bg)',
                  border: `1.5px solid ${validationReport.isValid ? 'var(--green-tick)' : 'var(--red-pen)'}`
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>
                  {validationReport.isValid
                    ? `✅ Validation Passed: ${validationReport.totalQuestions} valid questions found`
                    : `❌ Validation Errors Detected (${validationReport.issues.length})`}
                </div>
                {validationReport.issues.map((iss, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: iss.severity === 'error' ? 'var(--red-pen)' : '#b45309' }}>
                    • {iss.questionId ? `[${iss.questionId}] ` : ''}{iss.message}
                  </div>
                ))}
              </div>
            )}

            <button
              className="paper-btn paper-btn-primary"
              onClick={handleConfirmImport}
              disabled={!validationReport || !validationReport.isValid}
              style={{ opacity: !validationReport?.isValid ? 0.5 : 1 }}
            >
              Confirm Import
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
