import { supabase, isSupabaseConfigured, getEdgeFunctionUrl } from './supabase';
import { OnlineQuiz, Student, StaffProfile, AuditLogEntry } from '../types/online';
import { Question } from '../types/quiz';

export type AdminProfile = StaffProfile;

/**
 * Unified Staff Login for Teacher & Admin via Edge Function
 */
export async function staffLogin(
  email: string,
  password: string,
  requestedRole: 'admin' | 'teacher'
): Promise<StaffProfile> {
  const cleanEmail = email.trim().toLowerCase();

  const handleDemoCredentials = () => {
    if (requestedRole === 'admin') {
      if (cleanEmail === 'admin@school.com' && (password === 'admin123' || password === 'Admin#Quiz2026!')) {
        const mockAdmin: StaffProfile = {
          id: 'mock-admin-id',
          email: 'admin@school.com',
          name: 'Principal / Admin (Demo)',
          role: 'admin',
          active: true,
          must_change_password: false
        };
        localStorage.setItem('quizforge_staff_profile', JSON.stringify(mockAdmin));
        return mockAdmin;
      }
      throw new Error("Invalid email or password! (Admin demo: admin@school.com / admin123)");
    } else {
      if (
        (cleanEmail === 'teacher@school.com' && (password === 'teacher123' || password === 'Teach#Class9!2026')) ||
        (cleanEmail === 'teacher.class9@school.com' && (password === 'teacher123' || password === 'Teach#Class9!2026'))
      ) {
        const mockTeacher: StaffProfile = {
          id: 'mock-teacher-id',
          email: cleanEmail,
          name: 'Mr. Sharma (Class 9 Teacher)',
          role: 'teacher',
          active: true,
          must_change_password: false,
          assignedClasses: [9, 10, 11, 12]
        };
        localStorage.setItem('quizforge_staff_profile', JSON.stringify(mockTeacher));
        return mockTeacher;
      }
      throw new Error("Invalid email or password! (Teacher demo: teacher@school.com / teacher123)");
    }
  };

  if (!isSupabaseConfigured) {
    return handleDemoCredentials();
  }

  // Use staff-login Edge Function for server-enforced role checking & rate limiting
  const fnUrl = getEdgeFunctionUrl('staff-login');
  try {
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: password.trim(),
        requestedRole
      })
    });

    if (res.status === 404) {
      console.warn('staff-login edge function not deployed. Using local credentials check.');
      return handleDemoCredentials();
    }

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Login failed.');
    }

    if (body.session) {
      await supabase.auth.setSession(body.session);
    }

    const profile: StaffProfile = body.profile;
    localStorage.setItem('quizforge_staff_profile', JSON.stringify(profile));
    return profile;
  } catch (err: any) {
    // If it's a specific auth failure message from the edge function, surface it
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('Login failed')) {
      throw err;
    }
    return handleDemoCredentials();
  }
}

/**
 * Backward compatibility alias for adminLogin
 */
export async function adminLogin(email: string, password: string): Promise<StaffProfile> {
  return staffLogin(email, password, 'admin');
}

export async function staffLogout(): Promise<void> {
  localStorage.removeItem('quizforge_staff_profile');
  localStorage.removeItem('quizforge_mock_admin');
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
}

export const adminLogout = staffLogout;

