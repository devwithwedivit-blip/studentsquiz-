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
  toggleStudentActive
} from '../../../services/adminApi';
import { OnlineQuiz, Student } from '../../../types/online';
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
  const [activeTab, setActiveTab] = useState<'quizzes' | 'create' | 'roster'>('quizzes');
  const [quizzes, setQuizzes] = useState<OnlineQuiz[]>([]);
  const [roster, setRoster] = useState<Student[]>([]);
  const [classFilter, setClassFilter] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
      const [qList, rList] = await Promise.all([
        getAdminQuizzes(),
        getAdminRoster(classFilter)
      ]);
      setQuizzes(qList);
      setRoster(rList);
    } catch (err: any) {
      setActionMessage({ text: err.message || 'डेटा लोड करने में त्रुटि।', type: 'error' });
    } finally {
      setLoading(false);
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
          👥 विद्यार्थी रोस्टर एवं पिन (Roster & PINs)
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
