export type QuestionType =
  | 'mcq'
  | 'truefalse'
  | 'fillblank'
  | 'match'
  | 'numerical'
  | 'image'
  | 'short'
  | 'logic'
  | 'multiselect'
  | 'ordering';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type SubjectId =
  | 'gk'
  | 'maths'
  | 'hindi'
  | 'english'
  | 'cs'
  | 'physics'
  | 'chemistry'
  | 'biology';

export interface ImageAttachment {
  kind: 'svg' | 'data-url';
  src: string;
  alt?: string;
  caption?: string;
}

export interface Passage {
  id: string; // e.g. "c9-hindi-p01"
  class: 9 | 10 | 11 | 12;
  subject: SubjectId;
  kind: 'gadya' | 'padya';
  title: string; // teacher-only, NEVER shown to students
  text: string; // paragraphs separated by \n\n; poems = one line per \n
  wordCount: number;
  theme: string;
}

export interface Question {
  id: string;
  class: 9 | 10 | 11 | 12;
  subject: SubjectId;
  chapter: string;
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  options?: string[]; // mcq, multiselect, image (if MCQ-style), logic
  answer: number | boolean | string | number[]; // index (mcq), bool (truefalse), text/num (fill/numerical/short), indices (multiselect)
  acceptedAnswers?: string[]; // fillblank, short, numerical alternate forms
  keywords?: string[]; // short answer: keywords for lenient checking
  pairs?: [string, string][]; // match: [left, right] pairs
  orderedItems?: string[]; // ordering: stored in CORRECT order
  image?: ImageAttachment; // inline SVG or data-URL
  tolerance?: number; // numerical tolerance, e.g. 0.01
  unit?: string; // numerical unit, e.g. "cm²", "m/s"
  explanation: string;
  marks: number;
  volatile?: boolean;
  hint?: string; // especially for logic questions
  // Passage link (for unseen passages)
  passageId?: string;
  passageOrder?: number; // 1..5
  passage?: Passage;
  // User overlay flags (stored in IndexedDB overlay)
  isUserAdded?: boolean;
  isUserEdited?: boolean;
  isUserDeleted?: boolean;
  isHidden?: boolean;
}

export type QuizTimerMode = 'none' | 'per-question' | 'whole-quiz';
export type QuizMode = 'practice' | 'exam';

export interface QuizConfig {
  selectedClass: 9 | 10 | 11 | 12;
  selectedSubjects: SubjectId[];
  selectedChapters: string[];
  typeCounts: Record<QuestionType, number>;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  totalQuestions: number;
  timerMode: QuizTimerMode;
  timerSeconds: number; // either per question or total
  shuffleQuestions: boolean;
  negativeMarking: boolean; // 0.25 marks penalty per wrong
  quizMode: QuizMode; // practice (instant feedback) vs exam (feedback at end)
  includePassages?: boolean; // include unseen passages for Hindi
  passageCount?: number; // requested number of passages (groups of 5 questions)
}


export interface UserAnswer {
  questionId: string;
  answer: any; // index, string, pairs, ordered indices, etc.
  isCorrect: boolean;
  partialScore?: number; // 0 to 1
  timeSpentSeconds: number;
  isFlagged: boolean;
  isSkipped: boolean;
  selfGradedCorrect?: boolean;
  hintUsed?: boolean;
}

export interface QuizResult {
  id: string;
  timestamp: number;
  config: QuizConfig;
  totalQuestions: number;
  attemptedQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  score: number;
  maxScore: number;
  accuracyPercentage: number;
  totalTimeSpentSeconds: number;
  userAnswers: Record<string, UserAnswer>;
  questionList: Question[];
  xpEarned: number;
  badgesUnlocked: string[];
  bankVersion?: string;
}

export interface QuizPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  configPartial: Partial<QuizConfig>;
}

export interface UserStats {
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  currentStreakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalXp: number;
  badges: string[];
  mistakeQuestionIds: string[]; // for "Retry My Mistakes" preset
  bookmarkedQuestionIds: string[];
}

export interface ActiveQuizSession {
  config: QuizConfig;
  questions: Question[];
  userAnswers: Record<string, UserAnswer>;
  currentIndex: number;
  totalTimeElapsed: number;
  timestamp: number;
}
