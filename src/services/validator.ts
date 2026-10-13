import { Question, QuestionType, Difficulty } from '../types/quiz';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  questionId?: string;
  field?: string;
  message: string;
}

export interface BankValidationReport {
  file: string;
  className: number;
  subject: string;
  totalQuestions: number;
  typeCounts: Record<QuestionType, number>;
  difficultyCounts: Record<Difficulty, number>;
  issues: ValidationIssue[];
  isValid: boolean;
}

export interface GlobalValidationResult {
  reports: BankValidationReport[];
  totalQuestions: number;
  allValid: boolean;
  totalErrors: number;
  totalWarnings: number;
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

// Clean text for near-duplicate comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance for near duplicate detection
function isNearDuplicate(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 10) return false;
  
  // Quick length threshold check
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return true;

  // Jaccard similarity of words
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  const jaccard = union === 0 ? 1 : intersection / union;
  return jaccard > 0.92;
}

export type SubjectGroup = 'gk_cs' | 'mpc' | 'biology' | 'languages';

export const EXPECTED_DISTRIBUTIONS: Record<SubjectGroup, Record<QuestionType, number>> = {
  // GK, Computer Science: 25, 10, 10, 6, 10, 6, 10, 8, 8, 7
  gk_cs: {
    mcq: 25,
    truefalse: 10,
    fillblank: 10,
    match: 6,
    numerical: 10,
    image: 6,
    short: 10,
    logic: 8,
    multiselect: 8,
    ordering: 7
  },
  // Maths, Physics, Chemistry: 22, 8, 8, 5, 18, 6, 8, 8, 9, 8
  mpc: {
    mcq: 22,
    truefalse: 8,
    fillblank: 8,
    match: 5,
    numerical: 18,
    image: 6,
    short: 8,
    logic: 8,
    multiselect: 9,
    ordering: 8
  },
  // Biology: 24, 10, 10, 6, 5, 12, 10, 5, 8, 10
  biology: {
    mcq: 24,
    truefalse: 10,
    fillblank: 10,
    match: 6,
    numerical: 5,
    image: 12,
    short: 10,
    logic: 5,
    multiselect: 8,
    ordering: 10
  },
  // Hindi, English: 28, 10, 14, 8, 3, 6, 12, 6, 8, 5
  languages: {
    mcq: 28,
    truefalse: 10,
    fillblank: 14,
    match: 8,
    numerical: 3,
    image: 6,
    short: 12,
    logic: 6,
    multiselect: 8,
    ordering: 5
  }
};

export function getSubjectGroup(subject: string): SubjectGroup | null {
  const s = subject.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (
    s === 'gk' ||
    s.includes('generalknowledge') ||
    s === 'cs' ||
    s.includes('computer') ||
    s.includes('it') ||
    s.includes('infotech')
  ) {
    return 'gk_cs';
  }
  if (s.includes('math') || s.includes('physic') || s.includes('chem')) {
    return 'mpc';
  }
  if (s.includes('bio')) {
    return 'biology';
  }
  if (s.includes('hindi') || s.includes('english')) {
    return 'languages';
  }
  return null;
}

export interface QuestionItemRef {
  id: string;
  className: number;
  subject: string;
  question: string;
  file: string;
}

