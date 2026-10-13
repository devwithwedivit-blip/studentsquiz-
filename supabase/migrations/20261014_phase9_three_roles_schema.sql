-- ====================================================================
-- PHASE 9 MIGRATION: UNIFIED LOGIN + THREE ROLES (STUDENT / TEACHER / ADMIN)
-- ====================================================================

-- 1. PROFILES UPGRADE (admin | teacher)
UPDATE public.profiles SET role = 'teacher' WHERE role = 'viewer';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'teacher'));

-- 2. TEACHER_CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.teacher_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class smallint NOT NULL CHECK (class IN (9, 10, 11, 12)),
  created_at timestamptz DEFAULT now(),
  UNIQUE (teacher_id, class)
);

CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher ON public.teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class ON public.teacher_classes(class);

-- 3. STUDENTS UPGRADE
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. QUESTIONS SOFT-DELETE & OWNERSHIP UPGRADE
ALTER TABLE public.questions_public
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.question_answers
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_questions_public_deleted ON public.questions_public(is_deleted);
CREATE INDEX IF NOT EXISTS idx_questions_public_created_by ON public.questions_public(created_by);

-- 5. QUIZZES OWNERSHIP & SNAPSHOT UPGRADE
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_quizzes_owner ON public.quizzes(owner_id);

-- 6. AUDIT_LOG TABLE
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('admin', 'teacher', 'student', 'system')),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id, actor_role);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- ====================================================================
-- RLS HELPER FUNCTIONS
-- ====================================================================

