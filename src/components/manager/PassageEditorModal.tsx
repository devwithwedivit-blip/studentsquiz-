import React, { useState, useEffect } from 'react';
import { Passage } from '../../types/quiz';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface PassageEditorModalProps {
  passage: Partial<Passage> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (passage: Passage) => void;
}

export const PassageEditorModal: React.FC<PassageEditorModalProps> = ({
  passage,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(passage?.id);

  const [cls, setCls] = useState<9 | 10 | 11 | 12>(passage?.class || 9);
  const [kind, setKind] = useState<'gadya' | 'padya'>(passage?.kind || 'gadya');
  const [title, setTitle] = useState(passage?.title || '');
  const [theme, setTheme] = useState(passage?.theme || '');
  const [text, setText] = useState(passage?.text || '');

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const lineCount = text.split('\n').filter(Boolean).length;

  // Class word count limits
  const limits: Record<number, { gadya: string; padya: string }> = {
    9: { gadya: '120-170 शब्द', padya: '8-10 पंक्तियाँ' },
    10: { gadya: '160-220 शब्द', padya: '8-12 पंक्तियाँ' },
    11: { gadya: '200-280 शब्द', padya: '10-14 पंक्तियाँ' },
    12: { gadya: '250-320 शब्द', padya: '12-16 पंक्तियाँ' }
  };

  const handleSave = () => {
    if (!text.trim()) {
      alert('Passage text cannot be empty.');
      return;
    }

    const savedPassage: Passage = {
      id: passage?.id || `c${cls}-hindi-p${Date.now().toString().slice(-4)}`,
      class: cls,
      subject: 'hindi',
      kind,
      title: title.trim() || `Passage ${Date.now().toString().slice(-4)}`,
      text: text.trim(),
      wordCount,
      theme: theme.trim() || 'General'
    };

    onSave(savedPassage);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
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
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="notebook-sheet"
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-card)',
          gap: '1rem',
          boxShadow: 'var(--shadow-paper-elevated)',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
              {isEditing ? 'अपठित परिच्छेद संपादित करें' : 'नया अपठित परिच्छेद जोड़ें'}
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
              Teacher Repository Passage Editor
            </span>
          </div>
          <button className="paper-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>कक्षा (Class):</label>
            <select
              value={cls}
              onChange={e => setCls(Number(e.target.value) as any)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value={9}>Class 9</option>
              <option value={10}>Class 10</option>
              <option value={11}>Class 11</option>
              <option value={12}>Class 12</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>प्रकार (Kind):</label>
            <select
              value={kind}
              onChange={e => setKind(e.target.value as any)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value="gadya">अपठित गद्यांश (Prose)</option>
              <option value="padya">अपठित पद्यांश (Poem)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.9rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              शीर्षक (Teacher-Only Title):
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. समय का महत्व (Never shown to students)"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
              * यह केवल शिक्षक संदर्भ के लिए है; छात्रों से छिपा रहेगा।
            </span>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>विषय-वस्तु (Theme):</label>
            <input
              type="text"
              value={theme}
              onChange={e => setTheme(e.target.value)}
              placeholder="e.g. पर्यावरण, अनुशासन"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              परिच्छेद पाठ्य (Passage Content):
            </label>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-secondary)' }}>
              {kind === 'padya' ? (
                <span>पंक्तियाँ: {lineCount} (अनुशंसित: {limits[cls]?.padya})</span>
              ) : (
                <span>शब्द संख्या: {wordCount} (अनुशंसित: {limits[cls]?.gadya})</span>
              )}
            </div>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={10}
            placeholder={
              kind === 'padya'
                ? 'कविता की पंक्तियाँ यहाँ लिखें (प्रत्येक पंक्ति के बाद Enter दबाएँ)...'
                : 'गद्यांश के अनुच्छेद यहाँ लिखें (अनुच्छेदों के बीच खाली पंक्ति छोड़ें)...'
            }
            style={{
              width: '100%',
              padding: '0.7rem',
              borderRadius: '4px',
              border: '1.5px solid var(--ink-border)',
              fontFamily: "'Noto Sans Devanagari', inherit",
              fontSize: '0.98rem',
              lineHeight: '1.8'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
          <button className="paper-btn" onClick={onClose}>
            रद्द करें (Cancel)
          </button>
          <button className="paper-btn paper-btn-primary" onClick={handleSave}>
            <HandDrawnIcon name="check" size={16} />
            <span>सहेजें (Save Passage)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
