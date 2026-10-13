import { supabase, isSupabaseConfigured } from './supabase';
import { OnlineQuiz, OnlineAttempt } from '../types/online';

export interface QuizResultsOverview {
  quiz: OnlineQuiz;
  totalStudentsInClass: number;
  attempts: OnlineAttempt[];
  submittedCount: number;
  inProgressCount: number;
  timedOutCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  maxPossibleScore: number;
  averageTimeSeconds: number;
  scoreBuckets: {
    '0-40%': number;
    '41-60%': number;
    '61-80%': number;
    '81-100%': number;
  };
}

export interface DetailedStudentAttempt {
  attempt: OnlineAttempt;
  answers: {
    questionId: string;
    questionText: string;
    questionType: string;
    userResponse: any;
    correctAnswer?: any;
    isCorrect: boolean;
    marksAwarded: number;
    maxMarks: number;
    explanation?: string;
    timeSpentSeconds: number;
  }[];
}

/**
 * Fetch complete results overview for a given quiz
 */
export async function getQuizResultsOverview(quizId: string): Promise<QuizResultsOverview> {
  if (!isSupabaseConfigured) {
    // Offline Mock Overview
    const mockQuiz: OnlineQuiz = {
      id: quizId,
      title: 'कक्षा 9 - सामान्य ज्ञान व विज्ञान आवधिक टेस्ट',
      class: 9,
      status: 'published',
      duration_minutes: 25,
      negative_marking: true,
      shuffle: true,
      show_answers_after: 'submit',
      max_attempts: 1,
      created_at: new Date().toISOString()
    };

    const mockAttempts: OnlineAttempt[] = [
      {
        id: 'att-1',
        quiz_id: quizId,
        student_id: 's1',
        status: 'submitted',
        started_at: new Date(Date.now() - 1800000).toISOString(),
        submitted_at: new Date(Date.now() - 600000).toISOString(),
        score: 18,
        total: 20,
        time_taken_seconds: 1200,
        student_name: 'Aarav Sharma',
        student_class: 9
      },
      {
        id: 'att-2',
        quiz_id: quizId,
        student_id: 's2',
        status: 'submitted',
        started_at: new Date(Date.now() - 2000000).toISOString(),
        submitted_at: new Date(Date.now() - 1100000).toISOString(),
        score: 15,
        total: 20,
        time_taken_seconds: 900,
        student_name: 'Ananya Verma',
        student_class: 9
      },
      {
        id: 'att-3',
        quiz_id: quizId,
        student_id: 's3',
        status: 'in_progress',
        started_at: new Date(Date.now() - 400000).toISOString(),
        student_name: 'Ishaan Patel',
        student_class: 9
      }
    ];

    return {
      quiz: mockQuiz,
      totalStudentsInClass: 10,
      attempts: mockAttempts,
      submittedCount: 2,
      inProgressCount: 1,
      timedOutCount: 0,
      averageScore: 16.5,
      highestScore: 18,
      lowestScore: 15,
      maxPossibleScore: 20,
      averageTimeSeconds: 1050,
      scoreBuckets: {
        '0-40%': 0,
        '41-60%': 0,
        '61-80%': 1,
        '81-100%': 1
      }
    };
  }

  // 1. Fetch quiz
  const { data: quiz, error: qErr } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .single();

  if (qErr || !quiz) {
    throw new Error('प्रश्नोत्तरी (Quiz) नहीं मिली।');
  }

  // 2. Count active students in class
  const { count: studentCount } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('class', quiz.class)
    .eq('active', true);

  // 3. Fetch all attempts for this quiz
  const { data: attemptsData, error: attErr } = await supabase
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
    .order('submitted_at', { ascending: false });

  if (attErr) throw attErr;

  const attempts: OnlineAttempt[] = (attemptsData || []).map((a: any) => ({
    id: a.id,
    quiz_id: a.quiz_id,
    student_id: a.student_id,
    status: a.status,
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    score: a.score,
    total: a.total,
    time_taken_seconds: a.time_taken_seconds,
    student_name: a.students?.name || 'अज्ञात विद्यार्थी',
    student_class: a.students?.class || quiz.class,
    quiz_title: quiz.title
  }));

  const submittedAttempts = attempts.filter(a => a.status === 'submitted');
  const submittedCount = submittedAttempts.length;
  const inProgressCount = attempts.filter(a => a.status === 'in_progress').length;
  const timedOutCount = attempts.filter(a => a.status === 'timed_out').length;

  let totalScoreSum = 0;
  let highestScore = 0;
  let lowestScore = submittedCount > 0 ? (submittedAttempts[0].score || 0) : 0;
  let maxPossibleScore = 0;
  let totalTimeSum = 0;

  const scoreBuckets = {
    '0-40%': 0,
    '41-60%': 0,
    '61-80%': 0,
    '81-100%': 0
  };

  submittedAttempts.forEach(att => {
    const s = att.score || 0;
    const t = att.total || 0;
    if (t > maxPossibleScore) maxPossibleScore = t;
    totalScoreSum += s;
    if (s > highestScore) highestScore = s;
    if (s < lowestScore) lowestScore = s;
    totalTimeSum += att.time_taken_seconds || 0;

    const pct = t > 0 ? (s / t) * 100 : 0;
    if (pct <= 40) scoreBuckets['0-40%']++;
    else if (pct <= 60) scoreBuckets['41-60%']++;
    else if (pct <= 80) scoreBuckets['61-80%']++;
    else scoreBuckets['81-100%']++;
  });

  const averageScore = submittedCount > 0 ? Math.round((totalScoreSum / submittedCount) * 10) / 10 : 0;
  const averageTimeSeconds = submittedCount > 0 ? Math.round(totalTimeSum / submittedCount) : 0;

  return {
    quiz,
    totalStudentsInClass: studentCount || 0,
    attempts,
    submittedCount,
    inProgressCount,
    timedOutCount,
    averageScore,
    highestScore,
    lowestScore,
    maxPossibleScore,
    averageTimeSeconds,
    scoreBuckets
  };
}