-- Check if current authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND active = true
  ) OR (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current authenticated user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'teacher'
      AND active = true
  ) OR (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if teacher is assigned to a specific class
CREATE OR REPLACE FUNCTION public.is_teacher_for_class(target_class smallint)
RETURNS boolean AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.teacher_classes
    WHERE teacher_id = auth.uid()
      AND class = target_class
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to record audit log
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_id text,
  p_actor_role text,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO public.audit_log (
    actor_id, actor_role, action, target_type, target_id, details
  ) VALUES (
    p_actor_id, p_actor_role, p_action, p_target_type, p_target_id, p_details
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- RLS POLICIES (DROP EXISTING & RECREATE FOR PHASE 9)
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles_teacher_read_own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND active = true);

-- 2. TEACHER_CLASSES POLICIES
DROP POLICY IF EXISTS "teacher_classes_admin_all" ON public.teacher_classes;
DROP POLICY IF EXISTS "teacher_classes_read_own" ON public.teacher_classes;

CREATE POLICY "teacher_classes_admin_all" ON public.teacher_classes
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "teacher_classes_read_own" ON public.teacher_classes
  FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

-- 3. STUDENTS POLICIES
DROP POLICY IF EXISTS "students_admin_all" ON public.students;
DROP POLICY IF EXISTS "students_teacher_assigned" ON public.students;
DROP POLICY IF EXISTS "students_login_read" ON public.students;

CREATE POLICY "students_admin_all" ON public.students
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "students_teacher_select_assigned" ON public.students
  FOR SELECT
  TO authenticated
  USING (
    public.is_teacher() AND class IN (
      SELECT class FROM public.teacher_classes WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "students_teacher_insert_assigned" ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_teacher() AND class IN (
      SELECT class FROM public.teacher_classes WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "students_public_login_read" ON public.students
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- 4. QUESTIONS_PUBLIC POLICIES
DROP POLICY IF EXISTS "questions_public_select" ON public.questions_public;
DROP POLICY IF EXISTS "questions_public_admin_all" ON public.questions_public;
DROP POLICY IF EXISTS "questions_public_teacher_manage_own" ON public.questions_public;

CREATE POLICY "questions_public_admin_all" ON public.questions_public
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "questions_public_teacher_select" ON public.questions_public
  FOR SELECT
  TO authenticated
  USING (
    public.is_teacher() AND is_deleted = false
  );

CREATE POLICY "questions_public_teacher_insert" ON public.questions_public
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_teacher() AND created_by = auth.uid()
  );

CREATE POLICY "questions_public_teacher_modify_own" ON public.questions_public
  FOR UPDATE
  TO authenticated
  USING (
    public.is_teacher() AND created_by = auth.uid()
  )
  WITH CHECK (
    public.is_teacher() AND created_by = auth.uid()
  );

CREATE POLICY "questions_public_student_read" ON public.questions_public
  FOR SELECT
  TO anon, authenticated
  USING (is_deleted = false);

-- 5. QUESTION_ANSWERS (SERVICE ROLE ONLY)
DROP POLICY IF EXISTS "question_answers_service_only" ON public.question_answers;
-- (No policies granted = strictly accessible only by supabase service_role)

-- 6. QUIZZES POLICIES
DROP POLICY IF EXISTS "quizzes_admin_all" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_teacher_own" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_student_published" ON public.quizzes;

CREATE POLICY "quizzes_admin_all" ON public.quizzes
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "quizzes_teacher_own" ON public.quizzes
  FOR ALL
  TO authenticated
  USING (
    public.is_teacher() AND owner_id = auth.uid()
  )
  WITH CHECK (
    public.is_teacher() AND owner_id = auth.uid() AND (
      class IN (SELECT class FROM public.teacher_classes WHERE teacher_id = auth.uid())
    )
  );

CREATE POLICY "quizzes_student_published" ON public.quizzes
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published' AND class = public.current_student_class()
  );

-- 7. QUIZ_QUESTIONS POLICIES
DROP POLICY IF EXISTS "quiz_questions_admin_all" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_teacher_own" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_student_published" ON public.quiz_questions;

CREATE POLICY "quiz_questions_admin_all" ON public.quiz_questions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "quiz_questions_teacher_own" ON public.quiz_questions
  FOR ALL
  TO authenticated
  USING (
    quiz_id IN (SELECT id FROM public.quizzes WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    quiz_id IN (SELECT id FROM public.quizzes WHERE owner_id = auth.uid())
  );

CREATE POLICY "quiz_questions_student_published" ON public.quiz_questions
  FOR SELECT
  TO anon, authenticated
  USING (
    quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE status = 'published' AND class = public.current_student_class()
    )
  );

-- 8. ATTEMPTS & ATTEMPT_ANSWERS POLICIES
DROP POLICY IF EXISTS "attempts_admin_all" ON public.attempts;
DROP POLICY IF EXISTS "attempts_teacher_own" ON public.attempts;
DROP POLICY IF EXISTS "attempts_student_own" ON public.attempts;

CREATE POLICY "attempts_admin_all" ON public.attempts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "attempts_teacher_own_quizzes" ON public.attempts
  FOR SELECT
  TO authenticated
  USING (
    quiz_id IN (SELECT id FROM public.quizzes WHERE owner_id = auth.uid())
  );

CREATE POLICY "attempts_student_own" ON public.attempts
  FOR ALL
  TO anon, authenticated
  USING (student_id = public.current_student_id())
  WITH CHECK (student_id = public.current_student_id());

DROP POLICY IF EXISTS "attempt_answers_admin_all" ON public.attempt_answers;
DROP POLICY IF EXISTS "attempt_answers_teacher_own" ON public.attempt_answers;
DROP POLICY IF EXISTS "attempt_answers_student_own" ON public.attempt_answers;

CREATE POLICY "attempt_answers_admin_all" ON public.attempt_answers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "attempt_answers_teacher_own_quizzes" ON public.attempt_answers
  FOR SELECT
  TO authenticated
  USING (
    attempt_id IN (
      SELECT a.id FROM public.attempts a
      JOIN public.quizzes q ON a.quiz_id = q.id
      WHERE q.owner_id = auth.uid()
    )
  );

CREATE POLICY "attempt_answers_student_own" ON public.attempt_answers
  FOR ALL
  TO anon, authenticated
  USING (
    attempt_id IN (
      SELECT id FROM public.attempts WHERE student_id = public.current_student_id()
    )
  )
  WITH CHECK (
    attempt_id IN (
      SELECT id FROM public.attempts WHERE student_id = public.current_student_id()
    )
  );

-- 9. AUDIT_LOG POLICIES
DROP POLICY IF EXISTS "audit_log_admin_read" ON public.audit_log;

CREATE POLICY "audit_log_admin_read" ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Realtime Publication additions
ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
