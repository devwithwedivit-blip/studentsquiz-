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
      setActionMessage({ text: err.message || 'डेटा लोड करने में त्रुटि।', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Add Teacher Handler
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmail.trim() || !teacherName.trim()) {
      alert('ईमेल और नाम अनिवार्य हैं।');
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
      setActionMessage({ text: `शिक्षक ${teacherName} का खाता सफलतापूर्वक बनाया गया।`, type: 'success' });
      setShowAddTeacherModal(false);
      setTeacherEmail('');
      setTeacherName('');
      setTeacherTempPass('');
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'शिक्षक खाता बनाने में त्रुटि।', type: 'error' });
    } finally {
      setAddTeacherLoading(false);
    }
  };

  // Update Teacher Classes Handler
  const handleUpdateTeacherClasses = async () => {
    if (!editTeacherClassesTarget) return;
    try {
      await updateTeacherClassAssignments(editTeacherClassesTarget.id, editTeacherClassesList);
      setActionMessage({ text: 'कक्षा असाइनमेंट सफलतापूर्वक अपडेट किया गया।', type: 'success' });
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
        text: `शिक्षक खाता ${!currentActive ? 'सक्रिय' : 'निष्क्रिय'} किया गया।`,
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
      alert('पासवर्ड कम से कम 10 अक्षरों का होना चाहिए।');
      return;
    }
    setResetPassLoading(true);
    try {
      await resetTeacherPassword(resetTeacherPassTarget.id, teacherNewPass);
      setActionMessage({
        text: `${resetTeacherPassTarget.name} का पासवर्ड सफलतापूर्वक रीसेट किया गया (लॉगिन पर बदलना अनिवार्य)।`,
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
      setActionMessage({ text: 'प्रश्न सफलतापूर्वक पुनर्स्थापित किया गया।', type: 'success' });
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
        text: `परीक्षा की स्थिति '${newStatus === 'published' ? 'प्रकाशित' : newStatus === 'closed' ? 'बंद' : 'ड्राफ्ट'}' में परिवर्तित की गई।`,
        type: 'success'
      });
      loadData();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'स्थिति बदलने में त्रुटि।', type: 'error' });
    }
  };

  // Delete quiz
  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (window.confirm(`क्या आप निश्चित हैं कि आप परीक्षा "${title}" को हटाना चाहते हैं?`)) {
      try {
        await deleteAdminQuiz(quizId);
        setActionMessage({ text: 'परीक्षा सफलतापूर्वक हटा दी गई।', type: 'success' });
        loadData();
      } catch (err: any) {
        setActionMessage({ text: err.message || 'परीक्षा हटाने में त्रुटि।', type: 'error' });
      }
    }
  };

  // Reset PIN submit
  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalStudent) return;
    if (newPinValue.trim().length !== 4 || isNaN(Number(newPinValue))) {
      alert('कृपया 4 अंकों की मान्य संख्या दर्ज करें।');
      return;
    }
    setPinSubmitting(true);
    try {
      await resetStudentPin(pinModalStudent.id, newPinValue.trim());
      setActionMessage({
        text: `${pinModalStudent.name} का पिन सफलतापूर्वक बदलकर '${newPinValue}' कर दिया गया।`,
        type: 'success'
      });
      setPinModalStudent(null);
      setNewPinValue('');
    } catch (err: any) {
      alert(err.message || 'पिन रीसेट विफल रहा।');
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
        alert('कोई मान्य रिकॉर्ड नहीं मिला। कृपया फॉर्मेट जांचें: Name,Class,PIN');
        return;
      }

      const res = await importStudentRoster(parsed);
      setActionMessage({
        text: `सफलतापूर्वक ${res.insertedCount} विद्यार्थियों का रोस्टर इम्पोर्ट किया गया!`,
        type: 'success'
      });
      setShowImportModal(false);
      setImportCsvText('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'इम्पोर्ट विफल रहा।');
    } finally {
      setImportSubmitting(false);
    }
  };

  // Create Quiz submit
  const handleCreateQuizSubmit = async (e: React.FormEvent, publishImmediately = false) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) {
      alert('कृपया परीक्षा का शीर्षक दर्ज करें।');
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
        alert(`कक्षा ${newQuizClass} के लिए प्रश्न बैंक में कोई प्रश्न उपलब्ध नहीं है।`);
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
        text: `परीक्षा "${created.title}" सफलतापूर्वक निर्मित एवं ${publishImmediately ? 'कक्षा ' + newQuizClass + ' के लिए प्रकाशित की गई!' : 'ड्राफ्ट के रूप में सहेजी गई!'}`,
        type: 'success'
      });

      setNewQuizTitle('');
      setActiveTab('quizzes');
      loadData();
    } catch (err: any) {
      alert(err.message || 'परीक्षा बनाने में त्रुटि।');
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
            🛠️ परीक्षा नियंत्रण कक्ष (Admin Control Room)
          </h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginTop: '0.2rem' }}>
            व्यवस्थापक: <strong>{admin.name}</strong> ({admin.email}) • भूमिका: {admin.role.toUpperCase()}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="paper-btn"
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', color: 'var(--red-pen)', borderColor: 'var(--red-pen)' }}
        >
          🚪 लॉगआउट (Exit Admin)
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`paper-btn ${activeTab === 'quizzes' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          📋 परीक्षा सूची ({quizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`paper-btn ${activeTab === 'create' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          ➕ नई परीक्षा बनाएं (Create Quiz)
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`paper-btn ${activeTab === 'roster' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          👥 विद्यार्थी रोस्टर ({roster.length})
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`paper-btn ${activeTab === 'teachers' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          👨‍🏫 शिक्षक प्रबंधन ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('recycle_bin')}
          className={`paper-btn ${activeTab === 'recycle_bin' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          ♻️ रीसायकल बिन ({recycleBinQuestions.length})
        </button>
        <button
          onClick={() => setActiveTab('audit_log')}
          className={`paper-btn ${activeTab === 'audit_log' ? 'paper-btn-accent' : ''}`}
          style={{ padding: '0.6rem 1.2rem', fontWeight: 700 }}
        >
          🛡️ ऑडिट लॉग ({auditLogs.length})
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
          <p style={{ color: 'var(--ink-secondary)' }}>लोड हो रहा है...</p>
        </div>
      ) : activeTab === 'quizzes' ? (
        /* Quizzes Tab */
        <div className="notebook-sheet" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>
              वर्तमान परीक्षाएं (Active & Draft Tests)
            </h4>
            <button
              onClick={() => setActiveTab('create')}
              className="paper-btn paper-btn-accent"
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            >
              + नई परीक्षा बनाएं
            </button>
          </div>

          {quizzes.length === 0 ? (
            <p style={{ color: 'var(--ink-secondary)', textAlign: 'center', padding: '2rem' }}>
              कोई परीक्षा नहीं मिली। 'नई परीक्षा बनाएं' पर क्लिक करके पहली परीक्षा तैयार करें।
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                    <th style={{ padding: '0.7rem 0.5rem' }}>शीर्षक (Title)</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>कक्षा</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>स्थिति (Status)</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>प्रश्न</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>समय</th>
                    <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>क्रियाएं (Actions)</th>
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
                            {q.status === 'published' ? '🟢 प्रकाशित' : q.status === 'closed' ? '🔴 बंद' : '🟡 ड्राफ्ट'}
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
                              📊 परिणाम
                            </button>

                            {q.status !== 'published' && (
                              <button
                                onClick={() => handleStatusChange(q.id, 'published')}
                                className="paper-btn"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#059669' }}
                              >
                                प्रकाशित करें
                              </button>
                            )}

                            {q.status === 'published' && (
                              <button
                                onClick={() => handleStatusChange(q.id, 'closed')}
                                className="paper-btn"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#dc2626' }}
                              >
                                बंद करें
                              </button>
                            )}

                            {q.status === 'published' && (
                              <button
                                onClick={() => handleStatusChange(q.id, 'draft')}
                                className="paper-btn"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                              >
                                अप्रकाशित
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
            नई ऑनलाइन परीक्षा तैयार करें (Create & Push Online Quiz)
          </h4>

          <form onSubmit={e => handleCreateQuizSubmit(e, false)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  परीक्षा का शीर्षक (Quiz Title):
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. कक्षा 10 आवधिक मूल्यांकन - गणित व विज्ञान"
                  value={newQuizTitle}
                  onChange={e => setNewQuizTitle(e.target.value)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1.5px solid var(--paper-line)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  लक्ष्य कक्षा (Target Class):
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
                  समय सीमा (Minutes):
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
                  विषय चयन (Subject):
                </label>
                <select
                  value={newQuizSubject}
                  onChange={e => setNewQuizSubject(e.target.value)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
                >
                  <option value="all">सभी विषय (All Subjects)</option>
                  <option value="maths">गणित (Maths)</option>
                  <option value="hindi">हिन्दी (Hindi)</option>
                  <option value="english">English</option>
                  <option value="gk">सामान्य ज्ञान (GK)</option>
                  <option value="cs">Computer Science</option>
                  <option value="physics">Physics</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="biology">Biology</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  प्रश्नों की संख्या (Question Count):
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
                <span>⚠️ नकारात्मक अंकन (0.25 कटौती)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newQuizShuffle}
                  onChange={e => setNewQuizShuffle(e.target.checked)}
                />
                <span>🔀 प्रश्नों का रैंडम क्रम (Shuffle)</span>
              </label>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                  उत्तर दिखाने का समय:
                </label>
                <select
                  value={newQuizShowAnswers}
                  onChange={e => setNewQuizShowAnswers(e.target.value as any)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.3rem', fontSize: '0.85rem' }}
                >
                  <option value="submit">सबमिट करते ही (Instant)</option>
                  <option value="close">परीक्षा समाप्त होने पर (After close)</option>
                  <option value="never">कभी नहीं (Never)</option>
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
                {createSubmitting ? 'सहेजा जा रहा है...' : 'ड्राफ्ट के रूप में सहेजें (Save Draft)'}
              </button>
              <button
                type="button"
                disabled={createSubmitting}
                onClick={e => handleCreateQuizSubmit(e, true)}
                className="paper-btn paper-btn-accent"
                style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}
              >
                {createSubmitting ? 'प्रक्रियाधीन...' : `🚀 कक्षा ${newQuizClass} के लिए अभी प्रकाशित करें!`}
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
                विद्यार्थी रोस्टर एवं पिन प्रबंधन (Student Roster & PINs)
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                कुल विद्यार्थी: {roster.length}
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
                <option value="">सभी कक्षाएं (All Classes)</option>
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
                📥 CSV इम्पोर्ट करें
              </button>

              <button
                onClick={() => setShowPinSlips(true)}
                className="paper-btn paper-btn-accent"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 700 }}
              >
                🖨️ पिन पर्चियां प्रिंट करें (Print PIN Slips)
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                  <th style={{ padding: '0.7rem 0.5rem' }}>ID / रोल नं</th>
                  <th style={{ padding: '0.7rem 0.5rem' }}>नाम</th>
                  <th style={{ padding: '0.7rem 0.5rem' }}>कक्षा</th>
                  <th style={{ padding: '0.7rem 0.5rem' }}>स्थिति</th>
                  <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>क्रियाएं</th>
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
                          {st.active ? 'सक्रिय (Active)' : 'निष्क्रिय'}
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
                        🔑 पिन बदलें (Reset PIN)
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
                👨‍🏫 शिक्षक प्रबंधन (Teacher Management)
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                शिक्षकों के खाते बनाएं, कक्षाएं असाइन करें और पासवर्ड रीसेट करें
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
              + नया शिक्षक जोड़ें
            </button>
          </div>

          {teachers.length === 0 ? (
            <p style={{ color: 'var(--ink-secondary)', textAlign: 'center', padding: '2rem' }}>
              कोई शिक्षक खाता नहीं मिला। '+ नया शिक्षक जोड़ें' पर क्लिक करें।
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                    <th style={{ padding: '0.7rem 0.5rem' }}>नाम</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>ईमेल</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>असाइन कक्षाएं</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>स्थिति</th>
                    <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>कार्रवाई</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                      <td style={{ padding: '0.7rem 0.5rem', fontWeight: 700 }}>{t.name}</td>
                      <td style={{ padding: '0.7rem 0.5rem', color: 'var(--ink-secondary)' }}>{t.email}</td>
                      <td style={{ padding: '0.7rem 0.5rem' }}>
                        {t.assignedClasses.length === 0 ? (
                          <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>कोई नहीं</span>
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
                              कक्षा {c}
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
                          {t.active ? '🟢 सक्रिय' : '🔴 निष्क्रिय'}
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
                          📚 कक्षाएं बदलें
                        </button>
                        <button
                          onClick={() => {
                            setResetTeacherPassTarget(t);
                            setTeacherNewPass('');
                          }}
                          className="paper-btn"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          🔑 पासवर्ड रीसेट
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
              ♻️ रीसायकल बिन (Question Bank Recycle Bin)
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
              हटाए गए प्रश्न यहां सुरक्षित संग्रहीत हैं। आप इन्हें कभी भी पुनर्स्थापित कर सकते हैं।
            </p>
          </div>

          {recycleBinQuestions.length === 0 ? (
            <p style={{ color: 'var(--ink-secondary)', textAlign: 'center', padding: '2rem' }}>
              रीसायकल बिन खाली है। कोई हटाया गया प्रश्न नहीं मिला।
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                    <th style={{ padding: '0.7rem 0.5rem' }}>कक्षा / विषय</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>प्रश्न</th>
                    <th style={{ padding: '0.7rem 0.5rem' }}>हटाने का समय</th>
                    <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>कार्रवाई</th>
                  </tr>
                </thead>
                <tbody>
                  {recycleBinQuestions.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid var(--paper-line)' }}>
                      <td style={{ padding: '0.7rem 0.5rem', whiteSpace: 'nowrap' }}>
                        <strong>कक्षा {q.class}</strong> • {q.subject.toUpperCase()}
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem' }}>{q.question}</td>
                      <td style={{ padding: '0.7rem 0.5rem', color: 'var(--ink-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {q.deleted_at ? new Date(q.deleted_at).toLocaleString() : 'ज्ञात नहीं'}
                      </td>
                      <td style={{ padding: '0.7rem 0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleRestoreQuestion(q.id)}
                          className="paper-btn paper-btn-accent"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                        >
                          ♻️ पुनर्स्थापित करें (Restore)
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
                🛡️ सुरक्षा एवं ऑडिट लॉग (Security & Activity Audit Trail)
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                सभी लॉगिन, परीक्षा प्रकाशन, पासवर्ड परिवर्तन एवं प्रशासनिक कार्यों का स्थायी रिकॉर्ड
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
                <option value="all">सभी भूमिकाएं (All Roles)</option>
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
                <option value="all">सभी क्रियाएं (All Actions)</option>
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
              कोई ऑडिट लॉग रिकॉर्ड नहीं मिला।
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--paper-line)', color: 'var(--ink-secondary)' }}>
                    <th style={{ padding: '0.6rem 0.4rem' }}>समय</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>कर्ता (Actor)</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>कार्य (Action)</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>लक्ष्य (Target)</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>विवरण (Details)</th>
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
              ➕ नया शिक्षक खाता जोड़ें (Add Teacher)
            </h4>

            <form onSubmit={handleAddTeacherSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  शिक्षक का नाम *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा: राजेश कुमार"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.6rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  ईमेल पता (Email) *
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
                  असाइन की जाने वाली कक्षाएं *
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
                      कक्षा {cls}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  अस्थायी पासवर्ड (वैकल्पिक, न्यूनतम 10 अक्षर)
                </label>
                <input
                  type="text"
                  placeholder="रिक्त छोड़ने पर स्वतः जनरेट होगा"
                  value={teacherTempPass}
                  onChange={e => setTeacherTempPass(e.target.value)}
                  className="paper-input"
                  style={{ width: '100%', padding: '0.6rem', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>
                  प्रथम लॉगिन पर शिक्षक को पासवर्ड बदलना अनिवार्य होगा।
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={addTeacherLoading}
                  onClick={() => setShowAddTeacherModal(false)}
                  className="paper-btn"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={addTeacherLoading || teacherClasses.length === 0}
                  className="paper-btn paper-btn-accent"
                >
                  {addTeacherLoading ? 'खाता बन रहा है...' : 'शिक्षक बनाएं'}
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
              📚 कक्षाएं असाइन करें: {editTeacherClassesTarget.name}
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
                  कक्षा {cls}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setEditTeacherClassesTarget(null)}
                className="paper-btn"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleUpdateTeacherClasses}
                className="paper-btn paper-btn-accent"
              >
                सहेजें (Save Classes)
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
              🔑 पासवर्ड रीसेट: {resetTeacherPassTarget.name}
            </h4>

            <form onSubmit={handleResetTeacherPasswordSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  नया अस्थायी पासवर्ड (न्यूनतम 10 अक्षर) *
                </label>
                <input
                  type="text"
                  required
                  minLength={10}
                  placeholder="उदा: SchoolTeach#2026!"
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
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={resetPassLoading || teacherNewPass.length < 10}
                  className="paper-btn paper-btn-accent"
                >
                  {resetPassLoading ? 'रीसेट हो रहा है...' : 'पासवर्ड रीसेट करें'}
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
              🔑 पिन रीसेट: {pinModalStudent.name}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
              कक्षा: Class {pinModalStudent.class} • ID: {pinModalStudent.id}
            </p>

            <form onSubmit={handleResetPinSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  नया 4-अंकों का पिन (New 4-digit PIN):
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    required
                    placeholder="उदा. 4321"
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
                    🎲 रैंडम पिन
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
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={pinSubmitting || newPinValue.length !== 4}
                  className="paper-btn paper-btn-accent"
                >
                  {pinSubmitting ? 'सहेज रहे हैं...' : 'पिन अपडेट करें'}
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
              📥 CSV रोस्टर इम्पोर्ट (Bulk Student Import)
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.8rem' }}>
              फॉर्मेट: <code>Name,Class,PIN</code> (कक्षा 9-12, पिन 4 अंक)
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
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={importSubmitting || !importCsvText.trim()}
                  className="paper-btn paper-btn-accent"
                >
                  {importSubmitting ? 'इम्पोर्ट हो रहा है...' : 'रोस्टर अपलोड करें'}
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
            <h2>🖨️ विद्यार्थी परीक्षा पिन पर्चियां (Exam PIN Slips)</h2>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                onClick={() => window.print()}
                className="paper-btn paper-btn-accent"
                style={{ padding: '0.5rem 1rem', fontWeight: 700 }}
              >
                प्रिंट निकालें (Print)
              </button>
              <button
                onClick={() => setShowPinSlips(false)}
                className="paper-btn"
                style={{ padding: '0.5rem 1rem' }}
              >
                बंद करें (Close)
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
                  <div style={{ fontSize: '0.85rem' }}>कक्षा: <strong>Class {st.class}</strong></div>
                  <div style={{ fontSize: '0.85rem' }}>विद्यार्थी ID: <code>{st.id}</code></div>
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.4rem',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  >
                    लॉगिन पिन: <strong>**** (गोपनीय)</strong>
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
