// Server-Side Evaluator for all 10 question types in QuizForge

export interface QuestionData {
  id: string;
  type: string;
  marks: number;
}

export interface QuestionAnswerData {
  question_id: string;
  answer: any;
  accepted_answers?: string[];
  keywords?: string[];
  tolerance?: number;
  pairs?: [string, string][];
  ordered_items?: string[];
  explanation: string;
}

export interface EvaluationItemResult {
  questionId: string;
  isCorrect: boolean;
  score: number; // 0 to 1 ratio
  marksAwarded: number;
  feedback: string;
}

// Devanagari Hindi tolerance normalization: NFC, anusvar/panchamakshar, chandrabindu, and nukta
export function normalizeHindiDevanagari(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFC')
    .replace(/\u093C/g, '') // Remove Nukta
    .replace(/\u0901/g, '\u0902') // Chandrabindu to Anusvar
    .replace(/[ङञणनम]\u094D(?=[क-ह])/g, '\u0902'); // Nasals before consonants to Anusvar
}

export function normalizeAnswerText(text: string): string {
  if (!text) return '';
  const cleaned = text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’।॥]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeHindiDevanagari(cleaned);
}

export function evaluateQuestionServer(
  q: QuestionData,
  qa: QuestionAnswerData,
  userResponse: any,
  applyNegativeMarking = false
): EvaluationItemResult {
  const baseMarks = Number(q.marks) || 1;

  if (userResponse === undefined || userResponse === null || userResponse === '') {
    return {
      questionId: q.id,
      isCorrect: false,
      score: 0,
      marksAwarded: 0, // Unattempted does not incur negative penalty
      feedback: 'Unattempted'
    };
  }

  let isCorrect = false;
  let score = 0; // 0 to 1
  let feedback = '';

  switch (q.type) {
    case 'mcq':
    case 'logic':
    case 'image': {
      isCorrect = Number(userResponse) === Number(qa.answer);
      score = isCorrect ? 1.0 : 0;
      feedback = isCorrect ? 'Correct option' : 'Incorrect option';
      break;
    }

    case 'truefalse': {
      const userBool = userResponse === true || userResponse === 'true';
      const ansBool = qa.answer === true || qa.answer === 'true';
      isCorrect = userBool === ansBool;
      score = isCorrect ? 1.0 : 0;
      feedback = isCorrect ? 'Correct' : 'Incorrect';
      break;
    }

    case 'fillblank': {
      const normUser = normalizeAnswerText(String(userResponse));
      const candidates = [
        String(qa.answer),
        ...(qa.accepted_answers || qa.acceptedAnswers || [])
      ].map(normalizeAnswerText);

      const normUserNoSpace = normUser.replace(/\s+/g, '');
      isCorrect = candidates.some(
        c => c === normUser || (normUserNoSpace.length > 0 && c.replace(/\s+/g, '') === normUserNoSpace)
      );
      score = isCorrect ? 1.0 : 0;
      feedback = isCorrect ? 'Correct text' : 'Incorrect text';
      break;
    }

    case 'match': {
      // userResponse is expected to be [ [left, right], ... ]
      const correctPairs = qa.pairs || [];
      if (correctPairs.length === 0) {
        isCorrect = true;
        score = 1.0;
        break;
      }

      let correctCount = 0;
      if (Array.isArray(userResponse)) {
        for (const [uLeft, uRight] of userResponse) {
          const matched = correctPairs.some(
            ([cLeft, cRight]) => cLeft.trim() === String(uLeft).trim() && cRight.trim() === String(uRight).trim()
          );
          if (matched) correctCount++;
        }
      }

      score = correctCount / correctPairs.length;
      isCorrect = score === 1.0;
      feedback = `${correctCount} of ${correctPairs.length} pairs matched`;
      break;
    }

    case 'numerical': {
      const numUser = parseFloat(String(userResponse).trim());
      const numAns = parseFloat(String(qa.answer));
      const tol = qa.tolerance !== undefined ? Number(qa.tolerance) : 0;

      if (!isNaN(numUser) && !isNaN(numAns)) {
        isCorrect = Math.abs(numUser - numAns) <= tol;
      }
      score = isCorrect ? 1.0 : 0;
      feedback = isCorrect ? 'Correct value' : 'Value out of tolerance';
      break;
    }

    case 'short': {
      const normUser = normalizeAnswerText(String(userResponse));
      const candidates = [
        String(qa.answer),
        ...(qa.accepted_answers || qa.acceptedAnswers || [])
      ].map(normalizeAnswerText);

      if (candidates.some(c => c === normUser)) {
        isCorrect = true;
        score = 1.0;
        feedback = 'Exact accepted answer matched';
      } else {
        // Lenient keyword checking
        const keywords = (qa.keywords || []).map(normalizeAnswerText).filter(Boolean);
        if (keywords.length > 0) {
          const matchedKeywords = keywords.filter(kw => normUser.includes(kw));
          const kwRatio = matchedKeywords.length / keywords.length;
          if (kwRatio >= 0.6) {
            isCorrect = true;
            score = Math.min(1.0, kwRatio);
            feedback = `Keywords matched (${matchedKeywords.length}/${keywords.length})`;
          } else if (kwRatio > 0) {
            isCorrect = false;
            score = kwRatio * 0.5; // partial credit
            feedback = `Partial keywords matched (${matchedKeywords.length}/${keywords.length})`;
          } else {
            isCorrect = false;
            score = 0;
            feedback = 'No keywords matched';
          }
        } else {
          isCorrect = false;
          score = 0;
          feedback = 'Answer did not match';
        }
      }
      break;
    }

    case 'multiselect': {
      const correctIndices = Array.isArray(qa.answer) ? qa.answer.map(Number) : [];
      const userIndices = Array.isArray(userResponse) ? userResponse.map(Number) : [];

      if (correctIndices.length === 0) {
        isCorrect = true;
        score = 1.0;
        break;
      }

      let correctChosen = 0;
      let wrongChosen = 0;

      for (const idx of userIndices) {
        if (correctIndices.includes(idx)) {
          correctChosen++;
        } else {
          wrongChosen++;
        }
      }

      const fraction = (correctChosen - wrongChosen) / correctIndices.length;
      score = Math.max(0, Math.min(1.0, fraction));
      isCorrect = score === 1.0;
      feedback = `${correctChosen}/${correctIndices.length} correct, ${wrongChosen} incorrect choices`;
      break;
    }

    case 'ordering': {
      const correctOrder = qa.ordered_items || qa.orderedItems || [];
      if (!Array.isArray(userResponse) || correctOrder.length === 0) {
        isCorrect = false;
        score = 0;
        break;
      }

      let matchCount = 0;
      for (let i = 0; i < correctOrder.length; i++) {
        if (userResponse[i] === correctOrder[i]) {
          matchCount++;
        }
      }

      score = matchCount / correctOrder.length;
      isCorrect = score === 1.0;
      feedback = `${matchCount} of ${correctOrder.length} items in correct position`;
      break;
    }

    default: {
      isCorrect = String(userResponse).trim() === String(qa.answer).trim();
      score = isCorrect ? 1.0 : 0;
      feedback = isCorrect ? 'Correct' : 'Incorrect';
    }
  }

  let marksAwarded = score * baseMarks;
  if (!isCorrect && score === 0 && applyNegativeMarking) {
    marksAwarded = -0.25 * baseMarks;
  }

  return {
    questionId: q.id,
    isCorrect,
    score,
    marksAwarded: Math.round(marksAwarded * 100) / 100,
    feedback
  };
}
