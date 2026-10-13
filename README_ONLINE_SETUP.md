# QuizForge Phase 8: Online Version Setup Guide (Vercel + Supabase)

This document provides complete instructions for provisioning and deploying the online edition of QuizForge with Supabase (Postgres, Row Level Security, Auth, Realtime, Edge Functions) and Vercel.

---

## 1. Prerequisites

- A [Supabase](https://supabase.com) account & new project.
- A [Vercel](https://vercel.com) account.
- Node.js 18+ installed locally.
- Supabase CLI installed (`npm install -g supabase`).

---

## 2. Environment Variables

Create `.env` in the root of the project:

```env
# Frontend Client (Vercel & Local Vite)
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# Supabase Edge Functions Secrets (Set via `supabase secrets set`)
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
JWT_SECRET=super-secret-jwt-signing-key-at-least-32-chars
```

---

## 3. Database Schema & RLS Policies (Step 2 & 3)

Run the SQL migration in the Supabase Dashboard SQL Editor or via the CLI:

```bash
# Apply initial schema, RLS policies, and Realtime publications
supabase db push
# OR copy and paste: supabase/migrations/20261013_init_phase8_schema.sql
```

This creates:
- `profiles`: Admin & viewer role-based permissions.
- `students`: Class 9-12 roster with bcrypt pin hashes.
- `pin_attempts_log`: 5-attempt rate limiter table.
- `passages`: Reading passages (Hindi unseen poetry & prose).
- `questions_public`: 3,200 public question stems, options, and hints (zero answers!).
- `question_answers`: Service-role only answer keys & explanations.
- `quizzes`: Quiz configurations with class isolation.
- `quiz_questions`: Position and marks mapping.
- `attempts`: In-progress and submitted student attempts.
- `attempt_answers`: Autosaved and graded student responses.

---

## 4. Seeding Question Bank & Students

### A. Seed the 3,200 Question Bank & Hindi Passages:
Run the SQL seed in the Supabase SQL editor:
```bash
# Seed 3,200 questions cleanly separated into questions_public + question_answers
supabase/seed_bank.sql
```

### B. Seed Initial Admin & Student Roster:
Run the roster seed:
```bash
# Seed sample students across Classes 9-12 with hashed PIN (1234)
supabase/seed_roster.sql
```

To create your Supabase Admin user account in Auth:
1. Go to Supabase Dashboard -> **Authentication** -> **Users** -> **Add user**.
2. Email: `admin@school.com` (or your school email), Password: `admin123`.
3. In SQL Editor, ensure the profile exists:
   ```sql
   INSERT INTO public.profiles (id, role, name)
   VALUES ('<USER_AUTH_UUID>', 'admin', 'Principal / Exam Admin')
   ON CONFLICT (id) DO UPDATE SET role = 'admin';
   ```

---

## 5. Deploying Supabase Edge Functions (Step 4)

Deploy all 6 edge functions using the Supabase CLI:

```bash
# 1. Set environment secrets
supabase secrets set JWT_SECRET="your-secure-jwt-secret-key-32-chars"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 2. Deploy edge functions
supabase functions deploy student-login --no-verify-jwt
supabase functions deploy start-attempt --no-verify-jwt
supabase functions deploy save-progress --no-verify-jwt
supabase functions deploy submit-attempt --no-verify-jwt
supabase functions deploy admin-reset-pin --no-verify-jwt
supabase functions deploy admin-import-roster --no-verify-jwt
```

---

## 6. Vercel Deployment (Step 9)

1. Connect your Git repository to **Vercel**.
2. Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy! `vercel.json` provides automatic SPA routing for `/student`, `/admin`, and `/results`.

---

## 7. URL Route Map

| URL Path | Purpose | Access Control |
|---|---|---|
| `/` | Offline Practice Mode (Phase 1-7 Notebook) | Public / Offline IndexedDB |
| `/student` | Student Exam Portal (Class -> Name -> PIN) | Authenticated Student JWT |
| `/admin` | Teacher / Admin Portal (Quizzes, Roster, PINs) | Supabase Auth (Admin Profile) |
| `/results` | Realtime Live Results & Analytics | Admin / Teacher / Realtime |

---

## 8. Security Highlights

1. **Zero Answer Leaks**: `question_answers` has RLS enabled with no public read policies. Only Edge Functions with `service_role` access can read authoritative answers.
2. **Student Isolation**: Class 9 students can never read or attempt Class 10/11/12 quizzes.
3. **5-Fail Lockout**: Entering a wrong PIN 5 times locks the student ID for 15 minutes via `pin_attempts_log`.
4. **Server Timer Enforcement**: Submission and auto-saves reject requests after the deadline with a 60-90 second latency buffer.
5. **Realtime Proctoring**: The `/results` screen live counter updates automatically when any student in the school clicks "Submit".
