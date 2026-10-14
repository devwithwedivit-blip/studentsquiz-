import { supabase, isSupabaseConfigured, getEdgeFunctionUrl } from './supabase';
import { OnlineQuiz, Student, OnlineAttempt, StaffProfile } from '../types/online';
import { Question } from '../types/quiz';
import { normalizeClass, formatClassLabel, SupportedClass } from '../utils/classNormalizer';
import { notifyTestPublished, safeStorage } from './realtimeSync';

const LOCAL_TEACHER_QUIZZES_KEY = 'quizforge_mock_teacher_quizzes';

function getStoredTeacherQuizzes(): OnlineQuiz[] {
  const mock = safeStorage.getItem(LOCAL_TEACHER_QUIZZES_KEY);
  if (mock) {
    try {
      const list = JSON.parse(mock);
      if (Array.isArray(list) && list.length > 0) return list;
    } catch { }
  }
  return [
    {
      id: 'quiz-teach-01',
      title: 'Class 9 - Science Periodic Practice',
      class: 9,
      status: 'draft',
      duration_minutes: 30,
      negative_marking: false,
      shuffle: true,
      show_answers_after: 'submit',
      max_attempts: 1,
      created_at: new Date().toISOString(),
      question_count: 10,
      total_marks: 10
    }
  ];
}

function saveStoredTeacherQuizzes(quizzes: OnlineQuiz[]) {
  safeStorage.setItem(LOCAL_TEACHER_QUIZZES_KEY, JSON.stringify(quizzes));
}

/**
 * Fetch quizzes created by the logged-in teacher
 */
export async function getTeacherQuizzes(): Promise<OnlineQuiz[]> {
  if (!isSupabaseConfigured) {
    return getStoredTeacherQuizzes();
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return getStoredTeacherQuizzes();
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
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching teacher quizzes from Supabase, using local fallback:', error);
      return getStoredTeacherQuizzes();
    }

    return (data || []).map((q: any) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      class: normalizeClass(q.class),
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
  } catch (err) {
    console.warn('Falling back to local teacher quizzes:', err);
    return getStoredTeacherQuizzes();
  }
}

/**
 * Fetch assigned classes for the logged-in teacher
 */
export async function getTeacherAssignedClasses(): Promise<(9 | 10 | 11 | 12)[]> {
  if (!isSupabaseConfigured) {
    return [9, 10];
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [9, 10];

    const { data, error } = await supabase
      .from('teacher_classes')
      .select('class')
      .eq('teacher_id', user.id);

    if (error || !data || data.length === 0) {
      return [9, 10];
    }

    return data.map((d: any) => normalizeClass(d.class));
  } catch {
    return [9, 10];
  }
}

/**
 * Create a new quiz by teacher (enforces assigned class check)
 */
