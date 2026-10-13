import React, { useState, useEffect } from 'react';
import { Passage } from '../../types/quiz';
import { HandDrawnIcon } from '../common/HandDrawnIcon';

interface PassagePanelProps {
  passage: Passage;
  passageOrder?: number;
  mode?: 'inline' | 'modal';
  onCloseModal?: () => void;
  // Shared highlights per attempt so both inline and bottom-sheet share highlights
  highlights?: string[];
  onAddHighlight?: (phrase: string) => void;
  onClearHighlights?: () => void;
}

export const PassagePanel: React.FC<PassagePanelProps> = ({
  passage,
  passageOrder,
  mode = 'inline',
  onCloseModal,
  highlights: externalHighlights,
  onAddHighlight: externalAddHighlight,
  onClearHighlights: externalClearHighlights
}) => {
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(1); // 0 = 0.95rem, 1 = 1.05rem, 2 = 1.2rem
  const [localHighlights, setLocalHighlights] = useState<string[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');

  const highlights = externalHighlights ?? localHighlights;

  const fontSizes = ['0.95rem', '1.08rem', '1.22rem'];
  const currentFontSize = fontSizes[fontSizeLevel];

  // Capture selection within passage text container
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      const text = sel.toString().trim();
      if (text.length > 0 && text.length < 150) {
        setSelectedText(text);
        return;
      }
    }
    setSelectedText('');
  };

  const handleApplyHighlight = () => {
    if (!selectedText) return;
    if (externalAddHighlight) {
      externalAddHighlight(selectedText);
    } else {
      setLocalHighlights(prev => (prev.includes(selectedText) ? prev : [...prev, selectedText]));
    }
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleClearAll = () => {
    if (externalClearHighlights) {
      externalClearHighlights();
    } else {
      setLocalHighlights([]);
    }
    setSelectedText('');
  };

  // Render text with highlighted spans
  const renderHighlightedContent = (rawText: string) => {
    if (!highlights || highlights.length === 0) {
      return rawText;
    }

    // Build regex to split and highlight phrases
    // Escape special regex chars
    const escaped = highlights
      .map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .filter(Boolean);

    if (escaped.length === 0) return rawText;

    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = rawText.split(regex);

    return parts.map((part, i) => {
      const isMatch = highlights.some(h => h.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <mark
            key={i}
            style={{
              backgroundColor: '#fef08a',
              color: '#1e293b',
              padding: '0.1rem 0.25rem',
              borderRadius: '3px',
              borderBottom: '1.5px solid #eab308'
            }}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const isPoem = passage.kind === 'padya';

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: "'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          paddingBottom: '0.75rem',
          borderBottom: '1.5px dashed var(--ink-border)',
          marginBottom: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '0.82rem',
              backgroundColor: isPoem ? '#f3e8ff' : '#e0f2fe',
              color: isPoem ? '#6b21a8' : '#0369a1',
              border: '1px solid currentColor'
            }}
          >
            {isPoem ? '📜 अपठित पद्यांश (काव्यांश)' : '📄 अपठित गद्यांश'}
          </span>
          {passageOrder && (
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>
              (प्रश्न {passageOrder}/5)
            </span>
          )}
        </div>

        {/* Toolbar: Font Size A- / A+ and Highlighter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            className="paper-btn"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem', minWidth: '30px' }}
            title="फ़ॉन्ट छोटा करें (A-)"
            aria-label="Decrease text size"
            disabled={fontSizeLevel === 0}
            onClick={() => setFontSizeLevel(p => Math.max(0, p - 1))}
          >
            A-
          </button>
          <button
            type="button"
            className="paper-btn"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem', minWidth: '30px', fontWeight: 700 }}
            title="फ़ॉन्ट बड़ा करें (A+)"
            aria-label="Increase text size"
            disabled={fontSizeLevel === fontSizes.length - 1}
            onClick={() => setFontSizeLevel(p => Math.min(fontSizes.length - 1, p + 1))}
          >
            A+
          </button>

          {selectedText && (
            <button
              type="button"
              className="paper-btn paper-btn-accent"
              style={{
                padding: '0.2rem 0.55rem',
                fontSize: '0.78rem',
                backgroundColor: '#fef08a',
                color: '#854d0e',
                borderColor: '#eab308'
              }}
              onClick={handleApplyHighlight}
              title="चयनित शब्द हाइलाइट करें"
            >
              ✎ हाइलाइट
            </button>
          )}

          {highlights.length > 0 && (
            <button
              type="button"
              className="paper-btn"
              style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', color: 'var(--red-pen)' }}
              onClick={handleClearAll}
              title="सभी हाइलाइट हटाएं"
            >
              साफ़ करें
            </button>
          )}

          {mode === 'modal' && onCloseModal && (
            <button
              type="button"
              className="paper-btn"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.82rem', marginLeft: '0.2rem' }}
              onClick={onCloseModal}
              aria-label="Close passage modal"
            >
              ✕ बंद करें
            </button>
          )}
        </div>
      </div>

      {/* Notice / prompt */}
      <div
        style={{
          fontSize: '0.85rem',
          color: 'var(--ink-secondary)',
          fontStyle: 'italic',
          marginBottom: '0.6rem'
        }}
      >
        {isPoem
          ? 'निम्नलिखित काव्यांश को ध्यानपूर्वक पढ़कर नीचे दिए गए प्रश्नों के उत्तर दीजिए:'
          : 'निम्नलिखित गद्यांश को ध्यानपूर्वक पढ़कर नीचे दिए गए प्रश्नों के उत्तर दीजिए:'}
      </div>

      {/* Main Passage Text */}
      <div
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        style={{
          flex: 1,
          overflowY: 'auto',
          fontSize: currentFontSize,
          lineHeight: '1.9',
          letterSpacing: '0.015em',
          color: 'var(--ink-primary)',
          whiteSpace: isPoem ? 'pre-line' : 'pre-wrap',
          padding: '0.6rem 0.4rem',
          userSelect: 'text',
          borderLeft: '3px solid var(--ink-secondary)',
          paddingLeft: '0.9rem'
        }}
      >
        {renderHighlightedContent(passage.text)}
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--ink-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.78rem',
          color: 'var(--ink-muted)'
        }}
      >
        <span>
          {isPoem
            ? `पंक्तियाँ: ${passage.text.split('\n').filter(Boolean).length}`
            : `शब्द संख्या: लगभग ${passage.wordCount || passage.text.trim().split(/\s+/).length} शब्द`}
        </span>
        <span style={{ fontSize: '0.72rem' }}>* शब्दों को चुनकर हाइलाइट कर सकते हैं</span>
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="अपठित परिच्छेद"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={e => {
          if (e.target === e.currentTarget && onCloseModal) onCloseModal();
        }}
      >
        <div
          className="notebook-sheet"
          style={{
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.2rem',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.25)',
            backgroundColor: 'var(--bg-card)'
          }}
          onClick={e => e.stopPropagation()}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className="notebook-sheet passage-panel-inline"
      style={{
        padding: '1.2rem',
        backgroundColor: 'var(--bg-card)',
        border: '2px solid var(--ink-border)',
        borderRadius: '8px',
        height: '100%',
        maxHeight: '620px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {content}
    </div>
  );
};
