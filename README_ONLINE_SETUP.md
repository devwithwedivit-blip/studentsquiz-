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
# Apply Phase 8 base schema + Phase 9 three roles migration
supabase db push
# OR execute the migration in Supabase Dashboard SQL Editor:
# supabase/migrations/20261014_phase9_three_roles_schema.sql
```

This establishes:
- `profiles`: Authoritative `admin | teacher | student` roles (`must_change_password` flag).
- `teacher_classes`: Junction table mapping teachers (`teacher_id`) to assigned classes (`class_id`).
- `audit_log`: Append-only tamper-proof log recording logins, quiz pushes, teacher provisions, and question soft-deletions/restores.
- `students`: Class 9-12 roster with bcrypt pin hashes.
- `pin_attempts_log`: 5-attempt rate limiter table with lockout.
- `passages`: Reading passages (Hindi unseen poetry & prose).
- `questions_public`: 3,200 question stems, options, hints, plus soft-delete flags (`is_deleted`, `deleted_by`, `deleted_at`).
- `question_answers`: Service-role ONLY answer keys & explanations (zero client access).
- `quizzes`: Quiz configurations with `owner_id` and class targeting.
- `quiz_questions`: Position and marks mapping.
- `attempts`: In-progress and submitted student attempts.
- `attempt_answers`: Autosaved and graded student responses.

---

## 4. Seeding Question Bank, Admin & Dev Data

### A. Seed the 3,200 Question Bank & Hindi Passages:
Run the SQL seed in the Supabase SQL editor:
```bash
# Seed 3,200 questions cleanly separated into questions_public + question_answers
supabase/seed_bank.sql
```

### B. Provision the First Admin Account:
Set your environment variables in `.env` (or pass via CLI) and run:
```bash
ADMIN_EMAIL="admin@school.com" ADMIN_PASSWORD="your-strong-admin-password" npm run create-admin
```
This automatically:
1. Creates the user in Supabase Auth (or updates existing).
2. Sets `app_metadata: { role: 'admin' }`.
3. Sets `public.profiles` role to `'admin'` with `must_change_password = false`.

### C. (Optional) Seed Phase 9 Dev Environment:
To seed sample teachers and test students:
```bash
npm run seed-phase9
# Generates and executes supabase/seed_phase9_dev.sql:
# 1. Teacher (teacher9@school.com / Class 9 assigned)
# 2. 3 Students per class (9, 10, 11, 12) with default PIN 1234
```

---

## 5. Deploying Supabase Edge Functions (Step 4)

Deploy all edge functions using the Supabase CLI:

```bash
# 1. Set environment secrets
supabase secrets set JWT_SECRET="your-secure-jwt-secret-key-32-chars"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 2. Deploy edge functions
supabase functions deploy student-login --no-verify-jwt
supabase functions deploy staff-login --no-verify-jwt
supabase functions deploy admin-manage-teacher --no-verify-jwt
supabase functions deploy start-attempt --no-verify-jwt
supabase functions deploy save-progress --no-verify-jwt
supabase functions deploy submit-attempt --no-verify-jwt
supabase functions deploy admin-reset-pin --no-verify-jwt
supabase functions deploy admin-import-roster --no-verify-jwt
```

---

## 6. Security & Test Suite Verification

Run the automated 12-scenario security test suite:
```bash
npm run test-phase9
```
This validates:
- [x] Student login via Class + Name + PIN
- [x] Wrong PIN rejection & 5-attempt rate limiter lockout
- [x] Student token rejection from teacher/admin functions
- [x] Direct student query to `question_answers` blocked by RLS
- [x] Staff login with email & password (role verification via app_metadata & profiles)
- [x] Teacher blocked from accessing admin functions
- [x] Teacher blocked from pushing quizzes to unassigned classes
- [x] Teacher allowed to push quizzes only to assigned classes
- [x] Cross-card role mismatch rejections on login
- [x] Admin teacher provisioning & class assignments
- [x] Question soft-deletion by teacher & restore by admin
- [x] Audit log recording for all critical events

---

## 7. Vercel Deployment (Step 9)

1. Connect your Git repository (`devwithwedivit-blip/studentsquiz-`) to **Vercel**.
2. Build Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy! `vercel.json` provides automatic SPA routing for `/login`, `/student`, `/teacher`, `/admin`, and `/results`.

---

## 8. URL Route Map & Navigation

| URL Path | Purpose | Access Control |
|---|---|---|
| `/login` | Unified 3-card role switcher (Student / Teacher / Admin) | Public |
| `/` | Practice Mode (Phase 1-7 Notebook) | Authenticated Student Session Required |
| `/student` | Student Exam Portal (Quizzes assigned to student class) | Authenticated Student JWT |
| `/teacher` | Teacher Portal (Quizzes, Class Push, Questions, Roster, Results) | Authenticated Teacher (`profiles.role = 'teacher'`) |
| `/admin` | Admin Portal (Teachers, Recycle Bin, Audit Log, Quizzes, Roster) | Authenticated Admin (`profiles.role = 'admin'`) |
| `/results` | Realtime Live Results & Analytics | Admin / Teacher / Realtime |

---

## 9. Phase 9 Security Highlights

1. **Authoritative Dual-Layer Roles**: Roles are stored in `profiles.role` AND Supabase Auth `app_metadata` (`raw_app_meta_data->>'role'`). Client state is never trusted.
2. **Strict Class Boundaries**: Teachers can only push quizzes to classes assigned to them in `teacher_classes`.
3. **Zero Answer Leaks**: `question_answers` has RLS enabled with zero public/read policies. Only Edge Functions with `service_role` access can read authoritative answers.
4. **Mandatory Password Change**: New staff accounts (`must_change_password = true`) are forced to change their password on first login (minimum 10 characters).
5. **Soft-Delete with Admin Recycle Bin**: Question bank deletions are soft (`is_deleted = true`). Admin can review and restore any soft-deleted question.
6. **Immutable Audit Trail**: `audit_log` records all logins (including failed attempts), quiz pushes, teacher creations, and question modifications.
7. **Cross-Role Rejection**: Attempting to sign in via the wrong role card immediately fails with a descriptive error.
8. **5-Fail Lockout**: Entering a wrong PIN 5 times locks the student ID for 15 minutes via `pin_attempts_log`.
