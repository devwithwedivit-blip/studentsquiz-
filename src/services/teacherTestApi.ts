import { supabase, isSupabaseConfigured } from './supabase';
import {
  TeacherTest,
  TeacherTestQuestion,
  TeacherTestSubmission,
  TeacherTestCardItem,
  CreateTeacherTestInput,
  TeacherTestSubmissionRow
} from '../types/teacherTest';
import { StartAttemptResponse, SubmitAttemptResponse } from '../types/online';
import { normalizeClass, formatClassLabel, SupportedClass } from '../utils/classNormalizer';
import {
  safeStorage,
  notifyTestPublished,
  subscribeToTeacherTestUpdates,
  REALTIME_CHANNEL_NAME,
  STORAGE_PING_KEY
} from './realtimeSync';

// Re-export realtime utilities for backward compatibility
export { notifyTestPublished, subscribeToTeacherTestUpdates, safeStorage, REALTIME_CHANNEL_NAME, STORAGE_PING_KEY };

const LOCAL_TEACHER_TESTS_KEY = 'quizforge_teacher_tests';
const LOCAL_TEACHER_QUESTIONS_KEY = 'quizforge_teacher_test_questions';
const LOCAL_TEACHER_SUBMISSIONS_KEY = 'quizforge_teacher_test_submissions';

// Default offline demo tests for Class 9
function getDefaultOfflineTests(): { tests: TeacherTest[]; questions: TeacherTestQuestion[] } {
  const now = Date.now();
  // Due in 18 hours (due soon!)
  const dueSoonDate = new Date(now + 18 * 3600 * 1000).toISOString();
  // Due in 3 days
  const laterDate = new Date(now + 72 * 3600 * 1000).toISOString();

  const test1: TeacherTest = {
    id: 'demo-tt-c9-math',
    title: 'Periodic Test 1: Linear Equations & Polynomials',
    subject: 'mathematics',
    class: 9,
    teacher_id: 'teacher-sharma',
    teacher_name: 'Mr. R. K. Sharma',
    duration_minutes: 20,
    total_marks: 10,
    due_at: dueSoonDate,
    created_at: new Date(now - 24 * 3600 * 1000).toISOString(),
    is_published: true,
    question_count: 4
  };

  const test2: TeacherTest = {
    id: 'demo-tt-c9-sci',
    title: 'Weekly Science Checkup: Motion & Forces',
    subject: 'science',
    class: 9,
    teacher_id: 'teacher-verma',
    teacher_name: 'Mrs. Sunita Verma',
    duration_minutes: 25,
    total_marks: 10,
    due_at: laterDate,
    created_at: new Date(now - 12 * 3600 * 1000).toISOString(),
    is_published: true,
    question_count: 4
  };

  const questions: TeacherTestQuestion[] = [
    // Math questions
    {
      id: 'ttq-m1',
      test_id: 'demo-tt-c9-math',
      question: 'What is the degree of a non-zero constant polynomial?',
      options: ['1', '0', 'Not defined', 'Any real number'],
      correct_answer: 1, // index 1: '0'
      marks: 2
    },
    {
      id: 'ttq-m2',
      test_id: 'demo-tt-c9-math',
      question: 'The graph of the linear equation 2x + 3y = 6 cuts the y-axis at which point?',
      options: ['(0, 2)', '(3, 0)', '(2, 0)', '(0, 3)'],
      correct_answer: 0, // (0, 2)
      marks: 2
    },
    {
      id: 'ttq-m3',
      test_id: 'demo-tt-c9-math',
      question: 'If x + 1 is a factor of polynomial p(x) = 2x² + kx, find the value of k.',
      options: ['-2', '2', '1', '-1'],
      correct_answer: 1, // k = 2
      marks: 3
    },
    {
      id: 'ttq-m4',
      test_id: 'demo-tt-c9-math',
      question: 'Which of the following is a root of the polynomial p(x) = x³ - 6x² + 11x - 6?',
      options: ['0', '1', '-1', '4'],
      correct_answer: 1, // 1
      marks: 3
    },
    // Science questions
    {
      id: 'ttq-s1',
      test_id: 'demo-tt-c9-sci',
      question: 'Which law of motion gives the quantitative definition and formula for Force (F = ma)?',
      options: [
        'Newton’s First Law',
        'Newton’s Second Law',
        'Newton’s Third Law',
        'Universal Law of Gravitation'
      ],
      correct_answer: 1,
      marks: 2
    },
    {
      id: 'ttq-s2',
      test_id: 'demo-tt-c9-sci',
      question: 'What is the SI unit of momentum?',
      options: ['kg m/s', 'kg m/s²', 'N m', 'Joule'],
      correct_answer: 0,
      marks: 2
    },
    {
      id: 'ttq-s3',
      test_id: 'demo-tt-c9-sci',
      question: 'A vehicle starts from rest and achieves a speed of 20 m/s in 5 seconds. What is its acceleration?',
      options: ['2 m/s²', '4 m/s²', '5 m/s²', '100 m/s²'],
      correct_answer: 1,
      marks: 3
    },
    {
      id: 'ttq-s4',
      test_id: 'demo-tt-c9-sci',
      question: 'Inertia of an object depends directly on which physical quantity?',
      options: ['Velocity', 'Acceleration', 'Mass', 'Volume'],
      correct_answer: 2,
      marks: 3
    }
  ];

  return { tests: [test1, test2], questions };
}

