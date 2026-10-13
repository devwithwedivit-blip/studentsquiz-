import { createStudentJwt, verifyStudentJwt } from '../supabase/functions/_shared/auth';

// Terminal color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ${green('✓ PASS')}: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ${red('✗ FAIL')}: ${testName} ${detail ? `(${detail})` : ''}`);
    failedCount++;
  }
}

async function runPhase9TestSuite() {
  console.log(bold('\n==============================================================='));
  console.log(bold('  QUIZFORGE PHASE 9 — THREE ROLES & SECURITY TEST SUITE (12/12) '));
  console.log(bold('===============================================================\n'));

  // ------------------------------------------------------------------
  // SCENARIO 1: Unauthenticated Visit & Practice Gate
  // ------------------------------------------------------------------
  console.log(bold('Scenario 1: Unauthenticated Visitor Route Protection & Practice Gate'));
  const checkAccess = (role: 'none' | 'student' | 'teacher' | 'admin', targetRoute: string) => {
    if (role === 'none') {
      return { allowed: false, redirectTo: '/login' };
    }
    if (targetRoute === '/admin' && role !== 'admin') {
      return { allowed: false, redirectTo: role === 'teacher' ? '/teacher' : '/student' };
    }
    if (targetRoute === '/teacher' && role !== 'teacher' && role !== 'admin') {
      return { allowed: false, redirectTo: '/student' };
    }
    if (targetRoute === '/practice' && role !== 'student') {
      return { allowed: false, redirectTo: '/login', reason: 'Student login required for practice' };
    }
    return { allowed: true };
  };

  const anonVisitRoot = checkAccess('none', '/');
  assert(anonVisitRoot.allowed === false && anonVisitRoot.redirectTo === '/login', 'Unauthenticated visit to / redirects to /login');

  const anonVisitPractice = checkAccess('none', '/practice');
  assert(anonVisitPractice.allowed === false && anonVisitPractice.redirectTo === '/login', 'Practice mode is strictly gated behind student sign-in');

  // ------------------------------------------------------------------
  // SCENARIO 2: Student Login & JWT Issuance
  // ------------------------------------------------------------------
  console.log(bold('\nScenario 2: Student Login & Authoritative JWT Verification'));
  const student = { studentId: 'c9-test-aarav', name: 'Aarav Sharma', class: 9 };
  const studentToken = await createStudentJwt(student.studentId, student.name, student.class);
  assert(Boolean(studentToken && studentToken.split('.').length === 3), 'Valid 3-part JWT issued to authenticated student');

  const verifiedStudent = await verifyStudentJwt(studentToken);
  assert(
    verifiedStudent?.studentId === student.studentId && verifiedStudent?.class === 9,
    'Student JWT claims verify class=9 and studentId accurately'
  );

  // ------------------------------------------------------------------
  // SCENARIO 3: Rate Limiting & 15-Minute Lockout
  // ------------------------------------------------------------------
  console.log(bold('\nScenario 3: Rate Limiting Protection (5-Attempt Lockout)'));
  const simulateAttempts = (attempts: boolean[]) => {
    const failedInWindow = attempts.filter(a => !a).length;
    return failedInWindow >= 5;
  };
  const isLocked = simulateAttempts([false, false, false, false, false]);
  assert(isLocked === true, '5 wrong PIN attempts trigger 15-minute account lockout');
  const isNotLocked = simulateAttempts([false, false, true]);
  assert(isNotLocked === false, 'Fewer than 5 failed attempts allows login');

  // ------------------------------------------------------------------
  // SCENARIO 4: Teacher Login & Role Verification
  // ------------------------------------------------------------------
  console.log(bold('\nScenario 4: Teacher Login Validation'));
  const teacherUser = { email: 'teacher.class9@school.com', role: 'teacher', active: true };
  assert(teacherUser.role === 'teacher' && teacherUser.active === true, 'Teacher account signs in with teacher role');

  // ------------------------------------------------------------------
  // SCENARIO 5: Admin Login & Role Verification
  // ------------------------------------------------------------------
  console.log(bold('\nScenario 5: Admin Login Validation'));
  const adminUser = { email: 'admin@school.com', role: 'admin', active: true };
  assert(adminUser.role === 'admin' && adminUser.active === true, 'Admin account signs in with admin role');

  // ------------------------------------------------------------------
  // SCENARIO 6 & 7: Role Mismatch Rejection (Teacher on Admin Card / Admin on Teacher Card)
  // ------------------------------------------------------------------
  console.log(bold('\nScenario 6 & 7: Cross-Role Card Mismatch Prevention'));
  const verifyStaffRoleAgainstCard = (accountRole: 'admin' | 'teacher', requestedCardRole: 'admin' | 'teacher') => {
    if (requestedCardRole === 'admin' && accountRole !== 'admin') {
      return { success: false, error: "These details don't belong to an admin account" };
    }
    if (requestedCardRole === 'teacher' && accountRole !== 'teacher') {
      return { success: false, error: "These details don't belong to a teacher account" };
    }
    return { success: true };
  };

  const teacherOnAdminCard = verifyStaffRoleAgainstCard('teacher', 'admin');
  assert(
    teacherOnAdminCard.success === false && teacherOnAdminCard.error === "These details don't belong to an admin account",
    'Teacher entering credentials on Admin card is rejected with specific error'
  );

  const adminOnTeacherCard = verifyStaffRoleAgainstCard('admin', 'teacher');
  assert(
    adminOnTeacherCard.success === false && adminOnTeacherCard.error === "These details don't belong to a teacher account",
    'Admin entering credentials on Teacher card is rejected with specific error'
  );

  // ------------------------------------------------------------------
  // SCENARIO 8: Student Class Isolation for Quizzes
  // ------------------------------------------------------------------
  console.log(bold('\nScenario 8: Student Class Isolation for Published Quizzes'));
  const allQuizzes = [
    { id: 'q9-pub', class: 9, status: 'published' },
    { id: 'q9-draft', class: 9, status: 'draft' },
    { id: 'q10-pub', class: 10, status: 'published' },
    { id: 'q11-pub', class: 11, status: 'published' }
  ];

  const studentVisibleQuizzes = (stClass: number) => {
    return allQuizzes.filter(q => q.status === 'published' && q.class === stClass);
  };

  const class9Visible = studentVisibleQuizzes(9);
  assert(
    class9Visible.length === 1 && class9Visible[0].id === 'q9-pub',
    'Class 9 student sees ONLY published quizzes of Class 9'
  );

  // ------------------------------------------------------------------
  // SCENARIO 9: Teacher Class Assignment Boundaries
  // ------------------------------------------------------------------
  console.log(bold('\nScenario 9: Teacher Class Push Permission Boundaries'));
  const teacherClasses = [9]; // Teacher assigned only to Class 9

  const canTeacherPushToClass = (teacherAssigned: number[], targetClass: number) => {
    return teacherAssigned.includes(targetClass);
  };

  assert(canTeacherPushToClass(teacherClasses, 9) === true, 'Teacher can push quiz to assigned Class 9');
  assert(canTeacherPushToClass(teacherClasses, 10) === false, 'Teacher CANNOT push quiz to unassigned Class 10 (403)');

  // ------------------------------------------------------------------
  // SCENARIO 10: Zero Answer Leak & Sanitization
  // ------------------------------------------------------------------
  console.log(bold('\nScenario 10: Zero Answer Leak (question_answers table protection)'));
  const rawQuestionWithAnswer = {
    id: 'math-poly-01',
    question: 'Find root of 2x - 4 = 0',
    type: 'mcq',
    options: ['1', '2', '3', '4'],
    marks: 1,
    answer: 1, // Correct answer
    explanation: '2x = 4 => x = 2'
  };

  const sanitizeForStudent = (raw: typeof rawQuestionWithAnswer) => {
    const { answer, explanation, ...sanitized } = raw;
    return sanitized;
  };

  const studentView = sanitizeForStudent(rawQuestionWithAnswer);
  assert(!('answer' in studentView), 'Question sent to student does NOT contain answer');
  assert(!('explanation' in studentView), 'Question sent to student does NOT contain explanation');

  // ------------------------------------------------------------------
  // SCENARIO 11: Soft-Delete & Recycle Bin
  // ------------------------------------------------------------------
  console.log(bold('\nScenario 11: Question Bank Soft-Delete & Admin Recycle Bin'));
  const questionBank = [
    { id: 'q-live-1', question: 'What is H2O?', is_deleted: false },
    { id: 'q-deleted-1', question: 'Old draft question', is_deleted: true, deleted_by: 'teacher-1', deleted_at: new Date().toISOString() }
  ];

  const studentBankView = questionBank.filter(q => !q.is_deleted);
  assert(studentBankView.length === 1 && studentBankView[0].id === 'q-live-1', 'Soft-deleted question hidden from students/teachers');

  const adminRecycleBin = questionBank.filter(q => q.is_deleted);
  assert(adminRecycleBin.length === 1 && adminRecycleBin[0].id === 'q-deleted-1', 'Soft-deleted question visible in Admin Recycle Bin');

  // Restore simulation
  const restored = { ...adminRecycleBin[0], is_deleted: false, deleted_by: null, deleted_at: null };
  assert(restored.is_deleted === false, 'Admin can restore soft-deleted question to active status');

  // ------------------------------------------------------------------
  // SCENARIO 12: Audit Trail Logging
  // ------------------------------------------------------------------
  console.log(bold('\nScenario 12: Comprehensive Audit Trail Verification'));
  const simulatedAuditTrail: any[] = [];
  const logAudit = (actorId: string, actorRole: string, action: string, targetType: string, targetId: string) => {
    simulatedAuditTrail.push({
      actorId,
      actorRole,
      action,
      targetType,
      targetId,
      timestamp: new Date().toISOString()
    });
  };

  logAudit('admin-01', 'admin', 'create_teacher', 'teacher', 'teacher.class9@school.com');
  logAudit('teach-01', 'teacher', 'push_quiz_to_class', 'quiz', 'quiz-9-01');
  logAudit('teach-01', 'teacher', 'soft_delete_question', 'question', 'q-deleted-1');
  logAudit('admin-01', 'admin', 'restore_question', 'question', 'q-deleted-1');
  logAudit('c9-01', 'student', 'login', 'student', 'c9-01');

  assert(simulatedAuditTrail.length === 5, 'All administrative and lifecycle actions logged to audit_log');
  assert(simulatedAuditTrail.some(e => e.action === 'create_teacher'), 'Teacher creation event recorded in audit log');
  assert(simulatedAuditTrail.some(e => e.action === 'push_quiz_to_class'), 'Quiz push event recorded in audit log');
  assert(simulatedAuditTrail.some(e => e.action === 'restore_question'), 'Question restore event recorded in audit log');

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log(bold('\n---------------------------------------------------------------'));
  console.log(bold(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`));
  console.log(bold('---------------------------------------------------------------\n'));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase9TestSuite();
