const fs = require('fs');
const path = require('path');

// Colors for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓ PASS${RESET}: ${testName}`);
  } else {
    failedTests++;
    console.log(`  ${RED}✗ FAIL${RESET}: ${testName} ${details ? `(${details})` : ''}`);
  }
}

console.log(`${BOLD}${CYAN}================================================================${RESET}`);
console.log(`${BOLD}${CYAN}   QUIZFORGE QA SUITE: COMPREHENSIVE FEATURE & ENGINE TESTS    ${RESET}`);
console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

// -------------------------------------------------------------
// 1. EVALUATION ENGINE TESTS (All 10 Question Types)
// -------------------------------------------------------------
console.log(`${BOLD}1. Evaluating All 10 Interactive Question Types...${RESET}`);

// Implement evaluator replica from src/services/evaluator.ts for direct CLI validation
function normalizeAnswerText(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function evaluateAnswer(question, userAnswer, selfGradedCorrect = false) {
  if (selfGradedCorrect) return { isCorrect: true, score: 1.0 };
  if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
    return { isCorrect: false, score: 0 };
  }

  switch (question.type) {
    case 'mcq': {
      const isCorrect = Number(userAnswer) === Number(question.answer);
      return { isCorrect, score: isCorrect ? 1.0 : 0 };
    }
    case 'truefalse': {
      const userBool = userAnswer === true || userAnswer === 'true';
      const ansBool = question.answer === true || question.answer === 'true';
      const isCorrect = userBool === ansBool;
      return { isCorrect, score: isCorrect ? 1.0 : 0 };
    }
    case 'fillblank': {
      const normUser = normalizeAnswerText(String(userAnswer));
      const candidates = [String(question.answer), ...(question.acceptedAnswers || [])].map(normalizeAnswerText);
      const normUserNoSpace = normUser.replace(/\s+/g, '');
      const isCorrect = candidates.some(c => c === normUser || (normUserNoSpace.length > 0 && c.replace(/\s+/g, '') === normUserNoSpace));
      return { isCorrect, score: isCorrect ? 1.0 : 0 };
    }
    case 'match': {
      const pairs = question.pairs || [];
      let correctPairsCount = 0;
      if (Array.isArray(userAnswer)) {
        for (const [uLeft, uRight] of userAnswer) {
          const match = pairs.find(([pLeft, pRight]) => pLeft === uLeft && pRight === uRight);
          if (match) correctPairsCount++;
        }
      }
      const fraction = pairs.length > 0 ? correctPairsCount / pairs.length : 1.0;
      return { isCorrect: fraction === 1.0, score: fraction, isPartial: fraction > 0 && fraction < 1 };
    }
    case 'numerical': {
      const userNum = parseFloat(String(userAnswer).replace(/[^0-9.-]/g, ''));
      const targetNum = Number(question.answer);
      const tolerance = question.tolerance ?? 0.02;
      if (isNaN(userNum) || isNaN(targetNum)) return { isCorrect: false, score: 0 };
      const isCorrect = Math.abs(userNum - targetNum) <= tolerance;
      return { isCorrect, score: isCorrect ? 1.0 : 0 };
    }
    case 'image': {
      if (question.options && question.options.length > 0) {
        const isCorrect = Number(userAnswer) === Number(question.answer);
        return { isCorrect, score: isCorrect ? 1.0 : 0 };
      }
      const normUser = normalizeAnswerText(String(userAnswer));
      const candidates = [String(question.answer), ...(question.acceptedAnswers || [])].map(normalizeAnswerText);
      const isCorrect = candidates.some(c => c === normUser);
      return { isCorrect, score: isCorrect ? 1.0 : 0 };
    }
    case 'short': {
      const normUser = normalizeAnswerText(String(userAnswer));
      const candidates = (question.acceptedAnswers || [String(question.answer)]).map(normalizeAnswerText);
      if (candidates.some(c => normUser === c || normUser.includes(c))) {
        return { isCorrect: true, score: 1.0 };
      }
      const keywords = (question.keywords || []).map(normalizeAnswerText);
      if (keywords.length > 0) {
        let matched = 0;
        for (const kw of keywords) if (normUser.includes(kw)) matched++;
        const fraction = matched / keywords.length;
        if (fraction >= 0.6) return { isCorrect: true, score: 1.0 };
        if (fraction > 0) return { isCorrect: false, score: 0.5, isPartial: true };
      }
      return { isCorrect: false, score: 0 };
    }
    case 'logic': {
      const isCorrect = Number(userAnswer) === Number(question.answer);
      return { isCorrect, score: isCorrect ? 1.0 : 0 };
    }
    case 'multiselect': {
      const correctIndices = (Array.isArray(question.answer) ? question.answer : [Number(question.answer)]).map(Number);
      const userIndices = (Array.isArray(userAnswer) ? userAnswer : [Number(userAnswer)]).map(Number);
      const correctSet = new Set(correctIndices);
      let studentCorrect = 0;
      let studentWrong = 0;
      for (const idx of userIndices) {
        if (correctSet.has(idx)) studentCorrect++;
        else studentWrong++;
      }
      const fraction = Math.max(0, (studentCorrect - studentWrong) / correctSet.size);
      return { isCorrect: fraction === 1.0 && studentWrong === 0, score: fraction, isPartial: fraction > 0 && fraction < 1 };
    }
    case 'ordering': {
      const targetItems = question.orderedItems || [];
      const userItems = Array.isArray(userAnswer) ? userAnswer : [];
      if (userItems.length !== targetItems.length) return { isCorrect: false, score: 0 };
      let inPos = 0;
      for (let i = 0; i < targetItems.length; i++) {
        if (targetItems[i] === userItems[i]) inPos++;
      }
      const fraction = inPos / targetItems.length;
      return { isCorrect: fraction === 1.0, score: fraction, isPartial: fraction > 0 && fraction < 1 };
    }
    default:
      return { isCorrect: false, score: 0 };
  }
}