/**
 * Subscribe to realtime updates for attempts on a quiz
 */
export function subscribeToQuizAttempts(
  quizId: string,
  onUpdate: () => void
): () => void {
  if (!isSupabaseConfigured) {
    return () => {};
  }

  const channel = supabase
    .channel(`quiz-attempts-${quizId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attempts',
        filter: `quiz_id=eq.${quizId}`
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetch detailed attempt breakdown with answers
 */
export async function getAttemptDetail(attemptId: string): Promise<DetailedStudentAttempt> {
  if (!isSupabaseConfigured) {
    return {
      attempt: {
        id: attemptId,
        quiz_id: 'mock-quiz',
        student_id: 's1',
        status: 'submitted',
        started_at: new Date().toISOString(),
        score: 1,
        total: 1,
        student_name: 'Aarav Sharma'
      },
      answers: [
        {
          questionId: 'mock-q1',
          questionText: 'भारत की राजधानी क्या है?',
          questionType: 'mcq',
          userResponse: 1,
          correctAnswer: 1,
          isCorrect: true,
          marksAwarded: 1,
          maxMarks: 1,
          explanation: 'नई दिल्ली भारत की आधिकारिक राजधानी है।',
          timeSpentSeconds: 15
        }
      ]
    };
  }

  const { data: attempt, error: aErr } = await supabase
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
      students (name, class),
      quizzes (title)
    `)
    .eq('id', attemptId)
    .single();

  if (aErr || !attempt) throw new Error('Attempt not found');

  const { data: answersData, error: ansErr } = await supabase
    .from('attempt_answers')
    .select(`
      question_id,
      response,
      is_correct,
      partial_score,
      marks_awarded,
      time_spent_seconds,
      questions_public (type, question, marks)
    `)
    .eq('attempt_id', attemptId);

  if (ansErr) throw ansErr;

  const answers = (answersData || []).map((ans: any) => ({
    questionId: ans.question_id,
    questionText: ans.questions_public?.question || '',
    questionType: ans.questions_public?.type || 'mcq',
    userResponse: ans.response,
    isCorrect: Boolean(ans.is_correct),
    marksAwarded: ans.marks_awarded ?? (ans.is_correct ? (ans.questions_public?.marks || 1) : 0),
    maxMarks: ans.questions_public?.marks || 1,
    timeSpentSeconds: ans.time_spent_seconds || 0
  }));

  return {
    attempt: {
      id: attempt.id,
      quiz_id: attempt.quiz_id,
      student_id: attempt.student_id,
      status: attempt.status,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
      score: attempt.score,
      total: attempt.total,
      time_taken_seconds: attempt.time_taken_seconds,
      student_name: (attempt.students as any)?.name || 'विद्यार्थी',
      student_class: (attempt.students as any)?.class,
      quiz_title: (attempt.quizzes as any)?.title
    },
    answers
  };
}

/**
 * Format CSV of quiz results for download
 */
export function formatQuizResultsCSV(overview: QuizResultsOverview): string {
  const headers = [
    'Roll/Student ID',
    'Student Name',
    'Class',
    'Status',
    'Score',
    'Max Marks',
    'Percentage (%)',
    'Time Taken (Min)',
    'Started At',
    'Submitted At'
  ];

  const rows = overview.attempts.map(att => {
    const s = att.score ?? 0;
    const t = att.total || overview.maxPossibleScore || 1;
    const pct = t > 0 ? Math.round((s / t) * 1000) / 10 : 0;
    const mins = att.time_taken_seconds ? Math.round((att.time_taken_seconds / 60) * 10) / 10 : 0;

    return [
      `"${att.student_id}"`,
      `"${att.student_name || ''}"`,
      att.student_class || overview.quiz.class,
      `"${att.status}"`,
      s,
      t,
      `${pct}%`,
      mins,
      `"${att.started_at}"`,
      `"${att.submitted_at || ''}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