export async function getCurrentStaff(): Promise<StaffProfile | null> {
  if (!isSupabaseConfigured) {
    const mock = localStorage.getItem('quizforge_staff_profile') || localStorage.getItem('quizforge_mock_admin');
    return mock ? JSON.parse(mock) : null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    localStorage.removeItem('quizforge_staff_profile');
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role, active, must_change_password')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  let assignedClasses: (9 | 10 | 11 | 12)[] = [];
  if (profile.role === 'teacher') {
    const { data: tClasses } = await supabase
      .from('teacher_classes')
      .select('class')
      .eq('teacher_id', profile.id);
    assignedClasses = (tClasses || []).map((t: any) => Number(t.class) as 9 | 10 | 11 | 12);
  }

  const staff: StaffProfile = {
    id: profile.id,
    email: profile.email || session.user.email || '',
    name: profile.name || session.user.email?.split('@')[0] || 'Staff',
    role: profile.role,
    active: profile.active,
    must_change_password: Boolean(profile.must_change_password),
    assignedClasses
  };

  localStorage.setItem('quizforge_staff_profile', JSON.stringify(staff));
  return staff;
}

export const getCurrentAdmin = getCurrentStaff;

/**
 * Fetch all quizzes for Admin overview
 */
export async function getAdminQuizzes(): Promise<OnlineQuiz[]> {
  if (!isSupabaseConfigured) {
    const mock = localStorage.getItem('quizforge_mock_quizzes');
    if (mock) {
      try { return JSON.parse(mock); } catch {}
    }
    return [
      {
        id: 'quiz-c9-gk-01',
        title: 'Class 9 - General Knowledge & Science Exam',
        class: 9,
        status: 'published',
        duration_minutes: 25,
        negative_marking: true,
        shuffle: true,
        show_answers_after: 'submit',
        max_attempts: 1,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        question_count: 15,
        total_marks: 15
      },
      {
        id: 'quiz-c10-math-01',
        title: 'Class 10 - Trigonometry & Algebra Periodic Test',
        class: 10,
        status: 'draft',
        duration_minutes: 40,
        negative_marking: false,
        shuffle: false,
        show_answers_after: 'close',
        max_attempts: 1,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        question_count: 20,
        total_marks: 20
      }
    ];
  }

  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      id,
      title,
      description,
      class,
      status,
      duration_minutes,
      negative_marking,
      shuffle,
      show_answers_after,
      opens_at,
      closes_at,
      max_attempts,
      created_at,
      owner_id,
      quiz_questions (count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admin quizzes:', error);
    throw new Error(error.message);
  }

  return (data || []).map((q: any) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    class: q.class,
    status: q.status,
    duration_minutes: q.duration_minutes,
    negative_marking: q.negative_marking,
    shuffle: q.shuffle,
    show_answers_after: q.show_answers_after,
    opens_at: q.opens_at,
    closes_at: q.closes_at,
    max_attempts: q.max_attempts,
    created_at: q.created_at,
    owner_id: q.owner_id,
    question_count: q.quiz_questions?.[0]?.count || 0
  }));
}

/**
 * Publish / Change quiz status (draft | published | closed)
 */
export async function updateQuizStatus(
  quizId: string,
  status: 'draft' | 'published' | 'closed'
): Promise<void> {
  if (!isSupabaseConfigured) {
    const list = await getAdminQuizzes();
    const updated = list.map(q => q.id === quizId ? { ...q, status } : q);
    localStorage.setItem('quizforge_mock_quizzes', JSON.stringify(updated));
    return;
  }

  const { error } = await supabase
    .from('quizzes')
    .update({ status })
    .eq('id', quizId);

  if (error) {
    console.error('Failed to update quiz status:', error);
    throw new Error(error.message);
  }
}

/**
 * Create a new quiz and attach questions (Admin)
 */