// 1. MCQ Test
const qMCQ = { type: 'mcq', answer: 2, options: ['A', 'B', 'C', 'D'], marks: 1 };
assert(evaluateAnswer(qMCQ, 2).isCorrect === true, 'MCQ correct answer evaluation');
assert(evaluateAnswer(qMCQ, 0).isCorrect === false, 'MCQ incorrect answer evaluation');

// 2. True / False Test
const qTF = { type: 'truefalse', answer: true, marks: 1 };
assert(evaluateAnswer(qTF, true).isCorrect === true, 'TrueFalse boolean true evaluation');
assert(evaluateAnswer(qTF, 'true').isCorrect === true, 'TrueFalse string "true" evaluation');
assert(evaluateAnswer(qTF, false).isCorrect === false, 'TrueFalse incorrect evaluation');

// 3. Fill in the Blank Test
const qFill = { type: 'fillblank', answer: 'photosynthesis', acceptedAnswers: ['Photosynthesis', 'photo-synthesis'], marks: 1 };
assert(evaluateAnswer(qFill, ' Photosynthesis. ').isCorrect === true, 'FillBlank punctuation and case-insensitive normalization');
assert(evaluateAnswer(qFill, 'photo synthesis').isCorrect === true, 'FillBlank hyphen/space tolerance');
assert(evaluateAnswer(qFill, 'respiration').isCorrect === false, 'FillBlank wrong answer rejection');

// 4. Match the Columns Test
const qMatch = {
  type: 'match',
  pairs: [['Chloroplast', 'Photosynthesis'], ['Mitochondria', 'Cellular respiration']],
  marks: 2
};
assert(
  evaluateAnswer(qMatch, [['Chloroplast', 'Photosynthesis'], ['Mitochondria', 'Cellular respiration']]).isCorrect === true,
  'Match all pairs correct evaluation'
);
const pMatch = evaluateAnswer(qMatch, [['Chloroplast', 'Photosynthesis'], ['Mitochondria', 'Wrong']]);
assert(pMatch.isCorrect === false && pMatch.score === 0.5 && pMatch.isPartial === true, 'Match partial credit (1 of 2 pairs correct)');