export function validateCrossClassDuplicates(allQuestions: QuestionItemRef[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const normalizedList: { item: QuestionItemRef; norm: string }[] = [];

  for (const item of allQuestions) {
    const norm = normalizeText(item.question);
    for (const prev of normalizedList) {
      if (prev.item.className !== item.className) {
        if (isNearDuplicate(norm, prev.norm)) {
          issues.push({
            severity: 'error',
            questionId: item.id,
            field: 'question',
            message: `CROSS-CLASS near-duplicate detected between Class ${item.className} (${item.id} in ${item.file}) and Class ${prev.item.className} (${prev.item.id} in ${prev.item.file}): "${item.question.substring(0, 70)}..."`
          });
        }
      }
    }
    normalizedList.push({ item, norm });
  }

  return issues;
}

export function validateQuestionBank(
  questions: any[],
  fileName: string,
  options: { requireExact100?: boolean; allowPartial?: boolean } = {}
): BankValidationReport {
  const issues: ValidationIssue[] = [];
  const typeCounts: Record<QuestionType, number> = {
    mcq: 0,
    truefalse: 0,
    fillblank: 0,
    match: 0,
    numerical: 0,
    image: 0,
    short: 0,
    logic: 0,
    multiselect: 0,
    ordering: 0
  };
  const difficultyCounts: Record<Difficulty, number> = {
    easy: 0,
    medium: 0,
    hard: 0
  };

  const idSet = new Set<string>();
  const normalizedTexts: { id: string; text: string }[] = [];

  // Parse class and subject from filename or first question
  let className = 9;
  let subject = 'unknown';

  if (questions.length > 0) {
    className = questions[0].class || 9;
    subject = questions[0].subject || 'unknown';
  } else {
    issues.push({
      severity: 'error',
      message: 'Question bank file is empty.'
    });
  }

  if (options.requireExact100 && questions.length !== 100) {
    issues.push({
      severity: 'error',
      message: `File has ${questions.length} questions, expected exactly 100.`
    });
  } else if (!options.allowPartial && questions.length !== 100) {
    issues.push({
      severity: 'error',
      message: `File has ${questions.length} questions, expected exactly 100 (pass --allow-partial for in-progress files).`
    });
  }

  if (questions.length > 100) {
    issues.push({
      severity: 'error',
      message: `File has ${questions.length} questions, maximum 100 allowed.`
    });
  }

  const isHindiSubject = subject.toLowerCase() === 'hindi';
  let foundDevanagari = false;

  questions.forEach((q, index) => {
    const qId = q.id || `index_${index}`;

    // 1. ID checks
    if (!q.id) {
      issues.push({
        severity: 'error',
        questionId: qId,
        field: 'id',
        message: 'Missing question id.'
      });
    } else if (idSet.has(q.id)) {
      issues.push({
        severity: 'error',
        questionId: q.id,
        field: 'id',
        message: `Duplicate question id "${q.id}".`
      });
    } else {
      idSet.add(q.id);
    }

    // 2. Metadata checks
    if (!q.chapter || typeof q.chapter !== 'string' || q.chapter.trim() === '') {
      issues.push({
        severity: 'error',
        questionId: qId,
        field: 'chapter',
        message: 'Missing or empty chapter.'
      });
    }

    if (!q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty)) {
      issues.push({
        severity: 'error',
        questionId: qId,
        field: 'difficulty',
        message: `Invalid difficulty "${q.difficulty}". Must be easy, medium, or hard.`
      });
    } else {
      difficultyCounts[q.difficulty as Difficulty]++;
    }

    if (!q.question || typeof q.question !== 'string' || q.question.trim().length < 5) {
      issues.push({
        severity: 'error',
        questionId: qId,
        field: 'question',
        message: 'Question text is missing, too short, or empty.'
      });
    } else {
      // Check for Devanagari in Hindi questions
      if (DEVANAGARI_REGEX.test(q.question)) {
        foundDevanagari = true;
      }

      // Check near-duplicate question text
      const norm = normalizeText(q.question);
      for (const prev of normalizedTexts) {
        if (isNearDuplicate(norm, prev.text)) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'question',
            message: `Question text is duplicate or near-duplicate of question "${prev.id}".`
          });
          break;
        }
      }
      normalizedTexts.push({ id: qId, text: norm });
    }

    if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length < 5) {
      issues.push({
        severity: 'error',
        questionId: qId,
        field: 'explanation',
        message: 'Explanation is missing or too short.'
      });
    }

    // 3. Type-specific rules
    const validTypes: QuestionType[] = [
      'mcq',
      'truefalse',
      'fillblank',
      'match',
      'numerical',
      'image',
      'short',
      'logic',
      'multiselect',
      'ordering'
    ];

    if (!validTypes.includes(q.type)) {
      issues.push({
        severity: 'error',
        questionId: qId,
        field: 'type',
        message: `Invalid question type "${q.type}".`
      });
      return;
    }

    typeCounts[q.type as QuestionType]++;

    switch (q.type as QuestionType) {
      case 'mcq': {
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'options',
            message: `MCQ must have exactly 4 options, found ${q.options?.length || 0}.`
          });
        }
        if (
          typeof q.answer !== 'number' ||
          q.answer < 0 ||
          q.answer > 3 ||
          !Number.isInteger(q.answer)
        ) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'answer',
            message: `MCQ answer must be integer index (0-3), found ${JSON.stringify(q.answer)}.`
          });
        }
        break;
      }

      case 'truefalse': {
        if (typeof q.answer !== 'boolean') {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'answer',
            message: `True/False answer must be boolean (true/false), found ${JSON.stringify(q.answer)}.`
          });
        }
        if (!q.explanation || q.explanation.length < 10) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'explanation',
            message: 'True/False explanation must explain WHY the answer is true/false.'
          });
        }
        break;
      }

      case 'fillblank': {
        if (!q.question.includes('____')) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'question',
            message: 'Fill-in-the-blank question must contain "____" (4 underscores).'
          });
        }
        if (
          !q.acceptedAnswers ||
          !Array.isArray(q.acceptedAnswers) ||
          q.acceptedAnswers.length === 0
        ) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'acceptedAnswers',
            message: 'Fill-in-the-blank question must have non-empty acceptedAnswers array.'
          });
        }
        break;
      }

      case 'match': {
        if (!Array.isArray(q.pairs) || q.pairs.length < 4 || q.pairs.length > 6) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'pairs',
            message: `Match question must have 4-6 pairs, found ${q.pairs?.length || 0}.`
          });
        } else {
          for (let pIdx = 0; pIdx < q.pairs.length; pIdx++) {
            const pair = q.pairs[pIdx];
            if (!Array.isArray(pair) || pair.length !== 2 || !pair[0] || !pair[1]) {
              issues.push({
                severity: 'error',
                questionId: qId,
                field: 'pairs',
                message: `Pair at index ${pIdx} is invalid. Must be [left, right] strings.`
              });
            }
          }
        }
        break;
      }

      case 'numerical': {
        const numAns = Number(q.answer);
        if (isNaN(numAns)) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'answer',
            message: `Numerical answer must be a valid number, found ${JSON.stringify(q.answer)}.`
          });
        }
        if (q.tolerance !== undefined && (typeof q.tolerance !== 'number' || q.tolerance < 0)) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'tolerance',
            message: 'Numerical tolerance must be a non-negative number.'
          });
        }
        break;
      }

      case 'image': {
        if (!q.image || !q.image.src) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'image',
            message: 'Image question must have image object with "src".'
          });
        } else if (q.image.kind === 'svg') {
          const src = q.image.src.trim();
          if (!src.startsWith('<svg') || !src.endsWith('</svg>')) {
            issues.push({
              severity: 'error',
              questionId: qId,
              field: 'image.src',
              message: 'Inline SVG image must start with <svg and end with </svg>.'
            });
          }
        }
        break;
      }

      case 'short': {
        if (
          !q.acceptedAnswers ||
          !Array.isArray(q.acceptedAnswers) ||
          q.acceptedAnswers.length === 0
        ) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'acceptedAnswers',
            message: 'Short answer question must have acceptedAnswers array.'
          });
        }
        if (!q.keywords || !Array.isArray(q.keywords) || q.keywords.length === 0) {
          issues.push({
            severity: 'warning',
            questionId: qId,
            field: 'keywords',
            message: 'Short answer question recommended to have keywords for lenient grading.'
          });
        }
        break;
      }

      case 'logic': {
        if (q.options && Array.isArray(q.options)) {
          if (typeof q.answer !== 'number' && typeof q.answer !== 'string') {
            issues.push({
              severity: 'error',
              questionId: qId,
              field: 'answer',
              message: 'Logic MCQ question answer must be option index or value.'
            });
          }
        } else {
          if (q.answer === undefined || q.answer === null) {
            issues.push({
              severity: 'error',
              questionId: qId,
              field: 'answer',
              message: 'Logic question must have an answer.'
            });
          }
        }
        break;
      }

      case 'multiselect': {
        if (!Array.isArray(q.options) || q.options.length < 4 || q.options.length > 6) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'options',
            message: `Multiselect question must have 4-6 options, found ${q.options?.length || 0}.`
          });
        }
        if (!Array.isArray(q.answer) || q.answer.length < 2) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'answer',
            message: `Multiselect question must have at least 2 correct answers, found ${Array.isArray(q.answer) ? q.answer.length : 0}.`
          });
        } else {
          // Verify indices are valid
          for (const idx of q.answer) {
            if (typeof idx !== 'number' || idx < 0 || (q.options && idx >= q.options.length)) {
              issues.push({
                severity: 'error',
                questionId: qId,
                field: 'answer',
                message: `Multiselect answer index ${idx} is out of bounds for options length ${q.options?.length}.`
              });
            }
          }
        }
        break;
      }

      case 'ordering': {
        if (!Array.isArray(q.orderedItems) || q.orderedItems.length < 4 || q.orderedItems.length > 7) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'orderedItems',
            message: `Ordering question must have 4-7 orderedItems, found ${q.orderedItems?.length || 0}.`
          });
        }
        break;
      }
    }
  });

  if (isHindiSubject && !foundDevanagari && questions.length > 0) {
    issues.push({
      severity: 'error',
      message: 'Hindi question bank contains no Devanagari text! Hindi questions must be in Devanagari.'
    });
  }

  // Type distribution check when a file has 100 questions (or when strict 100 is requested)
  if (questions.length === 100) {
    const group = getSubjectGroup(subject);
    if (group && EXPECTED_DISTRIBUTIONS[group]) {
      const expected = EXPECTED_DISTRIBUTIONS[group];
      for (const [t, target] of Object.entries(expected) as [QuestionType, number][]) {
        const actual = typeCounts[t] || 0;
        if (actual < 3) {
          issues.push({
            severity: 'error',
            field: 'typeCounts',
            message: `Type "${t}" has only ${actual} question(s). Every type must appear at least 3 times in every file.`
          });
        }
        if (Math.abs(actual - target) > 2) {
          issues.push({
            severity: 'error',
            field: 'typeCounts',
            message: `Type "${t}" count is ${actual}, expected target ${target} (±2 allowed, found diff of ${Math.abs(actual - target)}).`
          });
        }
      }
    }
  }

  const errors = issues.filter(i => i.severity === 'error');

  return {
    file: fileName,
    className,
    subject,
    totalQuestions: questions.length,
    typeCounts,
    difficultyCounts,
    issues,
    isValid: errors.length === 0
  };
}