export async function createAdminQuiz(
  quizData: Omit<OnlineQuiz, 'id' | 'created_at' | 'question_count'>,
  questionIdsWithMarks: { questionId: string; marks?: number }[]
): Promise<OnlineQuiz> {
  if (!isSupabaseConfigured) {
    const newQuiz: OnlineQuiz = {
      ...quizData,
      id: 'quiz-' + Date.now(),
      created_at: new Date().toISOString(),
      question_count: questionIdsWithMarks.length
    };
    const list = await getAdminQuizzes();
    localStorage.setItem('quizforge_mock_quizzes', JSON.stringify([newQuiz, ...list]));
    return newQuiz;
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data: created, error: qError } = await supabase
    .from('quizzes')
    .insert({
      title: quizData.title,
      description: quizData.description,
      class: quizData.class,
      status: quizData.status || 'draft',
      duration_minutes: quizData.duration_minutes || 30,
      negative_marking: Boolean(quizData.negative_marking),
      shuffle: Boolean(quizData.shuffle),
      show_answers_after: quizData.show_answers_after || 'submit',
      opens_at: quizData.opens_at || null,
      closes_at: quizData.closes_at || null,
      max_attempts: quizData.max_attempts || 1,
      owner_id: user?.id || null
    })
    .select()
    .single();

  if (qError || !created) {
    throw new Error(qError?.message || 'Error creating quiz.');
  }

  // Insert quiz_questions links
  const links = questionIdsWithMarks.map((item, idx) => ({
    quiz_id: created.id,
    question_id: item.questionId,
    position: idx + 1,
    marks: item.marks || 1
  }));

  if (links.length > 0) {
    const { error: linkError } = await supabase
      .from('quiz_questions')
      .insert(links);

    if (linkError) {
      console.error('Error linking quiz questions:', linkError);
    }
  }

  return {
    ...created,
    question_count: links.length
  };
}

/**
 * Delete a quiz
 */
export async function deleteAdminQuiz(quizId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const list = await getAdminQuizzes();
    const updated = list.filter(q => q.id !== quizId);
    localStorage.setItem('quizforge_mock_quizzes', JSON.stringify(updated));
    return;
  }

  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fetch Student Roster
 */
export async function getAdminRoster(classFilter?: number): Promise<Student[]> {
  if (!isSupabaseConfigured) {
    const mock = localStorage.getItem('quizforge_mock_roster');
    if (mock) {
      try {
        const parsed: Student[] = JSON.parse(mock);
        return classFilter ? parsed.filter(s => s.class === classFilter) : parsed;
      } catch {}
    }
    const defaultRoster: Student[] = [
      { id: 'c9-01', name: 'Aarav Sharma', class: 9, active: true },
      { id: 'c9-02', name: 'Ananya Verma', class: 9, active: true },
      { id: 'c9-03', name: 'Ishaan Patel', class: 9, active: true },
      { id: 'c10-01', name: 'Rohan Gupta', class: 10, active: true },
      { id: 'c10-02', name: 'Sneha Rao', class: 10, active: true },
      { id: 'c11-01', name: 'Priya Patel', class: 11, active: true },
      { id: 'c11-02', name: 'Vikram Joshi', class: 11, active: true },
      { id: 'c12-01', name: 'Aditya Singh', class: 12, active: true },
      { id: 'c12-02', name: 'Meera Iyer', class: 12, active: true }
    ];
    return classFilter ? defaultRoster.filter(s => s.class === classFilter) : defaultRoster;
  }

  let query = supabase
    .from('students')
    .select('id, name, class, active, created_at')
    .order('class', { ascending: true })
    .order('name', { ascending: true });

  if (classFilter) {
    query = query.eq('class', classFilter);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    class: s.class,
    active: s.active,
    createdAt: s.created_at
  }));
}

/**
 * Reset student PIN via Edge Function
 */
export async function resetStudentPin(studentId: string, newPin: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Admin authentication required.');
  }

  const fnUrl = getEdgeFunctionUrl('admin-reset-pin');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      studentId,
      newPin: newPin.trim()
    })
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'PIN reset failed.');
  }
}

/**
 * Bulk import students roster via CSV data and Edge Function
 */
export async function importStudentRoster(
  students: { name: string; class: number; pin: string }[]
): Promise<{ insertedCount: number }> {
  if (!isSupabaseConfigured) {
    const list = await getAdminRoster();
    const newItems: Student[] = students.map((s, idx) => ({
      id: `imported-${Date.now()}-${idx}`,
      name: s.name,
      class: s.class as 9 | 10 | 11 | 12,
      active: true
    }));
    localStorage.setItem('quizforge_mock_roster', JSON.stringify([...list, ...newItems]));
    return { insertedCount: newItems.length };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Admin authentication required.');
  }

  const fnUrl = getEdgeFunctionUrl('admin-import-roster');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ students })
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Roster import failed.');
  }

  return { insertedCount: body.insertedCount || students.length };
}

