import { Question } from '../types/quiz';

export interface EvaluationResult {
  isCorrect: boolean;
  score: number; // 0 to 1
  feedback: string;
  isPartial?: boolean;
}

// Unicode and whitespace normalization (safe for English & Devanagari)
export function normalizeAnswerText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function evaluateAnswer(
  question: Question,
  userAnswer: any,
  selfGradedCorrect = false
): EvaluationResult {
  if (selfGradedCorrect) {
    return {
      isCorrect: true,
      score: 1.0,
      feedback: 'Self-graded as correct by student.'
    };
  }

  if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
    return {
      isCorrect: false,
      score: 0,
      feedback: 'Question skipped or unattempted.'
    };
  }

  switch (question.type) {
    case 'mcq': {
      const isCorrect = Number(userAnswer) === Number(question.answer);
      return {
        isCorrect,
        score: isCorrect ? 1.0 : 0,
        feedback: isCorrect ? 'Correct option chosen!' : 'Incorrect option chosen.'
      };
    }

    case 'truefalse': {
      const userBool = userAnswer === true || userAnswer === 'true';
      const ansBool = question.answer === true || question.answer === 'true';
      const isCorrect = userBool === ansBool;
      return {
        isCorrect,
        score: isCorrect ? 1.0 : 0,
        feedback: isCorrect ? 'Correct!' : 'Incorrect.'
      };
    }

    case 'fillblank': {
      const normUser = normalizeAnswerText(String(userAnswer));
      const candidates = [
        String(question.answer),
        ...(question.acceptedAnswers || [])
      ].map(normalizeAnswerText);

      const normUserNoSpace = normUser.replace(/\s+/g, '');
      const isCorrect = candidates.some(
        c => c === normUser || (normUserNoSpace.length > 0 && c.replace(/\s+/g, '') === normUserNoSpace)
      );
      return {
        isCorrect,
        score: isCorrect ? 1.0 : 0,
        feedback: isCorrect ? 'Correct answer!' : `Expected: ${question.acceptedAnswers?.[0] || question.answer}`
      };
    }

    case 'match': {
      // userAnswer is an array of [left, right] or record { left: right }
      const pairs = question.pairs || [];
      if (pairs.length === 0) return { isCorrect: true, score: 1.0, feedback: 'OK' };

      let correctPairsCount = 0;
      if (Array.isArray(userAnswer)) {
        for (const [uLeft, uRight] of userAnswer) {
          const match = pairs.find(([pLeft, pRight]) => pLeft === uLeft && pRight === uRight);
          if (match) correctPairsCount++;
        }
      } else if (typeof userAnswer === 'object') {
        for (const [pLeft, pRight] of pairs) {
          if (userAnswer[pLeft] === pRight) correctPairsCount++;
        }
      }

      const fraction = correctPairsCount / pairs.length;
      const isCorrect = fraction === 1.0;
      return {
        isCorrect,
        score: fraction,
        isPartial: fraction > 0 && fraction < 1,
        feedback: isCorrect
          ? 'All pairs matched correctly!'
          : `Matched ${correctPairsCount} of ${pairs.length} pairs correctly.`
      };
    }

    case 'numerical': {
      const userNum = parseFloat(String(userAnswer).replace(/[^0-9.-]/g, ''));
      const targetNum = Number(question.answer);
      const tolerance = question.tolerance ?? 0.02;

      if (isNaN(userNum) || isNaN(targetNum)) {
        return { isCorrect: false, score: 0, feedback: 'Invalid numerical input.' };
      }

      const isCorrect = Math.abs(userNum - targetNum) <= tolerance;
      return {
        isCorrect,
        score: isCorrect ? 1.0 : 0,
        feedback: isCorrect
          ? 'Calculated answer within allowed tolerance!'
          : `Expected: ${targetNum}${question.unit ? ` ${question.unit}` : ''}`
      };
    }

    case 'image': {
      if (question.options && question.options.length > 0) {
        const isCorrect = Number(userAnswer) === Number(question.answer);
        return {
          isCorrect,
          score: isCorrect ? 1.0 : 0,
          feedback: isCorrect ? 'Correct option!' : 'Incorrect option.'
        };
      } else {
        const normUser = normalizeAnswerText(String(userAnswer));
        const candidates = [
          String(question.answer),
          ...(question.acceptedAnswers || [])
        ].map(normalizeAnswerText);
        const isCorrect = candidates.some(c => c === normUser);
        return {
          isCorrect,
          score: isCorrect ? 1.0 : 0,
          feedback: isCorrect ? 'Correct diagram answer!' : `Expected: ${question.answer}`
        };
      }
    }

    case 'short': {
      const normUser = normalizeAnswerText(String(userAnswer));
      const candidates = (question.acceptedAnswers || [String(question.answer)]).map(
        normalizeAnswerText
      );

      // Check exact / substring candidate matches
      const exactMatch = candidates.some(c => normUser === c || normUser.includes(c));
      if (exactMatch) {
        return { isCorrect: true, score: 1.0, feedback: 'Correct answer!' };
      }

      // Check keywords leniently
      const keywords = (question.keywords || []).map(normalizeAnswerText);
      if (keywords.length > 0) {
        let matchedKeywords = 0;
        for (const kw of keywords) {
          if (normUser.includes(kw)) matchedKeywords++;
        }
        const keywordFraction = matchedKeywords / keywords.length;
        if (keywordFraction >= 0.6) {
          return {
            isCorrect: true,
            score: 1.0,
            feedback: 'Key conceptual points included!'
          };
        } else if (keywordFraction > 0) {
          return {
            isCorrect: false,
            score: 0.5,
            isPartial: true,
            feedback: 'Partially correct concepts present.'
          };
        }
      }

      return {
        isCorrect: false,
        score: 0,
        feedback: 'Answer does not match key concepts. You can self-grade if you were close.'
      };
    }

    case 'logic': {
      if (question.options && question.options.length > 0) {
        const isCorrect = Number(userAnswer) === Number(question.answer);
        return {
          isCorrect,
          score: isCorrect ? 1.0 : 0,
          feedback: isCorrect ? 'Logical deduction correct!' : 'Incorrect deduction.'
        };
      } else {
        const normUser = normalizeAnswerText(String(userAnswer));
        const ansNorm = normalizeAnswerText(String(question.answer));
        const isCorrect = normUser === ansNorm;
        return {
          isCorrect,
          score: isCorrect ? 1.0 : 0,
          feedback: isCorrect ? 'Correct puzzle answer!' : `Expected: ${question.answer}`
        };
      }
    }

    case 'multiselect': {
      const correctIndices = (Array.isArray(question.answer)
        ? question.answer
        : [Number(question.answer)]
      ).map(Number);
      const userIndices = (Array.isArray(userAnswer) ? userAnswer : [Number(userAnswer)]).map(
        Number
      );

      const correctSet = new Set(correctIndices);
      let studentCorrect = 0;
      let studentWrong = 0;

      for (const idx of userIndices) {
        if (correctSet.has(idx)) {
          studentCorrect++;
        } else {
          studentWrong++;
        }
      }

      // Partial credit formula: max(0, (studentCorrect - studentWrong) / totalCorrect)
      const fraction = Math.max(0, (studentCorrect - studentWrong) / correctSet.size);
      const isCorrect = fraction === 1.0 && studentWrong === 0;

      return {
        isCorrect,
        score: fraction,
        isPartial: fraction > 0 && fraction < 1,
        feedback: isCorrect
          ? 'All correct options selected!'
          : `Selected ${studentCorrect} correct and ${studentWrong} incorrect options.`
      };
    }

    case 'ordering': {
      // Target order is question.orderedItems
      const targetItems = question.orderedItems || [];
      const userItems = Array.isArray(userAnswer) ? userAnswer : [];

      if (userItems.length !== targetItems.length) {
        return { isCorrect: false, score: 0, feedback: 'Incorrect number of items ordered.' };
      }

      let inCorrectPosition = 0;
      for (let i = 0; i < targetItems.length; i++) {
        if (targetItems[i] === userItems[i]) {
          inCorrectPosition++;
        }
      }

      const fraction = inCorrectPosition / targetItems.length;
      const isCorrect = fraction === 1.0;
      return {
        isCorrect,
        score: fraction,
        isPartial: fraction > 0 && fraction < 1,
        feedback: isCorrect
          ? 'Perfect chronological / logical order!'
          : `${inCorrectPosition} of ${targetItems.length} items placed in correct position.`
      };
    }

    default:
      return { isCorrect: false, score: 0, feedback: 'Unknown question type.' };
  }
}