export async function createTeacherQuiz(
  quizData: Omit<OnlineQuiz, 'id' | 'created_at' | 'question_count'>,
  questionIdsWithMarks: { questionId: string; marks?: number }[]
): Promise<OnlineQuiz> {
  const normClass = normalizeClass(quizData.class);
  const assigned = await getTeacherAssignedClasses();
  if (assigned.length > 0 && !assigned.includes(normClass)) {
    throw new Error(`You are not authorized to create quizzes for ${formatClassLabel(normClass)}. Only classes ${assigned.map(formatClassLabel).join(', ')} are assigned.`);
  }

  const newQuiz: OnlineQuiz = {
    ...quizData,
    class: normClass,
    id: 'quiz-teach-' + Date.now(),
    created_at: new Date().toISOString(),
    question_count: questionIdsWithMarks.length
  };

  if (!isSupabaseConfigured) {
    const list = await getTeacherQuizzes();
    saveStoredTeacherQuizzes([newQuiz, ...list]);
    if (newQuiz.status === 'published') {
      notifyTestPublished(newQuiz);
    }
    return newQuiz;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const list = await getTeacherQuizzes();
      saveStoredTeacherQuizzes([newQuiz, ...list]);
      if (newQuiz.status === 'published') {
        notifyTestPublished(newQuiz);
      }
      return newQuiz;
    }

    const { data: created, error: qError } = await supabase
      .from('quizzes')
      .insert({
        title: quizData.title,
        description: quizData.description,
        class: normClass,
        status: quizData.status || 'draft',
        duration_minutes: quizData.duration_minutes || 30,
        negative_marking: Boolean(quizData.negative_marking),
        shuffle: Boolean(quizData.shuffle),
        show_answers_after: quizData.show_answers_after || 'submit',
        opens_at: quizData.opens_at || null,
        closes_at: quizData.closes_at || null,
        max_attempts: quizData.max_attempts || 1,
        owner_id: user.id
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

    const resultQuiz: OnlineQuiz = {
      ...created,
      class: normalizeClass(created.class),
      question_count: links.length
    };

    if (resultQuiz.status === 'published') {
      notifyTestPublished(resultQuiz);
    }

    return resultQuiz;
  } catch (err) {
    console.warn('Falling back to local quiz creation:', err);
    const list = await getTeacherQuizzes();
    saveStoredTeacherQuizzes([newQuiz, ...list]);
    if (newQuiz.status === 'published') {
      notifyTestPublished(newQuiz);
    }
    return newQuiz;
  }
}

/**
 * Push quiz to class (sets status to 'published' and verifies class assignment)
 */
export async function pushQuizToClass(quizId: string, targetClass: 9 | 10 | 11 | 12): Promise<void> {
  const normClass = normalizeClass(targetClass);
  const assigned = await getTeacherAssignedClasses();
  if (assigned.length > 0 && !assigned.includes(normClass)) {
    throw new Error(`You are not authorized to send quizzes to ${formatClassLabel(normClass)}.`);
  }

  const updateLocal = async () => {
    const list = await getTeacherQuizzes();
    const updated = list.map(q => q.id === quizId ? { ...q, status: 'published' as const, class: normClass } : q);
    saveStoredTeacherQuizzes(updated);
    notifyTestPublished({ id: quizId, class: normClass });
  };

  if (!isSupabaseConfigured) {
    await updateLocal();
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      await updateLocal();
      return;
    }

    const { error } = await supabase
      .from('quizzes')
      .update({ status: 'published', class: normClass })
      .eq('id', quizId)
      .eq('owner_id', user.id);

    if (error) {
      console.warn('Supabase push quiz error, using local fallback:', error);
      await updateLocal();
      return;
    }

    notifyTestPublished({ id: quizId, class: normClass });

    try {
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'teacher',
        action: 'push_quiz_to_class',
        target_type: 'quiz',
        target_id: quizId,
        details: { class: normClass }
      });
    } catch {}
  } catch (err) {
    console.warn('Falling back to local pushQuizToClass:', err);
    await updateLocal();
  }
}

/**
 * Unpublish quiz (returns to 'draft')
 */
export async function unpublishTeacherQuiz(quizId: string): Promise<void> {
  const updateLocal = async () => {
    const list = await getTeacherQuizzes();
    const target = list.find(q => q.id === quizId);
    const updated = list.map(q => q.id === quizId ? { ...q, status: 'draft' as const } : q);
    saveStoredTeacherQuizzes(updated);
    notifyTestPublished({ id: quizId, class: target?.class || 9 });
  };

  if (!isSupabaseConfigured) {
    await updateLocal();
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      await updateLocal();
      return;
    }

    const { error } = await supabase
      .from('quizzes')
      .update({ status: 'draft' })
      .eq('id', quizId)
      .eq('owner_id', user.id);

    if (error) {
      console.warn('Supabase unpublish error, using local fallback:', error);
      await updateLocal();
      return;
    }

    const list = await getTeacherQuizzes();
    const target = list.find(q => q.id === quizId);
    notifyTestPublished({ id: quizId, class: target?.class || 9 });
  } catch (err) {
    console.warn('Falling back to local unpublishTeacherQuiz:', err);
    await updateLocal();
  }
}

