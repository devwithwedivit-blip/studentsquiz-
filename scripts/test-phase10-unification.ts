import { normalizeClass, formatClassLabel } from '../src/utils/classNormalizer';
import { getTeacherTestsForStudent, startTeacherTest, createTeacherTest } from '../src/services/teacherTestApi';
import { createTeacherQuiz, unpublishTeacherQuiz, pushQuizToClass, deleteTeacherQuiz } from '../src/services/teacherApi';
import { getAvailableQuizzes } from '../src/services/studentApi';

const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ${green('✓ PASS')}: ${testName}`);
    passed++;
  } else {
    console.error(`  ${red('✗ FAIL')}: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runUnificationTests() {
  console.log(bold('\n==============================================================='));
  console.log(bold('  TEACHER TESTS UNIFICATION & ACCEPTANCE CRITERIA VERIFICATION  '));
  console.log(bold('===============================================================\n'));

  // Test 1: Class normalizer & formatter
  console.log(bold('Scenario 1: Class Normalization & Formatting'));
  assert(normalizeClass('Class 9') === 9, 'normalizeClass("Class 9") === 9');
  assert(normalizeClass('  9  ') === 9, 'normalizeClass("  9  ") === 9');
  assert(normalizeClass(9) === 9, 'normalizeClass(9) === 9');
  assert(normalizeClass('Class 10') === 10, 'normalizeClass("Class 10") === 10');
  assert(normalizeClass('12th') === 12, 'normalizeClass("12th") === 12');
  assert(formatClassLabel(9) === 'Class 9', 'formatClassLabel(9) === "Class 9"');
  assert(formatClassLabel('Class 9') === 'Class 9', 'formatClassLabel("Class 9") === "Class 9"');

  // Test 2: Teacher publishes "Class 9 - Science Periodic Practice" via createTeacherQuiz
  console.log(bold('\nScenario 2: Teacher Publishes Exam -> Visible in Student Teacher Tests'));
  const publishedQuiz = await createTeacherQuiz(
    {
      title: 'Class 9 - Science Periodic Practice',
      description: 'Practice test created by Science faculty',
      class: 9,
      status: 'published',
      duration_minutes: 30,
      negative_marking: false,
      shuffle: true,
      show_answers_after: true,
      max_attempts: 1
    },
    [
      { questionId: 'q-sample-1', marks: 1 },
      { questionId: 'q-sample-2', marks: 1 }
    ]
  );

  const class9StudentTests = await getTeacherTestsForStudent(9, 'sample-9-2');
  const foundTest = class9StudentTests.find(t => t.id === publishedQuiz.id || t.title === 'Class 9 - Science Periodic Practice');
  assert(!!foundTest, 'Class 9 student sees teacher published exam in Teacher Tests tab');
  assert(foundTest?.question_count === 2, 'Question count is correctly populated');
  assert(foundTest?.duration_minutes === 30, 'Duration minutes is correctly populated');

  // Test 3: Tab separation — Must NOT appear in Available Quizzes (Practice drills only)
  console.log(bold('\nScenario 3: Tab Separation (Zero Overlap with Available Quizzes)'));
  const practiceQuizzes = await getAvailableQuizzes(9);
  const inPractice = practiceQuizzes.find(q => q.id === publishedQuiz.id || q.title === 'Class 9 - Science Periodic Practice');
  assert(!inPractice, 'Teacher exam NEVER appears in Available Quizzes (strictly practice drills)');

  // Test 4: Class 10 student sees 0 of Class 9 test
  console.log(bold('\nScenario 4: Strict Class Isolation'));
  const class10StudentTests = await getTeacherTestsForStudent(10, 'sample-10-1');
  const foundInClass10 = class10StudentTests.find(t => t.id === publishedQuiz.id);
  assert(!foundInClass10, 'Class 10 student sees 0 tests assigned to Class 9');

  // Test 5: Draft exams do not appear to students
  console.log(bold('\nScenario 5: Draft Filter'));
  const draftQuiz = await createTeacherQuiz(
    {
      title: 'Class 9 - Draft Math Assessment',
      class: 9,
      status: 'draft',
      duration_minutes: 25,
      negative_marking: false,
      shuffle: false,
      show_answers_after: false,
      max_attempts: 1
    },
    [{ questionId: 'q-draft-1', marks: 1 }]
  );
  const testsWithDraft = await getTeacherTestsForStudent(9, 'sample-9-2');
  const foundDraft = testsWithDraft.find(t => t.id === draftQuiz.id);
  assert(!foundDraft, 'Draft exam is NOT visible to student in Teacher Tests');

  // Test 6: Reverting to draft removes it from student view
  console.log(bold('\nScenario 6: Reverting to Draft Dynamically Hides Test'));
  await unpublishTeacherQuiz(publishedQuiz.id);
  const testsAfterUnpublish = await getTeacherTestsForStudent(9, 'sample-9-2');
  const foundAfterUnpublish = testsAfterUnpublish.find(t => t.id === publishedQuiz.id);
  assert(!foundAfterUnpublish, 'Unpublished exam is immediately removed from student Teacher Tests tab');

  // Test 7: Start teacher test sanitization (No answer leak)
  console.log(bold('\nScenario 7: Starting Teacher Test Sanitizes Questions'));
  // Re-publish or create published test
  await pushQuizToClass(publishedQuiz.id, 9);
  const started = await startTeacherTest(publishedQuiz.id, { id: 'sample-9-2', name: 'Rahul Verma', class: 9 });
  assert(started.teacherTestId === publishedQuiz.id, 'Student successfully starts teacher test');
  assert(started.questions.length > 0, 'Questions returned to student');
  const hasAnswers = started.questions.some(q => (q as any).correct_answer !== undefined || (q as any).answer !== undefined);
  assert(!hasAnswers, 'Zero answer leakage: questions contain NO correct answer keys');

  // Test 8: Clean up
  await deleteTeacherQuiz(publishedQuiz.id);
  await deleteTeacherQuiz(draftQuiz.id);

  console.log(bold('\n---------------------------------------------------------------'));
  console.log(bold(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`));
  console.log(bold('---------------------------------------------------------------\n'));

  if (failed > 0) {
    process.exit(1);
  }
}

runUnificationTests().catch(err => {
  console.error(red('Fatal test error:'), err);
  process.exit(1);
});