/**
 * Toggle active status of a student
 */
export async function toggleStudentActive(studentId: string, active: boolean): Promise<void> {
  if (!isSupabaseConfigured) {
    const list = await getAdminRoster();
    const updated = list.map(s => s.id === studentId ? { ...s, active } : s);
    localStorage.setItem('quizforge_mock_roster', JSON.stringify(updated));
    return;
  }

  const { error } = await supabase
    .from('students')
    .update({ active })
    .eq('id', studentId);

  if (error) {
    throw new Error(error.message);
  }
}

/* ====================================================================
 * PHASE 9: TEACHER MANAGEMENT (ADMIN ONLY)
 * ==================================================================== */

export interface TeacherListItem {
  id: string;
  name: string;
  email: string;
  role: 'teacher';
  active: boolean;
  must_change_password: boolean;
  created_at: string;
  assignedClasses: (9 | 10 | 11 | 12)[];
}

/**
 * Fetch all teachers with assigned classes
 */
export async function getAdminTeachers(): Promise<TeacherListItem[]> {
  if (!isSupabaseConfigured) {
    const mock = localStorage.getItem('quizforge_mock_teachers');
    if (mock) {
      try { return JSON.parse(mock); } catch {}
    }
    return [
      {
        id: 't-demo-01',
        name: 'Sunil Sharma',
        email: 'teacher@school.com',
        role: 'teacher',
        active: true,
        must_change_password: false,
        created_at: new Date().toISOString(),
        assignedClasses: [9, 10]
      }
    ];
  }

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, name, email, role, active, must_change_password, created_at')
    .eq('role', 'teacher')
    .order('name', { ascending: true });

  if (pErr) {
    throw new Error(pErr.message);
  }

  const { data: classRows, error: cErr } = await supabase
    .from('teacher_classes')
    .select('teacher_id, class');

  if (cErr) {
    console.warn('Could not load teacher_classes:', cErr);
  }

  const classMap = new Map<string, (9 | 10 | 11 | 12)[]>();
  for (const row of classRows || []) {
    const existing = classMap.get(row.teacher_id) || [];
    existing.push(Number(row.class) as 9 | 10 | 11 | 12);
    classMap.set(row.teacher_id, existing);
  }

  return (profiles || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: 'teacher',
    active: p.active,
    must_change_password: Boolean(p.must_change_password),
    created_at: p.created_at,
    assignedClasses: classMap.get(p.id) || []
  }));
}

/**
 * Create a new teacher via admin-manage-teacher Edge Function
 */
export async function createTeacherAccount(
  data: { email: string; name: string; assignedClasses: (9 | 10 | 11 | 12)[]; password?: string }
): Promise<TeacherListItem> {
  if (!isSupabaseConfigured) {
    const teachers = await getAdminTeachers();
    const newT: TeacherListItem = {
      id: 't-mock-' + Date.now(),
      name: data.name,
      email: data.email,
      role: 'teacher',
      active: true,
      must_change_password: true,
      created_at: new Date().toISOString(),
      assignedClasses: data.assignedClasses
    };
    localStorage.setItem('quizforge_mock_teachers', JSON.stringify([...teachers, newT]));
    return newT;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Admin authentication required');

  const fnUrl = getEdgeFunctionUrl('admin-manage-teacher');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      action: 'create_teacher',
      email: data.email,
      name: data.name,
      assignedClasses: data.assignedClasses,
      password: data.password
    })
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Error creating teacher account.');
  }

  return body.teacher;
}

/**
 * Update teacher class assignments
 */
