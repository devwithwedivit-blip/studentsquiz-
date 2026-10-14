export type TestStatus = 'new' | 'in_progress' | 'submitted' | 'expired';

export interface TeacherTest {
  id: string;
  title: string;
  subject: string;
  class: 9 | 10 | 11 | 12;
  teacher_id: string;
  teacher_name: string;
  duration_minutes: number;
  total_marks: number;
  due_at: string; // ISO string
  created_at: string;
  is_published: boolean;
  question_count?: number;
}

export interface TeacherTestQuestion {
  id: string;
  test_id: string;
  question: string;
  options: string[];
  correct_answer?: number; // 0, 1, 2, 3 (omitted for students before submission)
  marks: number;
}

export interface TeacherTestSubmission {
  id: string;
  test_id: string;
  student_id: string;
  student_name?: string;
  answers: Record<string, any>;
  score: number;
  total_marks: number;
  status: 'in_progress' | 'submitted' | 'abrupt' | 'timed_out';
  started_at: string;
  submitted_at?: string;
}

export interface TeacherTestCardItem {
  id: string;
  title: string;
  subject: string;
  class: 9 | 10 | 11 | 12;
  teacher_id: string;
  teacher_name: string;
  duration_minutes: number;
  total_marks: number;
  due_at: string;
  created_at: string;
  is_published: boolean;
  question_count: number;
  status: TestStatus;
  submission?: TeacherTestSubmission;
  isDueSoon: boolean; // due within 24 hours
}

export interface CreateTeacherTestQuestionInput {
  question: string;
  options: string[];
  correct_answer: number;
  marks: number;
}

export interface CreateTeacherTestInput {
  title: string;
  subject: string;
  class: 9 | 10 | 11 | 12;
  duration_minutes: number;
  due_at: string;
  is_published: boolean;
  questions: CreateTeacherTestQuestionInput[];
}

export interface TeacherTestSubmissionRow {
  id: string;
  test_id: string;
  student_id: string;
  student_name: string;
  student_class: number;
  score: number;
  total_marks: number;
  status: 'in_progress' | 'submitted' | 'abrupt' | 'timed_out';
  started_at: string;
  submitted_at?: string;
}
