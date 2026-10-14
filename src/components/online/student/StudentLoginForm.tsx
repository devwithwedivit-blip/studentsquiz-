import React, { useState, useEffect } from 'react';
import { getStudentsForClass, loginStudent } from '../../../services/studentApi';
import { Student, StudentSession } from '../../../types/online';

interface StudentLoginFormProps {
  onSuccess: (session: StudentSession) => void;
  onBackToModeSelect?: () => void;
}

export function StudentLoginForm({ onSuccess, onBackToModeSelect }: StudentLoginFormProps) {
  const [selectedClass, setSelectedClass] = useState<9 | 10 | 11 | 12>(9);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load students when class changes
  useEffect(() => {
    let active = true;
    const fetchStudents = async () => {
      setLoadingStudents(true);
      setErrorMessage(null);
      try {
        const list = await getStudentsForClass(selectedClass);
        if (active) {
          setStudents(list);
          if (list.length > 0) {
            setSelectedStudentId(list[0].id);
          } else {
            setSelectedStudentId('');
          }
        }
      } catch (err: any) {
        if (active) {
          setErrorMessage(err.message || 'Could not load student list.');
        }
      } finally {
        if (active) setLoadingStudents(false);
      }
    };
    fetchStudents();
    return () => {
      active = false;
    };
  }, [selectedClass]);

  const handleKeypadPress = (val: string) => {
    if (submitting) return;
    if (val === 'clear') {
      setPin('');
      return;
    }
    if (val === 'backspace') {
      setPin(prev => prev.slice(0, -1));
      return;
    }
    if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      if (nextPin.length === 4) {
        performLogin(nextPin);
      }
    }
  };

  const performLogin = async (pinToSubmit: string) => {
    if (!selectedStudentId) {
      setErrorMessage('Please select your name.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const session = await loginStudent(selectedStudentId, selectedClass, pinToSubmit);
      onSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please enter the correct PIN.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setErrorMessage('Please enter a 4-digit PIN.');
      return;
    }
    performLogin(pin);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto' }}>
      <div className="notebook-sheet" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>🎓</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontSize: '1.6rem' }}>
            Student Login
          </h2>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Log in with your class, name and 4-digit PIN.
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '0.8rem 1rem',
              marginBottom: '1.2rem',
              borderRadius: '8px',
              backgroundColor: 'var(--red-pen-bg)',
              border: '1.5px solid var(--red-pen)',
              color: 'var(--red-pen)',
              fontSize: '0.88rem',
              fontWeight: 600,
              lineHeight: 1.4
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Class Selector Tabs */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Select class:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {([9, 10, 11, 12] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSelectedClass(c);
                    setPin('');
                  }}
                  className={`paper-btn ${selectedClass === c ? 'paper-btn-accent' : ''}`}
                  style={{
                    padding: '0.5rem',
                    textAlign: 'center',
                    fontWeight: selectedClass === c ? 800 : 500,
                    fontSize: '1rem'
                  }}
                >
                  Class {c}
                </button>
              ))}
            </div>
          </div>

          {/* Student Name Dropdown */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Student name:
            </label>
            {loadingStudents ? (
              <div style={{ padding: '0.6rem', color: 'var(--ink-secondary)', fontSize: '0.9rem' }}>
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div style={{ padding: '0.6rem', color: 'var(--red-pen)', fontSize: '0.88rem' }}>
                No students available in Class {selectedClass}.
              </div>
            ) : (
              <select
                value={selectedStudentId}
                onChange={e => {
                  setSelectedStudentId(e.target.value);
                  setPin('');
                }}
                className="paper-input"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  fontSize: '1rem',
                  borderRadius: '6px',
                  border: '1.5px solid var(--paper-line)'
                }}
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* PIN Input Display */}
          <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.6rem' }}>
              4-digit secret PIN:
            </label>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.8rem',
                marginBottom: '0.5rem'
              }}
            >
              {[0, 1, 2, 3].map(i => {
                const filled = pin.length > i;
                return (
                  <div
                    key={i}
                    style={{
                      width: '44px',
                      height: '52px',
                      borderRadius: '8px',
                      border: `2px solid ${filled ? 'var(--accent-color)' : 'var(--paper-line)'}`,
                      backgroundColor: filled ? 'var(--yellow-sticky)' : 'var(--paper-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      color: 'var(--ink-primary)',
                      boxShadow: filled ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {filled ? '●' : ''}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
              (Demo PIN: 1234)
            </div>
          </div>

          {/* On-screen Numeric Keypad */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.6rem',
              maxWidth: '300px',
              margin: '0 auto 1.5rem auto'
            }}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map(key => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypadPress(key)}
                disabled={submitting}
                className="paper-btn"
                style={{
                  height: '50px',
                  fontSize: key === 'clear' || key === 'backspace' ? '0.85rem' : '1.3rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  backgroundColor: key === 'clear' || key === 'backspace' ? 'var(--paper-tag)' : 'var(--paper-bg)'
                }}
              >
                {key === 'clear' ? 'Clear' : key === 'backspace' ? '⌫' : key}
              </button>
            ))}
          </div>

          {/* Submit / Action Buttons */}
          <button
            type="submit"
            disabled={submitting || pin.length !== 4 || !selectedStudentId}
            className="paper-btn paper-btn-accent"
            style={{
              width: '100%',
              padding: '0.8rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {submitting ? 'Authenticating...' : 'Start Learning →'}
          </button>

          {onBackToModeSelect && (
            <button
              type="button"
              onClick={onBackToModeSelect}
              className="paper-btn"
              style={{
                width: '100%',
                marginTop: '0.8rem',
                padding: '0.6rem',
                fontSize: '0.9rem',
                color: 'var(--ink-secondary)'
              }}
            >
              ← Back to Home
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
