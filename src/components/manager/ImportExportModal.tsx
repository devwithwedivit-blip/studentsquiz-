import React, { useState } from 'react';
import { Question, Passage } from '../../types/quiz';
import { validateQuestionBank, BankValidationReport } from '../../services/validator';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  passages?: Passage[];
  onImportQuestions: (imported: Question[]) => void;
  onImportPassages?: (imported: Passage[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  questions,
  passages = [],
  onImportQuestions,
  onImportPassages
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [validationReport, setValidationReport] = useState<BankValidationReport | null>(null);
  const [passageLinkErrors, setPassageLinkErrors] = useState<string[]>([]);
  const [pendingParsedData, setPendingParsedData] = useState<{ questions: Question[]; passages?: Passage[] } | null>(null);

  // EXPORT JSON BUNDLE
  const handleExportJSON = () => {
    const exportBundle = {
      version: 'v2_hindi_rewrite',
      timestamp: Date.now(),
      questions,
      passages
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `quizforge_bank_bundle_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // EXPORT QUESTIONS CSV (Includes passageId and passageOrder)
  const handleExportQuestionsCSV = () => {
    const headers = ['id', 'class', 'subject', 'chapter', 'type', 'difficulty', 'question', 'marks', 'explanation', 'passageId', 'passageOrder'];
    const rows = questions.map(q => [
      `"${q.id}"`,
      q.class,
      `"${q.subject}"`,
      `"${q.chapter.replace(/"/g, '""')}"`,
      `"${q.type}"`,
      `"${q.difficulty}"`,
      `"${q.question.replace(/"/g, '""')}"`,
      q.marks,
      `"${q.explanation.replace(/"/g, '""')}"`,
      `"${q.passageId || ''}"`,
      q.passageOrder || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `quizforge_questions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // EXPORT PASSAGES CSV
  const handleExportPassagesCSV = () => {
    const headers = ['id', 'class', 'subject', 'kind', 'title', 'theme', 'wordCount', 'text'];
    const rows = passages.map(p => [
      `"${p.id}"`,
      p.class,
      `"${p.subject}"`,
      `"${p.kind}"`,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.theme || '').replace(/"/g, '""')}"`,
      p.wordCount || 0,
      `"${p.text.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `quizforge_passages_${Date.now()}.csv`);
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
    setPassageLinkErrors([]);
    setPendingParsedData(null);

    try {
      const parsed = JSON.parse(rawContent);
      let qs: Question[] = [];
      let ps: Passage[] = [];

      if (Array.isArray(parsed)) {
        qs = parsed;
      } else if (parsed && Array.isArray(parsed.questions)) {
        qs = parsed.questions;
        if (Array.isArray(parsed.passages)) {
          ps = parsed.passages;
        }
      } else {
        alert('Invalid format: Root element must be an array of questions or an object with { questions, passages }.');
        return;
      }

      // Validate broken passage links
      const knownPassageIds = new Set([
        ...passages.map(p => p.id),
        ...ps.map(p => p.id)
      ]);

      const broken: string[] = [];
      for (const q of qs) {
        if (q.passageId && !knownPassageIds.has(q.passageId)) {
          broken.push(`Question "${q.id}" references non-existent passage ID "${q.passageId}"`);
        }
      }

      setPassageLinkErrors(broken);
      setPendingParsedData({ questions: qs, passages: ps.length > 0 ? ps : undefined });

      const report = validateQuestionBank(qs, 'import_upload');
      setValidationReport(report);
    } catch (err: any) {
      alert(`JSON Parse Error: ${err.message}`);
    }
  };

  const handleConfirmImport = () => {
    if (passageLinkErrors.length > 0) {
      alert('Cannot import: Broken passage links detected. Please fix the missing passages first.');
      return;
    }

    if (!pendingParsedData || pendingParsedData.questions.length === 0) {
      alert('No valid questions to import.');
      return;
    }

    onImportQuestions(pendingParsedData.questions);
    if (pendingParsedData.passages && onImportPassages) {
      onImportPassages(pendingParsedData.passages);
    }

    alert(
      `Successfully imported ${pendingParsedData.questions.length} questions` +
        (pendingParsedData.passages ? ` and ${pendingParsedData.passages.length} passages` : '') +
        ' into your question bank!'
    );
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
          maxWidth: '700px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          border: '2px solid var(--ink-primary)',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Import / Export Question Bank</h2>
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
              Download your current active question bank ({questions.length} questions, {passages.length} passages) including all custom additions, edits, and passage links:
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button className="paper-btn paper-btn-accent" onClick={handleExportJSON}>
                <HandDrawnIcon name="export" size={16} />
                <span>Export Full Bundle (JSON with Passages)</span>
              </button>
              <button className="paper-btn" onClick={handleExportQuestionsCSV}>
                <HandDrawnIcon name="export" size={16} />
                <span>Export Questions (CSV)</span>
              </button>
              {passages.length > 0 && (
                <button className="paper-btn" onClick={handleExportPassagesCSV}>
                  <HandDrawnIcon name="export" size={16} />
                  <span>Export Passages (CSV)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.95rem' }}>
              Upload a JSON file (questions array or full bundle with passages). Passage links and structural rules will be automatically verified:
            </p>

            <input type="file" accept=".json" onChange={handleFileUpload} />

            {/* Error report for broken passage links */}
            {passageLinkErrors.length > 0 && (
              <div
                style={{
                  padding: '0.8rem 1rem',
                  backgroundColor: 'var(--red-pen-bg)',
                  border: '1.5px solid var(--red-pen)',
                  borderRadius: '4px',
                  color: 'var(--red-pen)',
                  fontSize: '0.88rem'
                }}
              >
                <strong>⚠️ Broken Passage Links Detected ({passageLinkErrors.length}):</strong>
                <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0 }}>
                  {passageLinkErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
                <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#7f1d1d' }}>
                  Please ensure the referenced passage IDs are included in the bundle or already present in the question bank.
                </div>
              </div>
            )}

            {validationReport && (
              <div
                style={{
                  padding: '0.8rem 1rem',
                  backgroundColor: validationReport.isValid ? 'var(--green-tick-bg)' : 'var(--red-pen-bg)',
                  borderRadius: '4px',
                  fontSize: '0.88rem'
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  Validation Status: {validationReport.isValid ? '✅ PASSED' : '⚠️ ISSUES FOUND'}
                </div>
                <div style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  {validationReport.issues.filter(i => i.severity === 'error').length} errors,{' '}
                  {validationReport.issues.filter(i => i.severity === 'warning').length} warnings found.
                </div>
              </div>
            )}

            {pendingParsedData && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button className="paper-btn" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="paper-btn paper-btn-primary"
                  onClick={handleConfirmImport}
                  disabled={passageLinkErrors.length > 0}
                >
                  <HandDrawnIcon name="check" size={16} />
                  <span>Import {pendingParsedData.questions.length} Questions</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
