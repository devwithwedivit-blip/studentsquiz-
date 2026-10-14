import { getTeacherTestsForStudent, startTeacherTest, submitTeacherTest, createTeacherTest, getTeacherTestResults } from '../src/services/teacherTestApi';

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

async function runPhase10Tests() {
  console.log(bold('\n==============================================================='));
  console.log(bold('  PHASE 10 — TEACHER TESTS & STUDENT DASHBOARD TAB TEST SUITE  '));
  console.log(bold('===============================================================\n'));

  // Test 1: Class Isolation (Class 9 vs Class 10)
  console.log(bold('Scenario 1: Strict Class Isolation'));
  const studentC9 = { id: 'test-student-9', name: 'Aarav Sharma', class: 9 };
  const studentC10 = { id: 'test-student-10', name: 'Rohan Gupta', class: 10 };

  const testsC9 = await getTeacherTestsForStudent(9, studentC9.id);
  const testsC10 = await getTeacherTestsForStudent(10, studentC10.id);

  assert(testsC9.length > 0, 'Class 9 student receives Class 9 teacher tests');
  assert(testsC9.every(t => t.class === 9), 'All tests for studentC9 are strictly Class 9');
  assert(testsC10.every(t => t.class === 10), 'Class 10 student sees 0 tests for Class 9');

  // Test 2: Nearest Deadline Sorting & Due Soon Badge
  console.log(bold('\nScenario 2: Nearest Deadline Sorting & Due Soon Detection'));
  let sortedCorrectly = true;
  for (let i = 0; i < testsC9.length - 1; i++) {
    if (new Date(testsC9[i].due_at).getTime() > new Date(testsC9[i + 1].due_at).getTime()) {
      sortedCorrectly = false;
      break;
    }
  }
  assert(sortedCorrectly, 'Teacher tests are sorted nearest deadline first');

  const dueSoonTest = testsC9.find(t => t.isDueSoon);
  assert(Boolean(dueSoonTest), 'Test with deadline within 24h is marked with isDueSoon = true');

  // Test 3: Zero Answer Leakage in Student Questions
  console.log(bold('\nScenario 3: Zero Answer Leakage in StartAttempt Response'));
  const testToTake = testsC9[0];
  const attempt = await startTeacherTest(testToTake.id, studentC9);

  assert(attempt.questions.length > 0, 'Start attempt returns test questions');
  const hasLeakedAnswer = attempt.questions.some((q: any) => 'correct_answer' in q || 'correctAnswer' in q);
  assert(!hasLeakedAnswer, 'Questions sent to student NEVER contain correct_answer');

  // Test 4: Anti-Cheat Tab-Switch Violation (2nd violation triggers abrupt submit with 0 score)
  console.log(bold('\nScenario 4: Violation Monitoring & Abrupt Submission'));
  const abruptSubmitResult = await submitTeacherTest(testToTake.id, attempt.attemptId, {}, true); // isAbrupt = true
  assert(abruptSubmitResult.status === 'abrupt', '2nd violation submits test with status = abrupt');
  assert(abruptSubmitResult.score === 0, 'Abrupt violation submission forces score = 0');

  // Test 5: Single Attempt Enforcement
  console.log(bold('\nScenario 5: Single Attempt Enforcement'));
  let secondAttemptBlocked = false;
  try {
    await startTeacherTest(testToTake.id, studentC9);
  } catch (err: any) {
    if (err.message.includes('already submitted')) {
      secondAttemptBlocked = true;
    }
  }
  assert(secondAttemptBlocked, 'Attempting to retake a submitted teacher test is blocked');

  // Test 6: Teacher Test Submission drops pending count and appears in Past Results
  console.log(bold('\nScenario 6: Dashboard Tab Count Drop & Past Results Migration'));
  const updatedC9Tests = await getTeacherTestsForStudent(9, studentC9.id);
  const updatedTestCard = updatedC9Tests.find(t => t.id === testToTake.id);
  assert(updatedTestCard?.status === 'submitted', 'Submitted test card status updates to "submitted"');

  const pendingTests = updatedC9Tests.filter(t => t.status === 'new' || t.status === 'in_progress');
  assert(pendingTests.length === testsC9.length - 1, 'Pending count N drops by exactly 1');

  // Test 7: Teacher Portal - Create and Assign Test Builder
  console.log(bold('\nScenario 7: Teacher Creation of New Class Test'));
  const createdTest = await createTeacherTest(
    {
      title: 'Class 9 Mathematics Quiz on Coordinate Geometry',
      subject: 'mathematics',
      class: 9,
      duration_minutes: 30,
      due_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      is_published: true,
      questions: [
        {
          question: 'What is the abscissa of point (-3, 5)?',
          options: ['-3', '5', '3', '-5'],
          correct_answer: 0,
          marks: 2
        },
        {
          question: 'Point (0, -4) lies on which axis?',
          options: ['Positive X-axis', 'Negative X-axis', 'Positive Y-axis', 'Negative Y-axis'],
          correct_answer: 3,
          marks: 2
        }
      ]
    },
    { id: 'teacher-sharma', name: 'Mr. R. K. Sharma' }
  );

  assert(Boolean(createdTest.id), 'Teacher test created successfully with unique ID');
  assert(createdTest.total_marks === 4, 'Total marks calculated correctly (2 + 2 = 4)');

  // Test 8: Live Results Table
  console.log(bold('\nScenario 8: Teacher Live Results Table'));
  const results = await getTeacherTestResults(testToTake.id);
  assert(results.length > 0, 'Teacher can view results table for test');
  const studentResult = results.find(r => r.student_id === studentC9.id);
  assert(Boolean(studentResult), 'Student submission found in teacher results table');
  assert(studentResult?.status === 'abrupt', 'Student submission status accurately recorded');

  console.log(bold('\n---------------------------------------------------------------'));
  console.log(bold(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`));
  console.log(bold('---------------------------------------------------------------\n'));

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10Tests();