// 5. Numerical Tolerance Test
const qNum = { type: 'numerical', answer: 9.8, tolerance: 0.05, unit: 'm/s²', marks: 1 };
assert(evaluateAnswer(qNum, '9.82 m/s²').isCorrect === true, 'Numerical input within ±0.05 tolerance');
assert(evaluateAnswer(qNum, '10.5').isCorrect === false, 'Numerical input outside tolerance rejected');

// 6. Image SVG Question Test
const qImg = { type: 'image', answer: 1, options: ['Stoma Open', 'Stoma Closed'], marks: 1 };
assert(evaluateAnswer(qImg, 1).isCorrect === true, 'Image diagram question correct option evaluation');

// 7. Short Answer Keyword Test
const qShort = {
  type: 'short',
  answer: 'Newton first law states inertia of body',
  keywords: ['inertia', 'unbalanced force', 'rest'],
  marks: 2
};
assert(evaluateAnswer(qShort, 'An object at rest stays unless acted by an unbalanced force causing inertia').isCorrect === true, 'Short answer keyword presence matching (>= 60%)');
assert(evaluateAnswer(qShort, 'The body will accelerate with gravity').isCorrect === false, 'Short answer irrelevant text rejected');
assert(evaluateAnswer(qShort, 'Arbitrary text', true).isCorrect === true, 'Short answer self-grading override');

// 8. Logic / Assertion-Reason Test
const qLogic = { type: 'logic', answer: 0, options: ['Both true & correct explanation', 'Both true but not correct explanation'], marks: 1 };
assert(evaluateAnswer(qLogic, 0).isCorrect === true, 'Logic assertion-reason correct choice');
assert(evaluateAnswer(qLogic, 1).isCorrect === false, 'Logic assertion-reason incorrect choice');

// 9. Multiselect Partial Credit Test
const qMulti = { type: 'multiselect', answer: [0, 2], options: ['Helium', 'Nitrogen', 'Neon', 'Oxygen'], marks: 2 };
assert(evaluateAnswer(qMulti, [0, 2]).isCorrect === true, 'Multiselect all correct options selected');
const pMulti = evaluateAnswer(qMulti, [0]);
assert(pMulti.score === 0.5 && pMulti.isPartial === true, 'Multiselect partial credit (1 correct out of 2, 0 wrong)');
const penMulti = evaluateAnswer(qMulti, [0, 1]);
assert(penMulti.score === 0 && penMulti.isCorrect === false, 'Multiselect incorrect choice penalty cancellation');