/**
 * Delete a draft quiz owned by teacher
 */
export async function deleteTeacherQuiz(quizId: string): Promise<void> {
  const deleteLocal = async () => {
    const list = await getTeacherQuizzes();
    const target = list.find(q => q.id === quizId);
    const updated = list.filter(q => q.id !== quizId);
    saveStoredTeacherQuizzes(updated);
    notifyTestPublished({ id: quizId, class: target?.class || 9 });
  };

  if (!isSupabaseConfigured) {
    await deleteLocal();
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      await deleteLocal();
      return;
    }

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId)
      .eq('owner_id', user.id);

    if (error) {
      console.warn('Supabase delete error, using local fallback:', error);
      await deleteLocal();
      return;
    }

    const list = await getTeacherQuizzes();
    const target = list.find(q => q.id === quizId);
    notifyTestPublished({ id: quizId, class: target?.class || 9 });
  } catch (err) {
    console.warn('Falling back to local deleteTeacherQuiz:', err);
    await deleteLocal();
  }
}

/**
 * Fetch questions created by the teacher
 */
export async function getTeacherQuestions(): Promise<Question[]> {
  if (!isSupabaseConfigured) {
    const mock = localStorage.getItem('quizforge_mock_teacher_questions');
    return mock ? JSON.parse(mock) : [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('questions_public')
    .select('*')
    .eq('created_by', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching teacher questions:', error);
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
    created_by: q.created_by,
    is_deleted: q.is_deleted
  }));
}

/**
 * Soft-delete a question created by teacher
 */
export async function softDeleteTeacherQuestion(questionId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const questions = await getTeacherQuestions();
    const updated = questions.filter(q => q.id !== questionId);
    localStorage.setItem('quizforge_mock_teacher_questions', JSON.stringify(updated));
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('questions_public')
    .update({
      is_deleted: true,
      deleted_by: user.id,
      deleted_at: new Date().toISOString()
    })
    .eq('id', questionId)
    .eq('created_by', user.id);

  if (error) {
    throw new Error(error.message);
  }

  try {
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      actor_role: 'teacher',
      action: 'soft_delete_question',
      target_type: 'question',
      target_id: questionId
    });
  } catch {}
}

/**
 * Fetch roster for an assigned class
 */
export async function getTeacherRoster(classNum: 9 | 10 | 11 | 12): Promise<Student[]> {
  const assigned = await getTeacherAssignedClasses();
  if (assigned.length > 0 && !assigned.includes(classNum)) {
    throw new Error(`You are not authorized to view the roster for Class ${classNum}.`);
  }

  if (!isSupabaseConfigured) {
    const mockRoster: Student[] = [
      { id: `c${classNum}-01`, name: 'Student 1', class: classNum, active: true },
      { id: `c${classNum}-02`, name: 'Student 2', class: classNum, active: true }
    ];
    return mockRoster;
  }

  const { data, error } = await supabase
    .from('students')
    .select('id, name, class, active, created_at')
    .eq('class', classNum)
    .order('name', { ascending: true });

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
 * Fetch quiz attempts for teacher's own quiz
 */
export async function getTeacherQuizAttempts(quizId: string): Promise<OnlineAttempt[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('attempts')
    .select(`
      id,
      quiz_id,
      student_id,
      status,
      started_at,
      submitted_at,
      score,
      total,
      time_taken_seconds,
      students (name, class)
    `)
    .eq('quiz_id', quizId)
    .order('started_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((a: any) => ({
    id: a.id,
    quiz_id: a.quiz_id,
    student_id: a.student_id,
    status: a.status,
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    score: a.score,
    total: a.total,
    time_taken_seconds: a.time_taken_seconds,
    student_name: a.students?.name,
    student_class: a.students?.class
  }));
}

/**
 * Change own password (teacher or admin)
 */
export async function changeOwnPassword(newPassword: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const fnUrl = getEdgeFunctionUrl('admin-manage-teacher');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      action: 'change_password',
      newPassword
    })
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Error changing password.');
  }
}
