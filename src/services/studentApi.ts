import { supabase, isSupabaseConfigured, getEdgeFunctionUrl } from './supabase';
import {
  Student,
  StudentSession,
  OnlineQuiz,
  OnlineAttempt,
  StartAttemptResponse,
  SubmitAttemptResponse
} from '../types/online';

const STUDENT_SESSION_KEY = 'quizforge_student_session';

export function getStoredStudentSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(STUDENT_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session?.token && session?.student?.id) {
      return session;
    }
  } catch (e) {
    console.error('Failed to parse student session:', e);
  }
  return null;
}

export function setStoredStudentSession(session: StudentSession | null): void {
  if (!session) {
    localStorage.removeItem(STUDENT_SESSION_KEY);
  } else {
    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
  }
}

export function clearStudentSession(): void {
  localStorage.removeItem(STUDENT_SESSION_KEY);
}

/**
 * Fetch active students in a given class for the student login selection dropdown
 */
export async function getStudentsForClass(classNum: number): Promise<Student[]> {
  if (!isSupabaseConfigured) {
    // Return sample offline students if Supabase isn't connected yet
    return [
      { id: 'sample-9-1', name: 'Aarav Sharma (Offline Demo)', class: 9, active: true },
      { id: 'sample-9-2', name: 'Ananya Verma (Offline Demo)', class: 9, active: true },
      { id: 'sample-10-1', name: 'Rohan Gupta (Offline Demo)', class: 10, active: true },
      { id: 'sample-11-1', name: 'Priya Patel (Offline Demo)', class: 11, active: true },
      { id: 'sample-12-1', name: 'Aditya Singh (Offline Demo)', class: 12, active: true }
    ].filter(s => s.class === classNum) as Student[];
  }

  const { data, error } = await supabase
    .from('students')
    .select('id, name, class, active')
    .eq('class', classNum)
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('Error fetching students for class:', error);
    throw new Error(error.message || 'Unable to load student roster.');
  }

  return (data || []) as Student[];
}

/**
 * Authenticate student with PIN via student-login edge function
 */
export async function loginStudent(
  studentId: string,
  studentClass: number,
  pin: string
): Promise<StudentSession> {
  if (!isSupabaseConfigured) {
    // Local dev / preview fallback: if PIN is 1234, allow test session
    if (pin.trim() === '1234') {
      const mockSession: StudentSession = {
        token: 'mock-jwt-token-dev-' + Date.now(),
        student: {
          id: studentId,
          name: 'Demo Student (Class ' + studentClass + ')',
          class: studentClass as 9 | 10 | 11 | 12
        }
      };
      setStoredStudentSession(mockSession);
      return mockSession;
    } else {
      throw new Error('Invalid PIN! Use demo PIN 1234.');
    }
  }

  const fnUrl = getEdgeFunctionUrl('student-login');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      studentId,
      studentClass,
      pin: pin.trim()
    })
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Login failed.');
  }

  const session: StudentSession = {
    token: body.token,
    student: body.student
  };
  setStoredStudentSession(session);
  return session;
}

/**
 * Fetch published quizzes available for student's class
 */
export async function getAvailableQuizzes(studentClass: number): Promise<OnlineQuiz[]> {
  if (!isSupabaseConfigured) {
    return [
      {
        id: 'mock-quiz-1',
        title: `Class ${studentClass} Periodic Assessment (Mock Demo Quiz)`,
        class: studentClass as 9 | 10 | 11 | 12,
        status: 'published',
        duration_minutes: 20,
        negative_marking: true,
        shuffle: true,
        show_answers_after: 'submit',
        max_attempts: 1,
        created_at: new Date().toISOString(),
        question_count: 10,
        total_marks: 10
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
    .eq('class', studentClass)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching available quizzes:', error);
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
  })) as OnlineQuiz[];
}

/**
 * Fetch past attempts of the currently logged-in student
 */
export async function getMyAttempts(studentId: string): Promise<OnlineAttempt[]> {
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
      quizzes (title)
    `)
    .eq('student_id', studentId)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('Error fetching student attempts:', error);
    return [];
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
    quiz_title: a.quizzes?.title || 'Quiz'
  }));
}

/**
 * Start or resume an online quiz attempt via Edge Function
 */
export async function startOnlineAttempt(quizId: string): Promise<StartAttemptResponse> {
  const session = getStoredStudentSession();
  if (!session) {
    throw new Error('Please login first.');
  }

  if (!isSupabaseConfigured) {
    // Return offline mock quiz
    return {
      attemptId: 'mock-attempt-' + Date.now(),
      startedAt: new Date().toISOString(),
      durationMinutes: 15,
      negativeMarking: false,
      title: 'Offline Mock Exam',
      questions: [
        {
          id: 'mock-q1',
          class: session.student.class,
          subject: 'gk',
          chapter: 'General Knowledge',
          type: 'mcq',
          difficulty: 'easy',
          question: 'What is the capital of India?',
          options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'],
          marks: 1
        }
      ],
      passages: [],
      savedProgress: {}
    };
  }

  const fnUrl = getEdgeFunctionUrl('start-attempt');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`
    },
    body: JSON.stringify({ quizId })
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Unable to start exam.');
  }

  return body as StartAttemptResponse;
}

/**
 * Auto-save student response to a question
 */
export async function saveOnlineProgress(
  attemptId: string,
  questionId: string,
  response: any,
  timeSpentSeconds: number
): Promise<{ saved: boolean }> {
  const session = getStoredStudentSession();
  if (!session || !isSupabaseConfigured) {
    return { saved: true };
  }

  const fnUrl = getEdgeFunctionUrl('save-progress');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`
    },
    body: JSON.stringify({
      attemptId,
      questionId,
      response,
      timeSpentSeconds
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save progress.');
  }

  return { saved: true };
}

/**
 * Submit attempt for server-side grading
 */
export async function submitOnlineAttempt(
  attemptId: string,
  answers?: Record<string, any>
): Promise<SubmitAttemptResponse> {
  const session = getStoredStudentSession();
  if (!session) {
    throw new Error('Session expired. Please login again.');
  }

  if (!isSupabaseConfigured) {
    return {
      attemptId,
      status: 'submitted',
      score: 1,
      total: 1,
      percentage: 100,
      timeTakenSeconds: 30,
      submittedAt: new Date().toISOString(),
      answersVisible: true,
      review: []
    };
  }

  const fnUrl = getEdgeFunctionUrl('submit-attempt');
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`
    },
    body: JSON.stringify({
      attemptId,
      answers
    })
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Error during submission.');
  }

  return body as SubmitAttemptResponse;
}
