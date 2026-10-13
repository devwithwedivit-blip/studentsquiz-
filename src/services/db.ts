import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Question, QuizResult, UserStats, ActiveQuizSession } from '../types/quiz';

export function notifyStorageFull(customMessage?: string): void {
  const msg =
    customMessage ||
    'Your browser storage is nearly full. Some quiz history or custom questions may not save permanently. Consider clearing past attempts or browser cache.';
  console.warn(msg);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('quizforge:storage-warning', { detail: { message: msg } })
    );
  }
}

interface QuizForgeDB extends DBSchema {
  questionOverlay: {
    key: string; // question id
    value: Question;
  };
  quizResults: {
    key: string; // attempt id
    value: QuizResult;
    indexes: { 'by-timestamp': number };
  };
  userStats: {
    key: string; // 'current'
    value: UserStats;
  };
  bookmarkedQuestions: {
    key: string; // question id
    value: { id: string; timestamp: number };
  };
}

const DB_NAME = 'quizforge_database';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<QuizForgeDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<QuizForgeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<QuizForgeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('questionOverlay')) {
          db.createObjectStore('questionOverlay', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('quizResults')) {
          const resultStore = db.createObjectStore('quizResults', { keyPath: 'id' });
          resultStore.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('userStats')) {
          db.createObjectStore('userStats');
        }
        if (!db.objectStoreNames.contains('bookmarkedQuestions')) {
          db.createObjectStore('bookmarkedQuestions', { keyPath: 'id' });
        }
      }
    });
  }
  return dbPromise;
}

// QUESTION OVERLAY OPERATIONS
export async function getOverlayQuestions(): Promise<Question[]> {
  try {
    const db = await getDB();
    return await db.getAll('questionOverlay');
  } catch (err) {
    console.error('Failed to get overlay questions:', err);
    return [];
  }
}

export async function saveOverlayQuestion(question: Question): Promise<void> {
  try {
    const db = await getDB();
    await db.put('questionOverlay', question);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError') {
      notifyStorageFull('Cannot save custom question: Browser storage quota exceeded.');
    } else {
      console.error('Error saving overlay question:', err);
    }
  }
}

export async function deleteOverlayQuestion(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('questionOverlay', id);
  } catch (err) {
    console.error('Error deleting overlay question:', err);
  }
}

export async function resetToOriginalBank(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('questionOverlay');
  } catch (err) {
    console.error('Error resetting overlay:', err);
  }
}

// QUIZ RESULTS & ATTEMPTS
export async function saveQuizResult(result: QuizResult): Promise<void> {
  try {
    const db = await getDB();
    await db.put('quizResults', result);
    await updateUserStatsAfterQuiz(result);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError') {
      notifyStorageFull('Cannot save quiz results: Browser storage quota exceeded.');
    } else {
      console.error('Error saving quiz result:', err);
    }
  }
}

export async function getAllQuizResults(): Promise<QuizResult[]> {
  const db = await getDB();
  const results = await db.getAllFromIndex('quizResults', 'by-timestamp');
  return results.reverse(); // Most recent first
}

export async function getQuizResultById(id: string): Promise<QuizResult | undefined> {
  const db = await getDB();
  return db.get('quizResults', id);
}

// BOOKMARKS
export async function getBookmarks(): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAll('bookmarkedQuestions');
  return all.map(b => b.id);
}

export async function toggleBookmark(questionId: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('bookmarkedQuestions', questionId);
  if (existing) {
    await db.delete('bookmarkedQuestions', questionId);
    return false;
  } else {
    await db.put('bookmarkedQuestions', { id: questionId, timestamp: Date.now() });
    return true;
  }
}

// USER STATS & BADGES
const DEFAULT_STATS: UserStats = {
  totalQuizzesTaken: 0,
  totalQuestionsAnswered: 0,
  correctAnswers: 0,
  currentStreakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  totalXp: 100, // Starter notebook XP
  badges: ['first_step'],
  mistakeQuestionIds: [],
  bookmarkedQuestionIds: []
};

export async function getUserStats(): Promise<UserStats> {
  const db = await getDB();
  const stats = await db.get('userStats', 'current');
  return stats || DEFAULT_STATS;
}

export async function saveUserStats(stats: UserStats): Promise<void> {
  const db = await getDB();
  await db.put('userStats', stats, 'current');
}

async function updateUserStatsAfterQuiz(result: QuizResult): Promise<void> {
  const stats = await getUserStats();
  const todayStr = new Date().toISOString().split('T')[0];

  // Streak logic
  let newStreak = stats.currentStreakDays;
  if (stats.lastActiveDate) {
    const lastDate = new Date(stats.lastActiveDate);
    const today = new Date(todayStr);
    const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  }

  // Update mistake questions for "Retry My Mistakes" preset
  const newMistakes = new Set<string>(stats.mistakeQuestionIds);
  for (const [qId, ans] of Object.entries(result.userAnswers)) {
    if (!ans.isCorrect && !ans.isSkipped) {
      newMistakes.add(qId);
    } else if (ans.isCorrect) {
      newMistakes.delete(qId);
    }
  }

  // Badges check
  const newBadges = new Set(stats.badges);
  if (result.score >= result.maxScore * 0.8) {
    newBadges.add('scholar_honor'); // 80%+ score
  }
  if (result.score === result.maxScore && result.totalQuestions >= 10) {
    newBadges.add('centum_master'); // 100% on 10+ questions
  }
  if (result.correctCount >= 10) {
    newBadges.add('ten_in_a_row');
  }
  if (stats.totalQuizzesTaken + 1 >= 5) {
    newBadges.add('drill_sergeant');
  }
  if (newStreak >= 3) {
    newBadges.add('streak_fire');
  }

  const updatedStats: UserStats = {
    totalQuizzesTaken: stats.totalQuizzesTaken + 1,
    totalQuestionsAnswered: stats.totalQuestionsAnswered + result.attemptedQuestions,
    correctAnswers: stats.correctAnswers + result.correctCount,
    currentStreakDays: newStreak,
    lastActiveDate: todayStr,
    totalXp: stats.totalXp + result.xpEarned,
    badges: Array.from(newBadges),
    mistakeQuestionIds: Array.from(newMistakes),
    bookmarkedQuestionIds: stats.bookmarkedQuestionIds
  };

  await saveUserStats(updatedStats);
}

// ACTIVE MID-QUIZ SESSION PERSISTENCE (Handles tab reload / accidental close)
const ACTIVE_SESSION_STORAGE_KEY = 'quizforge_active_quiz_session';

export function saveActiveQuizSession(session: ActiveQuizSession): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError') {
      notifyStorageFull('Browser localStorage full: Cannot auto-save mid-quiz recovery state.');
    }
  }
}

export function getActiveQuizSession(): ActiveQuizSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Ignore sessions older than 24 hours
    if (Date.now() - parsed.timestamp > 24 * 3600 * 1000) {
      clearActiveQuizSession();
      return null;
    }
    return parsed as ActiveQuizSession;
  } catch {
    return null;
  }
}

export function clearActiveQuizSession(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {}
}
