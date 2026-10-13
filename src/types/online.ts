import { QuestionType, Difficulty, SubjectId, ImageAttachment } from './quiz';

export interface Student {
  id: string;
  name: string;
  class: 9 | 10 | 11 | 12;
  active: boolean;
  createdAt?: string;
}

export interface StudentSession {
  token: string;
  student: {
    id: string;
    name: string;
    class: 9 | 10 | 11 | 12;
  };
}

export interface OnlinePassage {
  id: string;
  class: 9 | 10 | 11 | 12;
  subject: SubjectId;
  kind: 'gadya' | 'padya';
  content: string; // paragraphs or verses
  theme?: string;
  wordCount?: number;
}

export interface SanitizedOnlineQuestion {
  id: string;
  class: 9 | 10 | 11 | 12;
  subject: SubjectId;
  chapter: string;
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  options?: string[];
  image?: ImageAttachment;
  unit?: string;
  hint?: string;
  marks: number;
  pairsLeft?: string[];
  pairsRightShuffled?: string[];
  itemsShuffled?: string[];
  passageId?: string;
  passageOrder?: number;
}

export interface StaffProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher';
  active: boolean;
  must_change_password: boolean;
  assignedClasses?: (9 | 10 | 11 | 12 | string)[];
}

export interface TeacherClass {
  id?: number;
  teacher_id: string;
  class: string;
  created_at?: string;
}

export interface AuditLogEntry {
  id: number;
  actor_id: string;
  actor_role: 'admin' | 'teacher' | 'student' | 'system';
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  created_at: string;
}

export interface OnlineQuiz {
  id: string;
  title: string;
  description?: string;
  class: 9 | 10 | 11 | 12;
  status: 'draft' | 'published' | 'closed';
  duration_minutes: number;
  negative_marking: boolean;
  shuffle: boolean;
  show_answers_after: 'submit' | 'close' | 'never';
  opens_at?: string | null;
  closes_at?: string | null;
  max_attempts: number;
  created_at: string;
  question_count?: number;
  total_marks?: number;
  owner_id?: string;
  owner_name?: string;
}

export interface OnlineAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  status: 'in_progress' | 'submitted' | 'timed_out';
  started_at: string;
  submitted_at?: string | null;
  score?: number | null;
  total?: number | null;
  time_taken_seconds?: number | null;
  student_name?: string;
  student_class?: number;
  quiz_title?: string;
}

export interface AttemptReviewItem {
  questionId: string;
  type: QuestionType;
  marks: number;
  marksAwarded: number;
  isCorrect: boolean;
  userResponse: any;
  feedback?: string;
  correctAnswer?: any;
  acceptedAnswers?: string[];
  explanation?: string;
}

export interface StartAttemptResponse {
  attemptId: string;
  startedAt: string;
  durationMinutes: number;
  negativeMarking: boolean;
  title: string;
  questions: SanitizedOnlineQuestion[];
  passages: OnlinePassage[];
  savedProgress: Record<string, { response: any; timeSpentSeconds: number }>;
}

export interface SubmitAttemptResponse {
  attemptId: string;
  status: 'submitted' | 'timed_out';
  score: number;
  total: number;
  percentage: number;
  timeTakenSeconds: number;
  submittedAt: string;
  answersVisible: boolean;
  review: AttemptReviewItem[];
}
