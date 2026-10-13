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

export type SubjectGroup = 'gk_cs' | 'mpc' | 'biology' | 'languages' | 'hindi';

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
  // English: 28, 10, 14, 8, 3, 6, 12, 6, 8, 5
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
  },
  // Hindi Phase 7 Total: 33, 8, 13, 7, 3, 4, 12, 5, 9, 6 = 100
  hindi: {
    mcq: 33,
    truefalse: 8,
    fillblank: 13,
    match: 7,
    numerical: 3,
    image: 4,
    short: 12,
    logic: 5,
    multiselect: 9,
    ordering: 6
  }
};

export const HINDI_VYAKARAN_DISTRIBUTION: Record<QuestionType, number> = {
  mcq: 23,
  truefalse: 4,
  fillblank: 10,
  match: 7,
  numerical: 3,
  image: 4,
  short: 4,
  logic: 5,
  multiselect: 6,
  ordering: 4
};

export const HINDI_PASSAGE_DISTRIBUTION: Record<QuestionType, number> = {
  mcq: 10,
  truefalse: 4,
  fillblank: 3,
  match: 0,
  numerical: 0,
  image: 0,
  short: 8,
  logic: 0,
  multiselect: 3,
  ordering: 2
};

export const ALLOWED_HINDI_CHAPTERS: Record<number, string[]> = {
  9: [
    'वर्ण विचार',
    'संज्ञा, सर्वनाम और विशेषण',
    'क्रिया और अविकारी शब्द',
    'लिंग और वचन',
    'कारक',
    'काल',
    'उपसर्ग और प्रत्यय',
    'संधि',
    'समास',
    'मुहावरे और लोकोक्तियाँ',
    'पर्यायवाची, विलोम और अनेकार्थी शब्द',
    'अनेक शब्दों के लिए एक शब्द',
    'शब्द शुद्धि और वाक्य शुद्धि',
    'अलंकार',
    'रस',
    'पत्र, अनुच्छेद, विज्ञापन और सूचना लेखन',
    'अपठित गद्यांश',
    'अपठित पद्यांश'
  ],
  10: [
    'पद परिचय',
    'रचना के आधार पर वाक्य भेद',
    'अर्थ के आधार पर वाक्य भेद',
    'वाच्य',
    'काल, कारक और विराम चिह्न',
    'संधि',
    'समास',
    'उपसर्ग और प्रत्यय',
    'रस',
    'अलंकार',
    'मुहावरे और लोकोक्तियाँ',
    'पर्यायवाची, विलोम, अनेकार्थी और श्रुतिसम भिन्नार्थक शब्द',
    'शब्द शुद्धि और वाक्य शुद्धि',
    'पत्र, सूचना, विज्ञापन, संदेश और अनुच्छेद लेखन',
    'अपठित गद्यांश',
    'अपठित पद्यांश'
  ],
  11: [
    'रस (स्थायी भाव, विभाव, अनुभाव, संचारी भाव)',
    'छंद',
    'अलंकार',
    'शब्द शक्ति',
    'वाक्य भेद और वाक्य रूपांतरण',
    'वाच्य',
    'पद परिचय',
    'समास',
    'संधि',
    'उपसर्ग, प्रत्यय (कृत् और तद्धित)',
    'शब्द भंडार (तत्सम, तद्भव, देशज, विदेशी)',
    'मुहावरे और लोकोक्तियाँ',
    'पर्यायवाची, विलोम, अनेकार्थी, श्रुतिसम भिन्नार्थक और युग्म शब्द',
    'शब्द शुद्धि, वाक्य शुद्धि और वर्तनी',
    'पत्र, प्रतिवेदन, अनुच्छेद, विज्ञापन और सूचना लेखन',
    'अपठित गद्यांश',
    'अपठित पद्यांश'
  ],
  12: [
    'रस (स्थायी भाव, विभाव, अनुभाव, संचारी भाव)',
    'छंद',
    'अलंकार',
    'शब्द शक्ति',
    'वाक्य भेद और वाक्य रूपांतरण',
    'वाच्य',
    'पद परिचय',
    'समास',
    'संधि',
    'उपसर्ग, प्रत्यय (कृत् और तद्धित)',
    'शब्द भंडार (तत्सम, तद्भव, देशज, विदेशी)',
    'मुहावरे और लोकोक्तियाँ',
    'पर्यायवाची, विलोम, अनेकार्थी, श्रुतिसम भिन्नार्थक और युग्म शब्द',
    'शब्द शुद्धि, वाक्य शुद्धि और वर्तनी',
    'पत्र, प्रतिवेदन, अनुच्छेद, विज्ञापन और सूचना लेखन',
    'अपठित गद्यांश',
    'अपठित पद्यांश'
  ]
};

