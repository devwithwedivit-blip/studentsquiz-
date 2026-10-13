import React, { useState } from 'react';
import { Question, QuizConfig } from '../../types/quiz';
import { SUBJECTS } from '../../data/subjects';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface WorksheetPrintViewProps {
  questions: Question[];
  config: QuizConfig;
  onBack: () => void;
}

export const WorksheetPrintView: React.FC<WorksheetPrintViewProps> = ({
  questions,
  config,
  onBack
}) => {
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const subjectName = config.selectedSubjects.map(s => SUBJECTS[s]?.name || s).join(', ');
  const totalMarks = questions.reduce((a, b) => a + b.marks, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Controls Bar (hidden during printing) */}
      <div
        className="no-print notebook-sheet"
        style={{
          padding: '1rem 1.4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.8rem'
        }}
      >
        <button className="paper-btn" onClick={onBack}>
          ← Back to Results
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={includeAnswerKey}
              onChange={e => setIncludeAnswerKey(e.target.checked)}
            />
            <span>Include Teacher's Answer Key</span>
          </label>

          <button className="paper-btn paper-btn-primary" onClick={handlePrint}>
            <HandDrawnIcon name="print" size={16} />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Question Paper Sheet */}
      <div
        className="print-sheet"
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          padding: '2.5rem',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          fontFamily: 'serif',
          lineHeight: '1.6'
        }}
      >
        {/* Exam Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            CBSE / NCERT PRACTICE QUESTION PAPER
          </h1>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.4rem' }}>
            CLASS {config.selectedClass} — {subjectName}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', fontSize: '0.95rem' }}>
            <span>Time Allowed: {config.timerSeconds ? Math.round(config.timerSeconds / 60) : 45} Minutes</span>
            <span>Maximum Marks: {totalMarks}</span>
          </div>
        </div>

        {/* General Instructions */}
        <div style={{ fontSize: '0.88rem', marginBottom: '1.5rem', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>
          <strong>General Instructions:</strong>
          <ol style={{ paddingLeft: '1.2rem', marginTop: '0.2rem' }}>
            <li>All questions are compulsory.</li>
            <li>Questions carry marks indicated against each question.</li>
            <li>Use rough space provided at the margin for numerical calculations.</li>
          </ol>
        </div>

        {/* Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {questions.map((q, idx) => {
            const isFirstOfPassage = q.passage && (idx === 0 || questions[idx - 1]?.passageId !== q.passageId);
            return (
              <React.Fragment key={q.id}>
                {isFirstOfPassage && q.passage && (
                  <div
                    style={{
                      border: '1.5px solid #1e293b',
                      borderRadius: '4px',
                      padding: '1rem 1.25rem',
                      backgroundColor: '#f8fafc',
                      pageBreakInside: 'avoid',
                      fontFamily: "'Noto Sans Devanagari', 'Times New Roman', serif",
                      lineHeight: '1.85',
                      marginBottom: '0.6rem'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.5rem', color: '#0f172a' }}>
                      {q.passage.kind === 'padya'
                        ? 'निम्नलिखित काव्यांश को ध्यानपूर्वक पढ़कर दिए गए प्रश्नों (प्रश्न ' + (idx + 1) + ' से ' + (idx + 5) + ') के उत्तर दीजिए:'
                        : 'निम्नलिखित गद्यांश को ध्यानपूर्वक पढ़कर दिए गए प्रश्नों (प्रश्न ' + (idx + 1) + ' से ' + (idx + 5) + ') के उत्तर दीजिए:'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.96rem',
                        whiteSpace: q.passage.kind === 'padya' ? 'pre-line' : 'pre-wrap',
                        color: '#1e293b'
                      }}
                    >
                      {q.passage.text}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', pageBreakInside: 'avoid' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, flex: 1, paddingRight: '1rem' }}>
                      <span>{idx + 1}. </span>
                      <span>{q.question}</span>
                    </div>

                <span style={{ fontWeight: 'bold', fontSize: '0.95rem', flexShrink: 0 }}>
                  [{q.marks}]
                </span>
              </div>

              {/* Inline SVG Diagram for Image Questions */}
              {q.image && (
                <div
                  style={{ maxWidth: '280px', margin: '0.5rem auto' }}
                  dangerouslySetInnerHTML={{ __html: q.image.src }}
                />
              )}

              {/* Options for MCQ / Multiselect */}
              {q.options && q.options.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', paddingLeft: '1.5rem', marginTop: '0.3rem' }}>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ fontSize: '0.95rem' }}>
                      ({String.fromCharCode(65 + oIdx)}) {opt}
                    </div>
                  ))}
                </div>
              )}

              {/* Pairs for Match Questions */}
              {q.pairs && q.pairs.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingLeft: '1.5rem', marginTop: '0.3rem', fontSize: '0.92rem' }}>
                  <div>
                    <strong>Column A:</strong>
                    {q.pairs.map((p, pIdx) => (
                      <div key={pIdx}>({pIdx + 1}) {p[0]}</div>
                    ))}
                  </div>
                  <div>
                    <strong>Column B:</strong>
                    {q.pairs.map((p, pIdx) => (
                      <div key={pIdx}>({String.fromCharCode(97 + pIdx)}) {p[1]}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
        </div>

        {/* Answer Key Page (Optional for Teachers) */}
        {includeAnswerKey && (
          <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '2px dashed #000000', pageBreakBefore: 'always' }}>
            <h2 style={{ fontSize: '1.3rem', textTransform: 'uppercase', marginBottom: '1rem', textAlign: 'center' }}>
              TEACHER'S ANSWER KEY & MARKING SCHEME
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {questions.map((q, idx) => (
                <div key={q.id} style={{ fontSize: '0.92rem' }}>
                  <strong>Q{idx + 1}. </strong>
                  <span>Answer: </span>
                  <strong style={{ textDecoration: 'underline' }}>
                    {q.type === 'mcq' && q.options
                      ? `(${String.fromCharCode(65 + Number(q.answer))}) ${q.options[Number(q.answer)]}`
                      : q.type === 'multiselect' && Array.isArray(q.answer) && q.options
                      ? q.answer.map(i => `(${String.fromCharCode(65 + i)}) ${q.options![i]}`).join(', ')
                      : String(q.answer)}
                  </strong>
                  <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.2rem', paddingLeft: '1.2rem' }}>
                    <em>Explanation: {q.explanation}</em>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
          .print-sheet {
            border: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