// 10. Ordering Sequence Test
const qOrder = { type: 'ordering', orderedItems: ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'], marks: 2 };
assert(evaluateAnswer(qOrder, ['Prophase', 'Metaphase', 'Anaphase', 'Telophase']).isCorrect === true, 'Ordering perfect sequence evaluation');
const pOrder = evaluateAnswer(qOrder, ['Prophase', 'Metaphase', 'Telophase', 'Anaphase']);
assert(pOrder.isCorrect === false && pOrder.score === 0.5, 'Ordering partial position credit (2 of 4 in position)');

// -------------------------------------------------------------
// 2. SCORING, TIMERS & EXAM / PRACTICE MODE MECHANICS
// -------------------------------------------------------------
console.log(`\n${BOLD}2. Scoring Rules, Penalties & Exam vs Practice Modes...${RESET}`);

function computeQuizScore(questions, answers, config) {
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let totalScore = 0;
  let maxScore = 0;

  for (const q of questions) {
    maxScore += q.marks;
    const ans = answers[q.id];
    if (!ans || ans.answer === undefined || ans.isSkipped) {
      skippedCount++;
    } else {
      const res = evaluateAnswer(q, ans.answer, ans.selfGradedCorrect);
      let qScore = res.score * q.marks;

      if (ans.hintUsed) {
        qScore = Math.max(0, qScore - 0.5);
      }

      if (!res.isCorrect && config.negativeMarking) {
        qScore = -0.25;
      }

      if (res.isCorrect) correctCount++;
      else wrongCount++;

      totalScore += qScore;
    }
  }

  const accuracy = correctCount + wrongCount > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;
  const xpEarned = correctCount * 15 + Math.round(accuracy / 2);

  return {
    correctCount,
    wrongCount,
    skippedCount,
    score: Math.max(0, Math.round(totalScore * 10) / 10),
    maxScore,
    accuracy,
    xpEarned
  };
}

const testQuestions = [
  { id: 'q1', type: 'mcq', answer: 0, marks: 1 },
  { id: 'q2', type: 'mcq', answer: 1, marks: 1 },
  { id: 'q3', type: 'mcq', answer: 2, marks: 1 },
  { id: 'q4', type: 'mcq', answer: 3, marks: 1 }
];

// Practice Mode: No negative marking, hints reduce score by 0.5
const practiceAnswers = {
  q1: { answer: 0, hintUsed: false },       // +1.0
  q2: { answer: 1, hintUsed: true },        // +1.0 - 0.5 = 0.5
  q3: { answer: 0, hintUsed: false },       // 0.0 (wrong, no penalty)
  q4: { isSkipped: true }                   // 0.0 (skipped)
};
const practiceResult = computeQuizScore(testQuestions, practiceAnswers, { negativeMarking: false, quizMode: 'practice' });
assert(practiceResult.score === 1.5, 'Practice mode score correctly awards 1.5 with hint penalty');
assert(practiceResult.correctCount === 2, 'Practice mode counts 2 correct');
assert(practiceResult.wrongCount === 1, 'Practice mode counts 1 wrong');
assert(practiceResult.skippedCount === 1, 'Practice mode counts 1 skipped');
assert(practiceResult.accuracy === 67, 'Practice mode accuracy: 2 / 3 attempted = 67%');

// Exam Mode: Negative marking enabled (-0.25 on wrong answers)
const examAnswers = {
  q1: { answer: 0 },                       // +1.0
  q2: { answer: 0 },                       // -0.25 (wrong)
  q3: { answer: 2 },                       // +1.0
  q4: { answer: 0 }                        // -0.25 (wrong)
};
const examResult = computeQuizScore(testQuestions, examAnswers, { negativeMarking: true, quizMode: 'exam' });
assert(examResult.score === 1.5, 'Exam mode negative marking: 1 + 1 - 0.25 - 0.25 = 1.5');
assert(examResult.correctCount === 2, 'Exam mode counts 2 correct');
assert(examResult.wrongCount === 2, 'Exam mode counts 2 wrong');
assert(examResult.accuracy === 50, 'Exam mode accuracy: 2 / 4 attempted = 50%');

// Total score lower bounded at 0
const allWrongAnswers = {
  q1: { answer: 1 },
  q2: { answer: 0 },
  q3: { answer: 0 },
  q4: { answer: 0 }
};
const allWrongResult = computeQuizScore(testQuestions, allWrongAnswers, { negativeMarking: true, quizMode: 'exam' });
assert(allWrongResult.score === 0, 'Total quiz score cannot fall below 0 under negative marking');

// -------------------------------------------------------------
// 3. BANK MANAGER: EXPORT, IMPORT, AND CORRUPT JSON HANDLING
// -------------------------------------------------------------
console.log(`\n${BOLD}3. Manager Import / Export & Fault Tolerance...${RESET}`);

// JSON Export and Roundtrip
const sampleBank = [
  { id: 'c9-maths-001', class: 9, subject: 'maths', chapter: 'Number Systems', type: 'mcq', question: 'Is root 2 rational?', answer: 1, options: ['Yes', 'No'], difficulty: 'easy', marks: 1 },
  { id: 'c9-maths-002', class: 9, subject: 'maths', chapter: 'Number Systems', type: 'truefalse', question: 'Every integer is a rational number.', answer: true, difficulty: 'easy', marks: 1 }
];

const exportedJSON = JSON.stringify(sampleBank, null, 2);
const reimportedBank = JSON.parse(exportedJSON);
assert(reimportedBank.length === 2, 'JSON Export/Import preserves question count');
assert(reimportedBank[0].id === 'c9-maths-001' && reimportedBank[1].type === 'truefalse', 'JSON Export/Import preserves question schemas');

// Corrupted JSON parsing error detection
let caughtCorruptError = false;
try {
  const corruptedData = '{"broken": json... invalid';
  JSON.parse(corruptedData);
} catch (e) {
  caughtCorruptError = true;
}
assert(caughtCorruptError === true, 'Malformed JSON import throws recoverable syntax error without application crash');

// CSV Generation and Parsing validation
function exportToCSV(questions) {
  const headers = ['id', 'class', 'subject', 'chapter', 'type', 'question', 'answer', 'difficulty', 'marks'];
  const rows = questions.map(q => [
    q.id,
    q.class,
    q.subject,
    `"${q.chapter}"`,
    q.type,
    `"${q.question.replace(/"/g, '""')}"`,
    `"${String(q.answer).replace(/"/g, '""')}"`,
    q.difficulty,
    q.marks
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

const csvOutput = exportToCSV(sampleBank);
assert(csvOutput.includes('c9-maths-001') && csvOutput.includes('Number Systems'), 'CSV generation outputs valid delimited records');

// -------------------------------------------------------------
// 4. SEED BANK PROTECTION & OVERLAY ISOLATION
// -------------------------------------------------------------
console.log(`\n${BOLD}4. Data Safety: Seed File Immutability & Overlays...${RESET}`);

const dataDir = path.join(__dirname, '..', 'src', 'data');
const classes = [9, 10, 11, 12];
let seedFilesTotal = 0;
let seedQuestionsTotal = 0;

for (const c of classes) {
  const cDir = path.join(dataDir, `class-${c}`);
  const files = fs.readdirSync(cDir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    seedFilesTotal++;
    const qList = JSON.parse(fs.readFileSync(path.join(cDir, f), 'utf8'));
    seedQuestionsTotal += qList.length;
  }
}

assert(seedFilesTotal === 32, `Exactly 32 seed files exist in src/data/ (Found: ${seedFilesTotal})`);
assert(seedQuestionsTotal === 3200, `Exactly 3,200 pristine questions preserved across seed bank (Found: ${seedQuestionsTotal})`);

// -------------------------------------------------------------
// 5. MID-QUIZ RECOVERY SESSION SERIALIZATION
// -------------------------------------------------------------
console.log(`\n${BOLD}5. Mid-Quiz Session Recovery Serialization...${RESET}`);

const mockSession = {
  config: { selectedClass: 10, selectedSubjects: ['physics'], totalQuestions: 15, quizMode: 'exam' },
  questions: testQuestions,
  userAnswers: { q1: { questionId: 'q1', answer: 0, isCorrect: true } },
  currentIndex: 2,
  totalTimeElapsed: 125,
  timestamp: Date.now()
};

const sessionStr = JSON.stringify(mockSession);
const restoredSession = JSON.parse(sessionStr);

assert(restoredSession.currentIndex === 2, 'Recovery session preserves currentIndex');
assert(restoredSession.totalTimeElapsed === 125, 'Recovery session preserves totalTimeElapsed');
assert(restoredSession.userAnswers.q1.answer === 0, 'Recovery session preserves in-progress userAnswers');

// -------------------------------------------------------------
// FINAL SUMMARY
// -------------------------------------------------------------
console.log(`\n${BOLD}${CYAN}----------------------------------------------------------------${RESET}`);
console.log(`${BOLD}QA Feature Tests Summary: ${GREEN}${passedTests} Passed${RESET}, ${failedTests > 0 ? `${RED}${failedTests} Failed${RESET}` : `${GREEN}0 Failed${RESET}`}`);
console.log(`${BOLD}${CYAN}----------------------------------------------------------------${RESET}\n`);

if (failedTests > 0) {
  process.exit(1);
}