export const BANNED_HINDI_LITERATURE_WORDS = [
  'kshitij', 'kritika', 'sparsh', 'sanchayan', 'aroh', 'vitan', 'antra', 'antral',
  'क्षितिज', 'कृतिका', 'स्पर्श', 'संचयन', 'आरोह', 'वितान', 'अंतरा', 'अंतराल'
];

export const PASSAGE_RANGES: Record<number, { gadyaWords: [number, number]; padyaLines: [number, number] }> = {
  9: { gadyaWords: [120, 170], padyaLines: [8, 10] },
  10: { gadyaWords: [160, 220], padyaLines: [8, 12] },
  11: { gadyaWords: [200, 280], padyaLines: [10, 14] },
  12: { gadyaWords: [250, 320], padyaLines: [12, 16] }
};

export function getDevanagariRatio(text: string): number {
  if (!text) return 1.0;
  // Remove SVG markup and HTML tags
  const noSvg = text.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<[^>]+>/g, '');
  // Match all Unicode letters
  const letters = noSvg.match(/\p{L}/gu) || [];
  if (letters.length === 0) return 1.0;
  let devanagariCount = 0;
  for (const ch of letters) {
    if (DEVANAGARI_REGEX.test(ch)) {
      devanagariCount++;
    }
  }
  return devanagariCount / letters.length;
}

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
  if (s.includes('hindi')) {
    return 'hindi';
  }
  if (s.includes('english')) {
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

export interface PassageValidationReport {
  id: string;
  class: number;
  kind: 'gadya' | 'padya';
  title: string;
  wordCount: number;
  lineCount: number;
  linkedQuestionCount: number;
  issues: ValidationIssue[];
  isValid: boolean;
}

export function validatePassages(
  passages: any[],
  className: number,
  linkedQuestions: any[] = [],
  options: { allowPartial?: boolean } = {}
): { reports: PassageValidationReport[]; fileIssues: ValidationIssue[]; isValid: boolean } {
  const reports: PassageValidationReport[] = [];
  const fileIssues: ValidationIssue[] = [];
  const range = PASSAGE_RANGES[className] || { gadyaWords: [120, 170], padyaLines: [8, 10] };

  if (!Array.isArray(passages)) {
    fileIssues.push({
      severity: 'error',
      message: `Passages data for Class ${className} is not an array.`
    });
    return { reports, fileIssues, isValid: false };
  }

  if (!options.allowPartial && passages.length !== 6) {
    fileIssues.push({
      severity: 'error',
      message: `Class ${className} must have exactly 6 unseen passages, found ${passages.length}.`
    });
  }

  let gadyaCount = 0;
  let padyaCount = 0;
  const pIdSet = new Set<string>();

  for (const p of passages) {
    const issues: ValidationIssue[] = [];
    const pId = p.id || 'missing_id';

    if (!p.id) {
      issues.push({ severity: 'error', message: 'Passage is missing an id.' });
    } else if (pIdSet.has(p.id)) {
      issues.push({ severity: 'error', message: `Duplicate passage id "${p.id}".` });
    } else {
      pIdSet.add(p.id);
    }

    if (!p.title || typeof p.title !== 'string' || p.title.trim().length === 0) {
      issues.push({ severity: 'error', message: `Passage "${pId}" is missing a teacher title.` });
    }

    const kind = p.kind;
    if (kind !== 'gadya' && kind !== 'padya') {
      issues.push({
        severity: 'error',
        message: `Passage "${pId}" has invalid kind "${kind}". Must be 'gadya' or 'padya'.`
      });
    } else if (kind === 'gadya') {
      gadyaCount++;
    } else if (kind === 'padya') {
      padyaCount++;
    }

    const content = typeof p.content === 'string' ? p.content : '';
    if (!content.trim()) {
      issues.push({ severity: 'error', message: `Passage "${pId}" has empty content.` });
    }

    // Word and line counts
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const lines = content.trim().split('\n').map((l: string) => l.trim()).filter(Boolean).length;

    if (kind === 'gadya') {
      const [minW, maxW] = range.gadyaWords;
      if (words < minW || words > maxW) {
        issues.push({
          severity: 'error',
          message: `Gadya passage "${pId}" has ${words} words. Required range for Class ${className} is ${minW}-${maxW} words.`
        });
      }
    } else if (kind === 'padya') {
      const [minL, maxL] = range.padyaLines;
      if (lines < minL || lines > maxL) {
        issues.push({
          severity: 'error',
          message: `Padya passage "${pId}" has ${lines} lines. Required range for Class ${className} is ${minL}-${maxL} lines.`
        });
      }
    }

    // Banned literature words
    const lowerText = ((p.title || '') + ' ' + content).toLowerCase();
    for (const banned of BANNED_HINDI_LITERATURE_WORDS) {
      if (lowerText.includes(banned.toLowerCase())) {
        issues.push({
          severity: 'error',
          message: `Passage "${pId}" contains banned literature textbook term "${banned}".`
        });
      }
    }

    // Devanagari ratio >= 90%
    const ratio = getDevanagariRatio(content);
    if (ratio < 0.90) {
      issues.push({
        severity: 'error',
        message: `Passage "${pId}" Devanagari content is ${(ratio * 100).toFixed(1)}%, must be >= 90%.`
      });
    }

    // Linked questions count: exactly 5 questions
    const linked = linkedQuestions.filter(q => q.passageId === p.id);
    if (!options.allowPartial && linked.length !== 5) {
      issues.push({
        severity: 'error',
        message: `Passage "${pId}" has ${linked.length} linked questions, expected exactly 5.`
      });
    } else if (options.allowPartial && linked.length > 5) {
      issues.push({
        severity: 'error',
        message: `Passage "${pId}" has ${linked.length} linked questions, maximum 5 allowed.`
      });
    }

    reports.push({
      id: pId,
      class: className,
      kind: (kind === 'gadya' || kind === 'padya') ? kind : 'gadya',
      title: p.title || '',
      wordCount: words,
      lineCount: lines,
      linkedQuestionCount: linked.length,
      issues,
      isValid: issues.filter(i => i.severity === 'error').length === 0
    });
  }

  if (!options.allowPartial) {
    if (gadyaCount !== 4) {
      fileIssues.push({
        severity: 'error',
        message: `Class ${className} must have exactly 4 gadya passages, found ${gadyaCount}.`
      });
    }
    if (padyaCount !== 2) {
      fileIssues.push({
        severity: 'error',
        message: `Class ${className} must have exactly 2 padya passages, found ${padyaCount}.`
      });
    }
  }

  const allIssues = [...fileIssues, ...reports.flatMap(r => r.issues)];
  const errors = allIssues.filter(i => i.severity === 'error');

  return {
    reports,
    fileIssues,
    isValid: errors.length === 0
  };
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
    } else if (isHindiSubject) {
      const allowed = ALLOWED_HINDI_CHAPTERS[className] || [];
      if (!allowed.includes(q.chapter)) {
        issues.push({
          severity: 'error',
          questionId: qId,
          field: 'chapter',
          message: `Chapter "${q.chapter}" is not in the allowed Hindi syllabus for Class ${className}.`
        });
      }
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

    // Hindi-specific checks for banned terms, Devanagari ratio, and passage linkage
    if (isHindiSubject) {
      const combinedText = [
        q.question || '',
        q.explanation || '',
        q.chapter || '',
        Array.isArray(q.options) ? q.options.join(' ') : '',
        Array.isArray(q.pairs) ? q.pairs.map((p: any) => Array.isArray(p) ? `${p[0]} ${p[1]}` : `${p.left} ${p.right}`).join(' ') : '',
        Array.isArray(q.orderedItems) ? q.orderedItems.join(' ') : ''
      ].join(' ');

      const lowerCombined = combinedText.toLowerCase();
      for (const banned of BANNED_HINDI_LITERATURE_WORDS) {
        if (lowerCombined.includes(banned.toLowerCase())) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'literature_ban',
            message: `Contains banned textbook literature term "${banned}". Only pure grammar and unseen passages are allowed.`
          });
        }
      }

      const ratio = getDevanagariRatio(combinedText);
      if (ratio < 0.90) {
        issues.push({
          severity: 'error',
          questionId: qId,
          field: 'devanagari_ratio',
          message: `Devanagari character content is only ${(ratio * 100).toFixed(1)}% (minimum 90% required).`
        });
      }

      if (q.passageId) {
        if (typeof q.passageOrder !== 'number' || q.passageOrder < 1 || q.passageOrder > 5) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'passageOrder',
            message: `Passage question must have passageOrder 1-5, found ${q.passageOrder}.`
          });
        }
        if (q.chapter !== 'अपठित गद्यांश' && q.chapter !== 'अपठित पद्यांश') {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'chapter',
            message: `Passage question chapter must be 'अपठित गद्यांश' or 'अपठित पद्यांश', found '${q.chapter}'.`
          });
        }
      } else {
        if (q.chapter === 'अपठित गद्यांश' || q.chapter === 'अपठित पद्यांश') {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'chapter',
            message: `Non-passage question cannot have chapter '${q.chapter}'.`
          });
        }
      }
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
        const hasImageObj = q.image && q.image.src;
        const hasSvgProp = typeof q.imageSvg === 'string' && q.imageSvg.length > 0;
        if (!hasImageObj && !hasSvgProp) {
          issues.push({
            severity: 'error',
            questionId: qId,
            field: 'image',
            message: 'Image question must have image object with "src" or "imageSvg".'
          });
        } else {
          const rawSrc = hasSvgProp ? q.imageSvg : (q.image?.src || '');
          const isSvg = hasSvgProp || q.image?.kind === 'svg' || (typeof rawSrc === 'string' && rawSrc.includes('<svg'));
          if (isHindiSubject) {
            if (!isSvg || typeof rawSrc !== 'string' || !rawSrc.includes('<svg') || !rawSrc.includes('</svg>')) {
              issues.push({
                severity: 'error',
                questionId: qId,
                field: 'image',
                message: 'Hindi image questions must use valid inline SVG.'
              });
            } else {
              const textMatches = rawSrc.match(/<text[\s\S]*?<\/text>/gi) || [];
              if (textMatches.length > 0 && !textMatches.some(t => DEVANAGARI_REGEX.test(t))) {
                issues.push({
                  severity: 'error',
                  questionId: qId,
                  field: 'image',
                  message: 'SVG diagram text elements must contain Devanagari text.'
                });
              }
            }
          } else if (q.image?.kind === 'svg' && typeof rawSrc === 'string') {
            const src = rawSrc.trim();
            if (!src.startsWith('<svg') || !src.endsWith('</svg>')) {
              issues.push({
                severity: 'error',
                questionId: qId,
                field: 'image.src',
                message: 'Inline SVG image must start with <svg and end with </svg>.'
              });
            }
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
    if (isHindiSubject) {
      const vyakaranQs = questions.filter(q => !q.passageId);
      const passageQs = questions.filter(q => q.passageId);

      if (vyakaranQs.length !== 70) {
        issues.push({
          severity: 'error',
          field: 'passage_split',
          message: `Hindi file has ${vyakaranQs.length} Vyakaran questions, expected exactly 70.`
        });
      }
      if (passageQs.length !== 30) {
        issues.push({
          severity: 'error',
          field: 'passage_split',
          message: `Hindi file has ${passageQs.length} Passage questions, expected exactly 30.`
        });
      }

      // Check overall Hindi distribution (33/8/13/7/3/4/12/5/9/6 with +-2 tolerance)
      for (const [t, target] of Object.entries(EXPECTED_DISTRIBUTIONS.hindi) as [QuestionType, number][]) {
        const actual = typeCounts[t] || 0;
        if (Math.abs(actual - target) > 2) {
          issues.push({
            severity: 'error',
            field: 'typeCounts',
            message: `Hindi type "${t}" total count is ${actual}, expected target ${target} (±2 allowed, found diff of ${Math.abs(actual - target)}).`
          });
        }
      }

      // Vyakaran type distribution
      const vyakaranTypeCounts: Record<QuestionType, number> = {
        mcq: 0, truefalse: 0, fillblank: 0, match: 0, numerical: 0,
        image: 0, short: 0, logic: 0, multiselect: 0, ordering: 0
      };
      for (const q of vyakaranQs) {
        if (vyakaranTypeCounts[q.type as QuestionType] !== undefined) {
          vyakaranTypeCounts[q.type as QuestionType]++;
        }
      }
      for (const [t, target] of Object.entries(HINDI_VYAKARAN_DISTRIBUTION) as [QuestionType, number][]) {
        const actual = vyakaranTypeCounts[t] || 0;
        if (Math.abs(actual - target) > 2) {
          issues.push({
            severity: 'error',
            field: 'vyakaran_typeCounts',
            message: `Vyakaran type "${t}" count is ${actual}, expected target ${target} (±2 allowed, found diff of ${Math.abs(actual - target)}).`
          });
        }
      }

      // Passage type distribution
      const passageTypeCounts: Record<QuestionType, number> = {
        mcq: 0, truefalse: 0, fillblank: 0, match: 0, numerical: 0,
        image: 0, short: 0, logic: 0, multiselect: 0, ordering: 0
      };
      for (const q of passageQs) {
        if (passageTypeCounts[q.type as QuestionType] !== undefined) {
          passageTypeCounts[q.type as QuestionType]++;
        }
      }
      for (const [t, target] of Object.entries(HINDI_PASSAGE_DISTRIBUTION) as [QuestionType, number][]) {
        const actual = passageTypeCounts[t] || 0;
        if (Math.abs(actual - target) > 2) {
          issues.push({
            severity: 'error',
            field: 'passage_typeCounts',
            message: `Passage type "${t}" count is ${actual}, expected target ${target} (±2 allowed, found diff of ${Math.abs(actual - target)}).`
          });
        }
      }

      // Vyakaran chapters spread (>= 12 chapters, max 10 per chapter)
      const vyakaranChapters = new Set(vyakaranQs.map(q => q.chapter));
      if (vyakaranChapters.size < 12) {
        issues.push({
          severity: 'error',
          field: 'chapter_spread',
          message: `Vyakaran questions spread across only ${vyakaranChapters.size} chapters (minimum 12 required).`
        });
      }
      for (const ch of vyakaranChapters) {
        const count = vyakaranQs.filter(q => q.chapter === ch).length;
        if (count > 10) {
          issues.push({
            severity: 'error',
            field: 'chapter_count',
            message: `Vyakaran chapter "${ch}" has ${count} questions (maximum 10 allowed).`
          });
        }
      }

      // Passage groups check
      const pGroups = new Map<string, any[]>();
      for (const q of passageQs) {
        if (!pGroups.has(q.passageId)) pGroups.set(q.passageId, []);
        pGroups.get(q.passageId)!.push(q);
      }
      if (pGroups.size !== 6) {
        issues.push({
          severity: 'error',
          field: 'passage_groups',
          message: `Found ${pGroups.size} unique passage IDs in questions, expected exactly 6.`
        });
      }
      for (const [pId, pList] of pGroups) {
        if (pList.length !== 5) {
          issues.push({
            severity: 'error',
            field: 'passage_questions',
            message: `Passage "${pId}" has ${pList.length} questions, expected exactly 5.`
          });
        }
        const orders = pList.map(q => q.passageOrder).sort((a: number, b: number) => a - b);
        if (orders.join(',') !== '1,2,3,4,5') {
          issues.push({
            severity: 'error',
            field: 'passage_orders',
            message: `Passage "${pId}" question orders are [${orders.join(', ')}], must be exactly 1, 2, 3, 4, 5.`
          });
        }
        const distTypes = new Set(pList.map(q => q.type));
        if (distTypes.size < 3) {
          issues.push({
            severity: 'error',
            field: 'passage_types',
            message: `Passage "${pId}" has only ${distTypes.size} distinct question types, minimum 3 required.`
          });
        }
      }
    } else {
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