// 10 Standard Questions for Science Exams (e.g. Class 9 - Science Periodic Practice)
function getDefaultQuizQuestions(testId: string, subject: string, classNum: number): TeacherTestQuestion[] {
  return [
    {
      id: `ttq-${testId}-1`,
      test_id: testId,
      question: 'Which law of motion provides the quantitative formula for Force (F = ma)?',
      options: ['Newton’s First Law', 'Newton’s Second Law', 'Newton’s Third Law', 'Universal Law of Gravitation'],
      correct_answer: 1,
      marks: 1
    },
    {
      id: `ttq-${testId}-2`,
      test_id: testId,
      question: 'What is the SI unit of momentum (p = mv)?',
      options: ['kg m/s', 'kg m/s²', 'N m', 'Joule'],
      correct_answer: 0,
      marks: 1
    },
    {
      id: `ttq-${testId}-3`,
      test_id: testId,
      question: 'A body accelerates uniformly from rest to 20 m/s in 4 seconds. Its acceleration is:',
      options: ['80 m/s²', '5 m/s²', '0.2 m/s²', '4 m/s²'],
      correct_answer: 1,
      marks: 1
    },
    {
      id: `ttq-${testId}-4`,
      test_id: testId,
      question: 'Inertia of an object depends directly on which physical quantity?',
      options: ['Velocity', 'Acceleration', 'Mass', 'Volume'],
      correct_answer: 2,
      marks: 1
    },
    {
      id: `ttq-${testId}-5`,
      test_id: testId,
      question: 'What is the work done by a force of 10 N acting on an object displaced by 5 m in the direction of the force?',
      options: ['2 J', '50 J', '15 J', '0.5 J'],
      correct_answer: 1,
      marks: 1
    },
    {
      id: `ttq-${testId}-6`,
      test_id: testId,
      question: 'Which organelle is universally known as the powerhouse of the cell?',
      options: ['Ribosome', 'Golgi apparatus', 'Mitochondria', 'Endoplasmic reticulum'],
      correct_answer: 2,
      marks: 1
    },
    {
      id: `ttq-${testId}-7`,
      test_id: testId,
      question: 'Chloroplasts contain which green pigment essential for photosynthesis?',
      options: ['Carotene', 'Chlorophyll', 'Anthocyanin', 'Xanthophyll'],
      correct_answer: 1,
      marks: 1
    },
    {
      id: `ttq-${testId}-8`,
      test_id: testId,
      question: 'What is the chemical formula of water?',
      options: ['H2O', 'H2O2', 'HO2', 'OH'],
      correct_answer: 0,
      marks: 1
    },
    {
      id: `ttq-${testId}-9`,
      test_id: testId,
      question: 'Which of the following is a homogeneous mixture?',
      options: ['Sand and water', 'Sugar in water', 'Chalk in water', 'Oil and water'],
      correct_answer: 1,
      marks: 1
    },
    {
      id: `ttq-${testId}-10`,
      test_id: testId,
      question: 'The value of acceleration due to gravity (g) near the Earth’s surface is approximately:',
      options: ['8.9 m/s²', '9.8 m/s²', '10.8 m/s²', '6.67 m/s²'],
      correct_answer: 1,
      marks: 1
    }
  ];
}

// Local storage helpers - ONLY return tests and questions created by teachers (no unnecessary dummy tests)
function getStoredTests(): TeacherTest[] {
  try {
    const raw = safeStorage.getItem(LOCAL_TEACHER_TESTS_KEY);
    const custom: TeacherTest[] = raw ? JSON.parse(raw) : [];
    return (custom || []).filter((t: TeacherTest) => t && !t.id.startsWith('demo-tt-'));
  } catch {
    return [];
  }
}

function getStoredQuestions(): TeacherTestQuestion[] {
  try {
    const raw = safeStorage.getItem(LOCAL_TEACHER_QUESTIONS_KEY);
    const custom: TeacherTestQuestion[] = raw ? JSON.parse(raw) : [];
    return (custom || []).filter((q: TeacherTestQuestion) => q && !q.test_id.startsWith('demo-tt-'));
  } catch {
    return [];
  }
}

