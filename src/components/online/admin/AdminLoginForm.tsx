import React, { useState } from 'react';
import { adminLogin, AdminProfile } from '../../../services/adminApi';

interface AdminLoginFormProps {
  onSuccess: (admin: AdminProfile) => void;
  onBackToModeSelect?: () => void;
}

export function AdminLoginForm({ onSuccess, onBackToModeSelect }: AdminLoginFormProps) {
  const [email, setEmail] = useState<string>('admin@school.com');
  const [password, setPassword] = useState<string>('admin123');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const admin = await adminLogin(email, password);
      onSuccess(admin);
    } catch (err: any) {
      setErrorMessage(err.message || 'एडमिन लॉगिन विफल हुआ।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto', padding: '1rem' }}>
      <div className="notebook-sheet" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.8rem', marginBottom: '0.4rem' }}>🔐</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontSize: '1.6rem' }}>
            शिक्षक / व्यवस्थापक पोर्टल
          </h2>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
            Teacher & Administrator Control Center
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '0.8rem',
              marginBottom: '1.2rem',
              borderRadius: '6px',
              backgroundColor: 'var(--red-pen-bg)',
              border: '1.5px solid var(--red-pen)',
              color: 'var(--red-pen)',
              fontSize: '0.88rem',
              fontWeight: 600
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              ईमेल (Admin Email):
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="paper-input"
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                fontSize: '1rem',
                borderRadius: '6px',
                border: '1.5px solid var(--paper-line)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              पासवर्ड (Password):
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="paper-input"
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                fontSize: '1rem',
                borderRadius: '6px',
                border: '1.5px solid var(--paper-line)',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginTop: '0.3rem' }}>
              (डिफ़ॉल्ट परीक्षण: admin@school.com / admin123)
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="paper-btn paper-btn-accent"
            style={{
              width: '100%',
              padding: '0.8rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {submitting ? 'प्रमाणीकरण हो रहा है...' : 'लॉगिन करें (Sign In) →'}
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
              ← वापस मुख्य मेनू (Back to Home)
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
