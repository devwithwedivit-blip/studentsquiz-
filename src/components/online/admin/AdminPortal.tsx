import React, { useState, useEffect } from 'react';
import {
  AdminProfile,
  getAdminQuizzes,
  updateQuizStatus,
  deleteAdminQuiz,
  createAdminQuiz,
  getAdminRoster,
  resetStudentPin,
  importStudentRoster,
  toggleStudentActive,
  getAdminTeachers,
  createTeacherAccount,
  updateTeacherClassAssignments,
  toggleTeacherActiveStatus,
  resetTeacherPassword,
  getRecycleBinQuestions,
  restoreQuestion,
  getAuditLogs,
  TeacherListItem
} from '../../../services/adminApi';
import { OnlineQuiz, Student, AuditLogEntry } from '../../../types/online';
import { Question } from '../../../types/quiz';

interface AdminPortalProps {
  admin: AdminProfile;
  allQuestions: Question[];
  onLogout: () => void;
  onOpenLiveResults: (quizId: string) => void;
}

export function AdminPortal({
  admin,
  allQuestions,
  onLogout,
  onOpenLiveResults
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'create' | 'roster' | 'teachers' | 'recycle_bin' | 'audit_log'>('quizzes');
  const [quizzes, setQuizzes] = useState<OnlineQuiz[]>([]);
  const [roster, setRoster] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [recycleBinQuestions, setRecycleBinQuestions] = useState<Question[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [classFilter, setClassFilter] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Teachers State
  const [showAddTeacherModal, setShowAddTeacherModal] = useState<boolean>(false);
  const [teacherEmail, setTeacherEmail] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherClasses, setTeacherClasses] = useState<(9 | 10 | 11 | 12)[]>([9]);
  const [teacherTempPass, setTeacherTempPass] = useState<string>('');
  const [addTeacherLoading, setAddTeacherLoading] = useState<boolean>(false);
  const [editTeacherClassesTarget, setEditTeacherClassesTarget] = useState<TeacherListItem | null>(null);
  const [editTeacherClassesList, setEditTeacherClassesList] = useState<(9 | 10 | 11 | 12)[]>([]);
  const [resetTeacherPassTarget, setResetTeacherPassTarget] = useState<TeacherListItem | null>(null);
  const [teacherNewPass, setTeacherNewPass] = useState<string>('');
  const [resetPassLoading, setResetPassLoading] = useState<boolean>(false);

  // Audit filters
  const [auditRoleFilter, setAuditRoleFilter] = useState<string>('all');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  // Reset PIN modal state
  const [pinModalStudent, setPinModalStudent] = useState<Student | null>(null);
  const [newPinValue, setNewPinValue] = useState<string>('');
  const [pinSubmitting, setPinSubmitting] = useState<boolean>(false);

  // Import CSV modal state
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importCsvText, setImportCsvText] = useState<string>('');
  const [importSubmitting, setImportSubmitting] = useState<boolean>(false);

  // PIN Slips print state
  const [showPinSlips, setShowPinSlips] = useState<boolean>(false);

  // Create Quiz form state
  const [newQuizTitle, setNewQuizTitle] = useState<string>('');
  const [newQuizClass, setNewQuizClass] = useState<9 | 10 | 11 | 12>(9);
  const [newQuizDuration, setNewQuizDuration] = useState<number>(30);
  const [newQuizNegative, setNewQuizNegative] = useState<boolean>(true);
  const [newQuizShuffle, setNewQuizShuffle] = useState<boolean>(true);
  const [newQuizShowAnswers, setNewQuizShowAnswers] = useState<'submit' | 'close' | 'never'>('submit');
  const [newQuizSubject, setNewQuizSubject] = useState<string>('all');
  const [newQuizQuestionCount, setNewQuizQuestionCount] = useState<number>(15);
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qList, rList, tList, rbList, aList] = await Promise.all([
        getAdminQuizzes(),
        getAdminRoster(classFilter),
        getAdminTeachers(),
        getRecycleBinQuestions(),
        getAuditLogs({ limit: 50 })
      ]);
      setQuizzes(qList);
      setRoster(rList);
      setTeachers(tList);
      setRecycleBinQuestions(rbList);
      setAuditLogs(aList);
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error loading data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Add Teacher Handler
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmail.trim() || !teacherName.trim()) {
      alert('Email and name are required.');
      return;
    }
    setAddTeacherLoading(true);
    try {
      await createTeacherAccount({
        email: teacherEmail.trim(),
        name: teacherName.trim(),
        assignedClasses: teacherClasses,
        password: teacherTempPass.trim() || undefined
      });
      setActionMessage({ text: `Teacher account for ${teacherName} created successfully.`, type: 'success' });
      setShowAddTeacherModal(false);
      setTeacherEmail('');
      setTeacherName('');
      setTeacherTempPass('');
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error creating teacher account.', type: 'error' });
    } finally {
      setAddTeacherLoading(false);
    }
  };

  // Update Teacher Classes Handler
  const handleUpdateTeacherClasses = async () => {
    if (!editTeacherClassesTarget) return;
    try {
      await updateTeacherClassAssignments(editTeacherClassesTarget.id, editTeacherClassesList);
      setActionMessage({ text: 'Class assignments updated successfully.', type: 'success' });
      setEditTeacherClassesTarget(null);
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  };

  // Toggle Teacher Active Handler
  const handleToggleTeacherActive = async (teacherId: string, currentActive: boolean) => {
    try {
      await toggleTeacherActiveStatus(teacherId, !currentActive);
      setActionMessage({
        text: `Teacher account ${!currentActive ? 'activated' : 'deactivated'}.`,
        type: 'success'
      });
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  };

  // Reset Teacher Password Handler
  const handleResetTeacherPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTeacherPassTarget) return;
    if (teacherNewPass.length < 10) {
      alert('Password must be at least 10 characters long.');
      return;
    }
    setResetPassLoading(true);
    try {
      await resetTeacherPassword(resetTeacherPassTarget.id, teacherNewPass);
      setActionMessage({
        text: `Password reset successfully for ${resetTeacherPassTarget.name} (must change on next login).`,
        type: 'success'
      });
      setResetTeacherPassTarget(null);
      setTeacherNewPass('');
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    } finally {
      setResetPassLoading(false);
    }
  };

  // Restore Question Handler
  const handleRestoreQuestion = async (qId: string) => {
    try {
      await restoreQuestion(qId);
      setActionMessage({ text: 'Question restored successfully.', type: 'success' });
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  };

  // Refresh Audit Logs
  const handleFilterAuditLogs = async (role: string, action: string) => {
    try {
      const logs = await getAuditLogs({
        limit: 50,
        actorRole: role === 'all' ? undefined : role,
        action: action === 'all' ? undefined : action
      });
      setAuditLogs(logs);
    } catch (err: any) {
      setActionMessage({ text: err.message, type: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, [classFilter]);

  // Quiz status change
  const handleStatusChange = async (quizId: string, newStatus: 'draft' | 'published' | 'closed') => {
    try {
      await updateQuizStatus(quizId, newStatus);
      setActionMessage({
        text: `Exam status changed to '${newStatus === 'published' ? 'Published' : newStatus === 'closed' ? 'Closed' : 'Draft'}'.`,
        type: 'success'
      });
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error updating status.', type: 'error' });
    }
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete exam "${title}"?`)) {
      try {
        await deleteAdminQuiz(quizId);
        setActionMessage({ text: 'Exam deleted successfully.', type: 'success' });
        loadData();
      } catch (err: any) {
        setActionMessage({ text: err.message || 'Error deleting exam.', type: 'error' });
      }
    }
  };

  // Reset PIN submit
  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalStudent) return;
    if (newPinValue.trim().length !== 4 || isNaN(Number(newPinValue))) {
      alert('Please enter a valid 4-digit PIN.');
      return;
    }
    setPinSubmitting(true);
    try {
      await resetStudentPin(pinModalStudent.id, newPinValue.trim());
      setActionMessage({
        text: `PIN for ${pinModalStudent.name} updated to '${newPinValue}' successfully.`,
        type: 'success'
      });
      setPinModalStudent(null);
      setNewPinValue('');
    } catch (err: any) {
      alert(err.message || 'PIN reset failed.');
    } finally {
      setPinSubmitting(false);
    }
  };

  // Import CSV submit
  const handleImportCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportSubmitting(true);
    try {
      const lines = importCsvText.trim().split('\n');
      const parsed: { name: string; class: number; pin: string }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || (i === 0 && line.toLowerCase().includes('name'))) continue;
        const [name, cls, pin] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (name && cls && pin) {
          parsed.push({
            name,
            class: Number(cls),
            pin
          });
        }
      }

      if (parsed.length === 0) {
        alert('No valid records found. Please check format: Name,Class,PIN');
        return;
      }

      const res = await importStudentRoster(parsed);
      setActionMessage({
        text: `Successfully imported ${res.insertedCount} students to roster!`,
        type: 'success'
      });
      setShowImportModal(false);
      setImportCsvText('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Import failed.');
    } finally {
      setImportSubmitting(false);
    }
  };

  // Create Quiz submit
  const handleCreateQuizSubmit = async (e: React.FormEvent, publishImmediately = false) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) {
      alert('Please enter an exam title.');
      return;
    }

    setCreateSubmitting(true);
    try {
      // Filter questions matching class and subject
      let pool = allQuestions.filter(q => q.class === newQuizClass && !q.isHidden && !q.isUserDeleted);
      if (newQuizSubject !== 'all') {
        pool = pool.filter(q => q.subject === newQuizSubject);
      }

      if (pool.length === 0) {
        alert(`No questions available in question bank for Class ${newQuizClass}.`);
        setCreateSubmitting(false);
        return;
      }

      // Pick questions
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, Math.min(newQuizQuestionCount, shuffled.length));

      const questionIdsWithMarks = chosen.map(q => ({
        questionId: q.id,
        marks: q.marks || 1
      }));

      const created = await createAdminQuiz(
        {
          title: newQuizTitle.trim(),
          class: newQuizClass,
          status: publishImmediately ? 'published' : 'draft',
          duration_minutes: newQuizDuration,
          negative_marking: newQuizNegative,
          shuffle: newQuizShuffle,
          show_answers_after: newQuizShowAnswers,
          max_attempts: 1
        },
        questionIdsWithMarks
      );

      setActionMessage({
        text: `Exam "${created.title}" created successfully and ${publishImmediately ? 'published for Class ' + newQuizClass + '!' : 'saved as draft!'}`,
        type: 'success'
      });

      setNewQuizTitle('');
      setActiveTab('quizzes');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error creating exam.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem' }}>
      {/* Admin Header Ribbon */}
      <div
        className="notebook-sheet"
        style={{
          padding: '1.2rem 1.6rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderLeft: '6px solid var(--accent-color)'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>
            🛠️ Admin Control Room
          </h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
            Admin: <strong>{admin.name}</strong> ({admin.email}) • Role: {admin.role.toUpperCase()}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="paper-btn"
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', color: 'var(--red-pen)', borderColor: 'var(--red-pen)' }}
        >
          🚪 Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`paper-btn ${activeTab === 'quizzes' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          📋 Exams ({quizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`paper-btn ${activeTab === 'create' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          ➕ Create Exam
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`paper-btn ${activeTab === 'roster' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          👥 Student Roster ({roster.length})
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`paper-btn ${activeTab === 'teachers' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          👨‍🏫 Teacher Management ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('recycle_bin')}
          className={`paper-btn ${activeTab === 'recycle_bin' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          ♻️ Recycle Bin ({recycleBinQuestions.length})
        </button>
        <button
          onClick={() => setActiveTab('audit_log')}
          className={`paper-btn ${activeTab === 'audit_log' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          🛡️ Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          style={{
            padding: '0.8rem 1.2rem',
            marginBottom: '1.2rem',
            borderRadius: '6px',
            backgroundColor: actionMessage.type === 'success' ? '#d1fae5' : 'var(--red-pen-bg)',
            border: `1.5px solid ${actionMessage.type === 'success' ? '#059669' : 'var(--red-pen)'}`,
            color: actionMessage.type === 'success' ? '#065f46' : 'var(--red-pen)',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="paper-btn"
            style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="notebook-sheet" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-secondary)' }}>Loading...</p>
        </div>
      ) : activeTab === 'quizzes' ? (
        /* Quizzes Tab */
        <div className="notebook-sheet" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>
              Active & Draft Tests
            </h4>
            <button
              onClick={() => setActiveTab('create')}
              className="paper-btn paper-btn-accent"
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            >
              + Create New Quiz
            </button>
          </div>

          {quizzes.length === 0 ? (
            <p style={{ color: 'var(--ink-secondary)', textAlign: 'center', padding: '2rem' }}>
              No quizzes found. Click '+ Create New Quiz' to create your first quiz.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Title</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Class</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Questions</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Duration</th>
                    <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map(q => {
                    const statusColor =
                      q.status === 'published' ? '#059669' : q.status === 'closed' ? '#dc2626' : '#d97706';

                    return (
                      <tr key={q.id} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                        <td style={{ padding: '0.8rem 0.5rem', fontWeight: 600 }}>{q.title}</td>
                        <td style={{ padding: '0.8rem 0.5rem' }}>Class {q.class}</td>
                        <td style={{ padding: '0.8rem 0.5rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: `${statusColor}22`,
                              color: statusColor
                            }}
                          >
                            {q.status === 'published' ? '🟢 Published' : q.status === 'closed' ? '🔴 Closed' : '🟡 Draft'}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 0.5rem' }}>{q.question_count || '-'}</td>
                        <td style={{ padding: '0.8rem 0.5rem' }}>{q.duration_minutes}m</td>
                        <td style={{ padding: '0.8rem 0.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => onOpenLiveResults(q.id)}
                              className="paper-btn"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-color)' }}
                            >
                              📊 Results
                            </button>

                            {q.status !== 'published' && (
                              <button
                                onClick={() => handleStatusChange(q.id, 'published')}
                                className="paper-btn"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#059669' }}
                              >
                                Publish
                              </button>
                            )}

                            {q.status === 'published' && (
                              <button
                                onClick={() => handleStatusChange(q.id, 'closed')}
                                className="paper-btn"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#dc2626' }}
                              >
                                Close
                              </button>
                            )}

                            {q.status === 'published' && (
                              <button
                                onClick={() => handleStatusChange(q.id, 'draft')}
                                className="paper-btn"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                              >
                                Unpublish
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteQuiz(q.id, q.title)}
                              className="paper-btn"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: 'var(--red-pen)' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'create' ? (
        /* Create Quiz Tab */
        <div className="notebook-sheet" style={{ padding: '2rem' }}>
          <h4 style={{ margin: '0 0 1.2rem 0', fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>
            Create & Push Online Quiz
          </h4>

          <form onSubmit={e => handleCreateQuizSubmit(e, false)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  Quiz Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 10 Periodic Assessment - Maths & Science"
                  value={newQuizTitle}
                  onChange={e => setNewQuizTitle(e.target.value)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1.5px solid var(--paper-line)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  Target Class:
                </label>
                <select
                  value={newQuizClass}
                  onChange={e => setNewQuizClass(Number(e.target.value) as any)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1.5px solid var(--paper-line)' }}
                >
                  <option value={9}>Class 9</option>
                  <option value={10}>Class 10</option>
                  <option value={11}>Class 11</option>
                  <option value={12}>Class 12</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  Duration (Minutes):
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={newQuizDuration}
                  onChange={e => setNewQuizDuration(Number(e.target.value))}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  Subject:
                </label>
                <select
                  value={newQuizSubject}
                  onChange={e => setNewQuizSubject(e.target.value)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
                >
                  <option value="all">All Subjects</option>
                  <option value="maths">Maths</option>
                  <option value="hindi">Hindi</option>
                  <option value="english">English</option>
                  <option value="gk">General Knowledge (GK)</option>
                  <option value="cs">Computer Science</option>
                  <option value="physics">Physics</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="biology">Biology</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  Question Count:
                </label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={newQuizQuestionCount}
                  onChange={e => setNewQuizQuestionCount(Number(e.target.value))}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--paper-card)',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newQuizNegative}
                  onChange={e => setNewQuizNegative(e.target.checked)}
                />
                <span>⚠️ Negative Marking (0.25 penalty)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newQuizShuffle}
                  onChange={e => setNewQuizShuffle(e.target.checked)}
                />
                <span>🔀 Randomize Question Order (Shuffle)</span>
              </label>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                  Show Answers Time:
                </label>
                <select
                  value={newQuizShowAnswers}
                  onChange={e => setNewQuizShowAnswers(e.target.value as any)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.3rem', fontSize: '0.85rem' }}
                >
                  <option value="submit">Instant (Upon submission)</option>
                  <option value="close">After Quiz Closes</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={createSubmitting}
                className="paper-btn"
                style={{ padding: '0.6rem 1.2rem', fontWeight: 600 }}
              >
                {createSubmitting ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                disabled={createSubmitting}
                onClick={e => handleCreateQuizSubmit(e, true)}
                className="paper-btn paper-btn-accent"
                style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}
              >
                {createSubmitting ? 'Publishing...' : `🚀 Publish Now for Class ${newQuizClass}!`}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Roster Tab */
        <div className="notebook-sheet" style={{ padding: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem'
            }}
          >
            <div>
              <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>
                Student Roster & PIN Management
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                Total Students: {roster.length}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Class Filter */}
              <select
                value={classFilter || ''}
                onChange={e => setClassFilter(e.target.value ? Number(e.target.value) : undefined)}
                className="paper-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
              >
                <option value="">All Classes</option>
                <option value="9">Class 9</option>
                <option value="10">Class 10</option>
                <option value="11">Class 11</option>
                <option value="12">Class 12</option>
              </select>

              <button
                onClick={() => setShowImportModal(true)}
                className="paper-btn"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                📥 Import CSV
              </button>

              <button
                onClick={() => setShowPinSlips(true)}
                className="paper-btn paper-btn-accent"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 700 }}
              >
                🖨️ Print PIN Slips
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                  <th style={{ padding: '0.7rem 0.5rem' }}>ID / Roll No</th>
                  <th style={{ padding: '0.7rem 0.5rem' }}>Name</th>
                  <th style={{ padding: '0.7rem 0.5rem' }}>Class</th>
                  <th style={{ padding: '0.7rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roster.map(st => (
                  <tr key={st.id} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                    <td style={{ padding: '0.7rem 0.5rem', fontFamily: 'monospace' }}>{st.id}</td>
                    <td style={{ padding: '0.7rem 0.5rem', fontWeight: 600 }}>{st.name}</td>
                    <td style={{ padding: '0.7rem 0.5rem' }}>Class {st.class}</td>
                    <td style={{ padding: '0.7rem 0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={st.active}
                          onChange={async e => {
                            try {
                              await toggleStudentActive(st.id, e.target.checked);
                              loadData();
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }}
                        />
                        <span style={{ fontSize: '0.8rem', color: st.active ? '#059669' : '#dc2626' }}>
                          {st.active ? 'Active' : 'Inactive'}
                        </span>
                      </label>
                    </td>
                    <td style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setPinModalStudent(st);
                          setNewPinValue('');
                        }}
                        className="paper-btn"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                      >
                        🔑 Reset PIN
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teachers Tab */}
      {activeTab === 'teachers' && (
        <div className="notebook-sheet" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>
                👨‍🏫 Teacher Management
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                Create teacher accounts, assign classes, and reset passwords
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddTeacherModal(true);
                setTeacherEmail('');
                setTeacherName('');
                setTeacherClasses([9]);
                setTeacherTempPass('');
              }}
              className="paper-btn paper-btn-accent"
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            >
              + Add New Teacher
            </button>
          </div>

          {teachers.length === 0 ? (
            <p style={{ color: 'var(--ink-secondary)', textAlign: 'center', padding: '2rem' }}>
              No teacher accounts found. Click '+ Add New Teacher'.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Name</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Email</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Assigned Classes</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                      <td style={{ padding: '0.7rem 0.5rem', fontWeight: 700 }}>{t.name}</td>
                      <td style={{ padding: '0.7rem 0.5rem', color: 'var(--ink-secondary)' }}>{t.email}</td>
                      <td style={{ padding: '0.7rem 0.5rem' }}>
                        {t.assignedClasses.length === 0 ? (
                          <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>None</span>
                        ) : (
                          t.assignedClasses.map(c => (
                            <span
                              key={c}
                              style={{
                                display: 'inline-block',
                                backgroundColor: 'var(--paper-bg)',
                                border: '1px solid var(--paper-line)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                marginRight: '0.3rem',
                                fontWeight: 700
                              }}
                            >
                              Class {c}
                            </span>
                          ))
                        )}
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem' }}>
                        <button
                          onClick={() => handleToggleTeacherActive(t.id, t.active)}
                          className="paper-btn"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            color: t.active ? '#059669' : '#dc2626',
                            borderColor: t.active ? '#059669' : '#dc2626'
                          }}
                        >
                          {t.active ? '🟢 Active' : '🔴 Inactive'}
                        </button>
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => {
                            setEditTeacherClassesTarget(t);
                            setEditTeacherClassesList([...t.assignedClasses]);
                          }}
                          className="paper-btn"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', marginRight: '0.4rem' }}
                        >
                          📚 Edit Classes
                        </button>
                        <button
                          onClick={() => {
                            setResetTeacherPassTarget(t);
                            setTeacherNewPass('');
                          }}
                          className="paper-btn"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          🔑 Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recycle Bin Tab */}
      {activeTab === 'recycle_bin' && (
        <div className="notebook-sheet" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>
              ♻️ Question Bank Recycle Bin
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
              Deleted questions are stored safely here. You can restore them anytime.
            </p>
          </div>

          {recycleBinQuestions.length === 0 ? (
            <p style={{ color: 'var(--ink-secondary)', textAlign: 'center', padding: '2rem' }}>
              Recycle bin is empty. No deleted questions found.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Class / Subject</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Question</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>Deleted At</th>
                    <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recycleBinQuestions.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                      <td style={{ padding: '0.7rem 0.5rem', whiteSpace: 'nowrap' }}>
                        <strong>Class {q.class}</strong> • {q.subject.toUpperCase()}
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem' }}>{q.question}</td>
                      <td style={{ padding: '0.7rem 0.5rem', color: 'var(--ink-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {q.deleted_at ? new Date(q.deleted_at).toLocaleString() : 'Unknown'}
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleRestoreQuestion(q.id)}
                          className="paper-btn paper-btn-accent"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          ♻️ Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit_log' && (
        <div className="notebook-sheet" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>
                🛡️ Security & Activity Audit Trail
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                Permanent audit trail of all logins, quiz publications, password changes, and administrative actions
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={auditRoleFilter}
                onChange={e => {
                  setAuditRoleFilter(e.target.value);
                  handleFilterAuditLogs(e.target.value, auditActionFilter);
                }}
                className="paper-input"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="system">System</option>
              </select>

              <select
                value={auditActionFilter}
                onChange={e => {
                  setAuditActionFilter(e.target.value);
                  handleFilterAuditLogs(auditRoleFilter, e.target.value);
                }}
                className="paper-input"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              >
                <option value="all">All Actions</option>
                <option value="login">Login</option>
                <option value="login_failed">Login Failed</option>
                <option value="create_teacher">Create Teacher</option>
                <option value="push_quiz_to_class">Push Quiz</option>
                <option value="soft_delete_question">Soft Delete Question</option>
                <option value="restore_question">Restore Question</option>
              </select>
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <p style={{ color: 'var(--ink-secondary)', textAlign: 'center', padding: '2rem' }}>
              No audit log records found.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Timestamp</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Actor</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Action</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Target</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                      <td style={{ padding: '0.6rem 0.4rem', color: 'var(--ink-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.6rem 0.4rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '0.1rem 0.4rem',
                            borderRadius: '3px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            backgroundColor: l.actor_role === 'admin' ? '#fef3c7' : l.actor_role === 'teacher' ? '#d1fae5' : '#e0e7ff',
                            color: l.actor_role === 'admin' ? '#92400e' : l.actor_role === 'teacher' ? '#065f46' : '#3730a3'
                          }}
                        >
                          {l.actor_role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.4rem', fontWeight: 600 }}>
                        <code style={{ fontSize: '0.8rem', color: l.action.includes('failed') ? '#dc2626' : 'inherit' }}>
                          {l.action}
                        </code>
                      </td>
                      <td style={{ padding: '0.6rem 0.4rem', color: 'var(--ink-secondary)' }}>
                        {l.target_type}: {l.target_id}
                      </td>
                      <td style={{ padding: '0.6rem 0.4rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {JSON.stringify(l.details || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddTeacherModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div className="notebook-sheet" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-heading)' }}>
              ➕ Add New Teacher Account
            </h4>

            <form onSubmit={handleAddTeacherSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Teacher Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.6rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="teacher@school.com"
                  value={teacherEmail}
                  onChange={e => setTeacherEmail(e.target.value)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.6rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Assigned Classes *
                </label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem' }}>
                  {([9, 10, 11, 12] as const).map(cls => (
                    <label key={cls} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={teacherClasses.includes(cls)}
                        onChange={e => {
                          if (e.target.checked) setTeacherClasses([...teacherClasses, cls]);
                          else setTeacherClasses(teacherClasses.filter(c => c !== cls));
                        }}
                      />
                      Class {cls}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Temporary Password (Optional, min 10 chars)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if left blank"
                  value={teacherTempPass}
                  onChange={e => setTeacherTempPass(e.target.value)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.6rem', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>
                  Teacher will be required to change password on first login.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={addTeacherLoading}
                  onClick={() => setShowAddTeacherModal(false)}
                  className="paper-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addTeacherLoading || teacherClasses.length === 0}
                  className="paper-btn paper-btn-accent"
                >
                  {addTeacherLoading ? 'Creating account...' : 'Create Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Teacher Classes Modal */}
      {editTeacherClassesTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div className="notebook-sheet" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontFamily: 'var(--font-heading)' }}>
              📚 Assign Classes: {editTeacherClassesTarget.name}
            </h4>

            <div style={{ display: 'flex', gap: '1rem', margin: '1.2rem 0' }}>
              {([9, 10, 11, 12] as const).map(cls => (
                <label key={cls} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={editTeacherClassesList.includes(cls)}
                    onChange={e => {
                      if (e.target.checked) setEditTeacherClassesList([...editTeacherClassesList, cls]);
                      else setEditTeacherClassesList(editTeacherClassesList.filter(c => c !== cls));
                    }}
                  />
                  Class {cls}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setEditTeacherClassesTarget(null)}
                className="paper-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateTeacherClasses}
                className="paper-btn paper-btn-accent"
              >
                Save Classes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Teacher Password Modal */}
      {resetTeacherPassTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div className="notebook-sheet" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontFamily: 'var(--font-heading)' }}>
              🔑 Reset Password: {resetTeacherPassTarget.name}
            </h4>

            <form onSubmit={handleResetTeacherPasswordSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  New Temporary Password (min 10 chars) *
                </label>
                <input
                  type="text"
                  required
                  minLength={10}
                  placeholder="e.g. SchoolTeach#2026!"
                  value={teacherNewPass}
                  onChange={e => setTeacherNewPass(e.target.value)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.6rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={resetPassLoading}
                  onClick={() => setResetTeacherPassTarget(null)}
                  className="paper-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPassLoading || teacherNewPass.length < 10}
                  className="paper-btn paper-btn-accent"
                >
                  {resetPassLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {pinModalStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div className="notebook-sheet" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontFamily: 'var(--font-heading)' }}>
              🔑 Reset PIN: {pinModalStudent.name}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
              Class: Class {pinModalStudent.class} • ID: {pinModalStudent.id}
            </p>

            <form onSubmit={handleResetPinSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  New 4-digit PIN:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    required
                    placeholder="e.g. 4321"
                    value={newPinValue}
                    onChange={e => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                    className="paper-input"
                    style={{ flex: 1, padding: '0.6rem', fontSize: '1.1rem', letterSpacing: '4px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setNewPinValue(String(Math.floor(1000 + Math.random() * 9000)))}
                    className="paper-btn"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                  >
                    🎲 Random PIN
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={pinSubmitting}
                  onClick={() => setPinModalStudent(null)}
                  className="paper-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinSubmitting || newPinValue.length !== 4}
                  className="paper-btn paper-btn-accent"
                >
                  {pinSubmitting ? 'Updating...' : 'Update PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div className="notebook-sheet" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <h4 style={{ margin: '0 0 0.6rem 0', fontFamily: 'var(--font-heading)' }}>
              📥 Bulk Student Roster Import (CSV)
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.8rem' }}>
              Format: <code>Name,Class,PIN</code> (Class 9-12, 4-digit PIN)
            </p>

            <form onSubmit={handleImportCsvSubmit}>
              <textarea
                rows={8}
                required
                placeholder="Aarav Sharma,9,1234&#10;Sneha Gupta,10,2345&#10;Rohan Kumar,11,3456"
                value={importCsvText}
                onChange={e => setImportCsvText(e.target.value)}
                className="paper-input"
                style={{ width: '100%', padding: '0.8rem', fontFamily: 'monospace', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  disabled={importSubmitting}
                  onClick={() => setShowImportModal(false)}
                  className="paper-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importSubmitting || !importCsvText.trim()}
                  className="paper-btn paper-btn-accent"
                >
                  {importSubmitting ? 'Importing...' : 'Upload Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable PIN Slips Overlay */}
      {showPinSlips && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#fff',
            zIndex: 200,
            padding: '2rem',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2>🖨️ Student Exam PIN Slips</h2>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                onClick={() => window.print()}
                className="paper-btn paper-btn-accent"
                style={{ padding: '0.5rem 1rem', fontWeight: 700 }}
              >
                Print
              </button>
              <button
                onClick={() => setShowPinSlips(false)}
                className="paper-btn"
                style={{ padding: '0.5rem 1rem' }}
              >
                Close
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem'
            }}
          >
            {roster.map(st => (
              <div
                key={st.id}
                style={{
                  border: '2px dashed #333',
                  padding: '1rem',
                  borderRadius: '6px',
                  pageBreakInside: 'avoid'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#666', borderBottom: '1px solid #ccc', paddingBottom: '0.2rem' }}>
                  QUIZFORGE ONLINE EXAM SLIP
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{st.name}</div>
                  <div style={{ fontSize: '0.85rem' }}>Class: <strong>Class {st.class}</strong></div>
                  <div style={{ fontSize: '0.85rem' }}>Student ID: <code>{st.id}</code></div>
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.4rem',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  >
                    Login PIN: <strong>**** (Confidential)</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
