-- ====================================================================
-- PHASE 10 MIGRATION: TEACHER TESTS & CLASS-SPECIFIC ASSIGNMENT SCHEMA
-- ====================================================================

-- 1. TEACHER_TESTS TABLE
CREATE TABLE IF NOT EXISTS public.teacher_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  class smallint NOT NULL CHECK (class IN (9, 10, 11, 12)),
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  total_marks integer NOT NULL DEFAULT 10 CHECK (total_marks >= 0),
  due_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_teacher_tests_class_published 
  ON public.teacher_tests(class, is_published, due_at);
CREATE INDEX IF NOT EXISTS idx_teacher_tests_teacher 
  ON public.teacher_tests(teacher_id);

-- 2. TEACHER_TEST_QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.teacher_test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.teacher_tests(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer smallint NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  marks integer NOT NULL DEFAULT 1 CHECK (marks > 0)
);

CREATE INDEX IF NOT EXISTS idx_teacher_test_questions_test 
  ON public.teacher_test_questions(test_id);

-- 3. TEACHER_TEST_SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.teacher_test_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.teacher_tests(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('in_progress', 'submitted', 'abrupt', 'timed_out')) DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  UNIQUE(test_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_test_submissions_lookup 
  ON public.teacher_test_submissions(test_id, student_id);

-- 4. SECURE VIEW FOR STUDENTS (OMITTING correct_answer)
CREATE OR REPLACE VIEW public.teacher_test_questions_student AS
  SELECT id, test_id, question, options, marks
  FROM public.teacher_test_questions;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.teacher_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_test_submissions ENABLE ROW LEVEL SECURITY;

-- Teacher Tests Policies:
-- Teachers can manage their own tests
DROP POLICY IF EXISTS "Teachers manage their own tests" ON public.teacher_tests;
CREATE POLICY "Teachers manage their own tests"
  ON public.teacher_tests
  FOR ALL
  TO authenticated
  USING (
    teacher_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students can read published tests for their own class
DROP POLICY IF EXISTS "Students read published tests for their class" ON public.teacher_tests;
CREATE POLICY "Students read published tests for their class"
  ON public.teacher_tests
  FOR SELECT
  TO public
  USING (
    is_published = true AND
    class = COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'class')::smallint,
      class
    )
  );

-- Teacher Test Questions Policies:
-- Teachers can manage questions for their tests
DROP POLICY IF EXISTS "Teachers manage test questions" ON public.teacher_test_questions;
CREATE POLICY "Teachers manage test questions"
  ON public.teacher_test_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_tests
      WHERE id = teacher_test_questions.test_id
        AND (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

-- Teacher Test Submissions Policies:
-- Students can insert and read their own submissions
DROP POLICY IF EXISTS "Students manage own submissions" ON public.teacher_test_submissions;
CREATE POLICY "Students manage own submissions"
  ON public.teacher_test_submissions
  FOR ALL
  TO public
  USING (
    student_id = COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'studentId'),
      student_id
    )
  );

-- Teachers can view submissions for tests they created
DROP POLICY IF EXISTS "Teachers view submissions for their tests" ON public.teacher_test_submissions;
CREATE POLICY "Teachers view submissions for their tests"
  ON public.teacher_test_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_tests
      WHERE id = teacher_test_submissions.test_id
        AND (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );
