import { Question, SubjectId } from '../types/quiz';
import { getOverlayQuestions } from '../services/db';

// Vite lazy glob imports: returns mapping of path -> dynamic import function () => Promise<{ default: Question[] }>
const seedBankModules = import.meta.glob<{ default: Question[] }>('/src/data/class-*/*.json');

// Memory cache of loaded subject questions
const seedCache = new Map<string, Question[]>();

/**
 * Lazily loads a specific class + subject question file (100 questions)
 */
export async function loadSubjectQuestions(cls: number, subject: string): Promise<Question[]> {
  const key = `/src/data/class-${cls}/${subject}.json`;
  if (seedCache.has(key)) {
    return seedCache.get(key)!;
  }

  const loader = seedBankModules[key];
  if (!loader) {
    console.warn(`Question bank module not found for ${key}`);
    return [];
  }

  try {
    const mod = await loader();
    const questions = mod.default || [];
    seedCache.set(key, questions);
    return questions;
  } catch (err) {
    console.error(`Failed to lazily load ${key}:`, err);
    return [];
  }
}

/**
 * Lazily loads all questions for a given class (8 subjects = 800 questions)
 */
export async function loadClassQuestions(cls: number): Promise<Question[]> {
  const subjects: SubjectId[] = ['maths', 'physics', 'chemistry', 'biology', 'english', 'hindi', 'cs', 'gk'];
  const promises = subjects.map(s => loadSubjectQuestions(cls, s));
  const results = await Promise.all(promises);
  return results.flat();
}

/**
 * Loads all 3,200 seed questions across all 4 classes on demand (e.g. for Question Bank Manager)
 */
export async function getAllSeedQuestions(): Promise<Question[]> {
  const promises = Object.keys(seedBankModules).map(async key => {
    if (seedCache.has(key)) return seedCache.get(key)!;
    const loader = seedBankModules[key];
    if (!loader) return [];
    try {
      const mod = await loader();
      const qs = mod.default || [];
      seedCache.set(key, qs);
      return qs;
    } catch (e) {
      console.error(`Error loading seed file ${key}:`, e);
      return [];
    }
  });

  const all = await Promise.all(promises);
  return all.flat();
}

/**
 * Returns currently cached seed questions synchronously (empty if none loaded yet)
 */
export function getSeedQuestions(): Question[] {
  const loaded: Question[] = [];
  for (const [, qs] of seedCache) {
    loaded.push(...qs);
  }
  return loaded;
}

/**
 * Loads the effective question bank:
 * Can load specifically for a given class and subjects (lazy loading),
 * or for the entire platform when requested.
 * Seed questions + IndexedDB user overlay (added, edited, deleted, hidden)
 */
export async function getEffectiveQuestions(
  options: {
    class?: number;
    subjects?: SubjectId[];
    includeDeleted?: boolean;
    loadAll?: boolean;
  } = {}
): Promise<Question[]> {
  let seedQuestions: Question[] = [];

  if (options.loadAll) {
    seedQuestions = await getAllSeedQuestions();
  } else if (options.class && options.subjects && options.subjects.length > 0) {
    const promises = options.subjects.map(s => loadSubjectQuestions(options.class!, s));
    const results = await Promise.all(promises);
    seedQuestions = results.flat();
  } else if (options.class) {
    seedQuestions = await loadClassQuestions(options.class);
  } else {
    // Default: load all seed questions for safety and completeness
    seedQuestions = await getAllSeedQuestions();
  }

  let overlayQuestions: Question[] = [];
  try {
    overlayQuestions = await getOverlayQuestions();
  } catch (err) {
    console.warn('Could not load IndexedDB overlay, falling back to seed questions:', err);
  }

  const overlayMap = new Map<string, Question>();
  for (const q of overlayQuestions) {
    overlayMap.set(q.id, q);
  }

  const effective: Question[] = [];

  // Merge seed questions with overlay modifications
  for (const seed of seedQuestions) {
    if (overlayMap.has(seed.id)) {
      const overlay = overlayMap.get(seed.id)!;
      if (overlay.isUserDeleted) {
        if (options.includeDeleted) effective.push(overlay);
        continue;
      }
      effective.push(overlay);
      overlayMap.delete(seed.id);
    } else {
      effective.push(seed);
    }
  }

  // Add brand new user-created questions that match current scope
  for (const [, userQ] of overlayMap) {
    if (userQ.isUserDeleted && !options.includeDeleted) continue;
    if (options.class && userQ.class !== options.class) continue;
    if (options.subjects && options.subjects.length > 0 && !options.subjects.includes(userQ.subject)) continue;
    effective.push(userQ);
  }

  return effective;
}

export function filterQuestions(
  questions: Question[],
  filters: {
    class?: number;
    subject?: SubjectId | 'all';
    chapter?: string | 'all';
    type?: string | 'all';
    difficulty?: string | 'all';
    search?: string;
    excludeHidden?: boolean;
  }
): Question[] {
  return questions.filter(q => {
    if (filters.excludeHidden && q.isHidden) return false;
    if (filters.class && q.class !== filters.class) return false;
    if (filters.subject && filters.subject !== 'all' && q.subject !== filters.subject) return false;
    if (filters.chapter && filters.chapter !== 'all' && q.chapter !== filters.chapter) return false;
    if (filters.type && filters.type !== 'all' && q.type !== filters.type) return false;
    if (filters.difficulty && filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;

    if (filters.search && filters.search.trim() !== '') {
      const query = filters.search.toLowerCase();
      const matchQ = q.question.toLowerCase().includes(query);
      const matchChapter = q.chapter.toLowerCase().includes(query);
      const matchExpl = q.explanation.toLowerCase().includes(query);
      const matchId = q.id.toLowerCase().includes(query);
      return matchQ || matchChapter || matchExpl || matchId;
    }

    return true;
  });
}
