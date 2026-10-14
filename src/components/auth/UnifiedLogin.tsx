import React, { useState, useEffect } from 'react';
import { Student, StudentSession, StaffProfile } from '../../types/online';
import { getStudentsForClass, loginStudent } from '../../services/studentApi';
import { staffLogin } from '../../services/adminApi';
import { changeOwnPassword } from '../../services/teacherApi';
import './UnifiedLogin.css';

interface UnifiedLoginProps {
  onStudentLoginSuccess: (session: StudentSession) => void;
  onStaffLoginSuccess: (profile: StaffProfile) => void;
  defaultRoleCard?: 'student' | 'teacher' | 'admin';
}

const EYE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EYE_OFF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6" />
    <path d="m2 2 20 20M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

const LOGO_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
    <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
  </svg>
);

export function UnifiedLogin({
  onStudentLoginSuccess,
  onStaffLoginSuccess,
  defaultRoleCard = 'student'
}: UnifiedLoginProps) {
  const [selectedCard, setSelectedCard] = useState<'student' | 'teacher' | 'admin'>(defaultRoleCard);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Student Form State
  const [selectedClass, setSelectedClass] = useState<9 | 10 | 11 | 12>(9);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentPin, setStudentPin] = useState<string>('');
  const [showStudentPin, setShowStudentPin] = useState<boolean>(false);
  const [studentLoading, setStudentLoading] = useState<boolean>(false);

  // Teacher Form State
  const [teacherEmail, setTeacherEmail] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [showTeacherPass, setShowTeacherPass] = useState<boolean>(false);
  const [teacherLoading, setTeacherLoading] = useState<boolean>(false);

  // Admin Form State
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);

  // Password Change Modal State (for must_change_password)
  const [pendingStaffProfile, setPendingStaffProfile] = useState<StaffProfile | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changePassLoading, setChangePassLoading] = useState<boolean>(false);
  const [changePassError, setChangePassError] = useState<string | null>(null);

  // Load students whenever class changes
  useEffect(() => {
    let active = true;
    const fetchStudents = async () => {
      try {
        setStudentLoading(true);
        const data = await getStudentsForClass(selectedClass);
        if (active) {
          setStudentsList(data);
          setSelectedStudentId(data.length > 0 ? data[0].id : '');
        }
      } catch (err: any) {
        if (active) {
          setErrorMessage(err.message || 'Could not load student list.');
        }
      } finally {
        if (active) setStudentLoading(false);
      }
    };
    fetchStudents();
    return () => { active = false; };
  }, [selectedClass]);

  const switchRole = (role: 'student' | 'teacher' | 'admin') => {
    setSelectedCard(role);
    setErrorMessage('');
  };

  // Handle Student Login
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedStudentId) {
      setErrorMessage('Please select your name.');
      return;
    }
    if (!studentPin || studentPin.length !== 4) {
      setErrorMessage('Enter your 4-digit PIN.');
      return;
    }

    try {
      setStudentLoading(true);
      const session = await loginStudent(selectedStudentId, selectedClass, studentPin);
      onStudentLoginSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setStudentLoading(false);
    }
  };

  // Handle Teacher Login
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = teacherEmail.trim();
    if (!cleanEmail || !teacherPassword) {
      setErrorMessage('Enter your user ID and password.');
      return;
    }

    try {
      setTeacherLoading(true);
      const profile = await staffLogin(cleanEmail, teacherPassword, 'teacher');
      if (profile.must_change_password) {
        setPendingStaffProfile(profile);
      } else {
        onStaffLoginSuccess(profile);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Teacher login failed.');
    } finally {
      setTeacherLoading(false);
    }
  };

  // Handle Admin Login
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = adminEmail.trim();
    if (!cleanEmail || !adminPassword) {
      setErrorMessage('Enter your user ID and password.');
      return;
    }

    try {
      setAdminLoading(true);
      const profile = await staffLogin(cleanEmail, adminPassword, 'admin');
      if (profile.must_change_password) {
        setPendingStaffProfile(profile);
      } else {
        onStaffLoginSuccess(profile);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Admin login failed.');
    } finally {
      setAdminLoading(false);
    }
  };

  // Handle Mandatory Password Change Submission
  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);

    if (!newPassword || newPassword.length < 10) {
      setChangePassError('Password must be at least 10 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePassError('Passwords do not match.');
      return;
    }

    try {
      setChangePassLoading(true);
      await changeOwnPassword(newPassword);
      if (pendingStaffProfile) {
        const updated = { ...pendingStaffProfile, must_change_password: false };
        setPendingStaffProfile(null);
        onStaffLoginSuccess(updated);
      }
    } catch (err: any) {
      setChangePassError(err.message || 'Error changing password.');
    } finally {
      setChangePassLoading(false);
    }
  };

  const activeIndex = selectedCard === 'student' ? '0' : selectedCard === 'teacher' ? '1' : '2';

  return (
    <div className="login-portal-wrapper">
      <main className="card">
        {/* Brand */}
        <div className="brand">
          <div className="logo" aria-hidden="true">
            {LOGO_ICON}
          </div>
          <h1>Welcome to School Exam Portal</h1>
          <p className="sub">Choose your role and sign in securely</p>
        </div>

        {/* Roles Tablist */}
        <div className="roles" role="tablist" aria-label="Sign in as" data-active={activeIndex} id="roles">
          <span className="pill" aria-hidden="true"></span>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCard === 'student'}
            data-role="student"
            aria-controls="p-student"
            onClick={() => switchRole('student')}
          >
            Student
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCard === 'teacher'}
            data-role="teacher"
            aria-controls="p-teacher"
            onClick={() => switchRole('teacher')}
          >
            Teacher
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCard === 'admin'}
            data-role="admin"
            aria-controls="p-admin"
            onClick={() => switchRole('admin')}
          >
            Admin
          </button>
        </div>

        {/* Error message slot */}
        <p className="error" id="error" role="alert">
          {errorMessage}
        </p>

        {/* STUDENT PANEL */}
        <form
          className="panel"
          id="p-student"
          data-role="student"
          autoComplete="off"
          noValidate
          hidden={selectedCard !== 'student'}
          onSubmit={handleStudentSubmit}
        >
          <div className="field">
            <span className="label" id="class-label">Select class</span>
            <div className="chips" role="radiogroup" aria-labelledby="class-label" id="chips">
              {([9, 10, 11, 12] as const).map((cls) => (
                <button
                  key={cls}
                  type="button"
                  className="chip"
                  role="radio"
                  aria-checked={selectedClass === cls}
                  data-class={String(cls)}
                  onClick={() => {
                    setSelectedClass(cls);
                    setErrorMessage('');
                  }}
                >
                  Class {cls}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="student-name">Student name</label>
            <select
              id="student-name"
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={studentLoading || studentsList.length === 0}
            >
              {studentsList.length === 0 ? (
                <option value="">{studentLoading ? 'Loading students...' : 'No students found'}</option>
              ) : (
                studentsList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="field">
            <label htmlFor="student-pin">4-digit secret PIN</label>
            <div className="pw">
              <input
                className="input pin"
                id="student-pin"
                type={showStudentPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="••••"
                required
                value={studentPin}
                onChange={(e) => setStudentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
              <button
                type="button"
                className="toggle"
                aria-label={showStudentPin ? 'Hide PIN' : 'Show PIN'}
                data-target="student-pin"
                onClick={() => setShowStudentPin(!showStudentPin)}
              >
                {showStudentPin ? EYE_OFF_ICON : EYE_ICON}
              </button>
            </div>
            <p className="hint">Forgot your PIN? Ask your class teacher.</p>
          </div>

          <button className="go" type="submit" disabled={studentLoading || studentsList.length === 0}>
            {studentLoading ? (
              <>
                <span className="spinner"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              'Start learning'
            )}
          </button>
        </form>

        {/* TEACHER PANEL */}
        <form
          className="panel"
          id="p-teacher"
          data-role="teacher"
          noValidate
          hidden={selectedCard !== 'teacher'}
          onSubmit={handleTeacherSubmit}
        >
          <div className="field">
            <label htmlFor="teacher-id">User ID</label>
            <input
              className="input"
              id="teacher-id"
              type="email"
              placeholder="you@school.com"
              autoComplete="username"
              required
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="teacher-pw">Password</label>
            <div className="pw">
              <input
                className="input"
                id="teacher-pw"
                type={showTeacherPass ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
              />
              <button
                type="button"
                className="toggle"
                aria-label={showTeacherPass ? 'Hide password' : 'Show password'}
                data-target="teacher-pw"
                onClick={() => setShowTeacherPass(!showTeacherPass)}
              >
                {showTeacherPass ? EYE_OFF_ICON : EYE_ICON}
              </button>
            </div>
          </div>

          <button className="go" type="submit" disabled={teacherLoading}>
            {teacherLoading ? (
              <>
                <span className="spinner"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              'Sign in as teacher'
            )}
          </button>
        </form>

        {/* ADMIN PANEL */}
        <form
          className="panel"
          id="p-admin"
          data-role="admin"
          noValidate
          hidden={selectedCard !== 'admin'}
          onSubmit={handleAdminSubmit}
        >
          <div className="field">
            <label htmlFor="admin-id">User ID</label>
            <input
              className="input"
              id="admin-id"
              type="email"
              placeholder="admin@school.com"
              autoComplete="username"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="admin-pw">Password</label>
            <div className="pw">
              <input
                className="input"
                id="admin-pw"
                type={showAdminPass ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <button
                type="button"
                className="toggle"
                aria-label={showAdminPass ? 'Hide password' : 'Show password'}
                data-target="admin-pw"
                onClick={() => setShowAdminPass(!showAdminPass)}
              >
                {showAdminPass ? EYE_OFF_ICON : EYE_ICON}
              </button>
            </div>
          </div>

          <button className="go" type="submit" disabled={adminLoading}>
            {adminLoading ? (
              <>
                <span className="spinner"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              'Sign in as admin'
            )}
          </button>
        </form>

        <p className="foot">Need help signing in? Contact your school office.</p>
      </main>

      {/* MANDATORY PASSWORD CHANGE MODAL */}
      {pendingStaffProfile && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="brand" style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: 'var(--ink)' }}>
                Set New Password
              </h2>
              <p className="sub" style={{ fontSize: '13px' }}>
                For security reasons, you must change your password on first login.
              </p>
            </div>

            {changePassError && (
              <p className="error" role="alert" style={{ marginBottom: '14px' }}>
                {changePassError}
              </p>
            )}

            <form onSubmit={handlePasswordChangeSubmit} noValidate>
              <div className="field">
                <label htmlFor="new-pass">New Secure Password (Minimum 10 characters)</label>
                <input
                  id="new-pass"
                  className="input"
                  type="password"
                  placeholder="••••••••••••"
                  required
                  minLength={10}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="confirm-pass">Confirm New Password</label>
                <input
                  id="confirm-pass"
                  className="input"
                  type="password"
                  placeholder="••••••••••••"
                  required
                  minLength={10}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <p className="hint" style={{ marginBottom: '18px' }}>
                Tip: Use a mix of uppercase letters, numbers, and symbols (!@#$).
              </p>

              <button className="go" type="submit" disabled={changePassLoading}>
                {changePassLoading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Updating...</span>
                  </>
                ) : (
                  'Save password & enter'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