function getStoredSubmissions(): TeacherTestSubmission[] {
  try {
    const raw = safeStorage.getItem(LOCAL_TEACHER_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredSubmissions(subs: TeacherTestSubmission[]) {
  safeStorage.setItem(LOCAL_TEACHER_SUBMISSIONS_KEY, JSON.stringify(subs));
}

// Read published teacher exams (e.g. "Class 9 - Science Periodic Practice") from mock teacher quizzes storage
function getStoredPublishedTeacherQuizzes(normClass: 9 | 10 | 11 | 12): TeacherTestCardItem[] {
  const raw = safeStorage.getItem('quizforge_mock_teacher_quizzes');
  let quizzes: any[] = [];
  if (raw) {
    try {
      quizzes = JSON.parse(raw);
    } catch { }
  }

  // If no stored quizzes exist in localStorage yet, include the default mock exam if published
  if (!raw || quizzes.length === 0) {
    // Default template is draft initially, but if a teacher created/published it, it will be in raw
  }

  const submissions = getStoredSubmissions();
  const now = Date.now();

  const publishedTeacherQuizzes = (quizzes || []).filter(
    (q: any) => q && normalizeClass(q.class) === normClass && q.status === 'published'
  );

  return publishedTeacherQuizzes.map((q: any) => {
    const sub = submissions.find(s => s.test_id === q.id);
    const defaultDue = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const dueTime = new Date(q.closes_at || defaultDue).getTime();
    const isPastDeadline = now > dueTime;
    const diffMs = dueTime - now;
    const isDueSoon = diffMs > 0 && diffMs <= 24 * 3600 * 1000;

    let status: 'new' | 'in_progress' | 'submitted' | 'expired' = 'new';
    if (sub) {
      if (sub.status === 'in_progress') {
        status = isPastDeadline ? 'expired' : 'in_progress';
      } else {
        status = 'submitted';
      }
    } else {
      status = isPastDeadline ? 'expired' : 'new';
    }

    const titleLower = (q.title || '').toLowerCase();
    let subject = 'science';
    if (titleLower.includes('math')) subject = 'mathematics';
    else if (titleLower.includes('english')) subject = 'english';
    else if (titleLower.includes('hindi')) subject = 'hindi';
    else if (titleLower.includes('social') || titleLower.includes('sst')) subject = 'social_science';

    return {
      id: q.id,
      title: q.title,
      subject,
      class: normClass,
      teacher_id: q.owner_id || 'teacher-teach',
      teacher_name: q.owner_name || 'Mr. Sharma (Class Teacher)',
      duration_minutes: q.duration_minutes || 30,
      total_marks: q.total_marks || (q.question_count || 10),
      due_at: q.closes_at || defaultDue,
      created_at: q.created_at || new Date().toISOString(),
      is_published: true,
      question_count: q.question_count || 10,
      status,
      submission: sub,
      isDueSoon
    };
  });
}

/**
 * 1. Fetch tests for student's class
 * STRICT REQUIREMENTS:
 * - One "Teacher Tests" tab lists every exam or test the student's teacher has published to the student's class
 *   (status published, class matches): title, subject, duration, number of questions, Start button.
 * - Available Quizzes is for self-practice only. The same item must never appear in both tabs.
 * - Store class as one normalised key (e.g. the number 9) and display "Class 9" as the label.
 * - Only show "No tests from your teacher yet" when the query succeeded with zero rows. If it fails,
 *   show "Couldn't load tests. Retry." with the real error in the console.
 */
export async function getTeacherTestsForStudent(
  studentClass: number | string,
  studentId: string
): Promise<TeacherTestCardItem[]> {
  const normClass = normalizeClass(studentClass);
  const now = Date.now();

  const getLocalItems = (): TeacherTestCardItem[] => {
    const allTests = getStoredTests();
    const allQuestions = getStoredQuestions();
    const submissions = getStoredSubmissions();

    // STRICT CLASS FILTERING: class = normClass && is_published = true
    const classTests = allTests.filter(
      t => normalizeClass(t.class) === normClass && t.is_published
    );

    const testItems: TeacherTestCardItem[] = classTests.map(test => {
      const qCount = allQuestions.filter(q => q.test_id === test.id).length;
      const sub = submissions.find(s => s.test_id === test.id && s.student_id === studentId);

      const dueTime = new Date(test.due_at).getTime();
      const isPastDeadline = now > dueTime;
      const diffMs = dueTime - now;
      const isDueSoon = diffMs > 0 && diffMs <= 24 * 3600 * 1000;

      let status: 'new' | 'in_progress' | 'submitted' | 'expired' = 'new';
      if (sub) {
        if (sub.status === 'in_progress') {
          status = isPastDeadline ? 'expired' : 'in_progress';
        } else {
          status = 'submitted';
        }
      } else {
        status = isPastDeadline ? 'expired' : 'new';
      }

      return {
        ...test,
        class: normClass,
        question_count: qCount || test.question_count || 0,
        status,
        submission: sub,
        isDueSoon
      };
    });

    const quizItems = getStoredPublishedTeacherQuizzes(normClass);

    // Merge both sources (no duplicates)
    const combinedMap = new Map<string, TeacherTestCardItem>();
    [...testItems, ...quizItems].forEach(item => {
      combinedMap.set(item.id, item);
    });

    return Array.from(combinedMap.values()).sort(
      (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    );
  };

  if (!isSupabaseConfigured) {
    return getLocalItems();
  }

  try {
    // 1. Fetch published tests from teacher_tests table
    const { data: tests, error: testErr } = await supabase
      .from('teacher_tests')
      .select(`
        id,
        title,
        subject,
        class,
        teacher_id,
        teacher_name,
        duration_minutes,
        total_marks,
        due_at,
        created_at,
        is_published,
        teacher_test_questions (count)
      `)
      .eq('class', normClass)
      .eq('is_published', true)
      .order('due_at', { ascending: true });

    if (testErr) throw testErr;

    // 2. Fetch published teacher exams from quizzes table
    const { data: quizzes, error: quizErr } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        class,
        status,
        duration_minutes,
        total_marks,
        opens_at,
        closes_at,
        created_at,
        owner_id,
        quiz_questions (count)
      `)
      .eq('class', normClass)
      .eq('status', 'published')
      .not('owner_id', 'is', null)
      .order('created_at', { ascending: false });

    // 3. Fetch submissions for this student across all test IDs
    const allIds = [
      ...(tests || []).map((t: any) => t.id),
      ...(quizzes || []).map((q: any) => q.id)
    ];

    let studentSubmissions: TeacherTestSubmission[] = [];
    if (allIds.length > 0) {
      const { data: subs } = await supabase
        .from('teacher_test_submissions')
        .select('*')
        .in('test_id', allIds)
        .eq('student_id', studentId);

      if (subs) {
        studentSubmissions = subs as TeacherTestSubmission[];
      }
    }

    const testItems: TeacherTestCardItem[] = (tests || []).map((test: any) => {
      const qCount = test.teacher_test_questions?.[0]?.count || 0;
      const sub = studentSubmissions.find(s => s.test_id === test.id);

      const dueTime = new Date(test.due_at).getTime();
      const isPastDeadline = now > dueTime;
      const diffMs = dueTime - now;
      const isDueSoon = diffMs > 0 && diffMs <= 24 * 3600 * 1000;

      let status: 'new' | 'in_progress' | 'submitted' | 'expired' = 'new';
      if (sub) {
        status = sub.status === 'in_progress' ? (isPastDeadline ? 'expired' : 'in_progress') : 'submitted';
      } else {
        status = isPastDeadline ? 'expired' : 'new';
      }

      return {
        id: test.id,
        title: test.title,
        subject: test.subject,
        class: normClass,
        teacher_id: test.teacher_id,
        teacher_name: test.teacher_name,
        duration_minutes: test.duration_minutes,
        total_marks: test.total_marks,
        due_at: test.due_at,
        created_at: test.created_at,
        is_published: test.is_published,
        question_count: qCount,
        status,
        submission: sub,
        isDueSoon
      };
    });

    const quizItems: TeacherTestCardItem[] = (quizzes || []).map((q: any) => {
      const qCount = q.quiz_questions?.[0]?.count || 10;
      const sub = studentSubmissions.find(s => s.test_id === q.id);
      const defaultDue = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      const dueTime = new Date(q.closes_at || defaultDue).getTime();
      const isPastDeadline = now > dueTime;
      const diffMs = dueTime - now;
      const isDueSoon = diffMs > 0 && diffMs <= 24 * 3600 * 1000;

      let status: 'new' | 'in_progress' | 'submitted' | 'expired' = 'new';
      if (sub) {
        status = sub.status === 'in_progress' ? (isPastDeadline ? 'expired' : 'in_progress') : 'submitted';
      } else {
        status = isPastDeadline ? 'expired' : 'new';
      }

      const titleLower = (q.title || '').toLowerCase();
      let subject = 'science';
      if (titleLower.includes('math')) subject = 'mathematics';
      else if (titleLower.includes('english')) subject = 'english';
      else if (titleLower.includes('hindi')) subject = 'hindi';
      else if (titleLower.includes('social') || titleLower.includes('sst')) subject = 'social_science';

      return {
        id: q.id,
        title: q.title,
        subject,
        class: normClass,
        teacher_id: q.owner_id || 'teacher',
        teacher_name: 'Class Teacher',
        duration_minutes: q.duration_minutes || 30,
        total_marks: q.total_marks || qCount,
        due_at: q.closes_at || defaultDue,
        created_at: q.created_at || new Date().toISOString(),
        is_published: true,
        question_count: qCount,
        status,
        submission: sub,
        isDueSoon
      };
    });

    const combinedMap = new Map<string, TeacherTestCardItem>();
    [...testItems, ...quizItems].forEach(item => combinedMap.set(item.id, item));

    return Array.from(combinedMap.values()).sort(
      (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    );
  } catch (err: any) {
    console.warn('Falling back to local teacher tests due to error:', err);
    const local = getLocalItems();
    if (local.length > 0) {
      return local;
    }
    // If local has no items and server query failed, log and throw error so "Couldn't load tests. Retry." is shown
    console.error('Failed to load teacher tests from server:', err);
    throw new Error(err.message || "Couldn't load tests from server.");
  }
}

/**
 * 2. Start or Resume a Teacher Test
 * Enforces:
 * - Deadline check (cannot start after deadline)
 * - Single attempt check (cannot start if already submitted)
 * - Sanitized questions: correct_answer is NEVER sent to browser
 */
export async function startTeacherTest(
  testId: string,
  studentParam: { id: string; name: string; class?: number | string } | string,
  maybeName?: string,
  maybeClass?: number | string
): Promise<StartAttemptResponse & { isTeacherTest: true; teacherTestId: string }> {
  const student = typeof studentParam === 'string'
    ? { id: studentParam, name: maybeName || 'Student', class: normalizeClass(maybeClass ?? 9) }
    : { id: studentParam.id, name: studentParam.name, class: normalizeClass(studentParam.class ?? 9) };
  const now = Date.now();

  // Helper to validate deadline and attempt limits
  const validateEligibility = (test: TeacherTest, existingSub?: TeacherTestSubmission) => {
    if (!test.is_published) {
      throw new Error('This test is currently not published.');
    }
    if (normalizeClass(test.class) !== normalizeClass(student.class)) {
      throw new Error(`Unauthorized: This test is assigned to Class ${test.class}, but you are in Class ${student.class}.`);
    }
    if (now > new Date(test.due_at).getTime()) {
      throw new Error('This test has passed its submission deadline and can no longer be taken.');
    }
    if (existingSub && existingSub.status !== 'in_progress') {
      throw new Error(`You have already submitted this test (${existingSub.status}). Only one attempt is allowed.`);
    }
  };

  if (!isSupabaseConfigured) {
    const tests = getStoredTests();
    let test = tests.find(t => t.id === testId);
    if (!test) {
      const teacherQuizzes = getStoredPublishedTeacherQuizzes(normalizeClass(student.class));
      const qMatch = teacherQuizzes.find(q => q.id === testId);
      if (qMatch) {
        test = {
          id: qMatch.id,
          title: qMatch.title,
          subject: qMatch.subject,
          class: qMatch.class,
          teacher_id: qMatch.teacher_id,
          teacher_name: qMatch.teacher_name,
          duration_minutes: qMatch.duration_minutes,
          total_marks: qMatch.total_marks,
          due_at: qMatch.due_at,
          created_at: qMatch.created_at,
          is_published: true,
          question_count: qMatch.question_count
        };

        const storedQuestions = getStoredQuestions().filter(q => q.test_id === testId);
        if (storedQuestions.length === 0) {
          const qs = getDefaultQuizQuestions(testId, test.subject, test.class);
          const currentQs = getStoredQuestions();
          currentQs.push(...qs);
          safeStorage.setItem(LOCAL_TEACHER_QUESTIONS_KEY, JSON.stringify(currentQs));
        }
      }
    }
    if (!test) throw new Error('Test not found.');

    const submissions = getStoredSubmissions();
    let sub = submissions.find(s => s.test_id === testId && s.student_id === student.id);
    validateEligibility(test, sub);

    if (!sub) {
      sub = {
        id: `tt-sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        test_id: testId,
        student_id: student.id,
        student_name: student.name,
        answers: {},
        score: 0,
        total_marks: test.total_marks,
        status: 'in_progress',
        started_at: new Date().toISOString()
      };
      submissions.push(sub);
      saveStoredSubmissions(submissions);
    }

    const allQuestions = getStoredQuestions().filter(q => q.test_id === testId);

    // SECURITY: Sanitize questions by stripping correct_answer
    const sanitizedQuestions = allQuestions.map(q => ({
      id: q.id,
      class: test.class,
      subject: (test.subject as any) || 'gk',
      chapter: 'Teacher Assigned Test',
      type: 'mcq' as const,
      difficulty: 'medium' as const,
      question: q.question,
      options: q.options,
      marks: q.marks
    }));

    return {
      attemptId: sub.id,
      startedAt: sub.started_at,
      durationMinutes: test.duration_minutes,
      negativeMarking: false,
      title: `${test.title} (${test.teacher_name})`,
      questions: sanitizedQuestions,
      passages: [],
      savedProgress: Object.entries(sub.answers || {}).reduce((acc: any, [qid, val]) => {
        acc[qid] = { response: val, timeSpentSeconds: 0 };
        return acc;
      }, {}),
      isTeacherTest: true,
      teacherTestId: test.id
    };
  }

  // Supabase Online Path
  try {
    const { data: test, error: tErr } = await supabase
      .from('teacher_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (tErr || !test) throw new Error('Test not found.');

    const { data: existingSubs } = await supabase
      .from('teacher_test_submissions')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', student.id);

    const existingSub = existingSubs?.[0];
    validateEligibility(test, existingSub);

    let subId = existingSub?.id;
    let startedAt = existingSub?.started_at || new Date().toISOString();

    if (!existingSub) {
      const { data: newSub, error: insErr } = await supabase
        .from('teacher_test_submissions')
        .insert({
          test_id: testId,
          student_id: student.id,
          answers: {},
          score: 0,
          status: 'in_progress',
          started_at: startedAt
        })
        .select()
        .single();

      if (insErr) throw insErr;
      subId = newSub.id;
    }

    // Fetch questions without correct_answer column
    const { data: questions, error: qErr } = await supabase
      .from('teacher_test_questions')
      .select('id, question, options, marks')
      .eq('test_id', testId);

    if (qErr) throw qErr;

    const sanitizedQuestions = (questions || []).map(q => ({
      id: q.id,
      class: test.class,
      subject: (test.subject as any) || 'gk',
      chapter: 'Teacher Assigned Test',
      type: 'mcq' as const,
      difficulty: 'medium' as const,
      question: q.question,
      options: q.options,
      marks: q.marks
    }));

    return {
      attemptId: subId!,
      startedAt,
      durationMinutes: test.duration_minutes,
      negativeMarking: false,
      title: `${test.title} (${test.teacher_name})`,
      questions: sanitizedQuestions,
      passages: [],
      savedProgress: Object.entries(existingSub?.answers || {}).reduce((acc: any, [qid, val]) => {
        acc[qid] = { response: val, timeSpentSeconds: 0 };
        return acc;
      }, {}),
      isTeacherTest: true,
      teacherTestId: test.id
    };
  } catch (err: any) {
    console.warn('Falling back to local startTeacherTest:', err);
    // Graceful offline fallback
    const tests = getStoredTests();
    let test = tests.find(t => t.id === testId);
    if (!test) {
      const teacherQuizzes = getStoredPublishedTeacherQuizzes(normalizeClass(student.class));
      const qMatch = teacherQuizzes.find(q => q.id === testId);
      if (qMatch) {
        test = {
          id: qMatch.id,
          title: qMatch.title,
          subject: qMatch.subject,
          class: qMatch.class,
          teacher_id: qMatch.teacher_id,
          teacher_name: qMatch.teacher_name,
          duration_minutes: qMatch.duration_minutes,
          total_marks: qMatch.total_marks,
          due_at: qMatch.due_at,
          created_at: qMatch.created_at,
          is_published: true,
          question_count: qMatch.question_count
        };

        const storedQuestions = getStoredQuestions().filter(q => q.test_id === testId);
        if (storedQuestions.length === 0) {
          const qs = getDefaultQuizQuestions(testId, test.subject, test.class);
          const currentQs = getStoredQuestions();
          currentQs.push(...qs);
          safeStorage.setItem(LOCAL_TEACHER_QUESTIONS_KEY, JSON.stringify(currentQs));
        }
      }
    }
    if (!test) throw new Error(err.message || 'Test not found.');

    const submissions = getStoredSubmissions();
    let sub = submissions.find(s => s.test_id === testId && s.student_id === student.id);
    validateEligibility(test, sub);

    if (!sub) {
      sub = {
        id: `tt-sub-${Date.now()}`,
        test_id: testId,
        student_id: student.id,
        student_name: student.name,
        answers: {},
        score: 0,
        total_marks: test.total_marks,
        status: 'in_progress',
        started_at: new Date().toISOString()
      };
      submissions.push(sub);
      saveStoredSubmissions(submissions);
    }

    const allQuestions = getStoredQuestions().filter(q => q.test_id === testId);
    const sanitizedQuestions = allQuestions.map(q => ({
      id: q.id,
      class: test.class,
      subject: (test.subject as any) || 'gk',
      chapter: 'Teacher Assigned Test',
      type: 'mcq' as const,
      difficulty: 'medium' as const,
      question: q.question,
      options: q.options,
      marks: q.marks
    }));

    return {
      attemptId: sub.id,
      startedAt: sub.started_at,
      durationMinutes: test.duration_minutes,
      negativeMarking: false,
      title: `${test.title} (${test.teacher_name})`,
      questions: sanitizedQuestions,
      passages: [],
      savedProgress: {},
      isTeacherTest: true,
      teacherTestId: test.id
    };
  }
}

/**
 * 3. Save progress during test
 */
export async function saveTeacherTestProgress(
  submissionId: string,
  questionId: string,
  answer: any
): Promise<{ saved: boolean }> {
  if (!isSupabaseConfigured) {
    const subs = getStoredSubmissions();
    const sub = subs.find(s => s.id === submissionId);
    if (sub && sub.status === 'in_progress') {
      sub.answers = { ...(sub.answers || {}), [questionId]: answer };
      saveStoredSubmissions(subs);
    }
    return { saved: true };
  }

  try {
    const { data: sub } = await supabase
      .from('teacher_test_submissions')
      .select('answers, status')
      .eq('id', submissionId)
      .single();

    if (sub && sub.status === 'in_progress') {
      const updated = { ...(sub.answers || {}), [questionId]: answer };
      await supabase
        .from('teacher_test_submissions')
        .update({ answers: updated })
        .eq('id', submissionId);
    }
    return { saved: true };
  } catch {
    return { saved: false };
  }
}

/**
 * 4. Submit a Teacher Test
 * Secure grading: calculates score based on authoritative correct answers.
 * If isAbrupt is true (violation triggered), score = 0 and status = 'abrupt'.
 */
export async function submitTeacherTest(
  testId: string,
  submissionId: string,
  answers: Record<string, any>,
  isAbrupt = false
): Promise<SubmitAttemptResponse> {
  const submittedAt = new Date().toISOString();

  // Offline grading logic
  const gradeOffline = () => {
    const questions = getStoredQuestions().filter(q => q.test_id === testId);
    const tests = getStoredTests();
    const test = tests.find(t => t.id === testId);
    const totalMarks = test?.total_marks || questions.reduce((sum, q) => sum + q.marks, 0);

    let score = 0;
    const review: any[] = [];

    questions.forEach(q => {
      const studentAns = answers[q.id];
      const correctIdx = q.correct_answer;
      // student answer could be option index or option string
      let isCorrect = false;
      if (typeof studentAns === 'number') {
        isCorrect = studentAns === correctIdx;
      } else if (typeof studentAns === 'string' && correctIdx !== undefined) {
        isCorrect = studentAns === q.options[correctIdx];
      }

      const awardedMarks = (!isAbrupt && isCorrect) ? q.marks : 0;
      score += awardedMarks;

      review.push({
        questionId: q.id,
        question: q.question,
        type: 'mcq' as const,
        userResponse: studentAns ?? null,
        correctAnswer: q.options[correctIdx || 0],
        isCorrect: !isAbrupt && isCorrect,
        marksAwarded: awardedMarks,
        marks: q.marks,
        explanation: `Correct option: ${q.options[correctIdx || 0]}`
      });
    });

    if (isAbrupt) {
      score = 0;
    }

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const status: 'submitted' | 'abrupt' = isAbrupt ? 'abrupt' : 'submitted';

    // Update stored submission
    const subs = getStoredSubmissions();
    const subIndex = subs.findIndex(s => s.id === submissionId);
    if (subIndex >= 0) {
      subs[subIndex].answers = answers;
      subs[subIndex].score = score;
      subs[subIndex].total_marks = totalMarks;
      subs[subIndex].status = status;
      subs[subIndex].submitted_at = submittedAt;
    } else {
      subs.push({
        id: submissionId,
        test_id: testId,
        student_id: 'offline-student',
        answers,
        score,
        total_marks: totalMarks,
        status,
        started_at: new Date(Date.now() - 300000).toISOString(),
        submitted_at: submittedAt
      });
    }
    saveStoredSubmissions(subs);

    return {
      attemptId: submissionId,
      status: status as 'submitted' | 'timed_out' | 'abrupt',
      score,
      total: totalMarks,
      percentage,
      timeTakenSeconds: 300,
      submittedAt,
      answersVisible: true,
      review
    };
  };

  if (!isSupabaseConfigured) {
    return gradeOffline();
  }

  try {
    // 1. Fetch authoritative questions with correct_answer for grading
    const { data: questions, error: qErr } = await supabase
      .from('teacher_test_questions')
      .select('id, question, options, correct_answer, marks')
      .eq('test_id', testId);

    if (qErr || !questions) throw qErr || new Error('Questions not found.');

    const { data: test } = await supabase
      .from('teacher_tests')
      .select('total_marks')
      .eq('id', testId)
      .single();

    const totalMarks = test?.total_marks || questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

    let score = 0;
    const review: any[] = [];

    questions.forEach((q: any) => {
      const studentAns = answers[q.id];
      const correctIdx = q.correct_answer;
      let isCorrect = false;
      if (typeof studentAns === 'number') {
        isCorrect = studentAns === correctIdx;
      } else if (typeof studentAns === 'string' && correctIdx !== undefined) {
        isCorrect = studentAns === q.options[correctIdx];
      }

      const awardedMarks = (!isAbrupt && isCorrect) ? (q.marks || 1) : 0;
      score += awardedMarks;

      review.push({
        questionId: q.id,
        question: q.question,
        type: 'mcq' as const,
        userResponse: studentAns ?? null,
        correctAnswer: q.options[correctIdx || 0],
        isCorrect: !isAbrupt && isCorrect,
        marksAwarded: awardedMarks,
        marks: q.marks || 1,
        explanation: `Correct option: ${q.options[correctIdx || 0]}`
      });
    });

    if (isAbrupt) {
      score = 0;
    }

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const finalStatus: 'submitted' | 'abrupt' = isAbrupt ? 'abrupt' : 'submitted';

    // 2. Persist submission update in Supabase
    const { error: updErr } = await supabase
      .from('teacher_test_submissions')
      .update({
        answers,
        score,
        status: finalStatus,
        submitted_at: submittedAt
      })
      .eq('id', submissionId);

    if (updErr) throw updErr;

    return {
      attemptId: submissionId,
      status: finalStatus as 'submitted' | 'timed_out' | 'abrupt',
      score,
      total: totalMarks,
      percentage,
      timeTakenSeconds: 300,
      submittedAt,
      answersVisible: true,
      review
    };
  } catch (err) {
    console.warn('Falling back to local grading due to error:', err);
    return gradeOffline();
  }
}

/**
 * 5. Create and Assign Test (Teacher Portal)
 */
export async function createTeacherTest(
  input: CreateTeacherTestInput,
  teacher: { id: string; name: string }
): Promise<TeacherTest> {
  const totalMarks = input.questions.reduce((sum, q) => sum + Number(q.marks || 1), 0);
  const testId = `tt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = new Date().toISOString();

  const newTest: TeacherTest = {
    id: testId,
    title: input.title.trim(),
    subject: input.subject.toLowerCase(),
    class: input.class,
    teacher_id: teacher.id,
    teacher_name: teacher.name,
    duration_minutes: Number(input.duration_minutes) || 30,
    total_marks: totalMarks,
    due_at: new Date(input.due_at).toISOString(),
    created_at: createdAt,
    is_published: input.is_published,
    question_count: input.questions.length
  };

  const newQuestions: TeacherTestQuestion[] = input.questions.map((q, idx) => ({
    id: `ttq-${testId}-${idx + 1}`,
    test_id: testId,
    question: q.question.trim(),
    options: q.options.map(o => o.trim()),
    correct_answer: Number(q.correct_answer),
    marks: Number(q.marks || 1)
  }));

  if (!isSupabaseConfigured) {
    // Save to local storage
    const tests = getStoredTests();
    tests.unshift(newTest);
    safeStorage.setItem(LOCAL_TEACHER_TESTS_KEY, JSON.stringify(tests));

    const questions = getStoredQuestions();
    questions.push(...newQuestions);
    safeStorage.setItem(LOCAL_TEACHER_QUESTIONS_KEY, JSON.stringify(questions));

    if (newTest.is_published) {
      notifyTestPublished(newTest);
    }

    return newTest;
  }

  try {
    const { data: testData, error: tErr } = await supabase
      .from('teacher_tests')
      .insert({
        title: newTest.title,
        subject: newTest.subject,
        class: newTest.class,
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        duration_minutes: newTest.duration_minutes,
        total_marks: newTest.total_marks,
        due_at: newTest.due_at,
        is_published: newTest.is_published
      })
      .select()
      .single();

    if (tErr) throw tErr;

    const insertedTestId = testData.id;

    const questionsToInsert = newQuestions.map(q => ({
      test_id: insertedTestId,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      marks: q.marks
    }));

    const { error: qErr } = await supabase
      .from('teacher_test_questions')
      .insert(questionsToInsert);

    if (qErr) throw qErr;

    const publishedTest: TeacherTest = {
      ...newTest,
      id: insertedTestId
    };

    if (publishedTest.is_published) {
      notifyTestPublished(publishedTest);
    }

    return publishedTest;
  } catch (err) {
    console.warn('Falling back to local storage for test creation:', err);
    const tests = getStoredTests();
    tests.unshift(newTest);
    safeStorage.setItem(LOCAL_TEACHER_TESTS_KEY, JSON.stringify(tests));

    const questions = getStoredQuestions();
    questions.push(...newQuestions);
    safeStorage.setItem(LOCAL_TEACHER_QUESTIONS_KEY, JSON.stringify(questions));

    if (newTest.is_published) {
      notifyTestPublished(newTest);
    }

    return newTest;
  }
}

/**
 * 6. Get all tests created by a teacher
 */
export async function getTeacherTestsForTeacher(teacherId: string): Promise<TeacherTest[]> {
  if (!isSupabaseConfigured) {
    const tests = getStoredTests();
    return tests.filter(t => !t.id.startsWith('demo-tt-') && (t.teacher_id === teacherId || t.teacher_id === 'mock-teacher-id' || teacherId.startsWith('teacher-')));
  }

  try {
    const { data, error } = await supabase
      .from('teacher_tests')
      .select('*, teacher_test_questions(count)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((t: any) => ({
      ...t,
      question_count: t.teacher_test_questions?.[0]?.count || 0
    }));
  } catch {
    const tests = getStoredTests();
    return tests.filter(t => !t.id.startsWith('demo-tt-') && (t.teacher_id === teacherId || t.teacher_id === 'mock-teacher-id' || teacherId.startsWith('teacher-')));
  }
}

/**
 * 7. Get submissions/results for a test (Teacher Portal)
 */
export async function getTeacherTestResults(testId: string): Promise<TeacherTestSubmissionRow[]> {
  if (!isSupabaseConfigured) {
    const subs = getStoredSubmissions().filter(s => s.test_id === testId);
    return subs.map(s => ({
      id: s.id,
      test_id: s.test_id,
      student_id: s.student_id,
      student_name: s.student_name || `Student (${s.student_id})`,
      student_class: 9,
      score: s.score,
      total_marks: s.total_marks,
      status: s.status,
      started_at: s.started_at,
      submitted_at: s.submitted_at
    }));
  }

  try {
    const { data, error } = await supabase
      .from('teacher_test_submissions')
      .select(`
        id,
        test_id,
        student_id,
        score,
        status,
        started_at,
        submitted_at,
        students (name, class),
        teacher_tests (total_marks)
      `)
      .eq('test_id', testId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      test_id: row.test_id,
      student_id: row.student_id,
      student_name: row.students?.name || `Student ${row.student_id}`,
      student_class: row.students?.class || 9,
      score: row.score || 0,
      total_marks: row.teacher_tests?.total_marks || 0,
      status: row.status,
      started_at: row.started_at,
      submitted_at: row.submitted_at
    }));
  } catch (err) {
    console.warn('Fallback to local results for test:', testId, err);
    const subs = getStoredSubmissions().filter(s => s.test_id === testId);
    return subs.map(s => ({
      id: s.id,
      test_id: s.test_id,
      student_id: s.student_id,
      student_name: s.student_name || `Student (${s.student_id})`,
      student_class: 9,
      score: s.score,
      total_marks: s.total_marks,
      status: s.status,
      started_at: s.started_at,
      submitted_at: s.submitted_at
    }));
  }
}

/**
 * 8. Retrieve a specific submission for viewing results
 */
export async function getTeacherTestSubmissionResult(
  testId: string,
  submissionId: string
): Promise<SubmitAttemptResponse | null> {
  const tests = getStoredTests();
  const test = tests.find(t => t.id === testId);
  const questions = getStoredQuestions().filter(q => q.test_id === testId);
  const subs = getStoredSubmissions();
  const sub = subs.find(s => s.id === submissionId || s.test_id === testId);

  if (!sub) return null;

  const totalMarks = sub.total_marks || test?.total_marks || questions.reduce((acc, q) => acc + q.marks, 0);
  const percentage = totalMarks > 0 ? Math.round((sub.score / totalMarks) * 100) : 0;

  const review = questions.map(q => {
    const studentAns = sub.answers?.[q.id];
    const correctIdx = q.correct_answer;
    let isCorrect = false;
    if (typeof studentAns === 'number') {
      isCorrect = studentAns === correctIdx;
    } else if (typeof studentAns === 'string' && correctIdx !== undefined) {
      isCorrect = studentAns === q.options[correctIdx];
    }

    return {
      questionId: q.id,
      question: q.question,
      type: 'mcq' as const,
      userResponse: studentAns ?? null,
      correctAnswer: q.options[correctIdx || 0],
      isCorrect: sub.status !== 'abrupt' && isCorrect,
      marksAwarded: (sub.status !== 'abrupt' && isCorrect) ? q.marks : 0,
      marks: q.marks,
      explanation: `Correct option: ${q.options[correctIdx || 0]}`
    };
  });

  const finalStatus = (sub.status === 'in_progress' ? 'submitted' : sub.status) as 'submitted' | 'timed_out' | 'abrupt';

  return {
    attemptId: sub.id,
    status: finalStatus,
    score: sub.score,
    total: totalMarks,
    percentage,
    timeTakenSeconds: 300,
    submittedAt: sub.submitted_at || sub.started_at,
    answersVisible: true,
    review
  };
}
