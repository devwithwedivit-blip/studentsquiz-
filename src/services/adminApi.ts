import { supabase, isSupabaseConfigured, getEdgeFunctionUrl } from './supabase';
import { OnlineQuiz, Student } from '../types/online';
import { Question } from '../types/quiz';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
}

/**
 * Sign in as Admin / Teacher using email and password
 */
export async function adminLogin(email: string, password: string): Promise<AdminProfile> {
  if (!isSupabaseConfigured) {
    // Offline / Mock fallback
    if (email === 'admin@school.com' && password === 'admin123') {
      const mockAdmin: AdminProfile = {
        id: 'mock-admin-id',
        email: 'admin@school.com',
        name: 'Principal / Admin (Demo)',
        role: 'admin'
      };
      localStorage.setItem('quizforge_mock_admin', JSON.stringify(mockAdmin));
      return mockAdmin;
    }
    throw new Error('गलत ईमेल या पासवर्ड! डेमो लॉगिन: admin@school.com / admin123');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim()
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'एडमिन लॉगिन विफल हुआ।');
  }

  // Fetch admin profile
  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', data.user.id)
    .single();

  if (profError || !profile) {
    return {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.email?.split('@')[0] || 'Admin',
      role: 'admin'
    };
  }

  return {
    id: profile.id,
    email: data.user.email || '',
    name: profile.name,
    role: profile.role
  };
}

export async function adminLogout(): Promise<void> {
  localStorage.removeItem('quizforge_mock_admin');
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
}

export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  if (!isSupabaseConfigured) {
    const mock = localStorage.getItem('quizforge_mock_admin');
    return mock ? JSON.parse(mock) : null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', session.user.id)
    .single();

  return {
    id: session.user.id,
    email: session.user.email || '',
    name: profile?.name || session.user.email?.split('@')[0] || 'Admin',
    role: profile?.role || 'admin'
  };
}

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
        title: 'कक्षा 9 - सामान्य ज्ञान व विज्ञान परीक्षा',
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
        title: 'कक्षा 10 - त्रिकोणमिति एवं बीजगणित आवधिक टेस्ट',
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
 * Create a new quiz and attach questions
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
      max_attempts: quizData.max_attempts || 1
    })
    .select()
    .single();

  if (qError || !created) {
    throw new Error(qError?.message || 'प्रश्नोत्तरी बनाने में त्रुटि।');
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
    // offline success
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('एडमिन प्रमाणीकरण आवश्यक है।');
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
    throw new Error(body.error || 'पिन रीसेट विफल रहा।');
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
    throw new Error('एडमिन प्रमाणीकरण आवश्यक है।');
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
    throw new Error(body.error || 'रोस्टर इम्पोर्ट विफल रहा।');
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
