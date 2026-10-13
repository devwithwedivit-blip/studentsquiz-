-- ==============================================================================
-- QUIZFORGE PHASE 8 — SUPABASE SCHEMA & ROW LEVEL SECURITY (RLS) MIGRATION
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quiz_status AS ENUM ('draft', 'published', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'timed_out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE show_answers_mode AS ENUM ('submit', 'close', 'never');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Supabase Auth extension)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. STUDENTS TABLE (Class Roster)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    class INT NOT NULL CHECK (class BETWEEN 9 AND 12),
    pin_hash TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_students_name_class UNIQUE (name, class)
);
CREATE INDEX IF NOT EXISTS idx_students_class_active ON public.students(class, active);

-- 5. PIN ATTEMPTS LOG TABLE (Brute Force Rate Limiting)
CREATE TABLE IF NOT EXISTS public.pin_attempts_log (
    id BIGSERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    success BOOLEAN NOT NULL,
    ip_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_pin_attempts_student_time ON public.pin_attempts_log(student_id, attempt_time);

-- 6. PASSAGES TABLE
CREATE TABLE IF NOT EXISTS public.passages (
    id TEXT PRIMARY KEY, -- e.g. "c9-hindi-p01"
    class INT NOT NULL CHECK (class BETWEEN 9 AND 12),
    subject TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('gadya', 'padya')),
    title TEXT NOT NULL, -- Teacher-only, withheld from student test view
    content TEXT NOT NULL,
    word_count INT,
    theme TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_passages_class_subject ON public.passages(class, subject);

-- 7. QUESTIONS PUBLIC TABLE (NO ANSWERS, NO EXPLANATIONS)
CREATE TABLE IF NOT EXISTS public.questions_public (
    id TEXT PRIMARY KEY, -- e.g. "c9-hindi-001"
    class INT NOT NULL CHECK (class BETWEEN 9 AND 12),
    subject TEXT NOT NULL,
    chapter TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('mcq', 'truefalse', 'fillblank', 'match', 'numerical', 'image', 'short', 'logic', 'multiselect', 'ordering')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question TEXT NOT NULL,
    options JSONB, -- array of strings for MCQ / multiselect / logic / image options
    image JSONB, -- { kind: 'svg'|'data-url', src: '...', alt: '...' }
    unit TEXT,
    hint TEXT,
    marks NUMERIC NOT NULL DEFAULT 1,
    pairs_left JSONB, -- array of left match strings
    pairs_right_shuffled JSONB, -- shuffled array of right match strings
    items_shuffled JSONB, -- shuffled array of ordering items
    passage_id TEXT REFERENCES public.passages(id) ON DELETE SET NULL,
    passage_order INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_public_class_subject ON public.questions_public(class, subject);
CREATE INDEX IF NOT EXISTS idx_questions_public_passage ON public.questions_public(passage_id);

-- 8. QUESTION ANSWERS TABLE (SERVICE ROLE ONLY — STRICTLY ISOLATED)
CREATE TABLE IF NOT EXISTS public.question_answers (
    question_id TEXT PRIMARY KEY REFERENCES public.questions_public(id) ON DELETE CASCADE,
    answer JSONB NOT NULL,
    accepted_answers JSONB,
    keywords JSONB,
    tolerance NUMERIC,
    pairs JSONB, -- authoritative correct [left, right][] pairs
    ordered_items JSONB, -- authoritative correct sequential order
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. QUIZZES TABLE
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    class INT NOT NULL CHECK (class BETWEEN 9 AND 12),
    status quiz_status NOT NULL DEFAULT 'draft',
    duration_minutes INT NOT NULL DEFAULT 30,
    negative_marking BOOLEAN NOT NULL DEFAULT false,
    shuffle BOOLEAN NOT NULL DEFAULT true,
    show_answers_after show_answers_mode NOT NULL DEFAULT 'submit',
    opens_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ,
    max_attempts INT NOT NULL DEFAULT 1,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quizzes_class_status ON public.quizzes(class, status);

-- 10. QUIZ QUESTIONS TABLE (Frozen copy of questions and marks at publish)
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES public.questions_public(id) ON DELETE CASCADE,
    position INT NOT NULL,
    marks NUMERIC NOT NULL DEFAULT 1,
    PRIMARY KEY (quiz_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_pos ON public.quiz_questions(quiz_id, position);

-- 11. ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    status attempt_status NOT NULL DEFAULT 'in_progress',
    score NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    time_taken_seconds INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_student ON public.attempts(quiz_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_status ON public.attempts(student_id, status);

-- 12. ATTEMPT ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.attempt_answers (
    id BIGSERIAL PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES public.questions_public(id) ON DELETE CASCADE,
    response JSONB,
    is_correct BOOLEAN,
    partial_score NUMERIC DEFAULT 0,
    marks_awarded NUMERIC DEFAULT 0,
    time_spent_seconds INT DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON public.attempt_answers(attempt_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_attempts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current authenticated user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper function: Check if current authenticated user is a Staff member (Admin or Viewer)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'viewer')
  );
$$;

-- Helper function: Extract student_id from current session JWT
CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'student_id', '')::UUID;
$$;

-- Helper function: Extract student_class from current session JWT
CREATE OR REPLACE FUNCTION public.current_student_class()
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'class', '')::INT;
$$;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Viewers can read own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- ------------------------------------------------------------------------------
-- STUDENTS (ROSTER) POLICIES
-- ------------------------------------------------------------------------------
-- Anonymous can select name, class, id to populate the student login dropdown
CREATE POLICY "Public can view active student names for signin"
    ON public.students FOR SELECT
    TO anon, authenticated
    USING (active = true);

CREATE POLICY "Staff can view all students"
    ON public.students FOR SELECT
    TO authenticated
    USING (public.is_staff());

CREATE POLICY "Admins can manage students"
    ON public.students FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- PIN ATTEMPTS LOG POLICIES
-- ------------------------------------------------------------------------------
-- Only service role and admin can see attempts log
CREATE POLICY "Admins can view pin attempts log"
    ON public.pin_attempts_log FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- QUESTIONS PUBLIC & PASSAGES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff can view questions_public"
    ON public.questions_public FOR SELECT
    TO authenticated
    USING (public.is_staff());

CREATE POLICY "Admins can manage questions_public"
    ON public.questions_public FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Students can read questions for published quizzes in their class"
    ON public.questions_public FOR SELECT
    TO authenticated, anon
    USING (
      EXISTS (
        SELECT 1 FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        WHERE qq.question_id = questions_public.id
          AND q.status = 'published'
          AND q.class = public.current_student_class()
      )
    );

CREATE POLICY "Staff can view passages"
    ON public.passages FOR SELECT
    TO authenticated
    USING (public.is_staff());

CREATE POLICY "Admins can manage passages"
    ON public.passages FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Students can view passages for published quizzes in their class"
    ON public.passages FOR SELECT
    TO authenticated, anon
    USING (
      EXISTS (
        SELECT 1 FROM public.questions_public qp
        JOIN public.quiz_questions qq ON qq.question_id = qp.id
        JOIN public.quizzes q ON q.id = qq.quiz_id
        WHERE qp.passage_id = passages.id
          AND q.status = 'published'
          AND q.class = public.current_student_class()
      )
    );

-- ------------------------------------------------------------------------------
-- QUESTION ANSWERS POLICIES (STRICT ISOLATION)
-- ------------------------------------------------------------------------------
-- NO STUDENT OR ANONYMOUS ACCESS EVER.
-- Staff can read answers for bank manager review, admins can manage.
CREATE POLICY "Staff can view question answers"
    ON public.question_answers FOR SELECT
    TO authenticated
    USING (public.is_staff());

CREATE POLICY "Admins can manage question answers"
    ON public.question_answers FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- QUIZZES & QUIZ QUESTIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff can view all quizzes"
    ON public.quizzes FOR SELECT
    TO authenticated
    USING (public.is_staff());

CREATE POLICY "Admins can manage quizzes"
    ON public.quizzes FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Students can view published quizzes matching their class"
    ON public.quizzes FOR SELECT
    TO authenticated, anon
    USING (
      status = 'published'
      AND class = public.current_student_class()
      AND (opens_at IS NULL OR opens_at <= now())
    );

CREATE POLICY "Staff can view quiz_questions"
    ON public.quiz_questions FOR SELECT
    TO authenticated
    USING (public.is_staff());

CREATE POLICY "Admins can manage quiz_questions"
    ON public.quiz_questions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Students can view quiz_questions for published quiz in their class"
    ON public.quiz_questions FOR SELECT
    TO authenticated, anon
    USING (
      EXISTS (
        SELECT 1 FROM public.quizzes q
        WHERE q.id = quiz_questions.quiz_id
          AND q.status = 'published'
          AND q.class = public.current_student_class()
      )
    );

-- ------------------------------------------------------------------------------
-- ATTEMPTS & ATTEMPT ANSWERS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff can view all attempts"
    ON public.attempts FOR SELECT
    TO authenticated
    USING (public.is_staff());

CREATE POLICY "Admins can manage attempts"
    ON public.attempts FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Students can view only their own attempts"
    ON public.attempts FOR SELECT
    TO authenticated, anon
    USING (student_id = public.current_student_id());

CREATE POLICY "Staff can view all attempt_answers"
    ON public.attempt_answers FOR SELECT
    TO authenticated
    USING (public.is_staff());

CREATE POLICY "Admins can manage attempt_answers"
    ON public.attempt_answers FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Students can view own attempt_answers if allowed by quiz policy"
    ON public.attempt_answers FOR SELECT
    TO authenticated, anon
    USING (
      EXISTS (
        SELECT 1 FROM public.attempts a
        JOIN public.quizzes q ON q.id = a.quiz_id
        WHERE a.id = attempt_answers.attempt_id
          AND a.student_id = public.current_student_id()
          AND (
            q.show_answers_after = 'submit'
            OR (q.show_answers_after = 'close' AND q.closes_at IS NOT NULL AND q.closes_at <= now())
          )
      )
    );

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS
-- ==============================================================================
-- Enable Realtime publication for attempts and quizzes so /results receives instant updates
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