export async function updateTeacherClassAssignments(
  teacherId: string,
  assignedClasses: (9 | 10 | 11 | 12)[]
): Promise<void> {
  if (!isSupabaseConfigured) {
    const list = await getAdminTeachers();
    const updated = list.map(t => t.id === teacherId ? { ...t, assignedClasses } : t);
    localStorage.setItem('quizforge_mock_teachers', JSON.stringify(updated));
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Admin authentication required');

  const fnUrl = getEdgeFunctionUrl('admin-manage-teacher');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      action: 'update_classes',
      teacherId,
      assignedClasses
    })
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Error updating classes.');
}

/**
 * Toggle teacher active status
 */
export async function toggleTeacherActiveStatus(teacherId: string, active: boolean): Promise<void> {
  if (!isSupabaseConfigured) {
    const list = await getAdminTeachers();
    const updated = list.map(t => t.id === teacherId ? { ...t, active } : t);
    localStorage.setItem('quizforge_mock_teachers', JSON.stringify(updated));
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Admin authentication required');

  const fnUrl = getEdgeFunctionUrl('admin-manage-teacher');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      action: 'toggle_active',
      teacherId,
      active
    })
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Error updating active status.');
}

/**
 * Reset teacher password
 */
export async function resetTeacherPassword(teacherId: string, newPassword: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Admin authentication required');

  const fnUrl = getEdgeFunctionUrl('admin-manage-teacher');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      action: 'reset_password',
      teacherId,
      newPassword
    })
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Password reset failed.');
}

/* ====================================================================
 * PHASE 9: RECYCLE BIN & QUESTION RESTORE (ADMIN ONLY)
 * ==================================================================== */

/**
 * Fetch soft-deleted questions
 */
export async function getRecycleBinQuestions(): Promise<Question[]> {
  if (!isSupabaseConfigured) {
    const mock = localStorage.getItem('quizforge_mock_recycle_bin');
    return mock ? JSON.parse(mock) : [];
  }

  const { data, error } = await supabase
    .from('questions_public')
    .select('*')
    .eq('is_deleted', true)
    .order('deleted_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((q: any) => ({
    id: q.id,
    class: q.class,
    subject: q.subject,
    chapter: q.chapter,
    type: q.type,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation || '',
    marks: q.marks || 1,
    is_deleted: true,
    deleted_by: q.deleted_by,
    deleted_at: q.deleted_at
  }));
}

/**
 * Restore a soft-deleted question
 */
export async function restoreQuestion(questionId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const list = await getRecycleBinQuestions();
    const updated = list.filter(q => q.id !== questionId);
    localStorage.setItem('quizforge_mock_recycle_bin', JSON.stringify(updated));
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('questions_public')
    .update({
      is_deleted: false,
      deleted_by: null,
      deleted_at: null
    })
    .eq('id', questionId);

  if (error) throw new Error(error.message);

  try {
    await supabase.from('audit_log').insert({
      actor_id: user?.id || 'admin',
      actor_role: 'admin',
      action: 'restore_question',
      target_type: 'question',
      target_id: questionId
    });
  } catch {}
}

/* ====================================================================
 * PHASE 9: AUDIT LOG VIEWER (ADMIN ONLY)
 * ==================================================================== */

export async function getAuditLogs(options?: {
  limit?: number;
  action?: string;
  actorRole?: string;
}): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured) {
    return [
      {
        id: 1,
        actor_id: 'mock-admin-id',
        actor_role: 'admin',
        action: 'login',
        target_type: 'staff_account',
        target_id: 'admin@school.com',
        details: { role: 'admin' },
        created_at: new Date().toISOString()
      }
    ];
  }

  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options?.limit || 50);

  if (options?.action) {
    query = query.eq('action', options.action);
  }
  if (options?.actorRole) {
    query = query.eq('actor_role', options.actorRole);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((l: any) => ({
    id: l.id,
    actor_id: l.actor_id,
    actor_role: l.actor_role,
    action: l.action,
    target_type: l.target_type,
    target_id: l.target_id,
    details: l.details || {},
    created_at: l.created_at
  }));
}
