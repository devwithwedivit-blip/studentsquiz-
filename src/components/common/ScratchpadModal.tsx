import React, { useRef, useState, useEffect } from 'react';
import { HandDrawnIcon } from './HandDrawnIcon';

interface ScratchpadProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScratchpadModal: React.FC<ScratchpadProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1b2a4a'); // Ink blue by default
  const [lineWidth, setLineWidth] = useState(2.5);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI canvas resolution
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Initial background: warm ruled paper
    ctx.fillStyle = '#fbf8f1';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw faint grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    for (let y = 25; y < rect.height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = isEraser ? 16 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#fbf8f1' : color;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#fbf8f1';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    for (let y = 25; y < rect.height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
          maxWidth: '750px',
          height: '82vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.2rem',
          backgroundColor: '#fbf8f1',
          border: '2px solid #1b2a4a'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header / Tools */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.8rem',
            flexWrap: 'wrap',
            gap: '0.6rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HandDrawnIcon name="scratchpad" size={24} color="#1b2a4a" />
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
              Rough Work Scratchpad
            </h3>
            <span className="handwritten-note" style={{ marginLeft: '0.5rem' }}>
              pencil working
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {/* Color buttons */}
            <button
              title="Blue Ink"
              onClick={() => {
                setColor('#1b2a4a');
                setIsEraser(false);
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: '#1b2a4a',
                border: color === '#1b2a4a' && !isEraser ? '3px solid #fde047' : '1px solid #94a3b8'
              }}
            />
            <button
              title="Pencil Grey"
              onClick={() => {
                setColor('#475569');
                setIsEraser(false);
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: '#475569',
                border: color === '#475569' && !isEraser ? '3px solid #fde047' : '1px solid #94a3b8'
              }}
            />
            <button
              title="Red Pen"
              onClick={() => {
                setColor('#dc2626');
                setIsEraser(false);
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: '#dc2626',
                border: color === '#dc2626' && !isEraser ? '3px solid #fde047' : '1px solid #94a3b8'
              }}
            />

            <button
              className={`paper-btn ${isEraser ? 'paper-btn-accent' : ''}`}
              style={{ padding: '0.35rem 0.7rem', minHeight: '36px' }}
              onClick={() => setIsEraser(!isEraser)}
              title="Eraser"
            >
              <HandDrawnIcon name="eraser" size={16} />
              <span>Eraser</span>
            </button>

            <button
              className="paper-btn"
              style={{ padding: '0.35rem 0.7rem', minHeight: '36px' }}
              onClick={clearCanvas}
              title="Clear all rough notes"
            >
              <HandDrawnIcon name="trash" size={16} />
              <span>Clear</span>
            </button>

            <button
              className="paper-btn paper-btn-primary"
              style={{ padding: '0.35rem 0.8rem', minHeight: '36px' }}
              onClick={onClose}
              title="Close Scratchpad"
            >
              <HandDrawnIcon name="check" size={16} />
              <span>Done</span>
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            border: '1.5px solid #cbd5e1',
            borderRadius: '4px',
            overflow: 'hidden',
            touchAction: 'none'
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', cursor: isEraser ? 'cell' : 'crosshair' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'right' }}>
          Touch or draw with mouse • Scratchpad notes are preserved during your quiz
        </div>
      </div>
    </div>
  );
};
